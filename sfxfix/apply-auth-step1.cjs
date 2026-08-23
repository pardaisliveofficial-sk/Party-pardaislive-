const fs = require("fs");
const path = require("path");

const file = path.join(process.cwd(), "server.ts");
if (!fs.existsSync(file)) throw new Error("server.ts not found. Run this from the Pardais Party repo root.");

let s = fs.readFileSync(file, "utf8");
const original = s;

// 1) Email-created accounts get a one-time username choice.
// The email-derived username exists for the verification step, but the user
// may replace it once during profile setup; after that it is locked.
const userMarker = `      username,\n      uniqueId,\n      fullName: "",`;
if (!s.includes(userMarker)) {
  throw new Error("Could not find the email signup user record. No changes made.");
}
s = s.replace(userMarker, `      username,\n      uniqueId,\n      usernameLocked: false,\n      emailLocked: true,\n      fullName: "",`);

// 2) Lock username after the first successful profile setup.
// Also remove the old default-username Firestore document so the account has
// one canonical username record instead of two.
const oldUsernameBlock = `  if (username && typeof username === "string") {\n    const cleanUser = username.trim().replace(/[^a-zA-Z0-9_]/g, "_");\n    if (cleanUser.length > 2) {\n      req.user.username = cleanUser;\n    }\n  }`;
const newUsernameBlock = `  if (username && typeof username === "string") {\n    const cleanUser = username.trim().replace(/[^a-zA-Z0-9_]/g, "_");\n    if (cleanUser.length > 2) {\n      if (req.user.usernameLocked) {\n        return res.status(400).json({ error: "USERNAME_PERMANENT", message: "Username is permanent and can only be changed by an administrator." });\n      }\n      const previousUsername = req.user.username;\n      req.user.username = cleanUser;\n      req.user.usernameLocked = true;\n      if (previousUsername && previousUsername !== cleanUser) {\n        try { deleteDocument("users", previousUsername); } catch (e) { console.warn("[AUTH] Could not remove old username record:", e); }\n      }\n    }\n  }`;
if (!s.includes(oldUsernameBlock)) {
  throw new Error("Could not find the profile username block. No changes made.");
}
s = s.replace(oldUsernameBlock, newUsernameBlock);

// 3) Guest endpoint is disabled at the API boundary. This prevents any
// unauthenticated fallback from creating/returning a guest account.
const guestMarker = `app.post("/api/v1/auth/guest-login", (req, res) => {\n`;
if (!s.includes(guestMarker)) {
  throw new Error("Could not find guest-login endpoint. No changes made.");
}
s = s.replace(guestMarker, guestMarker + `  return res.status(403).json({ error: "GUEST_ACCESS_DISABLED", message: "Please log in or create a Pardais account to continue." });\n`);

// 4) Make the wrong-password response explicit for the UI.
const wrongOld = `  if (!user || !user.passwordHash || !verifyPassword(password, user.passwordHash))\n    return res.status(401).json({ error: "Incorrect email/username or password." });`;
const wrongNew = `  if (!user) return res.status(401).json({ code: "ACCOUNT_NOT_FOUND", error: "Account not found. Check your email/username." });\n  if (!user.passwordHash) return res.status(401).json({ code: "PASSWORD_NOT_SET", error: "Password has not been created for this account." });\n  if (!verifyPassword(password, user.passwordHash)) return res.status(401).json({ code: "WRONG_PASSWORD", error: "Wrong password. Please try again." });`;
if (s.includes(wrongOld)) {
    s = s.replace(wrongOld, wrongNew);
} else {
    // allow already-patched state
    if (!s.includes('code: "WRONG_PASSWORD"')) throw new Error("Could not find password-login verification block. No changes made.");
}

if (s === original) {
  console.log("No changes needed; Step 1 may already be applied.");
} else {
  fs.writeFileSync(file, s, "utf8");
    console.log("Step 1 auth persistence patch applied to server.ts.");
  console.log("Changes: one-time username setup + username lock, immutable email flag, guest API disabled, explicit wrong-password response.");
}
