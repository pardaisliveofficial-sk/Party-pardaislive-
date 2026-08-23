import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { 
  initializeFirestore, 
  getFirestore,
  doc, 
  getDoc, 
  setDoc, 
  deleteDoc, 
  collection, 
  onSnapshot,
  setLogLevel,
  getDocs,
  runTransaction
} from "firebase/firestore";
import { resolveApiUrl } from "../lib/apiClient";
import appletConfig from "../../firebase-applet-config.json";

// Initialize Firebase using Client SDK
let firebaseConfig = {
  projectId: appletConfig.projectId || "pardais-party-production",
  appId: appletConfig.appId || "1:496371999211:web:3caed46eb0e946c1c9b9ae",
  apiKey: appletConfig.apiKey || "AIzaSyDUcaaRaU2ZJNUp90CMdl9gER_0oe1Db_E",
  authDomain: appletConfig.authDomain || "pardais-party-production.firebaseapp.com",
  storageBucket: (appletConfig as any).storageBucket || `${appletConfig.projectId || "pardais-party-production"}.firebasestorage.app`
};

let FIRESTORE_DB_ID = appletConfig.firestoreDatabaseId || "ai-studio-pardaisparty-472fb6a7-1901-43d4-8fd3-710376199072";

const apps = getApps();
const app = apps.length === 0 
  ? initializeApp(firebaseConfig) 
  : getApp();

console.log("[PARDAIS-PARTY FIREBASE] Firebase Client SDK initialized successfully with projectId:", firebaseConfig.projectId);

export let auth: any;
try {
  auth = getAuth(app);
} catch (err) {
  try {
    auth = getAuth();
  } catch (err2) {
    console.warn("[PARDAIS-PARTY FIREBASE] Failed to initialize Firebase Auth:", err2);
  }
}

// Silence internal Firestore client logging
setLogLevel("silent");

export let db: any = null;

try {
  if (FIRESTORE_DB_ID && FIRESTORE_DB_ID !== "(default)") {
    try {
      db = getFirestore(app, FIRESTORE_DB_ID);
    } catch (e1) {
      try {
        db = initializeFirestore(app, {
          experimentalForceLongPolling: true
        }, FIRESTORE_DB_ID);
      } catch (e2) {
        db = getFirestore(app);
      }
    }
  } else {
    db = getFirestore(app);
  }
} catch (outerErr) {
  try {
    db = getFirestore(app);
  } catch (finalErr) {
    console.warn("[PARDAIS-PARTY FIREBASE] Failed to initialize Firestore:", finalErr);
    db = null;
  }
}

// Helpers to track and handle Firestore write quota exhaustion and offline state gracefully
export let isFirestoreQuotaExhausted = false;
let lastQuotaCheckTime = 0;

export function handleQuotaError(err: any, operationName: string) {
  const errMsg = String(err?.message || err || "").toLowerCase();
  const errCode = String(err?.code || "").toLowerCase();
  const isOfflineOrQuota = 
    errMsg.includes("resource_exhausted") || 
    errMsg.includes("quota") || 
    errCode.includes("resource-exhausted") ||
    errCode.includes("quota") ||
    errMsg.includes("offline") ||
    errMsg.includes("client is offline") ||
    errMsg.includes("unavailable") ||
    errCode.includes("unavailable") ||
    errMsg.includes("failed-precondition") ||
    errMsg.includes("deadline-exceeded") ||
    errMsg.includes("network") ||
    errMsg.includes("transport") ||
    errMsg.includes("fetch failed");

  if (isOfflineOrQuota) {
    if (!isFirestoreQuotaExhausted) {
      isFirestoreQuotaExhausted = true;
      lastQuotaCheckTime = Date.now();
      console.warn(`[PARDAIS-PARTY FIREBASE] Firestore connection offline or quota limit reached during '${operationName}'. Switching seamlessly to local persistence.`);
    }
  } else {
    console.warn(`[PARDAIS-PARTY FIREBASE] Notice during '${operationName}':`, errMsg);
  }
}

// Collection keys to map to Firestore
export const COLLECTIONS = [
  "users",
  "gifts",
  "categories",
  "hosts",
  "parties",
  "families",
  "agencies",
  "transactions",
  "notifications",
  "reports",
  "kycRequests",
  "events",
  "adminUsersList",
  "reels",
  "stories",
  "chats",
  "messages",
  "agencyRequests",
  "purchaseRequests",
  "coinTransactions",
  "approvalStatus",
  "adminActions",
  "coinSellers"
];

// Memory Cache synced with Firestore
export const dbDataCache: any = {
  user: {
    username: "Pardais_User",
    uniqueId: "pardes_1001",
    avatar: "",
    coverPhoto: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80",
    bio: "Welcome to Pardes Party!",
    gender: "Male",
    country: "Pakistan",
    language: "Urdu / Hinglish",
    coins: 0,
    diamonds: 0,
    vipLevel: 0,
    userLevel: 1,
    hostLevel: 1,
    wealthLevel: 1,
    xp: 0,
    familyId: "",
    agencyId: "",
    isVerified: false,
    isBanned: false,
    twoFactorEnabled: false,
    fullName: "",
    dob: "",
    phoneNumber: "",
    kycStatus: "none",
    followersCount: 0,
    followingCount: 0,
    totalLikesCount: 0,
    selectedFrameId: "",
    vipSuspended: false
  },
  users: [],
  gifts: [],
  categories: [],
  hosts: [],
  parties: [],
  families: [],
  agencies: [],
  transactions: [],
  notifications: [],
  reports: [],
  kycRequests: [],
  events: [],
  configurations: {},
  adminUsersList: [],
  reels: [],
  stories: [],
  chats: [],
  messages: [],
  sessions: {},
  otps: {},
  emailOtps: {},
  agencyRequests: [],
  purchaseRequests: [],
  coinTransactions: [],
  approvalStatus: [],
  adminActions: [],
  coinSellers: []
};

export function shouldTryFirestore(): boolean {
  if (!isFirestoreQuotaExhausted) return true;
  // Allow a retry probe every 60 seconds
  if (Date.now() - lastQuotaCheckTime > 60000) {
    isFirestoreQuotaExhausted = false;
    lastQuotaCheckTime = Date.now();
    return true;
  }
  return false;
}

// Durable auth lookup used by the API server. The in-memory session cache can
// briefly be empty after a deploy/restart or on a second backend replica.
// Always fall back to Firestore before declaring a valid token expired.
export async function getPersistedSession(token: string): Promise<any | null> {
  if (!token || !shouldTryFirestore()) return null;
  try {
    const snap = await getDoc(doc(db, "sessions", token));
    return snap.exists() ? snap.data() : null;
  } catch (err) {
    handleQuotaError(err, "auth session lookup");
    return null;
  }
}


// Safe timeout wrapper for Firestore promises to guarantee the Node.js server never hangs
const withTimeout = <T>(p: Promise<T>, ms = 2500, fallback: T = null as unknown as T): Promise<T> => {
  return Promise.race([
    p,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))
  ]);
};

// Durable email-auth challenge storage. OTPs must survive API restarts/replicas.
export async function persistAuthChallenge(key: string, data: any): Promise<boolean> {
  if (!key || !shouldTryFirestore()) return false;
  try {
    const res = await withTimeout<boolean>(
      setDoc(doc(db, "authChallenges", String(key)), sanitizeForFirestore(data), { merge: true }).then(() => true),
      2500,
      false
    );
    return Boolean(res);
  } catch (err) {
    handleQuotaError(err, `persist auth challenge ${key}`);
    return false;
  }
}

export async function getPersistedAuthChallenge(key: string): Promise<any | null> {
  if (!key || !shouldTryFirestore()) return null;
  try {
    const snap = await withTimeout(getDoc(doc(db, "authChallenges", String(key))), 2500, null as any);
    return snap && snap.exists && snap.exists() ? snap.data() : null;
  } catch (err) {
    handleQuotaError(err, `get auth challenge ${key}`);
    return null;
  }
}

export async function deletePersistedAuthChallenge(key: string): Promise<void> {
  if (!key || !shouldTryFirestore()) return;
  try {
    await withTimeout(deleteDoc(doc(db, "authChallenges", String(key))), 2000, undefined);
  } catch (err) {
    handleQuotaError(err, `delete auth challenge ${key}`);
  }
}

export async function getPersistedUserForEmail(email: string): Promise<any | null> {
  const cleanEmail = String(email || "").toLowerCase().trim();
  if (!cleanEmail || !shouldTryFirestore()) return null;
  const emailKey = cleanEmail.replace(/[^a-zA-Z0-9]/g, "_");
  try {
    const registrySnap = await withTimeout(getDoc(doc(db, "emailRegistry", emailKey)), 2500, null as any);
    if (registrySnap && registrySnap.exists && registrySnap.exists()) {
      const registry = registrySnap.data();
      if (registry?.uid) {
        const uidSnap = await withTimeout(getDoc(doc(db, "users", `uid_${registry.uid}`)), 2500, null as any);
        if (uidSnap && uidSnap.exists && uidSnap.exists()) return uidSnap.data();
      }
    }
    const emailSnap = await withTimeout(getDoc(doc(db, "users", `email_${emailKey}`)), 2500, null as any);
    return emailSnap && emailSnap.exists && emailSnap.exists() ? emailSnap.data() : null;
  } catch (err) {
    handleQuotaError(err, "auth email account lookup");
    return null;
  }
}

export async function getPersistedUserForIdentifier(identifier: string): Promise<any | null> {
  const normalized = String(identifier || "").toLowerCase().trim().replace(/^@/, "");
  if (!normalized || !shouldTryFirestore()) return null;
  const isEmail = normalized.includes("@");

  if (isEmail) {
    const user = await getPersistedUserForEmail(normalized);
    if (user) return user;
  }

  try {
    // 1. Check doc by username
    const userDocSnap = await withTimeout(getDoc(doc(db, "users", normalized)), 2500, null as any);
    if (userDocSnap && userDocSnap.exists && userDocSnap.exists()) {
      return userDocSnap.data();
    }
    // 2. Check doc by email key
    const emailKey = normalized.replace(/[^a-zA-Z0-9]/g, "_");
    const emailDocSnap = await withTimeout(getDoc(doc(db, "users", `email_${emailKey}`)), 2500, null as any);
    if (emailDocSnap && emailDocSnap.exists && emailDocSnap.exists()) {
      return emailDocSnap.data();
    }
    // 3. Check doc by uid
    const uidDocSnap = await withTimeout(getDoc(doc(db, "users", `uid_${normalized}`)), 2500, null as any);
    if (uidDocSnap && uidDocSnap.exists && uidDocSnap.exists()) {
      return uidDocSnap.data();
    }
    // 4. Check doc by Pardais unique ID
    const idDocSnap = await withTimeout(getDoc(doc(db, "users", `id_${normalized}`)), 2500, null as any);
    if (idDocSnap && idDocSnap.exists && idDocSnap.exists()) {
      return idDocSnap.data();
    }
  } catch (err) {
    handleQuotaError(err, `lookup identifier ${normalized}`);
  }
  return null;
}

export async function getPersistedEmailRegistry(email: string): Promise<any | null> {
  const cleanEmail = String(email || "").toLowerCase().trim();
  if (!cleanEmail || !shouldTryFirestore()) return null;
  const emailKey = cleanEmail.replace(/[^a-zA-Z0-9]/g, "_");
  try {
    const snap = await withTimeout(getDoc(doc(db, "emailRegistry", emailKey)), 2500, null as any);
    return snap && snap.exists && snap.exists() ? snap.data() : null;
  } catch (err) {
    handleQuotaError(err, `get email registry ${emailKey}`);
    return null;
  }
}

export async function persistEmailRegistry(email: string, user: any): Promise<boolean> {
  const cleanEmail = String(email || "").toLowerCase().trim();
  if (!cleanEmail || !user?.uid || !shouldTryFirestore()) return false;
  const emailKey = cleanEmail.replace(/[^a-zA-Z0-9]/g, "_");
  try {
    const registryRef = doc(db, "emailRegistry", emailKey);
    await runTransaction(db, async (tx) => {
      const existing = await tx.get(registryRef);
      if (existing.exists()) {
        const current = existing.data() || {};
        if (String(current.uid || "") !== String(user.uid)) {
          throw new Error("EMAIL_REGISTRY_LOCKED_TO_ANOTHER_ACCOUNT");
        }
        tx.set(registryRef, sanitizeForFirestore({
          email: cleanEmail,
          uid: user.uid,
          username: user.username || current.username || "",
          registeredAt: current.registeredAt || user.registeredAt || new Date().toISOString(),
          locked: true
        }), { merge: true });
        return;
      }
      tx.set(registryRef, sanitizeForFirestore({
        email: cleanEmail,
        uid: user.uid,
        username: user.username || "",
        registeredAt: user.registeredAt || new Date().toISOString(),
        locked: true
      }), { merge: false });
    });
    return true;
  } catch (err) {
    handleQuotaError(err, `persist email registry ${emailKey}`);
    return false;
  }
}

export async function getPersistedUserForSession(session: any): Promise<any | null> {
  if (!session || !shouldTryFirestore()) return null;
  const candidates: any[] = [];
  try {
    if (session.uid) {
      const snap = await getDoc(doc(db, "users", `uid_${session.uid}`));
      if (snap.exists()) candidates.push(snap.data());
    }
    if (session.email) {
      const emailKey = String(session.email).toLowerCase().trim().replace(/[^a-zA-Z0-9]/g, "_");
      const snap = await getDoc(doc(db, "users", `email_${emailKey}`));
      if (snap.exists()) candidates.push(snap.data());
    }
    if (session.username) {
      const snap = await getDoc(doc(db, "users", String(session.username)));
      if (snap.exists()) candidates.push(snap.data());
    }
  } catch (err) {
    handleQuotaError(err, "auth user lookup");
  }
  // Deterministic identity matching: UID first, then normalized email.
  return candidates.find((u: any) => session.uid && u?.uid === session.uid)
    || candidates.find((u: any) => session.email && String(u?.email || "").toLowerCase().trim() === String(session.email).toLowerCase().trim())
    || candidates.find((u: any) => session.username && u?.username === session.username)
    || null;
}


export function sanitizeForFirestore(obj: any): any {
  if (obj === null || obj === undefined) return null;
  if (typeof obj !== "object") return obj;
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeForFirestore(item));
  }
  const cleanObj: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) {
      cleanObj[key] = null;
    } else if (typeof value === "object" && value !== null) {
      cleanObj[key] = sanitizeForFirestore(value);
    } else {
      cleanObj[key] = value;
    }
  }
  return cleanObj;
}

// Helper to check if database has been seeded
export async function checkAndSeedDatabase() {
  if (isFirestoreQuotaExhausted || !db) return;
  try {
    const seedCheckRef = doc(db, "metadata", "initial_seed_completed");
    let seedCheck: any = null;
    try {
      seedCheck = await getDoc(seedCheckRef);
    } catch (checkErr) {
      handleQuotaError(checkErr, "check initial seed");
      return;
    }
    if (seedCheck && typeof seedCheck.exists === "function" && seedCheck.exists()) {
      console.log("[PARDAIS-PARTY FIREBASE] Seeding already completed previously. Skipping.");
      return;
    }

    console.log("[PARDAIS-PARTY FIREBASE] Initializing firestore database seeding from backend API...");
    let localDb: any = {};
    try {
      const res = await fetch(resolveApiUrl("/api/v1/db"));
      if (res.ok) {
        localDb = await res.json();
      }
    } catch (err) {
      console.warn("[PARDAIS-PARTY FIREBASE] Failed to fetch /api/v1/db for seeding", err);
      return;
    }

    // Helper to safely write documents during seeding with quota awareness
    const safeSetDoc = async (docRef: any, data: any) => {
      if (isFirestoreQuotaExhausted) return;
      try {
        await setDoc(docRef, sanitizeForFirestore(data), { merge: true });
      } catch (err) {
        handleQuotaError(err, "database seeding write");
      }
    };

    // 1. Seed single/metadata properties
    if (localDb.user) {
      await safeSetDoc(doc(db, "metadata", "user_profile"), localDb.user);
    }
    if (localDb.configurations) {
      await safeSetDoc(doc(db, "metadata", "configurations"), localDb.configurations);
    }
    if (localDb.categories) {
      await safeSetDoc(doc(db, "metadata", "categories"), { list: localDb.categories });
    }

    // 2. Seed list collections
    const collectionsToSeed = [
      { name: "users", key: "username", data: localDb.users },
      { name: "gifts", key: "id", data: localDb.gifts },
      { name: "hosts", key: "id", data: [] }, // No demo hosts!
      { name: "families", key: "id", data: localDb.families },
      { name: "agencies", key: "id", data: [] }, // No demo agencies!
      { name: "transactions", key: "id", data: [] }, // No demo transactions!
      { name: "notifications", key: "id", data: localDb.notifications },
      { name: "reports", key: "id", data: localDb.reports },
      { name: "kycRequests", key: "id", data: localDb.kycRequests },
      { name: "events", key: "id", data: localDb.events },
      { name: "adminUsersList", key: "username", data: localDb.adminUsersList }
    ];

    for (const coll of collectionsToSeed) {
      if (isFirestoreQuotaExhausted) break;
      if (Array.isArray(coll.data)) {
        console.log(`[PARDAIS-PARTY FIREBASE] Seeding collection: ${coll.name} (${coll.data.length} items)`);
        for (const item of coll.data) {
          if (isFirestoreQuotaExhausted) break;
          const docId = String(item[coll.key] || Math.floor(1000 + Math.random() * 9000));
          await safeSetDoc(doc(db, coll.name, docId), item);
        }
      }
    }

    // Mark seed completed
    if (!isFirestoreQuotaExhausted) {
      await safeSetDoc(doc(db, "metadata", "initial_seed_completed"), {
        timestamp: new Date().toISOString(),
        completed: true
      });
      console.log("[PARDAIS-PARTY FIREBASE] Seeding completed successfully. All data moved to Firestore.");
    } else {
      console.log("[PARDAIS-PARTY FIREBASE] Seeding paused due to Firestore quota limitation. Operating in local mode.");
    }
  } catch (err) {
    handleQuotaError(err, "database seeding");
  }
}

// Starts real-time replication listeners from Firestore to local cache
export function startFirestoreSynchronization() {
  if (!db) {
    console.warn("[PARDAIS-PARTY FIREBASE] Firestore instance not available. Skipping real-time synchronization.");
    return;
  }
  console.log("[PARDAIS-PARTY FIREBASE] Initializing real-time Firestore synchronization engine...");

  // Sync Metadata values
  onSnapshot(doc(db, "metadata", "user_profile"), docSnap => {
    if (docSnap.exists()) {
      dbDataCache.user = docSnap.data();
    }
  }, err => handleQuotaError(err, "Sync user_profile"));

  onSnapshot(doc(db, "metadata", "configurations"), docSnap => {
    if (docSnap.exists()) {
      dbDataCache.configurations = docSnap.data();
    }
  }, err => handleQuotaError(err, "Sync configurations"));

  onSnapshot(doc(db, "metadata", "categories"), docSnap => {
    if (docSnap.exists()) {
      dbDataCache.categories = docSnap.data()?.list || [];
    }
  }, err => handleQuotaError(err, "Sync categories"));

  // Sync regular list collections
  COLLECTIONS.forEach(colName => {
    if (colName === "categories") return; // handled as metadata doc

    onSnapshot(collection(db, colName), snapshot => {
      const items: any[] = [];
      snapshot.forEach(docSnap => {
        items.push(docSnap.data());
      });
      if (colName === "users") {
        // Multiple legacy user documents may exist for one account (username,
        // uid_*, and email_* mirrors). Collapse them into one deterministic
        // in-memory user per stable email/UID so refresh order can never switch
        // the active account between two IDs.
        const byIdentity = new Map<string, any>();
        const score = (u: any) =>
          Number(Boolean(u?.passwordHash)) * 100 +
          Number(Boolean(u?.avatar)) * 10 +
          Number(Boolean(u?.fullName)) * 5 +
          Number(Boolean(u?.phoneNumber)) * 2 +
          Number(Boolean(u?.uniqueId));

        for (const item of items) {
          if (!item) continue;
          const email = typeof item.email === "string" ? item.email.toLowerCase().trim() : "";
          const uid = String(item.uid || "");
          const identity = email ? `email:${email}` : (uid ? `uid:${uid}` : `username:${String(item.username || "")}`);
          const current = byIdentity.get(identity);
          if (!current || score(item) > score(current)) {
            byIdentity.set(identity, item);
          }
        }

        dbDataCache.users = Array.from(byIdentity.values());
      } else if (colName === "hosts") {
        dbDataCache.hosts = items.filter((h: any) => h && (h.isLive === true || h.status === "live") && h.status !== "ended" && h.status !== "offline");
      } else if (colName === "gifts") {
        if (items.length > 0) {
          const giftMap = new Map<string, any>();
          (dbDataCache.gifts || []).forEach((g: any) => {
            if (g && g.id) giftMap.set(g.id, g);
          });
          items.forEach((g: any) => {
            if (g && g.id) giftMap.set(g.id, g);
          });
          dbDataCache.gifts = Array.from(giftMap.values());
        }
      } else if (colName === "reels") {
        // Never wipe the production reel cache when Firestore temporarily returns
        // an empty/stale snapshot. Merge by stable reel ID so refresh/reconnect
        // cannot make uploaded reels disappear.
        if (items.length > 0) {
          const reelMap = new Map<string, any>();
          (dbDataCache.reels || []).forEach((r: any) => {
            if (r && r.id) reelMap.set(String(r.id), r);
          });
          items.forEach((r: any) => {
            if (r && r.id) reelMap.set(String(r.id), r);
          });
          dbDataCache.reels = Array.from(reelMap.values());
        }
      } else {
        dbDataCache[colName] = items;
      }
    }, err => handleQuotaError(err, `Sync list ${colName}`));
  });

  // Sync session and OTP collections (dictionary map structure)
  onSnapshot(collection(db, "sessions"), snapshot => {
    const dict: any = {};
    snapshot.forEach(docSnap => {
      dict[docSnap.id] = docSnap.data();
    });
    dbDataCache.sessions = dict;
  }, err => handleQuotaError(err, "Sync sessions"));

  onSnapshot(collection(db, "otps"), snapshot => {
    const dict: any = {};
    snapshot.forEach(docSnap => {
      dict[docSnap.id] = docSnap.data();
    });
    dbDataCache.otps = dict;
  }, err => handleQuotaError(err, "Sync otps"));

  // Sync active email verification challenges into the hot API cache. This
  // makes verification fast on every Railway replica while Firestore remains
  // the durable source of truth.
  onSnapshot(collection(db, "authChallenges"), snapshot => {
    const now = Date.now();
    const dict: any = {};
    snapshot.forEach(docSnap => {
      const value: any = docSnap.data();
      if (value && (!value.expiresAt || Number(value.expiresAt) > now) && value.used !== true) {
        dict[String(value.email || "").toLowerCase().trim()] = value;
      }
    });
    dbDataCache.emailOtps = { ...(dbDataCache.emailOtps || {}), ...dict };
  }, err => handleQuotaError(err, "Sync authChallenges"));
}

export async function clearAllHostsInFirestore() {
  if (isFirestoreQuotaExhausted || !db) return;
  try {
    const querySnapshot = await getDocs(collection(db, "hosts"));
    const deletePromises: Promise<void>[] = [];
    const now = Date.now();
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (!data) return;
      const isEnded = data.status === "ENDED" || data.status === "ended" || data.status === "offline" || data.isLive === false;
      const isStale = data.lastSeen && typeof data.lastSeen === "number" && (now - data.lastSeen > 35000);
      if (isEnded || isStale) {
        deletePromises.push(deleteDoc(doc(db, "hosts", docSnap.id)));
      }
    });
    await Promise.all(deletePromises);
    console.log("[PARDAIS-PARTY FIREBASE] Cleared stale/ended hosts from Firestore.");
  } catch (err) {
    handleQuotaError(err, "clear hosts in Firestore");
  }
}

let reelsHydratedAt = 0;

export async function hydrateReelsFromFirestore(force = false): Promise<any[]> {
  const now = Date.now();
  // Avoid a Firestore read on every polling request while still recovering
  // quickly after a Railway restart or a cold server instance.
  if (!force && now - reelsHydratedAt < 5000 && Array.isArray(dbDataCache.reels) && dbDataCache.reels.length > 0) {
    return dbDataCache.reels;
  }
  if (!shouldTryFirestore()) return Array.isArray(dbDataCache.reels) ? dbDataCache.reels : [];
  try {
    const snapshot = await getDocs(collection(db, "reels"));
    const reelMap = new Map<string, any>();
    (dbDataCache.reels || []).forEach((r: any) => {
      if (r && r.id) reelMap.set(String(r.id), r);
    });
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      if (data && data.id) reelMap.set(String(data.id), data);
      else if (data) reelMap.set(String(docSnap.id), { ...data, id: docSnap.id });
    });
    dbDataCache.reels = Array.from(reelMap.values()).sort((a: any, b: any) => {
      const ta = Date.parse(a?.createdAt || "") || 0;
      const tb = Date.parse(b?.createdAt || "") || 0;
      return tb - ta;
    });
    reelsHydratedAt = now;
  } catch (err) {
    handleQuotaError(err, "hydrate reels from Firestore");
  }
  return Array.isArray(dbDataCache.reels) ? dbDataCache.reels : [];
}

export async function syncDocument(collectionName: string, docId: string, data: any): Promise<boolean> {
  if (!shouldTryFirestore()) return false;
  try {
    if (!docId) return false;
    await setDoc(doc(db, collectionName, String(docId)), sanitizeForFirestore(data), { merge: true });
    return true;
  } catch (err) {
    handleQuotaError(err, `syncDocument ${collectionName}/${docId}`);
    return false;
  }
}

export async function deleteDocument(collectionName: string, docId: string) {
  if (!shouldTryFirestore()) return;
  try {
    if (!docId) return;
    await deleteDoc(doc(db, collectionName, String(docId)));
  } catch (err) {
    handleQuotaError(err, `deleteDocument ${collectionName}/${docId}`);
  }
}

export async function writeMetadata(docName: "user_profile" | "configurations" | "categories", data: any) {
  if (!shouldTryFirestore()) return;
  try {
    await setDoc(doc(db, "metadata", docName), sanitizeForFirestore(data), { merge: true });
  } catch (err) {
    handleQuotaError(err, `writeMetadata ${docName}`);
  }
}
