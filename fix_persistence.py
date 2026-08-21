#!/usr/bin/env python3
from pathlib import Path

ROOT = Path.cwd()

fb = ROOT / "src/db/firebaseDb.ts"
s = fb.read_text(encoding="utf-8")

old = """      } else {
        dbDataCache[colName] = items;
      }
"""
new = """      } else if (colName === "users") {
        // Never erase locally known user records when Firestore temporarily
        // returns an empty/stale snapshot. Merge by stable UID/email/username.
        const existingUsers = Array.isArray(dbDataCache.users) ? dbDataCache.users : [];
        const merged = new Map<string, any>();
        const keyFor = (u: any) => {
          if (!u) return "";
          if (u.uid) return `uid:${String(u.uid)}`;
          if (u.email) return `email:${String(u.email).toLowerCase().trim()}`;
          if (u.username) return `username:${String(u.username).toLowerCase().trim()}`;
          return "";
        };
        for (const u of existingUsers) {
          const k = keyFor(u);
          if (k) merged.set(k, u);
        }
        for (const u of items) {
          const k = keyFor(u);
          if (!k) continue;
          const previous = merged.get(k);
          if (previous) {
            const preserved: any = { ...previous, ...u };
            if (previous.profileCompleted) {
              for (const field of ["fullName", "username", "avatar", "phoneNumber", "dob", "bio", "description", "gender"]) {
                if (previous[field] && (!u[field] || String(u[field]).includes("dicebear"))) {
                  preserved[field] = previous[field];
                }
              }
            }
            merged.set(k, preserved);
          } else {
            merged.set(k, u);
          }
        }
        dbDataCache.users = Array.from(merged.values());
      } else {
        dbDataCache[colName] = items;
      }
"""
if old not in s:
    raise SystemExit("ERROR: firebaseDb listener pattern not found. Stop; do not force the patch.")
s = s.replace(old, new, 1)

old = '    dbDataCache.sessions = dict;\n'
new = """    // Do not erase active in-memory sessions when Firestore temporarily
    // returns an empty snapshot. Merge cloud sessions into the local cache.
    dbDataCache.sessions = { ...(dbDataCache.sessions || {}), ...dict };
"""
if old not in s:
    raise SystemExit("ERROR: firebaseDb session pattern not found. Stop; do not force the patch.")
s = s.replace(old, new, 1)
fb.write_text(s, encoding="utf-8")

server = ROOT / "server.ts"
s = server.read_text(encoding="utf-8")

old = """function persistUser(user: any) {
  // Keep the legacy username document for existing app features, while also
  // creating stable identity documents keyed by UID and email.
  syncDocument("users", user.username, user);
  if (user.uid) syncDocument("users", `uid_${user.uid}`, user);
  if (user.email) syncDocument("users", `email_${user.email.toLowerCase().replace(/[^a-zA-Z0-9]/g, "_")}`, user);
}
"""
new = """function persistUser(user: any) {
  // Make the in-memory record authoritative before any cloud sync.
  if (!Array.isArray(dbData.users)) dbData.users = [];
  const email = typeof user?.email === "string" ? user.email.toLowerCase().trim() : "";
  const index = dbData.users.findIndex((u: any) =>
    u && ((user?.uid && u.uid === user.uid) || (email && typeof u.email === "string" && u.email.toLowerCase().trim() === email))
  );
  if (index >= 0) dbData.users[index] = user;
  else dbData.users.push(user);

  syncDocument("users", user.username, user);
  if (user.uid) syncDocument("users", `uid_${user.uid}`, user);
  if (email) syncDocument("users", `email_${email.replace(/[^a-zA-Z0-9]/g, "_")}`, user);
}
"""
if old not in s:
    raise SystemExit("ERROR: server persistUser pattern not found. Stop; do not force the patch.")
s = s.replace(old, new, 1)

old = """function findEmailUser(email: string) {
  const cleanEmail = email.toLowerCase().trim();
  return dbData.users?.find((u: any) =>
    u && typeof u.email === "string" && u.email.toLowerCase().trim() === cleanEmail
  );
}
"""
new = """function findEmailUser(email: string) {
  const cleanEmail = email.toLowerCase().trim();
  const matches = (dbData.users || []).filter((u: any) =>
    u && typeof u.email === "string" && u.email.toLowerCase().trim() === cleanEmail
  );
  if (!matches.length) return undefined;

  // Prefer the most complete account if old duplicate email records exist.
  return matches.sort((a: any, b: any) => {
    const score = (u: any) =>
      (u.passwordHash ? 1000 : 0) +
      (u.profileCompleted ? 500 : 0) +
      (u.fullName ? 100 : 0) +
      (u.username ? 100 : 0) +
      (u.avatar && !String(u.avatar).includes("dicebear") ? 50 : 0) +
      (u.profileUpdatedAt ? 10 : 0);
    return score(b) - score(a);
  })[0];
}
"""
if old not in s:
    raise SystemExit("ERROR: server findEmailUser pattern not found. Stop; do not force the patch.")
s = s.replace(old, new, 1)

old = """  if (username && typeof username === "string") {
    const cleanUser = username.trim().replace(/[^a-zA-Z0-9_]/g, "_");
    if (cleanUser.length > 2) {
      req.user.username = cleanUser;
    }
  }
"""
new = """  // Username is editable only during the initial profile setup.
  if (!req.user.profileCompleted && username && typeof username === "string") {
    const cleanUser = username.trim().replace(/[^a-zA-Z0-9_]/g, "_");
    if (cleanUser.length > 2) {
      req.user.username = cleanUser;
    }
  }
"""
if old not in s:
    raise SystemExit("ERROR: server username-lock pattern not found. Stop; do not force the patch.")
s = s.replace(old, new, 1)
server.write_text(s, encoding="utf-8")

print("DONE: persistence/auth patch applied.")
