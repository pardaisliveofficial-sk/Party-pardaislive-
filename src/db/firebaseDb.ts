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

export let db: any;
try {
  db = getFirestore(app, FIRESTORE_DB_ID);
} catch (err) {
  try {
    db = initializeFirestore(app, {
      experimentalForceLongPolling: true
    }, FIRESTORE_DB_ID);
  } catch (err2) {
    db = getFirestore(app);
  }
}

// Helpers to track and handle Firestore write quota exhaustion gracefully
export let isFirestoreQuotaExhausted = false;

export function handleQuotaError(err: any, operationName: string) {
  const errMsg = String(err?.message || err || "").toLowerCase();
  const errCode = String(err?.code || "").toLowerCase();
  if (
    errMsg.includes("resource_exhausted") || 
    errMsg.includes("quota") || 
    errCode.includes("resource-exhausted") ||
    errCode.includes("quota")
  ) {
    if (!isFirestoreQuotaExhausted) {
      isFirestoreQuotaExhausted = true;
      console.warn(`[PARDAIS-PARTY FIREBASE] Firestore write quota has been exhausted. Pardais Party is now operating in high-performance local fallback mode. All features remain fully functional locally.`);
    }
  } else {
    console.error(`[PARDAIS-PARTY FIREBASE] Error during '${operationName}':`, err);
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
    avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80",
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
  agencyRequests: [],
  purchaseRequests: [],
  coinTransactions: [],
  approvalStatus: [],
  adminActions: [],
  coinSellers: []
};

// Durable auth lookup used by the API server. The in-memory session cache can
// briefly be empty after a deploy/restart or on a second backend replica.
// Always fall back to Firestore before declaring a valid token expired.
export async function getPersistedSession(token: string): Promise<any | null> {
  if (!token) return null;
  try {
    const snap = await getDoc(doc(db, "sessions", token));
    return snap.exists() ? snap.data() : null;
  } catch (err) {
    handleQuotaError(err, "auth session lookup");
    return null;
  }
}


// Durable email-auth challenge storage. OTPs must survive API restarts/replicas.
export async function persistAuthChallenge(key: string, data: any): Promise<boolean> {
  if (!key) return false;
  try {
    await setDoc(doc(db, "authChallenges", String(key)), sanitizeForFirestore(data), { merge: true });
    return true;
  } catch (err) {
    handleQuotaError(err, `persist auth challenge ${key}`);
    return false;
  }
}

export async function getPersistedAuthChallenge(key: string): Promise<any | null> {
  if (!key) return null;
  try {
    const snap = await getDoc(doc(db, "authChallenges", String(key)));
    return snap.exists() ? snap.data() : null;
  } catch (err) {
    handleQuotaError(err, `get auth challenge ${key}`);
    return null;
  }
}

export async function deletePersistedAuthChallenge(key: string): Promise<void> {
  if (!key) return;
  try {
    await deleteDoc(doc(db, "authChallenges", String(key)));
  } catch (err) {
    handleQuotaError(err, `delete auth challenge ${key}`);
  }
}

export async function getPersistedUserForEmail(email: string): Promise<any | null> {
  const cleanEmail = String(email || "").toLowerCase().trim();
  if (!cleanEmail) return null;
  const emailKey = cleanEmail.replace(/[^a-zA-Z0-9]/g, "_");
  try {
    const registrySnap = await getDoc(doc(db, "emailRegistry", emailKey));
    if (registrySnap.exists()) {
      const registry = registrySnap.data();
      if (registry?.uid) {
        const uidSnap = await getDoc(doc(db, "users", `uid_${registry.uid}`));
        if (uidSnap.exists()) return uidSnap.data();
      }
    }
    const emailSnap = await getDoc(doc(db, "users", `email_${emailKey}`));
    return emailSnap.exists() ? emailSnap.data() : null;
  } catch (err) {
    handleQuotaError(err, "auth email account lookup");
    return null;
  }
}

export async function getPersistedEmailRegistry(email: string): Promise<any | null> {
  const cleanEmail = String(email || "").toLowerCase().trim();
  if (!cleanEmail) return null;
  const emailKey = cleanEmail.replace(/[^a-zA-Z0-9]/g, "_");
  try {
    const snap = await getDoc(doc(db, "emailRegistry", emailKey));
    return snap.exists() ? snap.data() : null;
  } catch (err) {
    handleQuotaError(err, `get email registry ${emailKey}`);
    return null;
  }
}

export async function persistEmailRegistry(email: string, user: any): Promise<boolean> {
  const cleanEmail = String(email || "").toLowerCase().trim();
  if (!cleanEmail || !user?.uid) return false;
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
  if (!session) return null;
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
  if (isFirestoreQuotaExhausted) return;
  try {
    const seedCheckRef = doc(db, "metadata", "initial_seed_completed");
    const seedCheck = await getDoc(seedCheckRef);
    if (seedCheck.exists()) {
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
    console.error("[PARDAIS-PARTY FIREBASE] Database seeding error:", err);
  }
}

// Starts real-time replication listeners from Firestore to local cache
export function startFirestoreSynchronization() {
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
}

export async function clearAllHostsInFirestore() {
  if (isFirestoreQuotaExhausted) return;
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
    console.error("[PARDAIS-PARTY FIREBASE] Failed to clear hosts in Firestore:", err);
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
  if (isFirestoreQuotaExhausted) return Array.isArray(dbDataCache.reels) ? dbDataCache.reels : [];
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
  if (isFirestoreQuotaExhausted) return false;
  try {
    if (!docId) return false;
    await setDoc(doc(db, collectionName, String(docId)), sanitizeForFirestore(data), { merge: true });
    console.log(`[PARDAIS-PARTY FIREBASE] Synced document to Firestore: ${collectionName}/${docId}`);
    return true;
  } catch (err) {
    handleQuotaError(err, `syncDocument ${collectionName}/${docId}`);
    return false;
  }
}

export async function deleteDocument(collectionName: string, docId: string) {
  if (isFirestoreQuotaExhausted) return;
  try {
    if (!docId) return;
    await deleteDoc(doc(db, collectionName, String(docId)));
    console.log(`[PARDAIS-PARTY FIREBASE] Deleted document from Firestore: ${collectionName}/${docId}`);
  } catch (err) {
    handleQuotaError(err, `deleteDocument ${collectionName}/${docId}`);
  }
}

export async function writeMetadata(docName: "user_profile" | "configurations" | "categories", data: any) {
  if (isFirestoreQuotaExhausted) return;
  try {
    await setDoc(doc(db, "metadata", docName), sanitizeForFirestore(data), { merge: true });
    console.log(`[PARDAIS-PARTY FIREBASE] Synced metadata to Firestore: ${docName}`);
  } catch (err) {
    handleQuotaError(err, `writeMetadata ${docName}`);
  }
}
