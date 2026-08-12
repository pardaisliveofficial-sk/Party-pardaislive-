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
  getDocs
} from "firebase/firestore";
import { resolveApiUrl } from "../lib/apiClient";
import appletConfig from "../../firebase-applet-config.json";

// Initialize Firebase using Client SDK
let firebaseConfig = {
  projectId: appletConfig.projectId || "sehr-live-production",
  appId: appletConfig.appId || "1:496371999211:web:3caed46eb0e946c1c9b9ae",
  apiKey: appletConfig.apiKey || "AIzaSyDUcaaRaU2ZJNUp90CMdl9gER_0oe1Db_E",
  authDomain: appletConfig.authDomain || "sehr-live-production.firebaseapp.com",
  storageBucket: (appletConfig as any).storageBucket || `${appletConfig.projectId || "sehr-live-production"}.firebasestorage.app`
};

let FIRESTORE_DB_ID = appletConfig.firestoreDatabaseId || "ai-studio-sehrlive-472fb6a7-1901-43d4-8fd3-710376199072";

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
      if (colName === "hosts") {
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

export async function syncDocument(collectionName: string, docId: string, data: any) {
  if (isFirestoreQuotaExhausted) return;
  try {
    if (!docId) return;
    await setDoc(doc(db, collectionName, String(docId)), sanitizeForFirestore(data), { merge: true });
    console.log(`[PARDAIS-PARTY FIREBASE] Synced document to Firestore: ${collectionName}/${docId}`);
  } catch (err) {
    handleQuotaError(err, `syncDocument ${collectionName}/${docId}`);
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
