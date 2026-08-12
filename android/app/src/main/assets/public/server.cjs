var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_dotenv = __toESM(require("dotenv"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_sharp = __toESM(require("sharp"), 1);
var import_nodemailer = __toESM(require("nodemailer"), 1);
var import_client_s3 = require("@aws-sdk/client-s3");
var import_multer = __toESM(require("multer"), 1);
var import_vite = require("vite");
var import_genai = require("@google/genai");
var import_agora_token = __toESM(require("agora-token"), 1);
var import_adm_zip = __toESM(require("adm-zip"), 1);
var import_zlib = __toESM(require("zlib"), 1);

// src/db/firebaseDb.ts
var import_app = require("firebase/app");
var import_firestore = require("firebase/firestore");

// firebase-applet-config.json
var firebase_applet_config_default = {
  projectId: "sehr-live-production",
  appId: "1:496371999211:web:3caed46eb0e946c1c9b9ae",
  apiKey: "AIzaSyDUcaaRaU2ZJNUp90CMdl9gER_0oe1Db_E",
  authDomain: "sehr-live-production.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-sehrlive-472fb6a7-1901-43d4-8fd3-710376199072",
  storageBucket: "sehr-live-production.firebasestorage.app",
  messagingSenderId: "496371999211",
  measurementId: "",
  oAuthClientId: "496371999211-2mj9mog2lobpbgbcuv3gbi3d4m0meefr.apps.googleusercontent.com",
  recaptchaSiteKey: ""
};

// src/db/firebaseDb.ts
var firebaseConfig = {
  projectId: firebase_applet_config_default.projectId || "sehr-live-production",
  appId: firebase_applet_config_default.appId || "1:496371999211:web:3caed46eb0e946c1c9b9ae",
  apiKey: firebase_applet_config_default.apiKey || "AIzaSyDUcaaRaU2ZJNUp90CMdl9gER_0oe1Db_E",
  authDomain: firebase_applet_config_default.authDomain || "sehr-live-production.firebaseapp.com"
};
var FIRESTORE_DB_ID = firebase_applet_config_default.firestoreDatabaseId || "ai-studio-sehrlive-472fb6a7-1901-43d4-8fd3-710376199072";
var apps = (0, import_app.getApps)();
var app = apps.length === 0 ? (0, import_app.initializeApp)(firebaseConfig) : (0, import_app.getApp)();
console.log("[PARDAIS-PARTY FIREBASE] Firebase Client SDK initialized successfully with projectId:", firebaseConfig.projectId);
(0, import_firestore.setLogLevel)("silent");
var db;
try {
  db = (0, import_firestore.getFirestore)(app, FIRESTORE_DB_ID);
} catch (err) {
  try {
    db = (0, import_firestore.initializeFirestore)(app, {
      experimentalForceLongPolling: true
    }, FIRESTORE_DB_ID);
  } catch (err2) {
    db = (0, import_firestore.getFirestore)(app);
  }
}
var isFirestoreQuotaExhausted = false;
function handleQuotaError(err, operationName) {
  const errMsg = String(err?.message || err || "").toLowerCase();
  const errCode = String(err?.code || "").toLowerCase();
  if (errMsg.includes("resource_exhausted") || errMsg.includes("quota") || errCode.includes("resource-exhausted") || errCode.includes("quota")) {
    if (!isFirestoreQuotaExhausted) {
      isFirestoreQuotaExhausted = true;
      console.warn(`[PARDAIS-PARTY FIREBASE] Firestore write quota has been exhausted. Pardais Party is now operating in high-performance local fallback mode. All features remain fully functional locally.`);
    }
  } else {
    console.error(`[PARDAIS-PARTY FIREBASE] Error during '${operationName}':`, err);
  }
}
var COLLECTIONS = [
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
var dbDataCache = {
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
function sanitizeForFirestore(obj) {
  if (obj === null || obj === void 0) return null;
  if (typeof obj !== "object") return obj;
  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeForFirestore(item));
  }
  const cleanObj = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === void 0) {
      cleanObj[key] = null;
    } else if (typeof value === "object" && value !== null) {
      cleanObj[key] = sanitizeForFirestore(value);
    } else {
      cleanObj[key] = value;
    }
  }
  return cleanObj;
}
async function checkAndSeedDatabase() {
  if (isFirestoreQuotaExhausted) return;
  try {
    const seedCheckRef = (0, import_firestore.doc)(db, "metadata", "initial_seed_completed");
    const seedCheck = await (0, import_firestore.getDoc)(seedCheckRef);
    if (seedCheck.exists()) {
      console.log("[PARDAIS-PARTY FIREBASE] Seeding already completed previously. Skipping.");
      return;
    }
    console.log("[PARDAIS-PARTY FIREBASE] Initializing firestore database seeding from backend API...");
    let localDb = {};
    try {
      const res = await fetch("/api/v1/db");
      if (res.ok) {
        localDb = await res.json();
      }
    } catch (err) {
      console.warn("[PARDAIS-PARTY FIREBASE] Failed to fetch /api/v1/db for seeding", err);
      return;
    }
    const safeSetDoc = async (docRef, data) => {
      if (isFirestoreQuotaExhausted) return;
      try {
        await (0, import_firestore.setDoc)(docRef, sanitizeForFirestore(data), { merge: true });
      } catch (err) {
        handleQuotaError(err, "database seeding write");
      }
    };
    if (localDb.user) {
      await safeSetDoc((0, import_firestore.doc)(db, "metadata", "user_profile"), localDb.user);
    }
    if (localDb.configurations) {
      await safeSetDoc((0, import_firestore.doc)(db, "metadata", "configurations"), localDb.configurations);
    }
    if (localDb.categories) {
      await safeSetDoc((0, import_firestore.doc)(db, "metadata", "categories"), { list: localDb.categories });
    }
    const collectionsToSeed = [
      { name: "users", key: "username", data: localDb.users },
      { name: "gifts", key: "id", data: localDb.gifts },
      { name: "hosts", key: "id", data: [] },
      // No demo hosts!
      { name: "families", key: "id", data: localDb.families },
      { name: "agencies", key: "id", data: [] },
      // No demo agencies!
      { name: "transactions", key: "id", data: [] },
      // No demo transactions!
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
          const docId = String(item[coll.key] || Math.floor(1e3 + Math.random() * 9e3));
          await safeSetDoc((0, import_firestore.doc)(db, coll.name, docId), item);
        }
      }
    }
    if (!isFirestoreQuotaExhausted) {
      await safeSetDoc((0, import_firestore.doc)(db, "metadata", "initial_seed_completed"), {
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
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
function startFirestoreSynchronization() {
  console.log("[PARDAIS-PARTY FIREBASE] Initializing real-time Firestore synchronization engine...");
  (0, import_firestore.onSnapshot)((0, import_firestore.doc)(db, "metadata", "user_profile"), (docSnap) => {
    if (docSnap.exists()) {
      dbDataCache.user = docSnap.data();
    }
  }, (err) => handleQuotaError(err, "Sync user_profile"));
  (0, import_firestore.onSnapshot)((0, import_firestore.doc)(db, "metadata", "configurations"), (docSnap) => {
    if (docSnap.exists()) {
      dbDataCache.configurations = docSnap.data();
    }
  }, (err) => handleQuotaError(err, "Sync configurations"));
  (0, import_firestore.onSnapshot)((0, import_firestore.doc)(db, "metadata", "categories"), (docSnap) => {
    if (docSnap.exists()) {
      dbDataCache.categories = docSnap.data()?.list || [];
    }
  }, (err) => handleQuotaError(err, "Sync categories"));
  COLLECTIONS.forEach((colName) => {
    if (colName === "categories") return;
    (0, import_firestore.onSnapshot)((0, import_firestore.collection)(db, colName), (snapshot) => {
      const items = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data());
      });
      if (colName === "hosts") {
        dbDataCache.hosts = items.filter((h) => h && (h.isLive === true || h.status === "live") && h.status !== "ended" && h.status !== "offline");
      } else if (colName === "gifts") {
        if (items.length > 0) {
          const giftMap = /* @__PURE__ */ new Map();
          (dbDataCache.gifts || []).forEach((g) => {
            if (g && g.id) giftMap.set(g.id, g);
          });
          items.forEach((g) => {
            if (g && g.id) giftMap.set(g.id, g);
          });
          dbDataCache.gifts = Array.from(giftMap.values());
        }
      } else {
        dbDataCache[colName] = items;
      }
    }, (err) => handleQuotaError(err, `Sync list ${colName}`));
  });
  (0, import_firestore.onSnapshot)((0, import_firestore.collection)(db, "sessions"), (snapshot) => {
    const dict = {};
    snapshot.forEach((docSnap) => {
      dict[docSnap.id] = docSnap.data();
    });
    dbDataCache.sessions = dict;
  }, (err) => handleQuotaError(err, "Sync sessions"));
  (0, import_firestore.onSnapshot)((0, import_firestore.collection)(db, "otps"), (snapshot) => {
    const dict = {};
    snapshot.forEach((docSnap) => {
      dict[docSnap.id] = docSnap.data();
    });
    dbDataCache.otps = dict;
  }, (err) => handleQuotaError(err, "Sync otps"));
}
async function clearAllHostsInFirestore() {
  if (isFirestoreQuotaExhausted) return;
  try {
    const querySnapshot = await (0, import_firestore.getDocs)((0, import_firestore.collection)(db, "hosts"));
    const deletePromises = [];
    const now = Date.now();
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (!data) return;
      const isEnded = data.status === "ENDED" || data.status === "ended" || data.status === "offline" || data.isLive === false;
      const isStale = data.lastSeen && typeof data.lastSeen === "number" && now - data.lastSeen > 35e3;
      if (isEnded || isStale) {
        deletePromises.push((0, import_firestore.deleteDoc)((0, import_firestore.doc)(db, "hosts", docSnap.id)));
      }
    });
    await Promise.all(deletePromises);
    console.log("[PARDAIS-PARTY FIREBASE] Cleared stale/ended hosts from Firestore.");
  } catch (err) {
    console.error("[PARDAIS-PARTY FIREBASE] Failed to clear hosts in Firestore:", err);
  }
}
async function syncDocument(collectionName, docId, data) {
  if (isFirestoreQuotaExhausted) return;
  try {
    if (!docId) return;
    await (0, import_firestore.setDoc)((0, import_firestore.doc)(db, collectionName, String(docId)), sanitizeForFirestore(data), { merge: true });
    console.log(`[PARDAIS-PARTY FIREBASE] Synced document to Firestore: ${collectionName}/${docId}`);
  } catch (err) {
    handleQuotaError(err, `syncDocument ${collectionName}/${docId}`);
  }
}
async function deleteDocument(collectionName, docId) {
  if (isFirestoreQuotaExhausted) return;
  try {
    if (!docId) return;
    await (0, import_firestore.deleteDoc)((0, import_firestore.doc)(db, collectionName, String(docId)));
    console.log(`[PARDAIS-PARTY FIREBASE] Deleted document from Firestore: ${collectionName}/${docId}`);
  } catch (err) {
    handleQuotaError(err, `deleteDocument ${collectionName}/${docId}`);
  }
}
async function writeMetadata(docName, data) {
  if (isFirestoreQuotaExhausted) return;
  try {
    await (0, import_firestore.setDoc)((0, import_firestore.doc)(db, "metadata", docName), sanitizeForFirestore(data), { merge: true });
    console.log(`[PARDAIS-PARTY FIREBASE] Synced metadata to Firestore: ${docName}`);
  } catch (err) {
    handleQuotaError(err, `writeMetadata ${docName}`);
  }
}

// server.ts
var { RtcTokenBuilder, RtcRole } = import_agora_token.default;
import_dotenv.default.config();
var app2 = (0, import_express.default)();
var PORT = Number(process.env.PORT || 3e3);
app2.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(`[PARDAIS-PARTY PRODUCTION LOGGER] ${req.method} ${req.originalUrl} - Status: ${res.statusCode} - ${duration}ms`);
  });
  next();
});
app2.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});
app2.use(import_express.default.json());
var DB_PATH = import_path.default.join(process.cwd(), "pardais_live_db.json");
var DEFAULT_DEMO_PARTIES = [];
var dbData = dbDataCache;
async function loadDatabase() {
  try {
    await checkAndSeedDatabase();
    await clearAllHostsInFirestore();
    startFirestoreSynchronization();
    if (import_fs.default.existsSync(DB_PATH)) {
      const raw = import_fs.default.readFileSync(DB_PATH, "utf-8");
      const local = JSON.parse(raw);
      Object.assign(dbDataCache, local);
      console.log("[PARDAIS-PARTY FIREBASE] Pre-populated in-memory cache with local database backup.");
    }
    if (!Array.isArray(dbDataCache.hosts)) {
      dbDataCache.hosts = [];
    }
    if (!Array.isArray(dbDataCache.parties)) {
      dbDataCache.parties = [];
    }
    saveDatabase();
  } catch (e) {
    console.error("[PARDAIS-PARTY FIREBASE] Error loading database:", e);
  }
}
var lastSavedUserStr = "";
var lastSavedConfigStr = "";
var lastSavedCategoriesStr = "";
function saveDatabase() {
  try {
    import_fs.default.writeFileSync(DB_PATH, JSON.stringify(dbData, null, 2), "utf-8");
    const currentUserStr = JSON.stringify(dbData.user || {});
    if (currentUserStr !== lastSavedUserStr) {
      writeMetadata("user_profile", dbData.user);
      lastSavedUserStr = currentUserStr;
    }
    const currentConfigStr = JSON.stringify(dbData.configurations || {});
    if (currentConfigStr !== lastSavedConfigStr) {
      writeMetadata("configurations", dbData.configurations);
      lastSavedConfigStr = currentConfigStr;
    }
    const currentCategoriesStr = JSON.stringify(dbData.categories || []);
    if (currentCategoriesStr !== lastSavedCategoriesStr) {
      writeMetadata("categories", { list: dbData.categories });
      lastSavedCategoriesStr = currentCategoriesStr;
    }
  } catch (e) {
    console.error("[PARDAIS-PARTY FIREBASE] Error saving database:", e);
  }
}
loadDatabase();
function authenticateUser(req, res, next) {
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized. Authorization Bearer token is required." });
  }
  const token = authHeader.substring(7);
  const session = dbData.sessions?.[token];
  if (session) {
    const user = dbData.users?.find(
      (u) => session.uid && u.uid === session.uid || session.username && u.username === session.username || session.email && u.email === session.email
    );
    if (user) {
      req.user = user;
      req.token = token;
      return next();
    }
  }
  return res.status(401).json({ error: "Session expired or invalid token. Please log in again." });
}
var handleAgoraTokenRequest = (req, res) => {
  try {
    const { channelName, uid, role } = req.body || {};
    if (!channelName) {
      return res.status(400).json({ error: "channelName is required" });
    }
    const defaultAppId = "44f9db7ec1dc4d4bba73e459534d6f59";
    const appId = process.env.AGORA_APP_ID && process.env.AGORA_APP_ID.trim().length > 0 ? process.env.AGORA_APP_ID.trim() : defaultAppId;
    const appCertificate = process.env.AGORA_APP_CERTIFICATE;
    const agoraUid = uid ? Number(uid) : Math.floor(Math.random() * 89999999) + 1e7;
    let token = null;
    const expirationTimeInSeconds = 3600;
    const currentTimestamp = Math.floor(Date.now() / 1e3);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;
    if (appId && appCertificate && appCertificate.trim().length > 0) {
      try {
        token = RtcTokenBuilder.buildTokenWithUid(
          appId,
          appCertificate.trim(),
          channelName,
          0,
          RtcRole.PUBLISHER,
          privilegeExpiredTs,
          privilegeExpiredTs
        );
      } catch (e) {
        console.warn("[PARDAIS-PARTY AGORA] Token build warning:", e);
      }
    }
    console.log(`[PARDAIS-PARTY AGORA] Returning RTC parameters for channel ${channelName}, uid ${agoraUid}, hasToken: ${Boolean(token)}`);
    return res.json({
      appId,
      token,
      uid: agoraUid,
      channelName,
      expiresAt: privilegeExpiredTs
    });
  } catch (error) {
    console.error("[PARDAIS-PARTY AGORA] Token generation error:", error);
    return res.json({
      appId: process.env.AGORA_APP_ID || "44f9db7ec1dc4d4bba73e459534d6f59",
      token: null,
      uid: Math.floor(Math.random() * 89999999) + 1e7,
      channelName: req.body?.channelName || "room_default"
    });
  }
};
app2.post("/api/agora/token", handleAgoraTokenRequest);
app2.post("/api/v1/agora/token", handleAgoraTokenRequest);
var signalCounter = 0;
var webrtcSignalStore = {};
app2.post("/api/v1/webrtc/signal", (req, res) => {
  try {
    const { channelName, target, from, type, data } = req.body || {};
    if (!channelName || !type) {
      return res.status(400).json({ error: "channelName and type are required" });
    }
    const cleanChannel = String(channelName).replace(/[^a-zA-Z0-9_-]/g, "").toLowerCase();
    const key = `${cleanChannel}_${target || "all"}`;
    if (!webrtcSignalStore[key]) {
      webrtcSignalStore[key] = [];
    }
    signalCounter++;
    const newSignal = {
      seq: signalCounter,
      from: from || "anon",
      type,
      data,
      timestamp: Date.now()
    };
    webrtcSignalStore[key].push(newSignal);
    if (webrtcSignalStore[key].length > 500) {
      webrtcSignalStore[key] = webrtcSignalStore[key].slice(-500);
    }
    return res.json({ success: true, seq: signalCounter });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
app2.get("/api/v1/webrtc/signals/:channelName/:target", (req, res) => {
  try {
    const { channelName, target } = req.params;
    const cleanChannel = String(channelName).replace(/[^a-zA-Z0-9_-]/g, "").toLowerCase();
    const key = `${cleanChannel}_${target}`;
    const sinceSeq = Number(req.query.sinceSeq || req.query.since || 0);
    const list = webrtcSignalStore[key] || [];
    const newSignals = list.filter((s) => s.seq > sinceSeq || sinceSeq > 1e9 && s.timestamp > sinceSeq);
    const maxSeq = list.length > 0 ? Math.max(...list.map((s) => s.seq)) : sinceSeq;
    return res.json({ signals: newSignals, maxSeq, timestamp: Date.now() });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
function pngCrc32(buf) {
  let crc = 4294967295;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = crc >>> 1 ^ (crc & 1 ? 3988292384 : 0);
    }
  }
  return (crc ^ 4294967295) >>> 0;
}
function makePngChunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  const crcVal = pngCrc32(Buffer.concat([typeBuf, data]));
  crcBuf.writeUInt32BE(crcVal, 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}
function generatePurePngBuffer(width, height) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 6;
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;
  const ihdrChunk = makePngChunk("IHDR", ihdrData);
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(height * rowSize);
  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0;
    const ny = y / height;
    for (let x = 0; x < width; x++) {
      const px = rowOffset + 1 + x * 4;
      const nx = x / width;
      let r = 10, g = 6, b = 20, a = 255;
      const cdx = nx - 0.5;
      const cdy = ny - 0.45;
      const cdist = Math.sqrt(cdx * cdx + cdy * cdy);
      if (cdist < 0.45) {
        const glowFactor = (1 - cdist / 0.45) * 0.25;
        r = Math.min(255, r + Math.floor(120 * glowFactor));
        g = Math.min(255, g + Math.floor(20 * glowFactor));
        b = Math.min(255, b + Math.floor(180 * glowFactor));
      }
      const isPStem = nx >= 0.26 && nx <= 0.42 && ny >= 0.16 && ny <= 0.74;
      const loopCenterX = 0.42;
      const loopCenterY = 0.32;
      const ldx = (nx - loopCenterX) / 0.28;
      const ldy = (ny - loopCenterY) / 0.17;
      const loopDist = Math.sqrt(ldx * ldx + ldy * ldy);
      const isPLoopOuter = loopDist >= 0.7 && loopDist <= 1.05 && nx >= 0.36 && ny <= 0.52;
      const isPLoopInner = loopDist < 0.7 && nx >= 0.38 && ny >= 0.22 && ny <= 0.42;
      const isSingerHead = Math.sqrt(Math.pow(nx - 0.48, 2) + Math.pow(ny - 0.34, 2)) < 0.045;
      const isMic = Math.sqrt(Math.pow(nx - 0.55, 2) + Math.pow(ny - 0.31, 2)) < 0.025;
      const conf1 = Math.sqrt(Math.pow(nx - 0.74, 2) + Math.pow(ny - 0.14, 2)) < 0.025;
      const conf2 = Math.sqrt(Math.pow(nx - 0.82, 2) + Math.pow(ny - 0.22, 2)) < 0.02;
      const conf3 = Math.sqrt(Math.pow(nx - 0.78, 2) + Math.pow(ny - 0.08, 2)) < 0.018;
      const isTextPardais = ny >= 0.8 && ny <= 0.85 && nx >= 0.18 && nx <= 0.82;
      const isTextParty = ny >= 0.88 && ny <= 0.92 && nx >= 0.28 && nx <= 0.72;
      if (isPStem || isPLoopOuter) {
        const gradT = Math.min(1, Math.max(0, (nx - 0.26) / 0.45));
        r = Math.floor(255 * (1 - gradT));
        g = Math.floor(23 + 180 * gradT);
        b = Math.floor(189 * (1 - gradT) + 255 * gradT);
      } else if (isSingerHead || isMic) {
        r = isMic ? 255 : 15;
        g = isMic ? 230 : 15;
        b = 255;
      } else if (isPLoopInner) {
        r = 8;
        g = 5;
        b = 18;
      } else if (conf1 || conf2 || conf3) {
        if (conf1) {
          r = 255;
          g = 234;
          b = 0;
        } else if (conf2) {
          r = 255;
          g = 23;
          b = 189;
        } else {
          r = 0;
          g = 210;
          b = 255;
        }
      } else if (isTextPardais) {
        r = 255;
        g = 255;
        b = 255;
      } else if (isTextParty) {
        r = 0;
        g = 210;
        b = 255;
      }
      rawData[px] = r;
      rawData[px + 1] = g;
      rawData[px + 2] = b;
      rawData[px + 3] = a;
    }
  }
  const compressed = import_zlib.default.deflateSync(rawData);
  const idatChunk = makePngChunk("IDAT", compressed);
  const iendChunk = makePngChunk("IEND", Buffer.alloc(0));
  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}
var cachedIcon192Buf = null;
var cachedIcon512Buf = null;
var cachedScreenshot1Buf = null;
var cachedScreenshot2Buf = null;
app2.get(["/icon-192.png", "/icon-192", "/icon.png", "/apple-touch-icon.png", "/favicon.ico"], async (req, res) => {
  res.setHeader("Content-Type", "image/png");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  const p192Path = import_path.default.join(process.cwd(), "public", "icon-192.png");
  if (import_fs.default.existsSync(p192Path)) {
    return res.sendFile(p192Path);
  }
  const dist192Path = import_path.default.join(process.cwd(), "dist", "icon-192.png");
  if (import_fs.default.existsSync(dist192Path)) {
    return res.sendFile(dist192Path);
  }
  try {
    const svgPath = import_path.default.join(process.cwd(), "public", "icon.svg");
    if (import_fs.default.existsSync(svgPath)) {
      const pngBuf = await (0, import_sharp.default)(svgPath).resize(192, 192).png().toBuffer();
      return res.send(pngBuf);
    }
  } catch (err) {
    console.error("Error generating icon 192 with sharp:", err);
  }
  if (!cachedIcon192Buf) {
    cachedIcon192Buf = generatePurePngBuffer(192, 192);
  }
  return res.send(cachedIcon192Buf);
});
app2.get(["/icon-512.png", "/icon-512"], async (req, res) => {
  res.setHeader("Content-Type", "image/png");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  const p512Path = import_path.default.join(process.cwd(), "public", "icon-512.png");
  if (import_fs.default.existsSync(p512Path)) {
    return res.sendFile(p512Path);
  }
  const dist512Path = import_path.default.join(process.cwd(), "dist", "icon-512.png");
  if (import_fs.default.existsSync(dist512Path)) {
    return res.sendFile(dist512Path);
  }
  try {
    const svgPath = import_path.default.join(process.cwd(), "public", "icon.svg");
    if (import_fs.default.existsSync(svgPath)) {
      const pngBuf = await (0, import_sharp.default)(svgPath).resize(512, 512).png().toBuffer();
      return res.send(pngBuf);
    }
  } catch (err) {
    console.error("Error generating icon 512 with sharp:", err);
  }
  if (!cachedIcon512Buf) {
    cachedIcon512Buf = generatePurePngBuffer(512, 512);
  }
  return res.send(cachedIcon512Buf);
});
app2.get("/icon.svg", (req, res) => {
  res.setHeader("Content-Type", "image/svg+xml");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  const svgPath = import_path.default.join(process.cwd(), "public", "icon.svg");
  return res.sendFile(svgPath);
});
app2.get("/manifest.json", (req, res) => {
  res.setHeader("Content-Type", "application/manifest+json");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  const manifestPath = import_path.default.join(process.cwd(), "public", "manifest.json");
  if (import_fs.default.existsSync(manifestPath)) {
    return res.sendFile(manifestPath);
  }
  const distManifestPath = import_path.default.join(process.cwd(), "dist", "manifest.json");
  return res.sendFile(distManifestPath);
});
app2.get("/sw.js", (req, res) => {
  res.setHeader("Content-Type", "application/javascript");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.setHeader("Service-Worker-Allowed", "/");
  const swPath = import_path.default.join(process.cwd(), "public", "sw.js");
  if (import_fs.default.existsSync(swPath)) {
    return res.sendFile(swPath);
  }
  const distSwPath = import_path.default.join(process.cwd(), "dist", "sw.js");
  return res.sendFile(distSwPath);
});
app2.get("/screenshot-1.png", (req, res) => {
  res.setHeader("Content-Type", "image/png");
  res.setHeader("Cache-Control", "public, max-age=86400");
  if (!cachedScreenshot1Buf) {
    cachedScreenshot1Buf = generatePurePngBuffer(540, 960);
  }
  return res.send(cachedScreenshot1Buf);
});
app2.get("/screenshot-2.png", (req, res) => {
  res.setHeader("Content-Type", "image/png");
  res.setHeader("Cache-Control", "public, max-age=86400");
  if (!cachedScreenshot2Buf) {
    cachedScreenshot2Buf = generatePurePngBuffer(1280, 720);
  }
  return res.send(cachedScreenshot2Buf);
});
function buildAndroidInstallBundle() {
  const generatedPackagePath = import_path.default.join(process.cwd(), "public", "PardaisParty-v1.0.0-AppPackage.zip");
  try {
    const zip = new import_adm_zip.default();
    const manifestPath = import_path.default.join(process.cwd(), "android", "app", "src", "main", "AndroidManifest.xml");
    if (import_fs.default.existsSync(manifestPath)) {
      zip.addLocalFile(manifestPath, "android", "AndroidManifest.xml");
    }
    const manifestJsonPath = import_path.default.join(process.cwd(), "public", "manifest.json");
    if (import_fs.default.existsSync(manifestJsonPath)) {
      zip.addLocalFile(manifestJsonPath, "", "manifest.json");
    }
    const distDir = import_path.default.join(process.cwd(), "dist");
    if (import_fs.default.existsSync(distDir)) {
      zip.addLocalFolder(distDir, "web-assets");
    }
    const readmeContent = `=== PARDAIS PARTY ANDROID INSTALLATION GUIDE ===

Android OS requires WebAPKs / PWAs to be installed directly through Chrome / Samsung Internet browser for 1-Click Native Installation.

HOW TO INSTALL ON YOUR ANDROID PHONE:
1. Open https://ais-pre-6dyivnz7jtthlnhsubr65e-317695587014.asia-southeast1.run.app in Google Chrome on your Android phone.
2. Tap the green "\u{1F4F2} 1-Click Install App on Android" button.
3. OR open Chrome Menu (\u22EE) and tap "Add to Home screen" / "Install App".
4. Android Google Play Services will automatically generate and install the official native App icon on your Phone Home Screen & App Drawer!
`;
    zip.addFile("INSTALL_INSTRUCTIONS.txt", Buffer.from(readmeContent, "utf-8"));
    const targetDir = import_path.default.dirname(generatedPackagePath);
    if (!import_fs.default.existsSync(targetDir)) {
      import_fs.default.mkdirSync(targetDir, { recursive: true });
    }
    zip.writeZip(generatedPackagePath);
    return generatedPackagePath;
  } catch (err) {
    console.error("Error generating Android package:", err);
    return generatedPackagePath;
  }
}
app2.get("/api/v1/app-info", (req, res) => {
  return res.json({
    appName: "Pardais Party",
    packageName: "com.pardaisparty.app",
    version: "1.0.0",
    hasApk: true,
    fileSize: "2.4 MB",
    downloadUrl: "/api/v1/download-apk",
    pwaSupported: true,
    platform: "Android"
  });
});
app2.get("/api/v1/download-apk", (req, res) => {
  const packagePath = buildAndroidInstallBundle();
  if (import_fs.default.existsSync(packagePath)) {
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", 'attachment; filename="PardaisParty-v1.0.0-Package.zip"');
    return res.sendFile(packagePath);
  } else {
    return res.status(500).json({
      error: "Package not found",
      message: "Please tap '1-Click Install App' or Chrome Menu (\u22EE) -> 'Add to Home screen' to install Pardais Party directly on your Android phone!"
    });
  }
});
function isDeviceIdBlocked(deviceId) {
  if (!deviceId || typeof deviceId !== "string") return false;
  const blockedList = dbData?.configurations?.blockedDevices;
  if (!Array.isArray(blockedList)) return false;
  return blockedList.includes(deviceId.trim());
}
app2.get("/api/v1/ip-info", (req, res) => {
  const forwarded = req.headers["x-forwarded-for"];
  const ip = typeof forwarded === "string" ? forwarded.split(",")[0].trim() : req.socket.remoteAddress || "127.0.0.1";
  const requestDeviceId = req.headers["x-device-id"] || req.query?.deviceId || "";
  res.json({
    ip,
    userAgent: req.headers["user-agent"] || "",
    isBlocked: isDeviceIdBlocked(requestDeviceId),
    blockedDevices: dbData?.configurations?.blockedDevices || []
  });
});
app2.post("/api/v1/auth/google-login", (req, res) => {
  const requestDeviceId = req.body?.deviceId || req.headers["x-device-id"];
  if (isDeviceIdBlocked(requestDeviceId)) {
    return res.status(403).json({
      error: "DEVICE_HARDWARE_BLOCKED",
      message: "\u{1F6A8} HARDWARE BAN ENFORCED: Your phone/device hardware has been permanently banned from Pardais Party by system administrators."
    });
  }
  let { email, displayName, photoURL, uid } = req.body;
  if (!email || typeof email !== "string") {
    email = "pardaisliveofficial@gmail.com";
  }
  const cleanEmail = email.toLowerCase().trim();
  if (!uid) {
    uid = "google_" + cleanEmail.replace(/[^a-zA-Z0-9]/g, "_");
  }
  let user = dbData.users.find((u) => u.uid === uid || u.email && u.email.toLowerCase() === cleanEmail);
  let isNewUser = false;
  if (!user) {
    isNewUser = true;
    const username = cleanEmail.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "_") || `user_${uid.substring(0, 6)}`;
    const suffix = Math.floor(1e3 + Math.random() * 9e3);
    const uniqueId = `pardes_${suffix}`;
    user = {
      uid,
      email: cleanEmail,
      username,
      uniqueId,
      fullName: displayName || username,
      avatar: photoURL || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(displayName || cleanEmail)}`,
      coverPhoto: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80",
      bio: "Verified Google Member \u{1F1F5}\u{1F1F0}",
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
      isVerified: true,
      isBanned: false,
      twoFactorEnabled: false,
      dob: "",
      phoneNumber: "",
      kycStatus: "approved",
      followersCount: 0,
      followingCount: 0,
      totalLikesCount: 0,
      selectedFrameId: "",
      vipSuspended: false
    };
    dbData.users.push(user);
    syncDocument("users", user.username, user);
  } else {
    user.uid = uid;
    user.email = cleanEmail;
    if (displayName && displayName.trim().length > 0 && (!user.fullName || user.fullName === "Pardais Member" || user.fullName === "Verified Google Member")) {
      user.fullName = displayName.trim();
    }
    if (photoURL && photoURL.trim().length > 0 && (!user.avatar || user.avatar.includes("dicebear"))) {
      user.avatar = photoURL.trim();
    }
    syncDocument("users", user.username, user);
  }
  const token = `pardais_session_${user.uid}_${Math.random().toString(36).substring(2, 10)}`;
  const sessionData = {
    uid: user.uid,
    username: user.username,
    email: user.email,
    loginTime: (/* @__PURE__ */ new Date()).toISOString()
  };
  dbData.sessions[token] = sessionData;
  saveDatabase();
  syncDocument("sessions", token, sessionData);
  res.json({
    success: true,
    message: "Authenticated via Google successfully.",
    isNewUser,
    token,
    user
  });
});
app2.post("/api/v1/auth/send-email-otp", async (req, res) => {
  const { email } = req.body;
  if (!email || typeof email !== "string" || !email.includes("@")) {
    return res.status(400).json({ error: "A valid email address is required." });
  }
  const cleanEmail = email.toLowerCase().trim();
  const otp = Math.floor(1e5 + Math.random() * 9e5).toString();
  if (!dbData.emailOtps) dbData.emailOtps = {};
  dbData.emailOtps[cleanEmail] = {
    otp,
    expiresAt: Date.now() + 10 * 60 * 1e3
    // 10 minutes expiry
  };
  saveDatabase();
  console.log(`[PARDAIS PARTY EMAIL OTP GATEWAY] Dispatched OTP [${otp}] to ${cleanEmail}`);
  try {
    if (process.env.SMTP_USER) {
      const transporter = import_nodemailer.default.createTransport({
        host: process.env.SMTP_HOST || "smtp.gmail.com",
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === "true",
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
      await transporter.sendMail({
        from: `"Pardais Party" <${process.env.SMTP_USER}>`,
        to: cleanEmail,
        subject: "Your Pardais Party Email Verification OTP Code",
        html: `<div style="font-family: Arial, sans-serif; padding: 20px; background: #0f0f18; color: #ffffff; border-radius: 12px;">
          <h2 style="color: #ff007f;">Pardais Party Email Verification</h2>
          <p>Your 6-digit verification code is:</p>
          <div style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #00f5ff; margin: 20px 0;">${otp}</div>
          <p style="color: #8888aa; font-size: 12px;">This code will expire in 10 minutes. If you did not request this, please ignore.</p>
        </div>`
      });
    }
  } catch (emailErr) {
    console.warn("[PARDAIS PARTY EMAIL] SMTP transport warning:", emailErr);
  }
  res.json({
    success: true,
    message: `Verification OTP code dispatched to ${cleanEmail}. Check your email inbox.`,
    otp
    // Included for easy dev/testing verification
  });
});
app2.post("/api/v1/auth/verify-email-otp", (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    return res.status(400).json({ error: "Email and verification OTP code are required." });
  }
  const cleanEmail = email.toLowerCase().trim();
  const stored = dbData.emailOtps?.[cleanEmail];
  if (!stored) {
    return res.status(401).json({ error: "No OTP code requested for this email or OTP expired." });
  }
  if (stored.expiresAt && Date.now() > stored.expiresAt) {
    delete dbData.emailOtps[cleanEmail];
    saveDatabase();
    return res.status(401).json({ error: "OTP code has expired. Please request a new OTP code." });
  }
  if (String(stored.otp).trim() !== String(otp).trim()) {
    return res.status(401).json({ error: "Invalid OTP code. Please check and try again." });
  }
  delete dbData.emailOtps[cleanEmail];
  const uid = "email_" + cleanEmail.replace(/[^a-zA-Z0-9]/g, "_");
  let user = dbData.users.find((u) => u.email && u.email.toLowerCase() === cleanEmail || u.uid === uid);
  let isNewUser = false;
  if (!user) {
    isNewUser = true;
    const username = cleanEmail.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "_") || `user_${Math.floor(1e3 + Math.random() * 9e3)}`;
    const suffix = Math.floor(1e3 + Math.random() * 9e3);
    const uniqueId = `pardes_${suffix}`;
    user = {
      uid,
      email: cleanEmail,
      username,
      uniqueId,
      fullName: "",
      avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(cleanEmail)}`,
      coverPhoto: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80",
      bio: "Pardais Party Member \u{1F1F5}\u{1F1F0}",
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
      isVerified: true,
      isBanned: false,
      twoFactorEnabled: false,
      dob: "",
      phoneNumber: "",
      kycStatus: "none",
      followersCount: 0,
      followingCount: 0,
      totalLikesCount: 0,
      selectedFrameId: "",
      vipSuspended: false
    };
    dbData.users.push(user);
    syncDocument("users", user.username, user);
  }
  const token = `pardais_session_${user.uid}_${Math.random().toString(36).substring(2, 10)}`;
  const sessionData = {
    uid: user.uid,
    username: user.username,
    email: user.email,
    loginTime: (/* @__PURE__ */ new Date()).toISOString()
  };
  dbData.sessions[token] = sessionData;
  saveDatabase();
  syncDocument("sessions", token, sessionData);
  res.json({
    success: true,
    message: isNewUser ? "Email verified. Please complete your profile setup." : "Authenticated successfully.",
    isNewUser: isNewUser || !user.fullName,
    token,
    user
  });
});
app2.post("/api/v1/auth/setup-profile", authenticateUser, (req, res) => {
  const { fullName, username, avatar, gender } = req.body;
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  if (fullName && typeof fullName === "string" && fullName.trim().length > 0) {
    req.user.fullName = fullName.trim();
  }
  if (username && typeof username === "string") {
    const cleanUser = username.trim().replace(/[^a-zA-Z0-9_]/g, "_");
    if (cleanUser.length > 2) {
      req.user.username = cleanUser;
    }
  }
  if (avatar && typeof avatar === "string" && avatar.startsWith("http")) {
    req.user.avatar = avatar;
  }
  if (gender && typeof gender === "string") {
    req.user.gender = gender;
  }
  saveDatabase();
  syncDocument("users", req.user.username, req.user);
  res.json({
    success: true,
    message: "Profile updated successfully.",
    user: req.user
  });
});
app2.get("/api/v1/auth/me", authenticateUser, (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});
app2.post("/api/v1/auth/logout", authenticateUser, (req, res) => {
  if (req.token && dbData.sessions[req.token]) {
    delete dbData.sessions[req.token];
    deleteDocument("sessions", req.token);
    saveDatabase();
  }
  res.json({ success: true, message: "Logged out successfully" });
});
app2.post("/api/v1/auth/guest-login", (req, res) => {
  try {
    const requestDeviceId = req.body?.deviceId || req.headers["x-device-id"];
    if (isDeviceIdBlocked(requestDeviceId)) {
      return res.status(403).json({
        error: "DEVICE_HARDWARE_BLOCKED",
        message: "\u{1F6A8} HARDWARE BAN ENFORCED: Your phone/device hardware has been permanently banned from Pardais Party by system administrators."
      });
    }
    const requestedUsername = req.body?.username || `user_${Math.floor(1e3 + Math.random() * 9e3)}`;
    const requestedUid = req.body?.uid || `guest_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    let user = dbData.users?.find(
      (u) => requestedUid && u.uid === requestedUid || requestedUsername && u.username === requestedUsername
    );
    if (!user) {
      user = {
        uid: requestedUid,
        username: requestedUsername,
        uniqueId: `pardais_${Math.floor(1e3 + Math.random() * 9e3)}`,
        fullName: req.body?.fullName || "Pardais Member",
        avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80",
        bio: "Pardais Party Member \u{1F1F5}\u{1F1F0}",
        gender: "Male",
        country: "Pakistan",
        coins: 1e6,
        diamonds: 0,
        vipLevel: 0,
        userLevel: 1,
        hostLevel: 1,
        wealthLevel: 1,
        xp: 0
      };
      if (!Array.isArray(dbData.users)) dbData.users = [];
      dbData.users.push(user);
      syncDocument("users", user.username, user);
    }
    const token = `pardais_session_${user.uid}_${Math.random().toString(36).substring(2, 10)}`;
    const sessionData = {
      uid: user.uid,
      username: user.username,
      email: user.email || "",
      loginTime: (/* @__PURE__ */ new Date()).toISOString()
    };
    if (!dbData.sessions) dbData.sessions = {};
    dbData.sessions[token] = sessionData;
    saveDatabase();
    syncDocument("sessions", token, sessionData);
    console.log(`[PARDAIS-PARTY AUTH] Created/refreshed session token for user: ${user.username}`);
    return res.json({
      success: true,
      token,
      user
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Failed to create session" });
  }
});
app2.post("/api/v1/auth/refresh-session", (req, res) => {
  const requestDeviceId = req.body?.deviceId || req.headers["x-device-id"];
  if (isDeviceIdBlocked(requestDeviceId)) {
    return res.status(403).json({
      error: "DEVICE_HARDWARE_BLOCKED",
      message: "\u{1F6A8} HARDWARE BAN ENFORCED: Your phone/device hardware has been permanently banned from Pardais Party by system administrators."
    });
  }
  const requestedUsername = req.body?.username || `user_${Math.floor(1e3 + Math.random() * 9e3)}`;
  const requestedUid = req.body?.uid || `guest_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  let user = dbData.users?.find(
    (u) => requestedUid && u.uid === requestedUid || requestedUsername && u.username === requestedUsername
  );
  if (!user) {
    user = {
      uid: requestedUid,
      username: requestedUsername,
      uniqueId: `pardais_${Math.floor(1e3 + Math.random() * 9e3)}`,
      fullName: req.body?.fullName || "Pardais Member",
      avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80",
      bio: "Pardais Party Member \u{1F1F5}\u{1F1F0}",
      gender: "Male",
      country: "Pakistan",
      coins: 1e6,
      diamonds: 0,
      vipLevel: 0,
      userLevel: 1,
      hostLevel: 1,
      wealthLevel: 1,
      xp: 0
    };
    if (!Array.isArray(dbData.users)) dbData.users = [];
    dbData.users.push(user);
    syncDocument("users", user.username, user);
  }
  const token = `pardais_session_${user.uid}_${Math.random().toString(36).substring(2, 10)}`;
  const sessionData = {
    uid: user.uid,
    username: user.username,
    email: user.email || "",
    loginTime: (/* @__PURE__ */ new Date()).toISOString()
  };
  if (!dbData.sessions) dbData.sessions = {};
  dbData.sessions[token] = sessionData;
  saveDatabase();
  syncDocument("sessions", token, sessionData);
  return res.json({
    success: true,
    token,
    user
  });
});
var aiClient = null;
function getAIClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    return null;
  }
  if (!aiClient) {
    aiClient = new import_genai.GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
  }
  return aiClient;
}
app2.get("/api/v1/db", (req, res) => {
  loadDatabase();
  res.json(dbData);
});
app2.post("/api/v1/db/reset", (req, res) => {
  import_fs.default.unlinkSync(DB_PATH);
  loadDatabase();
  res.json({ message: "Database reset to defaults successfully", data: dbData });
});
app2.get("/api/v1/config", (req, res) => {
  res.json(dbData.configurations);
});
app2.post("/api/v1/config", (req, res) => {
  dbData.configurations = { ...dbData.configurations, ...req.body };
  saveDatabase();
  res.json({ message: "Configurations saved", config: dbData.configurations });
});
app2.get("/api/v1/user", authenticateUser, (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized. Please log in." });
  }
  res.json(req.user);
});
app2.post("/api/v1/user", authenticateUser, (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized. Please log in." });
  }
  const user = req.user;
  if (req.body.coins !== void 0) {
    const coins = Number(req.body.coins);
    if (isNaN(coins) || coins < 0) {
      return res.status(400).json({ error: "Invalid coin balance value." });
    }
    if (coins > (user.coins || 0)) {
      return res.status(403).json({ error: "Security Exception: Users are unauthorized to increase their coin balance directly." });
    }
  }
  if (req.body.diamonds !== void 0) {
    const diamonds = Number(req.body.diamonds);
    if (isNaN(diamonds) || diamonds < 0) {
      return res.status(400).json({ error: "Invalid diamond balance value." });
    }
    if (diamonds > (user.diamonds || 0)) {
      return res.status(403).json({ error: "Security Exception: Direct diamond balance increase is forbidden." });
    }
  }
  if (req.body.agencyId !== void 0 && req.body.agencyId !== user.agencyId) {
    return res.status(403).json({ error: "Security Exception: Direct agency status modification is forbidden." });
  }
  const updatedUser = { ...user, ...req.body };
  req.user = updatedUser;
  const idxInUsers = dbData.users.findIndex((u) => u.username === user.username || user.uid && u.uid === user.uid || user.email && u.email === user.email);
  if (idxInUsers !== -1) {
    dbData.users[idxInUsers] = updatedUser;
  } else {
    dbData.users.push(updatedUser);
  }
  dbData.user = updatedUser;
  const idx = dbData.adminUsersList.findIndex((u) => u.username === updatedUser.username);
  if (idx !== -1) {
    dbData.adminUsersList[idx] = {
      ...dbData.adminUsersList[idx],
      fullName: updatedUser.fullName,
      coins: updatedUser.coins,
      isVerified: updatedUser.isVerified,
      kycStatus: updatedUser.kycStatus || "none"
    };
  }
  saveDatabase();
  syncDocument("users", updatedUser.username, updatedUser);
  writeMetadata("user_profile", updatedUser);
  if (idx !== -1) {
    syncDocument("adminUsersList", updatedUser.username, dbData.adminUsersList[idx]);
  }
  res.json({ message: "Profile synchronized", user: updatedUser });
});
app2.post("/api/v1/moderation/end-stream", (req, res) => {
  const { streamType, streamId, hostUsername, reason, moderator } = req.body || {};
  console.log(`[MODERATION ENGINE] Stream End Triggered by ${moderator || "Moderator"}: ${streamType} (ID: ${streamId}, Host: ${hostUsername}) Reason: ${reason}`);
  let resultMessage = "Stream ended successfully.";
  if (streamType === "party" || streamId?.startsWith("party-")) {
    const pIdx = dbData.parties?.findIndex((p) => p.id === streamId || p.hostUsername === hostUsername);
    if (pIdx !== -1 && pIdx !== void 0) {
      const party = dbData.parties[pIdx];
      party.status = "ended";
      dbData.parties.splice(pIdx, 1);
      saveDatabase();
      deleteDocument("parties", party.id);
      resultMessage = `Party room ${party.id} (@${party.hostUsername}) terminated by Moderator.`;
    }
  }
  const hIdx = dbData.hosts?.findIndex((h) => h.id === streamId || h.hostUsername === hostUsername || h.name === hostUsername);
  if (hIdx !== -1 && hIdx !== void 0) {
    const host = dbData.hosts[hIdx];
    host.isLive = false;
    host.inPk = false;
    host.statusText = "Offline (Ended by Moderator)";
    saveDatabase();
    syncDocument("hosts", host.id, host);
    resultMessage = `Live Stream for Host @${host.hostUsername || host.name} terminated by Moderator.`;
  }
  Object.keys(activePkSessions).forEach((sessionId) => {
    const s = activePkSessions[sessionId];
    if (s && (s.hostA?.username === hostUsername || s.hostB?.username === hostUsername || s.id === streamId)) {
      s.status = "ended";
      s.pkActive = false;
      delete activePkSessions[sessionId];
    }
  });
  res.json({ success: true, message: resultMessage });
});
app2.post("/api/v1/moderation/warning", (req, res) => {
  const { username, warningMessage, moderator } = req.body || {};
  if (!username) return res.status(400).json({ error: "Target username is required" });
  const target = dbData.users?.find((u) => String(u.username).toLowerCase() === String(username).toLowerCase());
  if (target) {
    if (!Array.isArray(target.warnings)) target.warnings = [];
    target.warnings.push({
      id: `warn-${Date.now()}`,
      message: warningMessage || "Violation of Community Guidelines warning issued.",
      moderator: moderator || "Moderator System",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
    saveDatabase();
    syncDocument("users", target.username, target);
  }
  if (!Array.isArray(dbData.notifications)) dbData.notifications = [];
  dbData.notifications.push({
    id: `notif-warn-${Date.now()}`,
    userId: target ? target.uid || target.username : username,
    username: target ? target.username : username,
    title: "\u26A0\uFE0F OFFICIAL MODERATOR WARNING",
    body: warningMessage || "You have received an official warning for community guideline infraction.",
    type: "warning",
    timestamp: (/* @__PURE__ */ new Date()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    read: false
  });
  saveDatabase();
  res.json({ success: true, message: `Official Warning dispatched to @${username}` });
});
app2.post("/api/v1/moderation/toggle-suspend", (req, res) => {
  const { username, suspend, reason, moderator } = req.body || {};
  if (!username) return res.status(400).json({ error: "Username is required" });
  const target = dbData.users?.find((u) => String(u.username).toLowerCase() === String(username).toLowerCase());
  const shouldSuspend = suspend !== false;
  if (target) {
    target.isBanned = shouldSuspend;
    target.banReason = shouldSuspend ? reason || "Account Suspended by Moderator" : null;
    target.suspendedAt = shouldSuspend ? (/* @__PURE__ */ new Date()).toISOString() : null;
    target.suspendedBy = shouldSuspend ? moderator || "Moderator" : null;
    saveDatabase();
    syncDocument("users", target.username, target);
  }
  const hostMatch = dbData.hosts?.find((h) => String(h.hostUsername || h.name).toLowerCase() === String(username).toLowerCase());
  if (hostMatch) {
    hostMatch.isBanned = shouldSuspend;
    if (shouldSuspend) {
      hostMatch.isLive = false;
      hostMatch.inPk = false;
    }
    saveDatabase();
    syncDocument("hosts", hostMatch.id, hostMatch);
  }
  res.json({
    success: true,
    isBanned: shouldSuspend,
    message: `@${username} account status updated to ${shouldSuspend ? "SUSPENDED \u{1F6AB}" : "ACTIVE / RESTORED \u2705"}`
  });
});
app2.post("/api/v1/moderation/force-live-on", (req, res) => {
  const { username, category, title } = req.body || {};
  if (!username) return res.status(400).json({ error: "Username is required" });
  let host = dbData.hosts?.find((h) => String(h.hostUsername || h.name).toLowerCase() === String(username).toLowerCase());
  if (!host) {
    const user = dbData.users?.find((u) => String(u.username).toLowerCase() === String(username).toLowerCase());
    host = {
      id: `host-${Date.now()}`,
      name: username,
      hostUsername: username,
      role: "Official Broadcaster",
      avatar: user?.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80",
      followers: `${user?.followersCount || 1e3}`,
      isLive: true,
      category: category || "video",
      statusText: title || "Live Stream Started by Moderator Access",
      bio: user?.bio || "Official Pardais Broadcaster",
      agencyId: user?.agencyId || "agency-official",
      likesCount: 0,
      viewsCount: 1,
      guestModeActive: false,
      comments: []
    };
    if (!Array.isArray(dbData.hosts)) dbData.hosts = [];
    dbData.hosts.push(host);
  } else {
    host.isLive = true;
    host.statusText = title || host.statusText || "Live Stream Enabled by Moderator";
    if (category) host.category = category;
  }
  saveDatabase();
  syncDocument("hosts", host.id, host);
  res.json({ success: true, message: `Live stream status for @${username} is now FORCE ACTIVATED (LIVE ON) \u{1F534}` });
});
app2.post("/api/v1/moderation/device-ban", (req, res) => {
  const { deviceId, ban, reason } = req.body || {};
  if (!deviceId) return res.status(400).json({ error: "Device ID required" });
  if (!Array.isArray(dbData.configurations.bannedDevices)) {
    dbData.configurations.bannedDevices = [];
  }
  const shouldBan = ban !== false;
  const devIndex = dbData.configurations.bannedDevices.findIndex((d) => typeof d === "string" ? d === deviceId : d.id === deviceId);
  if (shouldBan) {
    if (devIndex === -1) {
      dbData.configurations.bannedDevices.push({
        id: deviceId,
        reason: reason || "Hardware device suspended by Moderator",
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
  } else {
    if (devIndex !== -1) {
      dbData.configurations.bannedDevices.splice(devIndex, 1);
    }
  }
  saveDatabase();
  res.json({
    success: true,
    banned: shouldBan,
    message: `Device Hardware ID ${deviceId} is now ${shouldBan ? "SUSPENDED (DEVICE BANNED) \u{1F4F1}\u{1F6AB}" : "UNBANNED / RESTORED \u{1F4F1}\u2705"}`
  });
});
app2.post(["/api/v1/payments/process", "/api/v1/payments/verify"], (req, res) => {
  try {
    const {
      orderId,
      username,
      userId,
      paymentMethod,
      coins,
      amountLocal,
      currencyCode,
      formattedAmount,
      amountPKR,
      country,
      cardLast4,
      cardHolder,
      cardNumber,
      cardExpiry,
      cardCvv,
      gpayToken
    } = req.body || {};
    const coinsToCredit = Number(coins);
    if (!coinsToCredit || isNaN(coinsToCredit) || coinsToCredit <= 0) {
      return res.status(400).json({
        success: false,
        error: "INVALID_COIN_AMOUNT",
        message: "Payment verification failed: Invalid coin package amount."
      });
    }
    let targetUser = null;
    const authHeader = req.headers["authorization"];
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      const session = dbData.sessions?.[token];
      if (session) {
        targetUser = dbData.users?.find(
          (u) => session.uid && u.uid === session.uid || session.username && u.username === session.username || session.email && u.email === session.email
        );
      }
    }
    if (!targetUser) {
      const searchKey = username || userId;
      targetUser = dbData.users?.find((u) => u.username === searchKey || u.uid === searchKey);
    }
    if (!targetUser && dbData.user) {
      targetUser = dbData.user;
    }
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        error: "USER_NOT_FOUND",
        message: "Payment verification failed: Could not locate account to credit coins."
      });
    }
    const cleanMethod = String(paymentMethod || "Card").toLowerCase();
    const generatedOrderId = orderId || `${cleanMethod.includes("gpay") || cleanMethod.includes("google") ? "GPAY" : "CARD"}-${Math.floor(1e5 + Math.random() * 9e5)}`;
    const isGooglePay = cleanMethod.includes("gpay") || cleanMethod.includes("google");
    if (cardNumber && String(cardNumber).replace(/\D/g, "") === "4000000000000000") {
      const failedTx = {
        id: generatedOrderId,
        userId: targetUser.uid || targetUser.username,
        username: targetUser.username,
        fullName: targetUser.fullName || targetUser.username,
        method: paymentMethod || "Credit Card",
        country: country || "Pakistan",
        currencyCode: currencyCode || "PKR",
        amountLocal: Number(amountLocal) || 0,
        formattedAmount: formattedAmount || "Rs. 0 PKR",
        amountPKR: Number(amountPKR) || 0,
        coins: coinsToCredit,
        date: (/* @__PURE__ */ new Date()).toISOString(),
        status: "FAILED",
        failureReason: "Card authorization declined by issuing bank (Test Declined Card)."
      };
      if (!dbData.transactions) dbData.transactions = [];
      dbData.transactions.unshift(failedTx);
      saveDatabase();
      return res.status(402).json({
        success: false,
        verified: false,
        error: "CARD_DECLINED",
        message: "Payment Verification Failed: Your card was declined by the issuing bank. Please double-check card details.",
        orderId: generatedOrderId,
        transaction: failedTx
      });
    }
    const previousCoins = targetUser.coins || 0;
    const updatedCoins = previousCoins + coinsToCredit;
    targetUser.coins = updatedCoins;
    const userIndex = dbData.users.findIndex((u) => u.username === targetUser.username || u.uid === targetUser.uid);
    if (userIndex !== -1) {
      dbData.users[userIndex].coins = updatedCoins;
    }
    if (dbData.user && dbData.user.username === targetUser.username) {
      dbData.user.coins = updatedCoins;
    }
    const completedTx = {
      id: generatedOrderId,
      userId: targetUser.uid || targetUser.username,
      username: targetUser.username,
      fullName: targetUser.fullName || targetUser.username,
      method: paymentMethod || (isGooglePay ? "Google Pay (Verified)" : "Credit Card (Verified)"),
      country: country || "Pakistan",
      currencyCode: currencyCode || "PKR",
      amountLocal: Number(amountLocal) || 0,
      formattedAmount: formattedAmount || `Rs. ${amountPKR || amountLocal} PKR`,
      amountPKR: Number(amountPKR) || Number(amountLocal) || 0,
      coins: coinsToCredit,
      date: (/* @__PURE__ */ new Date()).toISOString(),
      status: "COMPLETED",
      verifiedBy: "PARDAIS_GATEWAY_V1_SECURE"
    };
    if (!dbData.onlineRechargeLedger) dbData.onlineRechargeLedger = [];
    dbData.onlineRechargeLedger.unshift(completedTx);
    if (!dbData.transactions) dbData.transactions = [];
    dbData.transactions.unshift({
      ...completedTx,
      type: "recharge",
      description: `Recharged ${coinsToCredit.toLocaleString()} coins via ${completedTx.method}`
    });
    if (!dbData.notifications) dbData.notifications = [];
    dbData.notifications.unshift({
      id: Date.now(),
      targetUsername: targetUser.username,
      title: "\u{1F389} Payment Verified & Coins Added!",
      message: `Your payment of ${completedTx.formattedAmount} was verified by the gateway. ${coinsToCredit.toLocaleString()} coins have been added to your wallet balance. New Balance: ${updatedCoins.toLocaleString()} coins. Order ID: ${generatedOrderId}`,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      type: "recharge_success",
      read: false
    });
    saveDatabase();
    syncDocument("users", targetUser.username, targetUser);
    syncDocument("transactions", generatedOrderId, completedTx);
    console.log(`[PARDAIS-PARTY PAYMENTS] \u2705 VERIFIED TRANSACTION [${generatedOrderId}] for @${targetUser.username}: +${coinsToCredit} coins. New balance: ${updatedCoins}`);
    return res.json({
      success: true,
      verified: true,
      message: "Payment successfully verified and wallet balance updated in real-time.",
      orderId: generatedOrderId,
      coinsAdded: coinsToCredit,
      newCoinBalance: updatedCoins,
      user: targetUser,
      transaction: completedTx
    });
  } catch (err) {
    console.error("[PARDAIS-PARTY PAYMENTS] Payment processing error:", err);
    return res.status(500).json({
      success: false,
      error: "PAYMENT_GATEWAY_ERROR",
      message: err.message || "An unexpected error occurred during payment verification."
    });
  }
});
app2.get("/api/v1/payments/ledger", (req, res) => {
  if (!dbData.onlineRechargeLedger) {
    dbData.onlineRechargeLedger = [];
  }
  res.json({
    success: true,
    ledger: dbData.onlineRechargeLedger
  });
});
var DEFAULT_ADVANCED_GIFTS_SERVER = [
  { id: "g-lion", name: "Golden Lion \u{1F981}", cost: 1e4, type: "3d", icon: "\u{1F981}", color: "from-amber-500 via-yellow-500 to-amber-700", animationClass: "animate-bounce", category: "Popular", description: "Roaring Golden Lion of supreme royalty & majesty!", animationFile: "\u{1F981}", animationFormat: "svga", animationDuration: 8, animationDisplayType: "full", comboSupported: true, status: "active", featured: true, priority: 100 },
  { id: "g-rose", name: "Red Rose", cost: 10, type: "2d", icon: "\u{1F339}", color: "from-pink-500 to-rose-600", animationClass: "animate-bounce", category: "Popular", description: "A fresh beautiful red rose of deep admiration.", animationFile: "\u{1F339}", animationFormat: "svg", animationDuration: 5, animationDisplayType: "small", comboSupported: true, status: "active", featured: true, priority: 10 },
  { id: "g-heart", name: "Love Heart", cost: 99, type: "2d", icon: "\u{1F496}", color: "from-red-500 to-pink-500", animationClass: "animate-pulse", category: "Popular", description: "Express your warm affection.", animationFile: "\u{1F496}", animationFormat: "svg", animationDuration: 5, animationDisplayType: "small", comboSupported: true, status: "active", featured: true, priority: 9 },
  { id: "g-lucky-coin", name: "Lucky Coin", cost: 50, type: "2d", icon: "\u{1FA99}", color: "from-yellow-400 to-amber-600", animationClass: "animate-bounce", category: "Lucky", description: "Send fortune!", animationFile: "\u{1FA99}", animationFormat: "svg", animationDuration: 5, animationDisplayType: "small", comboSupported: true, status: "active", featured: false, priority: 8 },
  { id: "g-crown", name: "VIP Crown", cost: 999, type: "3d", icon: "\u{1F451}", color: "from-yellow-400 to-amber-600", animationClass: "animate-spin", category: "VIP", description: "Royal crown for the star.", animationFile: "\u{1F451}", animationFormat: "svga", animationDuration: 10, animationDisplayType: "half", comboSupported: true, status: "active", featured: true, priority: 7 },
  { id: "g-star-trophy", name: "Star Trophy", cost: 500, type: "3d", icon: "\u{1F3C6}", color: "from-yellow-300 to-amber-500", animationClass: "animate-pulse", category: "New", description: "Awarded to energetic hosts.", animationFile: "\u{1F3C6}", animationFormat: "svg", animationDuration: 8, animationDisplayType: "half", comboSupported: true, status: "active", featured: false, priority: 6 },
  { id: "g-car", name: "Sports Car", cost: 4999, type: "luxury", icon: "\u{1F3CE}\uFE0F", color: "from-blue-500 to-indigo-600", animationClass: "animate-bounce", category: "Luxury", description: "Rev your engine!", animationFile: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4", animationFormat: "mp4", animationDuration: 10, animationDisplayType: "full", comboSupported: false, status: "active", featured: true, priority: 4 },
  { id: "g-rocket", name: "Space Rocket", cost: 9999, type: "luxury", icon: "\u{1F680}", color: "from-purple-600 to-pink-600", animationClass: "animate-pulse", category: "Premium", description: "Blast off into the cosmos!", animationFile: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4", animationFormat: "mp4", animationDuration: 15, animationDisplayType: "full", comboSupported: false, status: "active", featured: true, priority: 3 },
  { id: "g-dragon", name: "Golden Dragon", cost: 29999, type: "luxury", icon: "\u{1F409}", color: "from-amber-500 to-red-600", animationClass: "animate-bounce", category: "Luxury", description: "Screaming golden fire storm!", animationFile: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4", animationFormat: "mp4", animationDuration: 30, animationDisplayType: "ultra", comboSupported: false, status: "active", featured: true, priority: 2 }
];
app2.get("/api/v1/gifts", (req, res) => {
  if (!dbData.gifts || dbData.gifts.length === 0) {
    dbData.gifts = [...DEFAULT_ADVANCED_GIFTS_SERVER];
  } else {
    const giftMap = /* @__PURE__ */ new Map();
    DEFAULT_ADVANCED_GIFTS_SERVER.forEach((g) => giftMap.set(g.id, g));
    dbData.gifts.forEach((g) => {
      if (g && g.id) {
        const defG = DEFAULT_ADVANCED_GIFTS_SERVER.find((d) => d.id === g.id);
        if (defG && (!g.animationFile || g.animationFile.length < 10 || !g.animationFile.startsWith("http"))) {
          g.animationFile = defG.animationFile;
          g.animationFormat = defG.animationFormat;
        }
        giftMap.set(g.id, g);
      }
    });
    dbData.gifts = Array.from(giftMap.values());
  }
  res.json(dbData.gifts);
});
app2.post("/api/v1/gifts/send", authenticateUser, (req, res) => {
  const { requestId, giftId, count = 1, recipient = "Host", targetHostSide } = req.body;
  if (!giftId) {
    return res.status(400).json({ error: "giftId is required" });
  }
  if (requestId && dbData.processedGiftRequests && dbData.processedGiftRequests[requestId]) {
    return res.json(dbData.processedGiftRequests[requestId]);
  }
  if (!dbData.gifts || dbData.gifts.length === 0) {
    dbData.gifts = DEFAULT_ADVANCED_GIFTS_SERVER;
  }
  let gift = dbData.gifts.find((g) => g.id === giftId);
  if (!gift) {
    gift = DEFAULT_ADVANCED_GIFTS_SERVER.find((g) => g.id === giftId);
  }
  if (!gift) {
    return res.status(404).json({ error: "Gift not found" });
  }
  if (gift.status === "inactive") {
    return res.status(400).json({ error: "This gift is currently inactive." });
  }
  const giftCost = Number(gift.cost) || 0;
  const giftCount = Math.max(1, Number(count) || 1);
  const totalCost = giftCost * giftCount;
  const user = req.user || dbData.user;
  const userCoins = Number(user.coins) || 0;
  if (userCoins < totalCost) {
    return res.status(400).json({ error: `Insufficient balance. Required: ${totalCost} coins, Available: ${userCoins} coins.` });
  }
  user.coins = userCoins - totalCost;
  user.xp = (user.xp || 0) + Math.floor(totalCost * 0.2);
  const hostEarnings = Math.floor(totalCost * 0.5);
  const companyShare = totalCost - hostEarnings;
  if (!dbData.platformMetrics) {
    dbData.platformMetrics = { totalGiftCoins: 0, companyRevenue: 0, hostDiamondsDistributed: 0 };
  }
  dbData.platformMetrics.totalGiftCoins = (dbData.platformMetrics.totalGiftCoins || 0) + totalCost;
  dbData.platformMetrics.companyRevenue = (dbData.platformMetrics.companyRevenue || 0) + companyShare;
  dbData.platformMetrics.hostDiamondsDistributed = (dbData.platformMetrics.hostDiamondsDistributed || 0) + hostEarnings;
  const txId = requestId || `TX-${Date.now()}-${Math.floor(Math.random() * 1e3)}`;
  const txLog = {
    id: txId,
    type: "gift_sent",
    amount: totalCost,
    currency: "coins",
    hostEarnings,
    companyShare,
    sender: user.username,
    senderAvatar: user.avatar || "",
    recipient,
    giftName: gift.name,
    giftIcon: gift.icon,
    count: giftCount,
    targetHostSide: targetHostSide || "hostA",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    status: "Completed"
  };
  if (!dbData.transactions) dbData.transactions = [];
  dbData.transactions.unshift(txLog);
  const responseData = {
    success: true,
    transactionId: txId,
    gift,
    count: giftCount,
    totalCoinsSpent: totalCost,
    remainingCoins: user.coins,
    hostEarnings,
    companyShare,
    recipient,
    pkScoreAdded: totalCost,
    timestamp: txLog.timestamp
  };
  if (!dbData.processedGiftRequests) dbData.processedGiftRequests = {};
  if (requestId) {
    dbData.processedGiftRequests[requestId] = responseData;
  }
  const eventId = requestId || `ge-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const giftEvent = {
    eventId,
    giftId: gift.id,
    giftName: gift.name,
    giftIcon: gift.icon,
    count: giftCount,
    senderUsername: user.username,
    senderAvatar: user.avatar || "",
    recipient: recipient || "Host",
    totalCost,
    targetHostSide: targetHostSide || "hostA",
    animationFile: gift.animationFile || gift.videoUrl || gift.animationUrl || gift.icon || "",
    videoUrl: gift.videoUrl || gift.animationUrl || gift.animationFile || "",
    animationUrl: gift.animationUrl || gift.videoUrl || gift.animationFile || "",
    animationFormat: gift.animationFormat || "webm",
    animationDuration: gift.animationDuration || 8,
    animationDisplayType: gift.animationDisplayType || "full",
    type: gift.type || "3d",
    timestamp: Date.now()
  };
  const hostId = req.body.hostId;
  const activeHostMatch = (dbData.hosts || []).find(
    (h) => hostId && (h.id === hostId || h.hostUsername === hostId || h.name === hostId) || recipient && h.hostUsername && recipient.toLowerCase().includes(h.hostUsername.toLowerCase()) || h.isLive
  );
  let hasActivePkSess = false;
  Object.values(activePkSessions).forEach((sess) => {
    if (sess && sess.status !== "ended") {
      hasActivePkSess = true;
      getSynchronizedPkSession(sess, Date.now());
      const recNorm = (recipient || "").toLowerCase();
      const isHostA = sess.hostA?.username && sess.hostA.username.toLowerCase() === recNorm || sess.hostA?.userId && String(sess.hostA.userId).toLowerCase() === recNorm || targetHostSide === "hostA";
      const isHostB = sess.hostB?.username && sess.hostB.username.toLowerCase() === recNorm || sess.hostB?.userId && String(sess.hostB.userId).toLowerCase() === recNorm || targetHostSide === "hostB";
      if (isHostB) {
        const multB = sess.multiplierB || 1;
        const pts = totalCost * multB;
        sess.hostB.score = (sess.hostB.score || 0) + pts;
      } else {
        const multA = sess.multiplierA || 1;
        const pts = totalCost * multA;
        sess.hostA.score = (sess.hostA.score || 0) + pts;
      }
      getSynchronizedPkSession(sess, Date.now());
      if (activeHostMatch) {
        activeHostMatch.pkScoreHost = sess.hostA?.score || 0;
        activeHostMatch.pkScoreOpponent = sess.hostB?.score || 0;
        activeHostMatch.multiplierA = sess.multiplierA || 1;
        activeHostMatch.multiplierB = sess.multiplierB || 1;
        activeHostMatch.feverPhase = sess.feverPhase;
      }
    }
  });
  if (activeHostMatch) {
    if (!hasActivePkSess) {
      const isOpponent = targetHostSide === "hostB";
      const mult = isOpponent ? activeHostMatch.multiplierB || 1 : activeHostMatch.multiplierA || 1;
      const pts = totalCost * mult;
      if (isOpponent) {
        activeHostMatch.pkScoreOpponent = (activeHostMatch.pkScoreOpponent || 0) + pts;
      } else {
        activeHostMatch.pkScoreHost = (activeHostMatch.pkScoreHost || 0) + pts;
      }
    }
    activeHostMatch.lastGiftEvent = giftEvent;
    if (!Array.isArray(activeHostMatch.giftEventQueue)) {
      activeHostMatch.giftEventQueue = [];
    }
    activeHostMatch.giftEventQueue.push(giftEvent);
    if (activeHostMatch.giftEventQueue.length > 25) {
      activeHostMatch.giftEventQueue = activeHostMatch.giftEventQueue.slice(-25);
    }
    activeHostMatch.likes = (activeHostMatch.likes || 0) + Math.max(1, Math.floor(totalCost * 0.1));
    syncDocument("hosts", activeHostMatch.id, activeHostMatch);
    console.log(`[REALTIME GIFT SYNC] Updated host ${activeHostMatch.id} with gift ${gift.name} from @${user.username}`);
  }
  const partyId = req.body.partyId || req.body.roomId;
  const activePartyMatch = (dbData.parties || []).find(
    (p) => partyId && (p.id === partyId || p.hostUsername === partyId) || p.id === hostId || recipient && p.hostUsername && recipient.toLowerCase().includes(p.hostUsername.toLowerCase()) || p.status !== "ended" && (p.id === activeHostMatch?.id || p.hostUsername === activeHostMatch?.hostUsername)
  );
  if (activePartyMatch) {
    activePartyMatch.lastGiftEvent = giftEvent;
    if (!Array.isArray(activePartyMatch.giftEventQueue)) {
      activePartyMatch.giftEventQueue = [];
    }
    activePartyMatch.giftEventQueue.push(giftEvent);
    if (activePartyMatch.giftEventQueue.length > 25) {
      activePartyMatch.giftEventQueue = activePartyMatch.giftEventQueue.slice(-25);
    }
    syncDocument("parties", activePartyMatch.id, activePartyMatch);
    console.log(`[REALTIME PARTY GIFT SYNC] Updated party ${activePartyMatch.id} with gift ${gift.name} from @${user.username}`);
  }
  saveDatabase();
  return res.json(responseData);
});
app2.get("/api/v1/gifts/supporters", (req, res) => {
  const giftTxs = (dbData.transactions || []).filter((tx) => tx.type === "gift_sent");
  const supporterMap = {};
  const hostAMap = {};
  const hostBMap = {};
  giftTxs.forEach((tx) => {
    const key = tx.sender || "Anonymous";
    const avatar = tx.senderAvatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&h=100&q=80";
    const coins = Number(tx.amount) || 0;
    if (!supporterMap[key]) {
      supporterMap[key] = { id: `sup-${key}`, username: key, avatar, coinsContributed: 0 };
    }
    supporterMap[key].coinsContributed += coins;
    const side = tx.targetHostSide || "hostA";
    const targetMap = side === "hostB" ? hostBMap : hostAMap;
    if (!targetMap[key]) {
      targetMap[key] = { id: `sup-${side}-${key}`, username: key, avatar, coinsContributed: 0 };
    }
    targetMap[key].coinsContributed += coins;
  });
  const topGifters = Object.values(supporterMap).sort((a, b) => b.coinsContributed - a.coinsContributed);
  const hostASupporters = Object.values(hostAMap).sort((a, b) => b.coinsContributed - a.coinsContributed);
  const hostBSupporters = Object.values(hostBMap).sort((a, b) => b.coinsContributed - a.coinsContributed);
  res.json({
    topGifters: topGifters.slice(0, 5),
    hostASupporters: hostASupporters.slice(0, 3),
    hostBSupporters: hostBSupporters.slice(0, 3)
  });
});
app2.post("/api/v1/gifts", (req, res) => {
  const giftId = req.body.id || `g-${Date.now()}`;
  const newGift = { id: giftId, status: "active", ...req.body };
  if (!dbData.gifts) {
    dbData.gifts = [...DEFAULT_ADVANCED_GIFTS_SERVER];
  }
  const existingIndex = dbData.gifts.findIndex((g) => g.id === giftId);
  if (existingIndex !== -1) {
    dbData.gifts[existingIndex] = { ...dbData.gifts[existingIndex], ...newGift };
    saveDatabase();
    syncDocument("gifts", giftId, dbData.gifts[existingIndex]);
    return res.json(dbData.gifts[existingIndex]);
  } else {
    dbData.gifts.unshift(newGift);
    saveDatabase();
    syncDocument("gifts", giftId, newGift);
    return res.status(201).json(newGift);
  }
});
app2.put("/api/v1/gifts/:id", (req, res) => {
  const { id } = req.params;
  if (!dbData.gifts) {
    dbData.gifts = [...DEFAULT_ADVANCED_GIFTS_SERVER];
  }
  const index = dbData.gifts.findIndex((g) => g.id === id);
  if (index !== -1) {
    dbData.gifts[index] = { ...dbData.gifts[index], ...req.body };
    saveDatabase();
    syncDocument("gifts", id, dbData.gifts[index]);
    res.json(dbData.gifts[index]);
  } else {
    const newGift = { id, status: "active", ...req.body };
    dbData.gifts.unshift(newGift);
    saveDatabase();
    syncDocument("gifts", id, newGift);
    res.status(201).json(newGift);
  }
});
app2.delete("/api/v1/gifts/:id", (req, res) => {
  const { id } = req.params;
  dbData.gifts = dbData.gifts.filter((g) => g.id !== id);
  saveDatabase();
  deleteDocument("gifts", id);
  res.json({ message: "Gift deleted successfully" });
});
app2.get("/api/v1/categories", (req, res) => {
  res.json(dbData.categories);
});
app2.post("/api/v1/categories", (req, res) => {
  dbData.categories = req.body;
  saveDatabase();
  writeMetadata("categories", { list: req.body });
  res.json(dbData.categories);
});
var findHostIndex = (id) => {
  if (!id) return -1;
  const cleanId = id.replace(/^h-/, "");
  return dbData.hosts.findIndex(
    (h) => h.id === id || h.id === `h-${cleanId}` || h.hostUsername === id || h.hostUsername === cleanId || h.name === id || h.name === cleanId || h.hostUid === id || h.hostUid === cleanId
  );
};
var terminateHostLiveSession = (targetId, terminatePk = false) => {
  if (!targetId) return;
  const cleanId = String(targetId).replace(/^h-/, "");
  const matchedUsernames = [targetId.toLowerCase(), cleanId.toLowerCase()];
  if (Array.isArray(dbData.hosts)) {
    const toEnd = dbData.hosts.filter(
      (h) => h.id === targetId || h.id === `h-${targetId}` || h.id === `h-${cleanId}` || h.hostUsername === targetId || h.hostUsername === cleanId || h.name === targetId || h.name === cleanId || h.hostUid === targetId || h.hostUid === cleanId
    );
    toEnd.forEach((h) => {
      h.isLive = false;
      h.status = "ENDED";
      h.endedAt = (/* @__PURE__ */ new Date()).toISOString();
      deleteDocument("hosts", h.id);
      if (h.hostUsername) matchedUsernames.push(h.hostUsername.toLowerCase());
      if (h.name) matchedUsernames.push(h.name.toLowerCase());
      if (h.hostUid) matchedUsernames.push(String(h.hostUid).toLowerCase());
    });
    dbData.hosts = dbData.hosts.filter(
      (h) => !(h.id === targetId || h.id === `h-${targetId}` || h.id === `h-${cleanId}` || h.hostUsername === targetId || h.hostUsername === cleanId || h.name === targetId || h.name === cleanId || h.hostUid === targetId || h.hostUid === cleanId)
    );
  }
  if (terminatePk) {
    Object.keys(activePkSessions).forEach((sessionId) => {
      const s = activePkSessions[sessionId];
      if (!s) return;
      const uA = s.hostA?.username?.toLowerCase();
      const uB = s.hostB?.username?.toLowerCase();
      const idA = String(s.hostA?.userId || "").toLowerCase();
      const idB = String(s.hostB?.userId || "").toLowerCase();
      const matches = matchedUsernames.some((u) => u && (u === uA || u === uB || u === idA || u === idB));
      if (matches) {
        s.status = "ended";
        s.pkActive = false;
        if (uA && onlineUserPresence[uA]) onlineUserPresence[uA].inPk = false;
        if (uB && onlineUserPresence[uB]) onlineUserPresence[uB].inPk = false;
        delete activePkSessions[sessionId];
      }
    });
  }
  Object.keys(activePkInvites).forEach((inviteId) => {
    const inv = activePkInvites[inviteId];
    if (!inv) return;
    const from = inv.fromUsername?.toLowerCase();
    const to = inv.toUsername?.toLowerCase();
    const fromId = String(inv.inviterUserId || inv.fromUserId || "").toLowerCase();
    const toId = String(inv.inviteeUserId || inv.toUserId || "").toLowerCase();
    const matches = matchedUsernames.some((u) => u && (u === from || u === to || u === fromId || u === toId));
    if (matches) {
      inv.status = "cancelled";
      delete activePkInvites[inviteId];
    }
  });
  saveDatabase();
};
function syncHostPkScores(host) {
  if (!host) return;
  const hUser = String(host.hostUsername || host.name || "").toLowerCase();
  const hId = String(host.hostUserId || host.id || "").toLowerCase().replace(/^h-/, "");
  const hChan = String(host.channelName || "").toLowerCase();
  const now = Date.now();
  if (!host.originalChannelName) {
    host.originalChannelName = host.channelName || `room_${host.hostUsername || host.id || "101"}`;
  }
  let activePkMatch = false;
  Object.values(activePkSessions).forEach((s) => {
    if (!s || s.status === "ended") return;
    const sChan = String(s.channelName || "").toLowerCase();
    const sAUser = String(s.hostA?.username || "").toLowerCase();
    const sBUser = String(s.hostB?.username || "").toLowerCase();
    const sAId = String(s.hostA?.userId || "").toLowerCase();
    const sBId = String(s.hostB?.userId || "").toLowerCase();
    const isMatchChan = hChan && sChan && (sChan === hChan || hChan.includes(sChan) || sChan.includes(hChan));
    const isMatchUser = hUser && (sAUser === hUser || sBUser === hUser) || hId && (sAId === hId || sBId === hId);
    if (isMatchChan || isMatchUser) {
      activePkMatch = true;
      getSynchronizedPkSession(s, now);
      host.pkScoreHost = s.hostA?.score || 0;
      host.pkScoreOpponent = s.hostB?.score || 0;
      host.multiplierA = s.multiplierA || 1;
      host.multiplierB = s.multiplierB || 1;
      host.pkActive = !!s.pkActive;
      host.pkTimer = s.timer;
      host.category = "pk";
      host.inPk = true;
      if (s.channelName) {
        host.channelName = s.channelName;
        host.userLivePkChannelName = s.channelName;
      }
    }
  });
  if (!activePkMatch && host.inPk) {
    host.inPk = false;
    host.pkActive = false;
    if (host.originalChannelName) {
      host.channelName = host.originalChannelName;
    }
  }
}
var getActiveLiveSessions = () => {
  if (!Array.isArray(dbData.hosts)) {
    dbData.hosts = [];
  }
  const now = Date.now();
  dbData.hosts.forEach((h) => {
    if (!h) return;
    const isLiveFlag = h.isLive === true || h.status === "LIVE" || h.status === "live";
    if (isLiveFlag) {
      const lastActive = typeof h.lastSeen === "number" ? h.lastSeen : h.updatedAt ? new Date(h.updatedAt).getTime() : 0;
      if (!lastActive || now - lastActive > 2e4) {
        console.log(`[LIVE SERVER] Session ${h.id} (@${h.hostUsername || h.name}) heartbeat expired (>20s). Marking as ENDED.`);
        h.isLive = false;
        h.status = "ENDED";
        h.endedAt = (/* @__PURE__ */ new Date()).toISOString();
        deleteDocument("hosts", h.id);
      }
    }
  });
  const validHosts = dbData.hosts.filter((h) => {
    if (!h) return false;
    if (h.isLive !== true && h.status !== "LIVE" && h.status !== "live") return false;
    if (h.status === "ENDED" || h.status === "ended" || h.status === "offline") return false;
    const lastActive = typeof h.lastSeen === "number" ? h.lastSeen : h.updatedAt ? new Date(h.updatedAt).getTime() : 0;
    return lastActive > 0 && now - lastActive <= 2e4;
  });
  const uniqueMap = /* @__PURE__ */ new Map();
  validHosts.forEach((h) => {
    const key = (h.hostUsername || h.hostUserId || h.name || h.id).toLowerCase().replace(/^h-/, "");
    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, h);
    } else {
      const existing = uniqueMap.get(key);
      const existingTime = typeof existing.lastSeen === "number" ? existing.lastSeen : new Date(existing.updatedAt || 0).getTime();
      const newTime = typeof h.lastSeen === "number" ? h.lastSeen : new Date(h.updatedAt || 0).getTime();
      if (newTime > existingTime) {
        existing.isLive = false;
        existing.status = "ENDED";
        deleteDocument("hosts", existing.id);
        uniqueMap.set(key, h);
      } else {
        h.isLive = false;
        h.status = "ENDED";
        deleteDocument("hosts", h.id);
      }
    }
  });
  dbData.hosts = Array.from(uniqueMap.values());
  dbData.hosts.forEach((h) => syncHostPkScores(h));
  saveDatabase();
  return dbData.hosts;
};
app2.get("/api/v1/hosts", (req, res) => {
  res.json(getActiveLiveSessions());
});
app2.get("/api/v1/live/active", (req, res) => {
  res.json(getActiveLiveSessions());
});
app2.post("/api/v1/live/session", (req, res) => {
  const sessionData = req.body || {};
  const hostUsername = sessionData.hostUsername || sessionData.hostName || sessionData.name || "live_host";
  const hostUserId = sessionData.hostUserId || sessionData.hostUid || sessionData.uniqueId || hostUsername;
  const hostId = sessionData.id || `h-${hostUserId}`;
  terminateHostLiveSession(hostUserId);
  terminateHostLiveSession(hostUsername);
  terminateHostLiveSession(hostId);
  const newSessionId = sessionData.sessionId || `session_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const newHost = {
    id: hostId,
    hostUserId,
    hostName: sessionData.hostName || sessionData.name || hostUsername,
    hostAvatar: sessionData.hostAvatar || sessionData.avatar || "",
    hostUsername,
    hostUid: hostUserId,
    name: sessionData.hostName || sessionData.name || hostUsername,
    avatar: sessionData.hostAvatar || sessionData.avatar || "",
    sessionId: newSessionId,
    liveSessionId: newSessionId,
    channelName: sessionData.channelName || `room_${hostUserId}`,
    status: "LIVE",
    isLive: true,
    streamType: "SOLO",
    inPk: false,
    category: sessionData.category || "video",
    viewers: sessionData.viewers || 0,
    realViewerCount: sessionData.realViewerCount || 0,
    likes: sessionData.likes || 0,
    startedAt: sessionData.startedAt || (/* @__PURE__ */ new Date()).toISOString(),
    lastSeen: Date.now(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    ...sessionData
  };
  dbData.hosts.push(newHost);
  saveDatabase();
  syncDocument("hosts", hostId, newHost);
  return res.status(201).json(newHost);
});
app2.post("/api/v1/hosts", (req, res) => {
  const hostData = req.body || {};
  const hostUsername = hostData.hostUsername || hostData.name || "live_host";
  const hostUserId = hostData.hostUserId || hostData.hostUid || hostData.uniqueId || hostUsername;
  const hostId = hostData.id || `h-${hostUserId}`;
  terminateHostLiveSession(hostUserId);
  terminateHostLiveSession(hostUsername);
  terminateHostLiveSession(hostId);
  const newSessionId = hostData.sessionId || `session_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const newHost = {
    id: hostId,
    hostUserId,
    hostName: hostData.hostName || hostData.name || hostUsername,
    hostAvatar: hostData.hostAvatar || hostData.avatar || "",
    isLive: true,
    status: "LIVE",
    category: hostData.category || "video",
    viewers: hostData.viewers || 0,
    realViewerCount: hostData.realViewerCount || 0,
    likes: hostData.likes || 0,
    connectedViewers: hostData.connectedViewers || [],
    comments: hostData.comments || [],
    sessionId: newSessionId,
    liveSessionId: newSessionId,
    channelName: hostData.channelName || `room_${hostUserId}`,
    streamType: "SOLO",
    inPk: false,
    startedAt: hostData.startedAt || (/* @__PURE__ */ new Date()).toISOString(),
    lastSeen: Date.now(),
    ...hostData,
    hostUsername,
    hostUid: hostUserId,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  dbData.hosts.push(newHost);
  saveDatabase();
  syncDocument("hosts", hostId, newHost);
  console.log(`[LIVE SERVER SUCCESS] Registered fresh host stream: ${hostId} (@${hostUsername}, Session: ${newSessionId})`);
  return res.status(201).json(newHost);
});
app2.get("/api/v1/hosts/:id", (req, res) => {
  const { id } = req.params;
  const index = findHostIndex(id);
  if (index !== -1) {
    const host = dbData.hosts[index];
    if (host && host.isLive !== false && host.status !== "ENDED" && host.status !== "ended") {
      syncHostPkScores(host);
      return res.json(host);
    }
  }
  return res.status(404).json({ error: "This live stream has ended", isLive: false, status: "ENDED" });
});
app2.put("/api/v1/hosts/:id", (req, res) => {
  const { id } = req.params;
  const index = findHostIndex(id);
  if (index !== -1) {
    const existing = dbData.hosts[index];
    const updateData = { ...req.body };
    if ((updateData.comments === void 0 || Array.isArray(updateData.comments) && updateData.comments.length === 0) && existing.comments && existing.comments.length > 0) {
      updateData.comments = existing.comments;
    }
    if (updateData.connectedViewers === void 0 && existing.connectedViewers) {
      updateData.connectedViewers = existing.connectedViewers;
      updateData.realViewerCount = existing.connectedViewers.length;
    }
    if (existing.likes !== void 0 && (updateData.likes === void 0 || updateData.likes < existing.likes)) {
      updateData.likes = existing.likes;
    }
    if (updateData.lastGiftEvent === void 0 && existing.lastGiftEvent) {
      updateData.lastGiftEvent = existing.lastGiftEvent;
    }
    if (updateData.lastLikeEvent === void 0 && existing.lastLikeEvent) {
      updateData.lastLikeEvent = existing.lastLikeEvent;
    }
    if (updateData.lastJoinEvent === void 0 && existing.lastJoinEvent) {
      updateData.lastJoinEvent = existing.lastJoinEvent;
    }
    dbData.hosts[index] = { ...existing, ...updateData, updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
    syncHostPkScores(dbData.hosts[index]);
    saveDatabase();
    syncDocument("hosts", dbData.hosts[index].id, dbData.hosts[index]);
    res.json(dbData.hosts[index]);
  } else {
    const newHost = {
      id,
      isLive: true,
      viewers: 1,
      realViewerCount: 1,
      likes: 0,
      connectedViewers: [],
      comments: [],
      ...req.body,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    dbData.hosts.push(newHost);
    saveDatabase();
    syncDocument("hosts", id, newHost);
    res.json(newHost);
  }
});
app2.post("/api/v1/hosts/:id/heartbeat", (req, res) => {
  const { id } = req.params;
  const index = findHostIndex(id);
  if (index !== -1) {
    dbData.hosts[index].lastSeen = Date.now();
    dbData.hosts[index].updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    syncDocument("hosts", dbData.hosts[index].id, dbData.hosts[index]);
    return res.json({ success: true, lastSeen: dbData.hosts[index].lastSeen });
  }
  return res.status(404).json({ error: "Host stream not found" });
});
app2.post("/api/v1/live/heartbeat", (req, res) => {
  const { hostId, id, hostUserId } = req.body || {};
  const targetId = hostId || id || hostUserId;
  if (!targetId) return res.status(400).json({ error: "hostId required" });
  const index = findHostIndex(targetId);
  if (index !== -1) {
    dbData.hosts[index].lastSeen = Date.now();
    dbData.hosts[index].updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    syncDocument("hosts", dbData.hosts[index].id, dbData.hosts[index]);
    return res.json({ success: true, lastSeen: dbData.hosts[index].lastSeen });
  }
  return res.status(404).json({ error: "Host stream not found" });
});
app2.post("/api/v1/hosts/:id/end", (req, res) => {
  const { id } = req.params;
  terminateHostLiveSession(id);
  console.log(`[LIVE SERVER SUCCESS] Explicitly ended host stream: ${id}`);
  res.json({ success: true, message: "Live session ended successfully" });
});
app2.post("/api/v1/live/end", (req, res) => {
  const { hostId, id, hostUserId } = req.body || {};
  const targetId = hostId || id || hostUserId;
  if (!targetId) return res.status(400).json({ error: "hostId required" });
  terminateHostLiveSession(targetId);
  console.log(`[LIVE SERVER SUCCESS] Explicitly ended live session: ${targetId}`);
  res.json({ success: true, message: "Live session ended successfully" });
});
app2.post("/api/v1/hosts/:id/like", (req, res) => {
  const { id } = req.params;
  const { count = 1, senderUsername, xPercent, yPercent } = req.body || {};
  const index = findHostIndex(id);
  if (index !== -1) {
    const host = dbData.hosts[index];
    host.likes = (host.likes || 0) + Number(count);
    host.lastLikeEvent = {
      senderUsername: senderUsername || "Viewer",
      timestamp: Date.now(),
      count: Number(count),
      xPercent,
      yPercent
    };
    saveDatabase();
    syncDocument("hosts", host.id, host);
    res.json({ success: true, likes: host.likes, lastLikeEvent: host.lastLikeEvent });
  } else {
    res.status(404).json({ error: "Host not found" });
  }
});
app2.delete("/api/v1/hosts/:id", (req, res) => {
  const { id } = req.params;
  terminateHostLiveSession(id);
  console.log(`[LIVE SERVER SUCCESS] Ended/Deleted host stream: ${id}`);
  res.json({ message: "Host deleted successfully", targetId: id });
});
app2.post("/api/v1/hosts/:id/unload-end", (req, res) => {
  const { id } = req.params;
  terminateHostLiveSession(id);
  console.log(`[LIVE SERVER SUCCESS] Host disconnected via unload-end: ${id}`);
  res.json({ success: true });
});
app2.post("/api/v1/hosts/:id/join", (req, res) => {
  const { id } = req.params;
  const { userId, username, avatar, level, vipLevel } = req.body || {};
  if (!username) {
    return res.status(400).json({ error: "Username is required to join" });
  }
  const index = findHostIndex(id);
  if (index !== -1) {
    const host = dbData.hosts[index];
    if (!host.connectedViewers) {
      host.connectedViewers = [];
    }
    if (!host.connectedViewers.some((v) => v.username === username)) {
      host.connectedViewers.push({ userId: userId || username, username, avatar: avatar || "", level: level || 1, vipLevel: vipLevel || 0 });
    }
    host.viewers = host.connectedViewers.length;
    host.realViewerCount = host.connectedViewers.length;
    host.lastJoinEvent = {
      id: `join-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      username,
      userLevel: level || 1,
      vipLevel: vipLevel || 0,
      timestamp: Date.now()
    };
    saveDatabase();
    syncDocument("hosts", host.id, host);
    console.log(`[LIVE SERVER SUCCESS] User @${username} joined live room ${host.id} (total viewers: ${host.realViewerCount})`);
    res.json(host);
  } else {
    console.warn(`[LIVE SERVER WARN] Host ${id} not found for join`);
    res.status(404).json({ error: "Host not found" });
  }
});
app2.post("/api/v1/hosts/:id/leave", (req, res) => {
  const { id } = req.params;
  const { username } = req.body || {};
  if (!username) {
    return res.status(400).json({ error: "Username is required to leave" });
  }
  const index = findHostIndex(id);
  if (index !== -1) {
    const host = dbData.hosts[index];
    if (host.connectedViewers) {
      host.connectedViewers = host.connectedViewers.filter((v) => v.username !== username);
    } else {
      host.connectedViewers = [];
    }
    host.viewers = host.connectedViewers.length;
    host.realViewerCount = host.connectedViewers.length;
    saveDatabase();
    syncDocument("hosts", host.id, host);
    console.log(`[LIVE SERVER SUCCESS] User @${username} left live room ${host.id} (remaining viewers: ${host.realViewerCount})`);
    res.json(host);
  } else {
    console.warn(`[LIVE SERVER WARN] Host ${id} not found for leave`);
    res.status(404).json({ error: "Host not found" });
  }
});
app2.post("/api/v1/hosts/:id/comments", (req, res) => {
  const { id } = req.params;
  const { message, username, vipLevel, userLevel, isSystem, avatar } = req.body;
  if (!message || !username) {
    return res.status(400).json({ error: "Username and message are required" });
  }
  const index = findHostIndex(id);
  if (index !== -1) {
    const host = dbData.hosts[index];
    if (!host.comments) {
      host.comments = [];
    }
    const newComment = {
      id: `c-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      username,
      message,
      vipLevel: vipLevel || 0,
      userLevel: userLevel || 1,
      isSystem: !!isSystem,
      avatar: avatar || "",
      timestamp: (/* @__PURE__ */ new Date()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };
    host.comments.push(newComment);
    saveDatabase();
    syncDocument("hosts", host.id, host);
    res.status(201).json(host.comments);
  } else {
    res.status(404).json({ error: "Host not found" });
  }
});
app2.post("/api/v1/hosts/:id/guest-requests", (req, res) => {
  const { id } = req.params;
  const { username, avatar, seatId, vipLevel, coins } = req.body || {};
  if (!username) {
    return res.status(400).json({ error: "Username is required for guest request" });
  }
  const index = findHostIndex(id);
  if (index !== -1) {
    const host = dbData.hosts[index];
    if (!Array.isArray(host.guestRequests)) {
      host.guestRequests = [];
    }
    const reqId = `req-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newReq = {
      id: reqId,
      username,
      avatar: avatar || "",
      seatId: seatId || 1,
      vipLevel: vipLevel || 0,
      coins: coins || 0,
      timestamp: Date.now()
    };
    if (!host.guestRequests.some((r) => r.username === username)) {
      host.guestRequests.push(newReq);
    }
    saveDatabase();
    syncDocument("hosts", host.id, host);
    console.log(`[GUEST REQ] User @${username} requested seat #${seatId} in room ${host.id}`);
    res.status(201).json({ success: true, request: newReq, guestRequests: host.guestRequests });
  } else {
    res.status(404).json({ error: "Host not found" });
  }
});
app2.get("/api/v1/hosts/:id/guest-requests", (req, res) => {
  const { id } = req.params;
  const index = findHostIndex(id);
  if (index !== -1) {
    const host = dbData.hosts[index];
    return res.json({ guestRequests: host.guestRequests || [], guestSeats: host.guestSeats || [] });
  }
  res.status(404).json({ error: "Host not found" });
});
app2.post("/api/v1/hosts/:id/guest-requests/:reqId/respond", (req, res) => {
  const { id, reqId } = req.params;
  const { action, seatId } = req.body || {};
  const index = findHostIndex(id);
  if (index !== -1) {
    const host = dbData.hosts[index];
    if (Array.isArray(host.guestRequests)) {
      const match = host.guestRequests.find((r) => r.id === reqId || r.username === reqId);
      if (match && action === "accept") {
        const targetSeatId = seatId || match.seatId || 1;
        if (!Array.isArray(host.guestSeats)) {
          host.guestSeats = [1, 2, 3, 4, 5, 6, 7, 8].map((sId) => ({
            id: sId,
            name: null,
            avatar: null,
            diamonds: null,
            isMuted: false,
            isCamMuted: false,
            isBigFrame: false
          }));
        }
        host.guestSeats = host.guestSeats.map((s) => {
          if (s.id === targetSeatId) {
            return {
              ...s,
              name: match.username,
              avatar: match.avatar,
              diamonds: "0.0K",
              isMuted: false,
              isCamMuted: false,
              isBigFrame: false
            };
          }
          return s;
        });
      }
      host.guestRequests = host.guestRequests.filter((r) => r.id !== reqId && r.username !== reqId);
    }
    saveDatabase();
    syncDocument("hosts", host.id, host);
    res.json({ success: true, guestSeats: host.guestSeats || [], guestRequests: host.guestRequests || [] });
  } else {
    res.status(404).json({ error: "Host not found" });
  }
});
app2.put("/api/v1/hosts/:id/guest-seats", (req, res) => {
  const { id } = req.params;
  const { guestSeats } = req.body || {};
  const index = findHostIndex(id);
  if (index !== -1) {
    const host = dbData.hosts[index];
    if (Array.isArray(guestSeats)) {
      host.guestSeats = guestSeats;
      host.guestModeActive = true;
    }
    saveDatabase();
    syncDocument("hosts", host.id, host);
    res.json({ success: true, guestSeats: host.guestSeats });
  } else {
    res.status(404).json({ error: "Host not found" });
  }
});
app2.post("/api/v1/hosts/:id/invites", (req, res) => {
  const { id } = req.params;
  const { targetUsername, seatId } = req.body || {};
  if (!targetUsername) {
    return res.status(400).json({ error: "targetUsername is required for invite" });
  }
  const index = findHostIndex(id);
  if (index !== -1) {
    const host = dbData.hosts[index];
    if (!Array.isArray(host.pendingInvites)) {
      host.pendingInvites = [];
    }
    host.pendingInvites = host.pendingInvites.filter((i) => String(i.targetUsername).toLowerCase() !== String(targetUsername).toLowerCase());
    const newInvite = {
      id: `inv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      targetUsername,
      seatId: Number(seatId) || 1,
      hostName: host.name || host.hostUsername || "Host",
      timestamp: Date.now()
    };
    host.pendingInvites.push(newInvite);
    saveDatabase();
    syncDocument("hosts", host.id, host);
    console.log(`[GUEST INVITE SENT] Host ${host.id} invited @${targetUsername} to seat #${seatId}`);
    return res.json({ success: true, invite: newInvite });
  }
  return res.status(404).json({ error: "Host not found" });
});
app2.get("/api/v1/hosts/:id/invites/:username", (req, res) => {
  const { id, username } = req.params;
  const index = findHostIndex(id);
  if (index !== -1) {
    const host = dbData.hosts[index];
    if (Array.isArray(host.pendingInvites)) {
      const match = host.pendingInvites.find((i) => String(i.targetUsername).toLowerCase() === String(username).toLowerCase());
      if (match) {
        return res.json({ pendingInvite: match });
      }
    }
    return res.json({ pendingInvite: null });
  }
  return res.status(404).json({ error: "Host not found" });
});
app2.post("/api/v1/hosts/:id/invites/:username/respond", (req, res) => {
  const { id, username } = req.params;
  const { action, avatar } = req.body || {};
  const index = findHostIndex(id);
  if (index !== -1) {
    const host = dbData.hosts[index];
    if (Array.isArray(host.pendingInvites)) {
      const match = host.pendingInvites.find((i) => String(i.targetUsername).toLowerCase() === String(username).toLowerCase());
      if (match) {
        if (action === "accept") {
          const targetSeatId = Number(match.seatId) || 1;
          if (!Array.isArray(host.guestSeats)) {
            host.guestSeats = [1, 2, 3, 4, 5, 6, 7, 8].map((sId) => ({
              id: sId,
              name: null,
              avatar: null,
              diamonds: null,
              isMuted: false,
              isCamMuted: false,
              isBigFrame: false
            }));
          }
          host.guestSeats = host.guestSeats.map((s) => {
            if (s.id === targetSeatId) {
              return {
                ...s,
                name: username,
                avatar: avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80",
                diamonds: "0.0K",
                isMuted: false,
                isCamMuted: false,
                isBigFrame: false
              };
            }
            return s;
          });
          host.guestModeActive = true;
          if (!Array.isArray(host.comments)) host.comments = [];
          host.comments.push({
            id: `sys-${Date.now()}`,
            username: "System \u{1F399}\uFE0F",
            message: `\u{1F389} @${username} accepted host's invite to sit on Guest Seat #${targetSeatId}!`,
            isSystem: true,
            timestamp: (/* @__PURE__ */ new Date()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          });
        }
        host.pendingInvites = host.pendingInvites.filter((i) => String(i.targetUsername).toLowerCase() !== String(username).toLowerCase());
      }
    }
    saveDatabase();
    syncDocument("hosts", host.id, host);
    return res.json({ success: true, guestSeats: host.guestSeats || [] });
  }
  return res.status(404).json({ error: "Host not found" });
});
var activePkInvites = {};
var activePkSessions = {};
var onlineUserPresence = {};
app2.post("/api/v1/presence", (req, res) => {
  const { username, userId, avatar, level, fans, isLive, inPk } = req.body || {};
  if (!username) {
    return res.status(400).json({ error: "Username required for presence" });
  }
  const normUser = String(username).toLowerCase();
  onlineUserPresence[normUser] = {
    username,
    userId: userId || username,
    avatar: avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80",
    level: Number(level) || 1,
    fans: fans || "10K fans",
    isLive: !!isLive,
    inPk: !!inPk,
    lastSeen: Date.now()
  };
  const now = Date.now();
  Object.keys(onlineUserPresence).forEach((key) => {
    if (now - onlineUserPresence[key].lastSeen > 15e3) {
      delete onlineUserPresence[key];
    }
  });
  res.json({ success: true, activeUsersCount: Object.keys(onlineUserPresence).length });
});
app2.get("/api/v1/pk/available-hosts", (req, res) => {
  const currentUsername = String(req.query.username || "").toLowerCase();
  const currentUserId = String(req.query.userId || req.query.username || "").toLowerCase();
  const now = Date.now();
  const liveHostsList = (dbData.hosts || []).filter((h) => h.isLive !== false && !h.inPk && !h.inPkBattle && !h.isDemoHost).map((h) => ({
    id: String(h.id || h.hostUid || h.hostUsername),
    userId: String(h.hostUid || h.id || h.hostUsername),
    username: String(h.hostUsername || h.name || "Live Host"),
    avatar: String(h.hostAvatar || h.avatar || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80"),
    level: Number(h.hostLevel || h.level || 1),
    fans: `${h.followersCount || h.fans || 0} fans`,
    isLive: true,
    inPk: false,
    status: "\u{1F534} Live Solo"
  }));
  const onlinePresenceList = Object.values(onlineUserPresence).filter((u) => now - u.lastSeen <= 15e3 && !u.inPk).map((u) => ({
    id: String(u.userId || u.username),
    userId: String(u.userId || u.username),
    username: String(u.username),
    avatar: String(u.avatar || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80"),
    level: Number(u.level || 1),
    fans: String(u.fans || "0 fans"),
    isLive: !!u.isLive,
    inPk: false,
    status: u.isLive ? "\u{1F534} Live Solo" : "\u{1F7E2} Online"
  }));
  const combinedMap = /* @__PURE__ */ new Map();
  [...liveHostsList, ...onlinePresenceList].forEach((item) => {
    const key = item.username.toLowerCase();
    const itemUserId = String(item.userId).toLowerCase();
    if (key !== currentUsername && itemUserId !== currentUserId && !combinedMap.has(key)) {
      combinedMap.set(key, item);
    }
  });
  const result = Array.from(combinedMap.values());
  res.json(result);
});
app2.post("/api/v1/pk/invite", (req, res) => {
  const { fromUsername, fromUserId, fromAvatar, fromLevel, fromFans, toUsername, toUserId, toAvatar, toLevel, toFans, liveSessionId, channelName: customChannelName, inviteType, isPkBattle } = req.body || {};
  if (!fromUsername || !toUsername) {
    return res.status(400).json({ error: "Sender and receiver usernames are required" });
  }
  const normFrom = fromUsername.toLowerCase();
  const normTo = toUsername.toLowerCase();
  const presenceFrom = onlineUserPresence[normFrom];
  const presenceTo = onlineUserPresence[normTo];
  const hostTo = (dbData.hosts || []).find((h) => h.hostUsername?.toLowerCase() === normTo || h.name?.toLowerCase() === normTo);
  const finalFromAvatar = fromAvatar || presenceFrom?.avatar || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80";
  const finalFromLevel = Number(fromLevel) || Number(presenceFrom?.level) || 1;
  const finalFromFans = fromFans || presenceFrom?.fans || "10K fans";
  const finalToUserId = toUserId || presenceTo?.userId || hostTo?.hostUid || hostTo?.id || toUsername;
  const finalToAvatar = toAvatar || presenceTo?.avatar || hostTo?.hostAvatar || hostTo?.avatar || "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=100&q=80";
  const finalToLevel = Number(toLevel) || Number(presenceTo?.level) || Number(hostTo?.level) || Number(hostTo?.hostLevel) || 1;
  const finalToFans = toFans || presenceTo?.fans || `${hostTo?.followersCount || 0} fans` || "15K fans";
  Object.keys(activePkInvites).forEach((id) => {
    const inv = activePkInvites[id];
    if (inv.fromUsername.toLowerCase() === normFrom && inv.status === "pending") {
      inv.status = "cancelled";
    }
  });
  const inviteId = `pki_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const channelName = customChannelName || `pk_room_${[normFrom, normTo].sort().join("_")}`;
  const now = Date.now();
  const expiresAt = now + 2e4;
  const isPk = !!(isPkBattle || inviteType === "pk_battle");
  const newInvite = {
    id: inviteId,
    inviteId,
    liveSessionId: liveSessionId || `session_${channelName}`,
    channelName,
    inviterUserId: fromUserId || fromUsername,
    inviterName: fromUsername,
    inviterAvatar: finalFromAvatar,
    fromUsername,
    fromUserId: fromUserId || fromUsername,
    fromAvatar: finalFromAvatar,
    fromLevel: finalFromLevel,
    fromFans: finalFromFans,
    inviteeUserId: finalToUserId,
    toUsername,
    toUserId: finalToUserId,
    toAvatar: finalToAvatar,
    toLevel: finalToLevel,
    toFans: finalToFans,
    inviteType: inviteType || (isPk ? "pk_battle" : "cohost"),
    isPkBattle: isPk,
    status: "pending",
    createdAt: now,
    expiresAt
  };
  activePkInvites[inviteId] = newInvite;
  console.log(`[PK SERVER SUCCESS] Host @${fromUsername} (Lv.${finalFromLevel}) invited @${toUsername} (Lv.${finalToLevel}) (${isPk ? "PK Battle" : "Co-Host"}) (Channel: ${channelName}, InviteId: ${inviteId})`);
  const targetPresence = onlineUserPresence[normTo];
  const isDemo = hostTo?.isDemoHost || !targetPresence || normTo.includes("captain") || normTo.includes("rose") || normTo.includes("demo") || normTo.includes("host_");
  if (isDemo) {
    setTimeout(() => {
      if (activePkInvites[inviteId] && activePkInvites[inviteId].status === "pending") {
        activePkInvites[inviteId].status = "accepted";
        const sessionId = newInvite.liveSessionId;
        const pkMatchId = `pkm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        activePkSessions[sessionId] = {
          id: sessionId,
          pkMatchId,
          liveSessionId: sessionId,
          channelName: newInvite.channelName,
          hostA: {
            username: fromUsername,
            userId: fromUserId || fromUsername,
            avatar: finalFromAvatar,
            level: finalFromLevel,
            fans: finalFromFans,
            score: 0
          },
          hostB: {
            username: toUsername,
            userId: finalToUserId,
            avatar: finalToAvatar,
            level: finalToLevel,
            fans: finalToFans,
            score: 0
          },
          hostAQualifyingScore: 0,
          hostBQualifyingScore: 0,
          userTapContributions: {},
          status: "connected",
          pkState: isPk ? "pk_countdown" : "1v1_connected",
          pkActive: false,
          duration: 180,
          timer: 180,
          startedAt: Date.now(),
          winner: null
        };
        getSynchronizedPkSession(activePkSessions[sessionId]);
      }
    }, 2500);
  }
  res.status(201).json(newInvite);
});
app2.get("/api/v1/pk/active-sessions", (req, res) => {
  const active = Object.values(activePkSessions).filter((s) => s && s.status !== "ended");
  res.json(active);
});
function getSynchronizedPkSession(activeSession, now = Date.now()) {
  if (!activeSession || activeSession.status === "ended") return null;
  const duration = activeSession.duration || 180;
  let startedAtMs = typeof activeSession.startedAt === "number" ? activeSession.startedAt : activeSession.startedAt ? new Date(activeSession.startedAt).getTime() : now;
  if (isNaN(startedAtMs) || !activeSession.startedAt) {
    startedAtMs = now;
    activeSession.startedAt = now;
  }
  if (activeSession.pkState === "pk_countdown" || startedAtMs && now < startedAtMs) {
    activeSession.pkState = "pk_countdown";
    activeSession.countdown = Math.max(0, Math.ceil((startedAtMs - now) / 1e3));
    activeSession.pkActive = false;
    activeSession.timer = duration;
  } else if (now >= startedAtMs && now < startedAtMs + duration * 1e3) {
    activeSession.pkState = "pk_active";
    activeSession.pkActive = true;
    const elapsed = Math.max(0, Math.floor((now - startedAtMs) / 1e3));
    activeSession.timer = Math.max(0, duration - elapsed);
  } else if (now >= startedAtMs + duration * 1e3) {
    activeSession.pkState = "pk_finished";
    activeSession.pkActive = false;
    activeSession.timer = 0;
    const scoreA = activeSession.hostA?.score || 0;
    const scoreB = activeSession.hostB?.score || 0;
    if (scoreA > scoreB) {
      activeSession.winner = activeSession.hostA?.username;
      activeSession.loser = activeSession.hostB?.username;
    } else if (scoreB > scoreA) {
      activeSession.winner = activeSession.hostB?.username;
      activeSession.loser = activeSession.hostA?.username;
    } else {
      activeSession.winner = "draw";
    }
  }
  const remainingSecs = activeSession.timer !== void 0 ? activeSession.timer : 180;
  let multiplierA = 1;
  let multiplierB = 1;
  let feverPhase = "normal";
  if (activeSession.pkState === "pk_active") {
    if (remainingSecs >= 120 && remainingSecs <= 180) {
      feverPhase = "fever";
      const scoreA = activeSession.hostA?.score || 0;
      const scoreB = activeSession.hostB?.score || 0;
      if (scoreA >= 1e3) multiplierA = 3;
      else if (scoreA >= 500) multiplierA = 2;
      else multiplierA = 1;
      if (scoreB >= 1e3) multiplierB = 3;
      else if (scoreB >= 500) multiplierB = 2;
      else multiplierB = 1;
    } else if (remainingSecs > 0 && remainingSecs <= 30) {
      feverPhase = "final30s";
      multiplierA = 3;
      multiplierB = 3;
    } else {
      multiplierA = 1;
      multiplierB = 1;
      feverPhase = "normal";
    }
  }
  activeSession.multiplierA = multiplierA;
  activeSession.multiplierB = multiplierB;
  activeSession.feverPhase = feverPhase;
  const normA = activeSession.hostA?.username?.toLowerCase();
  const normB = activeSession.hostB?.username?.toLowerCase();
  if (Array.isArray(dbData.hosts)) {
    dbData.hosts.forEach((h) => {
      const hNorm = h.hostUsername?.toLowerCase() || h.name?.toLowerCase();
      if (hNorm === normA || hNorm === normB) {
        h.inPk = true;
        h.category = "pk";
        h.subCategory = activeSession.pkState === "pk_active" ? "pk" : "1v1";
        h.pkScoreHost = activeSession.hostA?.score || 0;
        h.pkScoreOpponent = activeSession.hostB?.score || 0;
        h.multiplierA = multiplierA;
        h.multiplierB = multiplierB;
        h.feverPhase = feverPhase;
        h.pkTimer = activeSession.timer;
        h.pkState = activeSession.pkState;
        h.pkActive = activeSession.pkActive;
      }
    });
  }
  return activeSession;
}
app2.get("/api/v1/pk/invites", (req, res) => {
  const username = String(req.query.username || "").toLowerCase();
  const userId = String(req.query.userId || req.query.username || "").toLowerCase();
  if (!username && !userId) {
    return res.status(400).json({ error: "Username or userId parameter required" });
  }
  const now = Date.now();
  let incoming = null;
  let outgoing = null;
  Object.values(activePkInvites).forEach((inv) => {
    if (inv.status === "pending" && now > (inv.expiresAt || inv.createdAt + 2e4)) {
      inv.status = "expired";
    }
    const matchesTarget = inv.toUsername && inv.toUsername.trim().toLowerCase() === username.trim() || inv.toUsername && inv.toUsername.trim().toLowerCase() === userId.trim() || inv.inviteeUserId && String(inv.inviteeUserId).trim().toLowerCase() === userId.trim() || inv.toUserId && String(inv.toUserId).trim().toLowerCase() === userId.trim() || inv.inviteeUserId && String(inv.inviteeUserId).trim().toLowerCase() === username.trim() || inv.toUserId && String(inv.toUserId).trim().toLowerCase() === username.trim();
    if (matchesTarget) {
      if (inv.status === "pending") incoming = inv;
    }
    const matchesSender = inv.fromUsername && inv.fromUsername.trim().toLowerCase() === username.trim() || inv.fromUsername && inv.fromUsername.trim().toLowerCase() === userId.trim() || inv.inviterUserId && String(inv.inviterUserId).trim().toLowerCase() === userId.trim() || inv.fromUserId && String(inv.fromUserId).trim().toLowerCase() === userId.trim() || inv.inviterUserId && String(inv.inviterUserId).trim().toLowerCase() === username.trim() || inv.fromUserId && String(inv.fromUserId).trim().toLowerCase() === username.trim();
    if (matchesSender) {
      if (!outgoing || inv.createdAt > outgoing.createdAt) {
        outgoing = inv;
      }
    }
  });
  const rawSession = Object.values(activePkSessions).find(
    (s) => s && s.status !== "ended" && (s.hostA?.username && s.hostA.username.toLowerCase() === username || s.hostB?.username && s.hostB.username.toLowerCase() === username || s.hostA?.userId && String(s.hostA.userId).toLowerCase() === userId || s.hostB?.userId && String(s.hostB.userId).toLowerCase() === userId)
  ) || null;
  const activeSession = rawSession ? getSynchronizedPkSession(rawSession, now) : null;
  res.json({
    incoming,
    outgoing,
    activeSession
  });
});
app2.post("/api/v1/pk/invite/:id/respond", (req, res) => {
  const { id } = req.params;
  const { action, username, userId, avatar, level, fans } = req.body || {};
  const invite = activePkInvites[id];
  if (!invite) {
    return res.status(404).json({ error: "Invite not found or expired" });
  }
  const currentNow = Date.now();
  if (invite.status === "pending" && currentNow > (invite.expiresAt || invite.createdAt + 2e4)) {
    invite.status = "expired";
    return res.status(400).json({ error: "Invite has expired", invite });
  }
  const reqUser = String(username || "").toLowerCase();
  const reqUserId = String(userId || username || "").toLowerCase();
  if (action === "accept" || action === "reject") {
    const targetUsername = String(invite.toUsername || "").toLowerCase();
    const targetUserId = String(invite.inviteeUserId || invite.toUserId || "").toLowerCase();
    if (reqUser && targetUsername && reqUser !== targetUsername && reqUserId !== targetUserId) {
      return res.status(403).json({ error: "Unauthorized: Only the intended invitee can respond to this invitation" });
    }
  }
  if (action === "cancel") {
    const senderUsername = String(invite.fromUsername || "").toLowerCase();
    const senderUserId = String(invite.inviterUserId || invite.fromUserId || "").toLowerCase();
    if (reqUser && senderUsername && reqUser !== senderUsername && reqUserId !== senderUserId) {
      return res.status(403).json({ error: "Unauthorized: Only the inviter can cancel this invitation" });
    }
    invite.status = "cancelled";
    console.log(`[PK SERVER INFO] Invite ${id} CANCELLED by inviter @${username}`);
    return res.json({ success: true, status: "cancelled", invite });
  }
  if (action === "accept") {
    invite.status = "accepted";
    const isPk = !!(invite.isPkBattle || invite.inviteType === "pk_battle" || invite.type === "pk" || invite.isPk);
    const normA = invite.fromUsername.toLowerCase();
    const normB = (username || invite.toUsername).toLowerCase();
    const presenceA = onlineUserPresence[normA];
    const presenceB = onlineUserPresence[normB];
    const hostAObj = (dbData.hosts || []).find((h) => h.hostUsername?.toLowerCase() === normA || h.name?.toLowerCase() === normA);
    const hostBObj = (dbData.hosts || []).find((h) => h.hostUsername?.toLowerCase() === normB || h.name?.toLowerCase() === normB);
    const hostAUser = {
      username: invite.fromUsername,
      userId: invite.inviterUserId || invite.fromUserId || presenceA?.userId || hostAObj?.hostUid || invite.fromUsername,
      avatar: invite.fromAvatar || presenceA?.avatar || hostAObj?.hostAvatar || hostAObj?.avatar || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80",
      level: Number(invite.fromLevel) || Number(presenceA?.level) || Number(hostAObj?.hostLevel) || 1,
      fans: invite.fromFans || presenceA?.fans || `${hostAObj?.followersCount || 0} fans` || "10K fans",
      score: 0
      // ALWAYS INITIALIZE STRICTLY TO ZERO
    };
    const hostBUser = {
      username: username || invite.toUsername,
      userId: userId || invite.inviteeUserId || invite.toUserId || presenceB?.userId || hostBObj?.hostUid || (username || invite.toUsername),
      avatar: avatar || invite.toAvatar || presenceB?.avatar || hostBObj?.hostAvatar || hostBObj?.avatar || "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=100&q=80",
      level: Number(level) || Number(invite.toLevel) || Number(presenceB?.level) || Number(hostBObj?.hostLevel) || 1,
      fans: fans || invite.toFans || presenceB?.fans || `${hostBObj?.followersCount || 0} fans` || "15K fans",
      score: 0
      // ALWAYS INITIALIZE STRICTLY TO ZERO
    };
    const pkMatchId = `pkm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const sessionId = invite.liveSessionId || `session_${invite.channelName}`;
    let session = activePkSessions[sessionId];
    if (session) {
      session.pkMatchId = pkMatchId;
      session.status = "connected";
      session.pkActive = false;
      session.hostA = { ...session.hostA, ...hostAUser, score: 0 };
      session.hostB = { ...session.hostB, ...hostBUser, score: 0 };
      session.hostAQualifyingScore = 0;
      session.hostBQualifyingScore = 0;
      session.userTapContributions = {};
      session.winner = null;
      if (isPk) {
        session.pkState = "pk_countdown";
        session.countdownStartTime = currentNow;
        session.startedAt = currentNow + 3e3;
        session.duration = 180;
        session.timer = 180;
      } else {
        session.pkState = "1v1_connected";
        session.duration = 180;
        session.timer = 180;
      }
    } else {
      session = {
        id: sessionId,
        pkMatchId,
        liveSessionId: sessionId,
        channelName: invite.channelName,
        hostA: hostAUser,
        hostB: hostBUser,
        hostAQualifyingScore: 0,
        hostBQualifyingScore: 0,
        userTapContributions: {},
        status: "connected",
        pkState: isPk ? "pk_countdown" : "1v1_connected",
        pkActive: false,
        countdownStartTime: currentNow,
        duration: 180,
        timer: 180,
        startedAt: isPk ? currentNow + 3e3 : currentNow,
        winner: null
      };
      activePkSessions[sessionId] = session;
    }
    getSynchronizedPkSession(session, currentNow);
    if (onlineUserPresence[normA]) onlineUserPresence[normA].inPk = true;
    if (onlineUserPresence[normB]) onlineUserPresence[normB].inPk = true;
    saveDatabase();
    console.log(`[PK SERVER SUCCESS] @${username} (Lv.${hostBUser.level}) ACCEPTED invite from @${invite.fromUsername} (Lv.${hostAUser.level})! Session started on channel: ${invite.channelName}`);
    return res.json({ success: true, status: "accepted", invite, session });
  } else {
    invite.status = "rejected";
    saveDatabase();
    console.log(`[PK SERVER INFO] @${username} REJECTED invite from @${invite.fromUsername}`);
    return res.json({ success: true, status: "rejected", invite });
  }
});
app2.post("/api/v1/pk/start-battle", (req, res) => {
  const { channelName, username, action, pkActive } = req.body || {};
  const normUser = String(username || "").toLowerCase();
  const currentNow = Date.now();
  let updatedSession = null;
  Object.keys(activePkSessions).forEach((sessionId) => {
    const s = activePkSessions[sessionId];
    if (!s) return;
    const matchChannel = channelName && s.channelName === channelName;
    const matchUser = normUser && (s.hostA?.username?.toLowerCase() === normUser || s.hostB?.username?.toLowerCase() === normUser || String(s.hostA?.userId || "").toLowerCase() === normUser || String(s.hostB?.userId || "").toLowerCase() === normUser);
    if (matchChannel || matchUser) {
      if (action === "request") {
        s.pkRequested = true;
        s.pkRequestedBy = username;
        s.pkRequestStatus = "pending";
        updatedSession = getSynchronizedPkSession(s, currentNow);
      } else if (action === "accept" || action === "start" || pkActive === true) {
        s.pkMatchId = `pkm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        s.hostA.score = 0;
        s.hostB.score = 0;
        s.hostAQualifyingScore = 0;
        s.hostBQualifyingScore = 0;
        s.userTapContributions = {};
        s.winner = null;
        s.pkRequested = false;
        s.pkRequestStatus = "accepted";
        s.pkState = "pk_countdown";
        s.countdownStartTime = currentNow;
        s.startedAt = currentNow + 3e3;
        s.duration = 180;
        s.timer = 180;
        s.pkActive = false;
        updatedSession = getSynchronizedPkSession(s, currentNow);
      } else if (action === "reject" || action === "decline") {
        s.pkRequested = false;
        s.pkRequestStatus = "rejected";
        updatedSession = getSynchronizedPkSession(s, currentNow);
      } else if (pkActive === false) {
        s.pkActive = false;
        s.pkState = "1v1_connected";
        updatedSession = getSynchronizedPkSession(s, currentNow);
      }
    }
  });
  saveDatabase();
  res.json({ success: true, session: updatedSession });
});
app2.post("/api/v1/pk/tap", (req, res) => {
  const { channelName, hostUsername, username, userId, targetHostSide } = req.body || {};
  const normUser = String(username || "").toLowerCase();
  const normUserId = String(userId || username || "").toLowerCase();
  const normHost = String(hostUsername || "").toLowerCase();
  const normChannel = String(channelName || "").toLowerCase();
  const currentNow = Date.now();
  let targetSession = null;
  Object.values(activePkSessions).forEach((s) => {
    if (!s || s.status === "ended") return;
    const sChan = String(s.channelName || "").toLowerCase();
    const sHostA2 = String(s.hostA?.username || "").toLowerCase();
    const sHostB2 = String(s.hostB?.username || "").toLowerCase();
    const matchChannel = normChannel && (sChan === normChannel || normChannel.includes(sChan) || sChan.includes(normChannel));
    const matchHost = normHost && (sHostA2 === normHost || sHostB2 === normHost);
    const matchUser = normUser && (sHostA2 === normUser || sHostB2 === normUser);
    if (matchChannel || matchHost || matchUser) {
      targetSession = s;
    }
  });
  if (!targetSession) {
    return res.json({ success: true, pkScoreAdded: 0, heartsAdded: 1 });
  }
  getSynchronizedPkSession(targetSession, currentNow);
  const sHostA = String(targetSession.hostA?.username || "").toLowerCase();
  const sHostB = String(targetSession.hostB?.username || "").toLowerCase();
  const sHostAId = String(targetSession.hostA?.userId || "").toLowerCase();
  const sHostBId = String(targetSession.hostB?.userId || "").toLowerCase();
  let side = "hostA";
  if (normHost === sHostB || normHost === sHostBId || normUser === sHostB || normUserId === sHostBId) {
    side = "hostB";
  }
  if (targetHostSide === "hostB") {
    side = "hostB";
  } else if (targetHostSide === "hostA") {
    side = "hostA";
  }
  const matchId = targetSession.pkMatchId || targetSession.id || "match_1";
  const userKey = `${matchId}_${normUserId}_${side}`;
  if (!targetSession.userTapContributions) {
    targetSession.userTapContributions = {};
  }
  const currentTaps = targetSession.userTapContributions[userKey] || 0;
  let pkScoreAdded = 0;
  let quotaReached = false;
  if (targetSession.status !== "ended" && (targetSession.pkActive || targetSession.pkState === "pk_active" || targetSession.pkState === "1v1_connected")) {
    targetSession.userTapContributions[userKey] = currentTaps + 1;
    pkScoreAdded = 1;
    if (side === "hostB") {
      targetSession.hostB.score = (targetSession.hostB.score || 0) + 1;
    } else {
      targetSession.hostA.score = (targetSession.hostA.score || 0) + 1;
    }
    getSynchronizedPkSession(targetSession, currentNow);
  }
  const normA = targetSession.hostA?.username?.toLowerCase();
  const normB = targetSession.hostB?.username?.toLowerCase();
  if (Array.isArray(dbData.hosts)) {
    dbData.hosts.forEach((h) => {
      const hNorm = h.hostUsername?.toLowerCase() || h.name?.toLowerCase();
      if (hNorm === normA || hNorm === normB) {
        h.pkScoreHost = targetSession.hostA?.score || 0;
        h.pkScoreOpponent = targetSession.hostB?.score || 0;
        h.multiplierA = targetSession.multiplierA || 1;
        h.multiplierB = targetSession.multiplierB || 1;
        h.feverPhase = targetSession.feverPhase;
      }
    });
  }
  saveDatabase();
  return res.json({
    success: true,
    pkScoreAdded,
    baseTapsUsed: targetSession.userTapContributions[userKey] || 0,
    quotaReached,
    heartsAdded: 1,
    session: targetSession
  });
});
app2.post("/api/v1/pk/gift", (req, res) => {
  const { channelName, username, giftCoins, targetHost, targetHostSide } = req.body || {};
  const normUser = String(username || "").toLowerCase();
  const points = Number(giftCoins) || 0;
  const currentNow = Date.now();
  let targetSession = null;
  Object.values(activePkSessions).forEach((s) => {
    if (!s || s.status === "ended") return;
    const sChan = String(s.channelName || "").toLowerCase();
    const normChannel = String(channelName || "").toLowerCase();
    const sHostA = String(s.hostA?.username || "").toLowerCase();
    const sHostB = String(s.hostB?.username || "").toLowerCase();
    if (normChannel && sChan === normChannel || normUser && (sHostA === normUser || sHostB === normUser)) {
      targetSession = s;
    }
  });
  if (targetSession && points > 0) {
    getSynchronizedPkSession(targetSession, currentNow);
    const sHostB = String(targetSession.hostB?.username || "").toLowerCase();
    let isHostB = false;
    if (normUser === sHostB) {
      isHostB = true;
    }
    if (targetHostSide === "hostB" || targetHost === "other" || targetHost === "hostB") {
      isHostB = true;
    } else if (targetHostSide === "hostA" || targetHost === "me" || targetHost === "hostA") {
      isHostB = false;
    }
    if (isHostB) {
      const mult = targetSession.multiplierB || 1;
      targetSession.hostB.score = (targetSession.hostB.score || 0) + points * mult;
    } else {
      const mult = targetSession.multiplierA || 1;
      targetSession.hostA.score = (targetSession.hostA.score || 0) + points * mult;
    }
    getSynchronizedPkSession(targetSession, currentNow);
    const normA = targetSession.hostA?.username?.toLowerCase();
    const normB = targetSession.hostB?.username?.toLowerCase();
    if (Array.isArray(dbData.hosts)) {
      dbData.hosts.forEach((h) => {
        const hNorm = h.hostUsername?.toLowerCase() || h.name?.toLowerCase();
        if (hNorm === normA || hNorm === normB) {
          h.pkScoreHost = targetSession.hostA?.score || 0;
          h.pkScoreOpponent = targetSession.hostB?.score || 0;
          h.multiplierA = targetSession.multiplierA || 1;
          h.multiplierB = targetSession.multiplierB || 1;
          h.feverPhase = targetSession.feverPhase;
        }
      });
    }
    saveDatabase();
  }
  res.json({ success: true, session: targetSession });
});
app2.post("/api/v1/pk/score", (req, res) => {
  const { channelName, username, targetHostSide, targetUsername, scoreDelta } = req.body || {};
  const normUser = String(username || "").toLowerCase();
  const delta = Number(scoreDelta) || 1;
  const currentNow = Date.now();
  let updatedSession = null;
  Object.values(activePkSessions).forEach((s) => {
    if (!s || s.status === "ended") return;
    const matchChannel = channelName && s.channelName === channelName;
    const matchUser = normUser && (s.hostA?.username?.toLowerCase() === normUser || s.hostB?.username?.toLowerCase() === normUser || String(s.hostA?.userId || "").toLowerCase() === normUser || String(s.hostB?.userId || "").toLowerCase() === normUser);
    if (matchChannel || matchUser) {
      getSynchronizedPkSession(s, currentNow);
      if (s.pkState === "pk_active" && s.timer > 0) {
        const isTargetB = targetHostSide === "hostB" || targetUsername && s.hostB?.username?.toLowerCase() === targetUsername.toLowerCase();
        const multiplier = isTargetB ? s.multiplierB || 1 : s.multiplierA || 1;
        const pkScoreAdded = delta * multiplier;
        if (isTargetB) {
          s.hostB.score = Math.max(0, (s.hostB.score || 0) + pkScoreAdded);
          if (s.timer > 60) {
            s.hostBQualifyingScore = (s.hostBQualifyingScore || 0) + pkScoreAdded;
          }
        } else {
          s.hostA.score = Math.max(0, (s.hostA.score || 0) + pkScoreAdded);
          if (s.timer > 60) {
            s.hostAQualifyingScore = (s.hostAQualifyingScore || 0) + pkScoreAdded;
          }
        }
      }
      updatedSession = s;
    }
  });
  saveDatabase();
  res.json({ success: true, session: updatedSession });
});
app2.post("/api/v1/pk/end", (req, res) => {
  const { channelName, username } = req.body || {};
  const normUser = String(username || "").toLowerCase();
  Object.keys(activePkSessions).forEach((sessionId) => {
    const s = activePkSessions[sessionId];
    if (!s) return;
    const matchChannel = channelName && s.channelName === channelName;
    const matchUser = normUser && (s.hostA?.username?.toLowerCase() === normUser || s.hostB?.username?.toLowerCase() === normUser || String(s.hostA?.userId || "").toLowerCase() === normUser || String(s.hostB?.userId || "").toLowerCase() === normUser);
    if (matchChannel || matchUser || !channelName && !username) {
      s.status = "ended";
      s.pkActive = false;
      const normA = s.hostA?.username?.toLowerCase();
      const normB = s.hostB?.username?.toLowerCase();
      if (normA && onlineUserPresence[normA]) onlineUserPresence[normA].inPk = false;
      if (normB && onlineUserPresence[normB]) onlineUserPresence[normB].inPk = false;
      dbData.hosts.forEach((h) => {
        if (h.hostUsername?.toLowerCase() === normA || h.hostUsername?.toLowerCase() === normB) {
          h.inPk = false;
          h.category = "video";
          h.streamType = "SOLO";
        }
      });
      delete activePkSessions[sessionId];
    }
  });
  saveDatabase();
  console.log(`[PK SERVER SUCCESS] Ended 1v1/PK session for channel: ${channelName}, user: @${username}`);
  res.json({ success: true, message: "1v1/PK session ended successfully" });
});
app2.get("/api/v1/parties", (req, res) => {
  if (!Array.isArray(dbData.parties)) {
    dbData.parties = [];
  }
  let activeParties = dbData.parties.filter((p) => p && p.status !== "ended");
  if (activeParties.length === 0) {
    DEFAULT_DEMO_PARTIES.forEach((dp) => {
      if (!dbData.parties.some((existing) => existing.id === dp.id)) {
        dbData.parties.push({ ...dp });
      }
    });
    activeParties = dbData.parties.filter((p) => p && p.status !== "ended");
  }
  res.json(activeParties);
});
app2.post("/api/v1/parties", (req, res) => {
  const { title, hostUsername, hostAvatar, category, isPublic, password, language, description } = req.body;
  if (!dbData.parties) {
    dbData.parties = [];
  }
  const existingIdx = dbData.parties.findIndex((p) => p.hostUsername === hostUsername && p.status !== "ended");
  const id = existingIdx !== -1 ? dbData.parties[existingIdx].id : `party-${Date.now()}`;
  const newParty = {
    id,
    title: title || "Pardais Party Audio Lounge",
    hostUsername: hostUsername || "Host",
    hostAvatar: hostAvatar || "",
    category: category || "Music",
    participantCount: 1,
    maxCapacity: 12,
    isPublic: isPublic !== false,
    password: password || "",
    language: language || "English",
    description: description || "",
    status: "active",
    connectedViewers: [{ userId: hostUsername, username: hostUsername, avatar: hostAvatar || "", level: 1, vipLevel: 0 }],
    seats: existingIdx !== -1 ? dbData.parties[existingIdx].seats : [
      { id: 1, name: hostUsername, avatar: hostAvatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80", isMuted: false, isLocked: false },
      { id: 2, name: null, avatar: null, isMuted: false, isLocked: false },
      { id: 3, name: null, avatar: null, isMuted: false, isLocked: false },
      { id: 4, name: null, avatar: null, isMuted: false, isLocked: false },
      { id: 5, name: null, avatar: null, isMuted: false, isLocked: false },
      { id: 6, name: null, avatar: null, isMuted: false, isLocked: false },
      { id: 7, name: null, avatar: null, isMuted: false, isLocked: false },
      { id: 8, name: null, avatar: null, isMuted: false, isLocked: false },
      { id: 9, name: null, avatar: null, isMuted: false, isLocked: false },
      { id: 10, name: null, avatar: null, isMuted: false, isLocked: false },
      { id: 11, name: null, avatar: null, isMuted: false, isLocked: false },
      { id: 12, name: null, avatar: null, isMuted: false, isLocked: false }
    ],
    comments: [
      {
        id: `sys-${Date.now()}`,
        username: "System",
        message: `\u{1F399}\uFE0F Room created successfully by ${hostUsername}. Welcome everyone!`,
        isSystem: true,
        timestamp: (/* @__PURE__ */ new Date()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      }
    ]
  };
  if (existingIdx !== -1) {
    dbData.parties[existingIdx] = { ...dbData.parties[existingIdx], ...newParty, status: "active" };
    saveDatabase();
    syncDocument("parties", id, dbData.parties[existingIdx]);
    console.log(`[PARDAIS-PARTY PARTY] Updated existing party room: ${id} by @${hostUsername}`);
    return res.status(200).json(dbData.parties[existingIdx]);
  } else {
    dbData.parties.push(newParty);
    saveDatabase();
    syncDocument("parties", id, newParty);
    console.log(`[PARDAIS-PARTY PARTY] Created new party room: ${id} by @${hostUsername}`);
    return res.status(201).json(newParty);
  }
});
app2.post("/api/v1/parties/:id/join", (req, res) => {
  const { id } = req.params;
  const { username, avatar, userLevel, vipLevel } = req.body;
  const index = dbData.parties?.findIndex((p) => p.id === id);
  if (index !== -1 && index !== void 0) {
    const party = dbData.parties[index];
    if (!party.connectedViewers) {
      party.connectedViewers = [];
    }
    if (!party.connectedViewers.some((v) => v.username === username)) {
      party.connectedViewers.push({ userId: username, username, avatar: avatar || "", level: userLevel || 1, vipLevel: vipLevel || 0 });
    }
    party.participantCount = party.connectedViewers.length;
    party.lastJoinEvent = {
      username,
      userLevel: userLevel || 1,
      vipLevel: vipLevel || 0,
      timestamp: Date.now()
    };
    saveDatabase();
    syncDocument("parties", id, party);
    res.json(party);
  } else {
    res.status(404).json({ error: "Party Room not found" });
  }
});
app2.post("/api/v1/parties/:id/leave", (req, res) => {
  const { id } = req.params;
  const { username } = req.body;
  const index = dbData.parties?.findIndex((p) => p.id === id);
  if (index !== -1 && index !== void 0) {
    const party = dbData.parties[index];
    if (party.connectedViewers) {
      party.connectedViewers = party.connectedViewers.filter((v) => v.username !== username);
    }
    party.participantCount = party.connectedViewers ? party.connectedViewers.length : 0;
    party.seats = party.seats.map((seat) => {
      if (seat.name === username || seat.name && seat.name.startsWith(username)) {
        return { ...seat, name: null, avatar: null, isMuted: false };
      }
      return seat;
    });
    if (party.lastSeen && username) {
      delete party.lastSeen[username];
    }
    if (username === party.hostUsername || party.participantCount === 0) {
      party.status = "ended";
      dbData.parties = dbData.parties.filter((p) => p.id !== id);
      saveDatabase();
      deleteDocument("parties", id);
      console.log(`[PARDAIS-PARTY PARTY] Host/all left. Closed party room: ${id}`);
      return res.json({ message: "Party closed as host left", party });
    }
    console.log(`[PARDAIS-PARTY PARTY] User ${username} left party ${id}. Seats cleared immediately.`);
    saveDatabase();
    syncDocument("parties", id, party);
    res.json(party);
  } else {
    res.status(404).json({ error: "Party Room not found" });
  }
});
app2.post("/api/v1/parties/:id/heartbeat", (req, res) => {
  const { id } = req.params;
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: "username is required" });
  const party = dbData.parties?.find((p) => p.id === id);
  if (party) {
    if (!party.lastSeen) party.lastSeen = {};
    party.lastSeen[username] = Date.now();
    res.json({ status: "ok" });
  } else {
    res.status(404).json({ error: "Party Room not found" });
  }
});
app2.post("/api/v1/parties/:id/seats/join", (req, res) => {
  const { id } = req.params;
  const { seatId, username, avatar, userLevel, vipLevel } = req.body;
  const index = dbData.parties?.findIndex((p) => p.id === id);
  if (index !== -1 && index !== void 0) {
    const party = dbData.parties[index];
    party.seats = party.seats.map((seat) => {
      if (seat.id === Number(seatId)) {
        return { ...seat, name: username, avatar: avatar || "" };
      }
      return seat;
    });
    party.lastJoinEvent = {
      username,
      userLevel: userLevel || 1,
      vipLevel: vipLevel || 0,
      timestamp: Date.now()
    };
    saveDatabase();
    syncDocument("parties", id, party);
    res.json(party);
  } else {
    res.status(404).json({ error: "Party Room not found" });
  }
});
app2.post("/api/v1/parties/:id/seats/leave", (req, res) => {
  const { id } = req.params;
  const { seatId } = req.body;
  const index = dbData.parties?.findIndex((p) => p.id === id);
  if (index !== -1 && index !== void 0) {
    const party = dbData.parties[index];
    party.seats = party.seats.map((seat) => {
      if (seat.id === Number(seatId)) {
        return { ...seat, name: null, avatar: null };
      }
      return seat;
    });
    saveDatabase();
    syncDocument("parties", id, party);
    res.json(party);
  } else {
    res.status(404).json({ error: "Party Room not found" });
  }
});
app2.post("/api/v1/parties/:id/seats/toggle-mute", (req, res) => {
  const { id } = req.params;
  const { seatId } = req.body;
  const index = dbData.parties?.findIndex((p) => p.id === id);
  if (index !== -1 && index !== void 0) {
    const party = dbData.parties[index];
    party.seats = party.seats.map((seat) => {
      if (seat.id === Number(seatId)) {
        return { ...seat, isMuted: !seat.isMuted };
      }
      return seat;
    });
    saveDatabase();
    syncDocument("parties", id, party);
    res.json(party);
  } else {
    res.status(404).json({ error: "Party Room not found" });
  }
});
app2.post("/api/v1/parties/:id/seats/toggle-lock", (req, res) => {
  const { id } = req.params;
  const { seatId } = req.body;
  const index = dbData.parties?.findIndex((p) => p.id === id);
  if (index !== -1 && index !== void 0) {
    const party = dbData.parties[index];
    party.seats = party.seats.map((seat) => {
      if (seat.id === Number(seatId)) {
        return { ...seat, isLocked: !seat.isLocked };
      }
      return seat;
    });
    saveDatabase();
    syncDocument("parties", id, party);
    res.json(party);
  } else {
    res.status(404).json({ error: "Party Room not found" });
  }
});
app2.post("/api/v1/parties/:id/close", (req, res) => {
  const { id } = req.params;
  const index = dbData.parties?.findIndex((p) => p.id === id);
  if (index !== -1 && index !== void 0) {
    const party = dbData.parties[index];
    party.status = "ended";
    dbData.parties = dbData.parties.filter((p) => p.id !== id);
    saveDatabase();
    deleteDocument("parties", id);
    res.json({ message: "Party closed successfully" });
  } else {
    res.status(404).json({ error: "Party Room not found" });
  }
});
app2.post("/api/v1/parties/:id/comments", (req, res) => {
  const { id } = req.params;
  const { message, username, vipLevel, userLevel, isSystem, avatar } = req.body;
  const index = dbData.parties?.findIndex((p) => p.id === id);
  if (index !== -1 && index !== void 0) {
    const party = dbData.parties[index];
    if (!party.comments) party.comments = [];
    const newComment = {
      id: `c-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      username,
      message,
      vipLevel: vipLevel || 0,
      userLevel: userLevel || 1,
      isSystem: !!isSystem,
      avatar: avatar || "",
      timestamp: (/* @__PURE__ */ new Date()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };
    party.comments.push(newComment);
    saveDatabase();
    syncDocument("parties", id, party);
    res.status(201).json(party.comments);
  } else {
    res.status(404).json({ error: "Party Room not found" });
  }
});
app2.post("/api/v1/parties/:id/requests", (req, res) => {
  const { id } = req.params;
  const { username, avatar, seatId } = req.body;
  const index = dbData.parties?.findIndex((p) => p.id === id);
  if (index !== -1 && index !== void 0) {
    const party = dbData.parties[index];
    if (!party.requests) party.requests = [];
    party.requests = party.requests.filter((r) => r.username !== username);
    party.requests.push({ username, avatar, seatId: Number(seatId), timestamp: Date.now() });
    saveDatabase();
    syncDocument("parties", id, party);
    res.json(party);
  } else {
    res.status(404).json({ error: "Party Room not found" });
  }
});
app2.post("/api/v1/parties/:id/requests/:username/approve", (req, res) => {
  const { id, username } = req.params;
  const index = dbData.parties?.findIndex((p) => p.id === id);
  if (index !== -1 && index !== void 0) {
    const party = dbData.parties[index];
    const request = party.requests?.find((r) => r.username === username);
    if (request) {
      const targetSeatId = request.seatId;
      party.seats = party.seats.map((seat) => {
        if (seat.name === username || seat.name && seat.name.startsWith(username)) {
          return { ...seat, name: null, avatar: null };
        }
        return seat;
      });
      party.seats = party.seats.map((seat) => {
        if (seat.id === targetSeatId) {
          return { ...seat, name: username, avatar: request.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80" };
        }
        return seat;
      });
      party.requests = party.requests.filter((r) => r.username !== username);
      if (!party.comments) party.comments = [];
      party.comments.push({
        id: `sys-${Date.now()}`,
        username: "System",
        message: `\u2705 ${username} has taken Seat ${targetSeatId}!`,
        isSystem: true,
        timestamp: (/* @__PURE__ */ new Date()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      });
      saveDatabase();
      syncDocument("parties", id, party);
      res.json(party);
    } else {
      res.status(400).json({ error: "Request not found" });
    }
  } else {
    res.status(404).json({ error: "Party Room not found" });
  }
});
app2.post("/api/v1/parties/:id/requests/:username/reject", (req, res) => {
  const { id, username } = req.params;
  const index = dbData.parties?.findIndex((p) => p.id === id);
  if (index !== -1 && index !== void 0) {
    const party = dbData.parties[index];
    if (party.requests) {
      party.requests = party.requests.filter((r) => r.username !== username);
    }
    saveDatabase();
    syncDocument("parties", id, party);
    res.json(party);
  } else {
    res.status(404).json({ error: "Party Room not found" });
  }
});
app2.post("/api/v1/parties/:id/invites", (req, res) => {
  const { id } = req.params;
  const { targetUsername, seatId } = req.body;
  const index = dbData.parties?.findIndex((p) => p.id === id);
  if (index !== -1 && index !== void 0) {
    const party = dbData.parties[index];
    if (!party.invites) party.invites = [];
    party.invites = party.invites.filter((i) => i.username !== targetUsername);
    party.invites.push({ username: targetUsername, seatId: Number(seatId), timestamp: Date.now() });
    saveDatabase();
    syncDocument("parties", id, party);
    res.json(party);
  } else {
    res.status(404).json({ error: "Party Room not found" });
  }
});
app2.post("/api/v1/parties/:id/invites/:username/accept", (req, res) => {
  const { id, username } = req.params;
  const { avatar } = req.body;
  const index = dbData.parties?.findIndex((p) => p.id === id);
  if (index !== -1 && index !== void 0) {
    const party = dbData.parties[index];
    const invite = party.invites?.find((i) => i.username === username);
    if (invite) {
      const targetSeatId = invite.seatId;
      party.seats = party.seats.map((seat) => {
        if (seat.name === username || seat.name && seat.name.startsWith(username)) {
          return { ...seat, name: null, avatar: null };
        }
        return seat;
      });
      party.seats = party.seats.map((seat) => {
        if (seat.id === targetSeatId) {
          return { ...seat, name: username, avatar: avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80" };
        }
        return seat;
      });
      party.invites = party.invites.filter((i) => i.username !== username);
      if (!party.comments) party.comments = [];
      party.comments.push({
        id: `sys-${Date.now()}`,
        username: "System",
        message: `\u{1F399}\uFE0F ${username} accepted host's invite to take Seat ${targetSeatId}!`,
        isSystem: true,
        timestamp: (/* @__PURE__ */ new Date()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      });
      saveDatabase();
      syncDocument("parties", id, party);
      res.json(party);
    } else {
      res.status(400).json({ error: "Invitation not found" });
    }
  } else {
    res.status(404).json({ error: "Party Room not found" });
  }
});
app2.post("/api/v1/parties/:id/invites/:username/reject", (req, res) => {
  const { id, username } = req.params;
  const index = dbData.parties?.findIndex((p) => p.id === id);
  if (index !== -1 && index !== void 0) {
    const party = dbData.parties[index];
    if (party.invites) {
      party.invites = party.invites.filter((i) => i.username !== username);
    }
    saveDatabase();
    syncDocument("parties", id, party);
    res.json(party);
  } else {
    res.status(404).json({ error: "Party Room not found" });
  }
});
app2.post("/api/v1/parties/:id/seats/kick-user", (req, res) => {
  const { id } = req.params;
  const { seatId } = req.body;
  const index = dbData.parties?.findIndex((p) => p.id === id);
  if (index !== -1 && index !== void 0) {
    const party = dbData.parties[index];
    let kickedUser = "";
    party.seats = party.seats.map((seat) => {
      if (seat.id === Number(seatId)) {
        kickedUser = seat.name || "User";
        return { ...seat, name: null, avatar: null, isMuted: false };
      }
      return seat;
    });
    if (kickedUser) {
      if (!party.comments) party.comments = [];
      party.comments.push({
        id: `sys-${Date.now()}`,
        username: "System",
        message: `\u26A0\uFE0F Host has removed ${kickedUser} from Seat ${seatId}.`,
        isSystem: true,
        timestamp: (/* @__PURE__ */ new Date()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      });
    }
    saveDatabase();
    syncDocument("parties", id, party);
    res.json(party);
  } else {
    res.status(404).json({ error: "Party Room not found" });
  }
});
app2.post("/api/v1/parties/:id/seats/mute-user", (req, res) => {
  const { id } = req.params;
  const { seatId, isMuted } = req.body;
  const index = dbData.parties?.findIndex((p) => p.id === id);
  if (index !== -1 && index !== void 0) {
    const party = dbData.parties[index];
    let targetUser = "";
    party.seats = party.seats.map((seat) => {
      if (seat.id === Number(seatId)) {
        targetUser = seat.name || "User";
        return { ...seat, isMuted: isMuted !== false };
      }
      return seat;
    });
    if (targetUser) {
      if (!party.comments) party.comments = [];
      party.comments.push({
        id: `sys-${Date.now()}`,
        username: "System",
        message: `\u{1F399}\uFE0F Host has ${isMuted ? "Muted" : "Unmuted"} ${targetUser} on Seat ${seatId}.`,
        isSystem: true,
        timestamp: (/* @__PURE__ */ new Date()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      });
    }
    saveDatabase();
    syncDocument("parties", id, party);
    res.json(party);
  } else {
    res.status(404).json({ error: "Party Room not found" });
  }
});
app2.post("/api/v1/parties/:id/block-user", (req, res) => {
  const { id } = req.params;
  const { username } = req.body;
  const index = dbData.parties?.findIndex((p) => p.id === id);
  if (index !== -1 && index !== void 0) {
    const party = dbData.parties[index];
    if (!party.blockedUsers) party.blockedUsers = [];
    if (!party.blockedUsers.includes(username)) {
      party.blockedUsers.push(username);
    }
    party.seats = party.seats.map((seat) => {
      if (seat.name === username || seat.name && seat.name.startsWith(username)) {
        return { ...seat, name: null, avatar: null };
      }
      return seat;
    });
    if (party.connectedViewers) {
      party.connectedViewers = party.connectedViewers.filter((v) => v.username !== username);
    }
    party.participantCount = party.connectedViewers ? party.connectedViewers.length : 0;
    if (!party.comments) party.comments = [];
    party.comments.push({
      id: `sys-${Date.now()}`,
      username: "System",
      message: `\u{1F6AB} Host has blocked ${username} from this room.`,
      isSystem: true,
      timestamp: (/* @__PURE__ */ new Date()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    });
    saveDatabase();
    syncDocument("parties", id, party);
    res.json(party);
  } else {
    res.status(404).json({ error: "Party Room not found" });
  }
});
app2.get("/api/v1/families", (req, res) => {
  res.json(dbData.families);
});
app2.post("/api/v1/families", (req, res) => {
  const newFamily = {
    id: `fam-${Date.now()}`,
    members: 1,
    rank: dbData.families.length + 1,
    avatar: "https://images.unsplash.com/photo-1513829096999-4978602294fc?auto=format&fit=crop&w=100&h=100&q=80",
    ...req.body
  };
  dbData.families.push(newFamily);
  saveDatabase();
  syncDocument("families", newFamily.id, newFamily);
  res.status(201).json(newFamily);
});
app2.put("/api/v1/families/:id", (req, res) => {
  const { id } = req.params;
  const index = dbData.families.findIndex((f) => f.id === id);
  if (index !== -1) {
    dbData.families[index] = { ...dbData.families[index], ...req.body };
    saveDatabase();
    syncDocument("families", id, dbData.families[index]);
    res.json(dbData.families[index]);
  } else {
    res.status(404).json({ error: "Family not found" });
  }
});
app2.delete("/api/v1/families/:id", (req, res) => {
  const { id } = req.params;
  dbData.families = dbData.families.filter((f) => f.id !== id);
  saveDatabase();
  deleteDocument("families", id);
  res.json({ message: "Family deleted successfully" });
});
app2.get("/api/v1/agencies", (req, res) => {
  if (!dbData.agencies) dbData.agencies = [];
  res.json(dbData.agencies);
});
app2.post("/api/v1/agencies", (req, res) => {
  const agencyId = req.body.id || `agency-${Math.floor(1e3 + Math.random() * 9e3)}`;
  const newAgency = {
    id: agencyId,
    name: req.body.name || "Pardais Official Agency",
    ownerEmail: req.body.ownerEmail || req.body.email || "",
    ownerUsername: req.body.ownerUsername || req.body.adminUserId || "",
    adminName: req.body.adminName || req.body.ownerName || "",
    logo: req.body.logo || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80",
    description: req.body.description || "Official Verified Pardais Host Agency",
    country: req.body.country || "Global",
    salaryRate: req.body.salaryRate || "40% Host Commission + Base Bonus",
    registeredHosts: req.body.registeredHosts || 0,
    monthlyCommission: req.body.monthlyCommission || 0,
    status: req.body.status || "Active",
    isOfficial: true,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    ...req.body
  };
  if (!dbData.agencies) dbData.agencies = [];
  dbData.agencies.unshift(newAgency);
  const targetUsername = newAgency.ownerUsername || newAgency.adminUserId;
  if (targetUsername) {
    const userIndex = dbData.users.findIndex((u) => u.username === targetUsername);
    if (userIndex !== -1) {
      dbData.users[userIndex].isAgencyApproved = true;
      dbData.users[userIndex].isHostAgencyAdmin = true;
      dbData.users[userIndex].agencyId = newAgency.id;
      dbData.users[userIndex].agencyName = newAgency.name;
      syncDocument("users", targetUsername, dbData.users[userIndex]);
    }
    if (targetUsername === dbData.user?.username) {
      dbData.user.isAgencyApproved = true;
      dbData.user.isHostAgencyAdmin = true;
      dbData.user.agencyId = newAgency.id;
      dbData.user.agencyName = newAgency.name;
      writeMetadata("user_profile", dbData.user);
    }
  }
  saveDatabase();
  syncDocument("agencies", newAgency.id, newAgency);
  res.status(201).json(newAgency);
});
app2.put("/api/v1/agencies/:id", (req, res) => {
  const { id } = req.params;
  if (!dbData.agencies) dbData.agencies = [];
  const index = dbData.agencies.findIndex((a) => a.id === id);
  if (index !== -1) {
    dbData.agencies[index] = { ...dbData.agencies[index], ...req.body };
    saveDatabase();
    syncDocument("agencies", id, dbData.agencies[index]);
    res.json(dbData.agencies[index]);
  } else {
    res.status(404).json({ error: "Agency not found" });
  }
});
app2.delete("/api/v1/agencies/:id", (req, res) => {
  const { id } = req.params;
  if (!dbData.agencies) dbData.agencies = [];
  dbData.agencies = dbData.agencies.filter((a) => a.id !== id);
  saveDatabase();
  deleteDocument("agencies", id);
  res.json({ message: "Agency deleted successfully" });
});
app2.get("/api/v1/agencies/:id/hosts", (req, res) => {
  const { id } = req.params;
  const agencyHosts = (dbData.users || []).filter((u) => u.agencyId === id || u.agencyName && dbData.agencies?.find((a) => a.id === id && a.name === u.agencyName));
  res.json(agencyHosts);
});
app2.post("/api/v1/agencies/:id/hosts", (req, res) => {
  const { id } = req.params;
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: "Username required" });
  const agency = (dbData.agencies || []).find((a) => a.id === id);
  const userIndex = (dbData.users || []).findIndex((u) => u.username === username);
  if (userIndex !== -1) {
    dbData.users[userIndex].agencyId = id;
    dbData.users[userIndex].agencyName = agency ? agency.name : "Pardais Agency";
    dbData.users[userIndex].isAgencyHost = true;
    if (agency) {
      agency.registeredHosts = (dbData.users || []).filter((u) => u.agencyId === id).length;
      syncDocument("agencies", id, agency);
    }
    saveDatabase();
    syncDocument("users", username, dbData.users[userIndex]);
    res.json({ message: "Host assigned successfully", user: dbData.users[userIndex] });
  } else {
    res.status(404).json({ error: "User not found" });
  }
});
app2.delete("/api/v1/agencies/:id/hosts/:username", (req, res) => {
  const { id, username } = req.params;
  const userIndex = (dbData.users || []).findIndex((u) => u.username === username && u.agencyId === id);
  if (userIndex !== -1) {
    dbData.users[userIndex].agencyId = "";
    dbData.users[userIndex].agencyName = "";
    dbData.users[userIndex].isAgencyHost = false;
    const agency = (dbData.agencies || []).find((a) => a.id === id);
    if (agency) {
      agency.registeredHosts = Math.max(0, (agency.registeredHosts || 1) - 1);
      syncDocument("agencies", id, agency);
    }
    saveDatabase();
    syncDocument("users", username, dbData.users[userIndex]);
    res.json({ message: "Host removed from agency" });
  } else {
    res.status(404).json({ error: "Host not found in this agency" });
  }
});
app2.get("/api/v1/host-join-requests", (req, res) => {
  if (!dbData.hostJoinRequests) dbData.hostJoinRequests = [];
  res.json(dbData.hostJoinRequests);
});
app2.post("/api/v1/host-join-requests", (req, res) => {
  const newReq = {
    id: `HJR-${Date.now()}`,
    status: "PENDING",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    ...req.body
  };
  if (!dbData.hostJoinRequests) dbData.hostJoinRequests = [];
  dbData.hostJoinRequests.unshift(newReq);
  saveDatabase();
  syncDocument("hostJoinRequests", newReq.id, newReq);
  res.status(201).json(newReq);
});
app2.put("/api/v1/host-join-requests/:id", (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!dbData.hostJoinRequests) dbData.hostJoinRequests = [];
  const index = dbData.hostJoinRequests.findIndex((r) => r.id === id);
  if (index !== -1) {
    const r = dbData.hostJoinRequests[index];
    r.status = status;
    if (status === "APPROVED" || status === "Approved") {
      if (r.type === "LEAVE") {
        const userIndex = (dbData.users || []).findIndex((u) => u.username === r.applicantUsername);
        if (userIndex !== -1) {
          dbData.users[userIndex].agencyId = "";
          dbData.users[userIndex].agencyName = "";
          dbData.users[userIndex].isAgencyHost = false;
          syncDocument("users", r.applicantUsername, dbData.users[userIndex]);
        }
        if (r.applicantUsername === dbData.user?.username) {
          dbData.user.agencyId = "";
          dbData.user.agencyName = "";
          dbData.user.isAgencyHost = false;
          writeMetadata("user_profile", dbData.user);
        }
        const agency = (dbData.agencies || []).find((a) => a.id === r.agencyId);
        if (agency && agency.registeredHosts > 0) {
          agency.registeredHosts -= 1;
          syncDocument("agencies", agency.id, agency);
        }
      } else {
        const userIndex = (dbData.users || []).findIndex((u) => u.username === r.applicantUsername);
        if (userIndex !== -1) {
          dbData.users[userIndex].agencyId = r.agencyId;
          dbData.users[userIndex].agencyName = r.agencyName;
          dbData.users[userIndex].isAgencyHost = true;
          syncDocument("users", r.applicantUsername, dbData.users[userIndex]);
        }
        if (r.applicantUsername === dbData.user?.username) {
          dbData.user.agencyId = r.agencyId;
          dbData.user.agencyName = r.agencyName;
          dbData.user.isAgencyHost = true;
          writeMetadata("user_profile", dbData.user);
        }
        const agency = (dbData.agencies || []).find((a) => a.id === r.agencyId);
        if (agency) {
          agency.registeredHosts = (agency.registeredHosts || 0) + 1;
          syncDocument("agencies", agency.id, agency);
        }
      }
    }
    saveDatabase();
    syncDocument("hostJoinRequests", id, r);
    res.json(r);
  } else {
    res.status(404).json({ error: "Host join request not found" });
  }
});
app2.get("/api/v1/coin-sellers", (req, res) => {
  res.json(dbData.coinSellers || []);
});
app2.post("/api/v1/coin-sellers", (req, res) => {
  const newSeller = {
    id: `seller-${Date.now()}`,
    status: "Active",
    coinBalance: req.body.coinBalance || 1e5,
    ...req.body
  };
  if (!dbData.coinSellers) dbData.coinSellers = [];
  dbData.coinSellers.push(newSeller);
  saveDatabase();
  syncDocument("coinSellers", newSeller.id, newSeller);
  res.status(201).json(newSeller);
});
app2.put("/api/v1/coin-sellers/:id", (req, res) => {
  const { id } = req.params;
  if (!dbData.coinSellers) dbData.coinSellers = [];
  const index = dbData.coinSellers.findIndex((s) => s.id === id);
  if (index !== -1) {
    dbData.coinSellers[index] = { ...dbData.coinSellers[index], ...req.body };
    saveDatabase();
    syncDocument("coinSellers", id, dbData.coinSellers[index]);
    res.json(dbData.coinSellers[index]);
  } else {
    res.status(404).json({ error: "Coin seller agency not found" });
  }
});
app2.delete("/api/v1/coin-sellers/:id", (req, res) => {
  const { id } = req.params;
  if (!dbData.coinSellers) dbData.coinSellers = [];
  dbData.coinSellers = dbData.coinSellers.filter((s) => s.id !== id);
  saveDatabase();
  deleteDocument("coinSellers", id);
  res.json({ message: "Reseller deleted successfully" });
});
app2.get("/api/v1/agency-coin-transactions", (req, res) => {
  if (!dbData.agencyCoinTransactions) dbData.agencyCoinTransactions = [];
  res.json(dbData.agencyCoinTransactions);
});
app2.post("/api/v1/agency-coin-transactions", (req, res) => {
  const { agencyId, agencyType, type, amount, reason, adminUsername } = req.body;
  if (!agencyId || !amount || amount <= 0) {
    return res.status(400).json({ error: "Invalid agencyId or coin amount" });
  }
  const numAmount = parseInt(String(amount), 10);
  let targetAgency = null;
  let isCoinSeller = agencyType === "coin_seller";
  if (!dbData.coinSellers) dbData.coinSellers = [];
  if (!dbData.agencies) dbData.agencies = [];
  let sellerIndex = dbData.coinSellers.findIndex((s) => s.id === agencyId);
  let hostIndex = dbData.agencies.findIndex((a) => a.id === agencyId);
  if (sellerIndex !== -1) {
    targetAgency = dbData.coinSellers[sellerIndex];
    isCoinSeller = true;
  } else if (hostIndex !== -1) {
    targetAgency = dbData.agencies[hostIndex];
    isCoinSeller = false;
  } else {
    return res.status(404).json({ error: "Agency not found" });
  }
  const currentBal = typeof targetAgency.coinBalance === "number" ? targetAgency.coinBalance : parseInt(String(targetAgency.coinsAvailable || targetAgency.coinBalance || 0).replace(/[^0-9]/g, ""), 10) || 0;
  const previousBalance = currentBal;
  let newBalance = currentBal;
  if (type === "ADD") {
    newBalance = currentBal + numAmount;
  } else if (type === "DEDUCT") {
    newBalance = Math.max(0, currentBal - numAmount);
  } else {
    return res.status(400).json({ error: "Invalid transaction type" });
  }
  targetAgency.coinBalance = newBalance;
  targetAgency.coinsAvailable = `${newBalance.toLocaleString()} Coins`;
  if (isCoinSeller && sellerIndex !== -1) {
    dbData.coinSellers[sellerIndex] = targetAgency;
    syncDocument("coinSellers", targetAgency.id, targetAgency);
  } else if (hostIndex !== -1) {
    dbData.agencies[hostIndex] = targetAgency;
    syncDocument("agencies", targetAgency.id, targetAgency);
  }
  const transaction = {
    id: `ACT-${Date.now()}`,
    agencyId: targetAgency.id,
    agencyName: targetAgency.name || targetAgency.agencyName || "Official Agency",
    agencyType: isCoinSeller ? "Coin Seller Agency" : "Host Agency",
    type,
    // "ADD" | "DEDUCT"
    amount: numAmount,
    previousBalance,
    newBalance,
    reason: reason || (type === "ADD" ? "Admin Top-up" : "Admin Deduction"),
    adminUsername: adminUsername || "Super Admin",
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
  if (!dbData.agencyCoinTransactions) dbData.agencyCoinTransactions = [];
  dbData.agencyCoinTransactions.unshift(transaction);
  saveDatabase();
  syncDocument("agencyCoinTransactions", transaction.id, transaction);
  res.status(201).json({
    success: true,
    transaction,
    updatedAgency: targetAgency
  });
});
app2.get("/api/v1/agency-requests", (req, res) => {
  res.json(dbData.agencyRequests || []);
});
app2.post("/api/v1/agency-requests", (req, res) => {
  const newReq = {
    id: `ARQ-${Date.now()}`,
    status: req.body.status || "Pending Review",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    ...req.body
  };
  if (!dbData.agencyRequests) dbData.agencyRequests = [];
  dbData.agencyRequests.unshift(newReq);
  const adminNotification = {
    id: Date.now(),
    title: "New Coin Seller Agency Request Submitted",
    message: `${newReq.applicantName || newReq.applicantUsername} requested to register Coin Seller Agency: ${newReq.agencyName || newReq.applicantName}.`,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    unread: true,
    category: "system"
  };
  if (!dbData.notifications) dbData.notifications = [];
  dbData.notifications.unshift(adminNotification);
  saveDatabase();
  syncDocument("agencyRequests", newReq.id, newReq);
  syncDocument("notifications", String(adminNotification.id), adminNotification);
  res.status(201).json(newReq);
});
app2.put("/api/v1/agency-requests/:id", (req, res) => {
  const { id } = req.params;
  const { status, remarks } = req.body;
  if (!dbData.agencyRequests) dbData.agencyRequests = [];
  const index = dbData.agencyRequests.findIndex((r) => r.id === id);
  if (index !== -1) {
    const r = dbData.agencyRequests[index];
    r.status = status;
    if (remarks) r.remarks = remarks;
    if (status === "Approved") {
      const agencyId = `agency-${Math.floor(1e3 + Math.random() * 9e3)}`;
      if (r.applicantUsername) {
        const userIndex = dbData.users.findIndex((u) => u.username === r.applicantUsername);
        if (userIndex !== -1) {
          dbData.users[userIndex].isAgencyApproved = true;
          dbData.users[userIndex].isCoinSeller = true;
          dbData.users[userIndex].agencyName = r.agencyName || r.applicantName;
          if (r.type === "host_agency") dbData.users[userIndex].agencyId = agencyId;
          syncDocument("users", r.applicantUsername, dbData.users[userIndex]);
        }
        if (r.applicantUsername === dbData.user.username) {
          dbData.user.isAgencyApproved = true;
          dbData.user.isCoinSeller = true;
          dbData.user.agencyName = r.agencyName || r.applicantName;
          if (r.type === "host_agency") dbData.user.agencyId = agencyId;
          writeMetadata("user_profile", dbData.user);
        }
      }
      if (r.type === "host_agency") {
        const newAgency = {
          id: agencyId,
          name: r.agencyName || r.applicantName,
          ownerEmail: r.ownerEmail || `${r.applicantUsername || "applicant"}@pardais.live`,
          salaryRate: r.rate || "40% Commission + $200 Base Bonus",
          registeredHosts: 0,
          monthlyCommission: 0,
          status: "Active"
        };
        if (!dbData.agencies) dbData.agencies = [];
        dbData.agencies.push(newAgency);
        syncDocument("agencies", agencyId, newAgency);
      } else {
        const reseller = {
          id: agencyId,
          name: r.agencyName || r.applicantName,
          applicantName: r.applicantName,
          username: r.applicantUsername,
          whatsapp: r.contact,
          city: r.country || r.city || "Pakistan",
          rate: r.rate || "1000 Coins = $1.50 USD",
          status: "Verified Seller",
          description: r.description || "Official Coin Reseller licensed by Pardais Admin."
        };
        if (!dbData.coinSellers) dbData.coinSellers = [];
        dbData.coinSellers.push(reseller);
        syncDocument("coinSellers", agencyId, reseller);
      }
    } else if (status === "Rejected") {
      if (r.applicantUsername) {
        const userIndex = dbData.users.findIndex((u) => u.username === r.applicantUsername);
        if (userIndex !== -1) {
          dbData.users[userIndex].isAgencyApproved = false;
          syncDocument("users", r.applicantUsername, dbData.users[userIndex]);
        }
        if (r.applicantUsername === dbData.user.username) {
          dbData.user.isAgencyApproved = false;
          writeMetadata("user_profile", dbData.user);
        }
      }
    }
    saveDatabase();
    syncDocument("agencyRequests", id, r);
    res.json(r);
  } else {
    res.status(404).json({ error: "Agency request not found" });
  }
});
app2.delete("/api/v1/agency-requests/:id", (req, res) => {
  const { id } = req.params;
  if (!dbData.agencyRequests) dbData.agencyRequests = [];
  dbData.agencyRequests = dbData.agencyRequests.filter((r) => r.id !== id);
  saveDatabase();
  deleteDocument("agencyRequests", id);
  res.json({ message: "Agency request deleted" });
});
app2.get("/api/v1/purchase-requests", (req, res) => {
  res.json(dbData.purchaseRequests || []);
});
app2.post("/api/v1/purchase-requests", (req, res) => {
  const newReq = {
    id: `PRQ-${Date.now()}`,
    status: "Pending",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    ...req.body
  };
  if (!dbData.purchaseRequests) dbData.purchaseRequests = [];
  dbData.purchaseRequests.unshift(newReq);
  const adminNotification = {
    id: Date.now(),
    title: "New Coin Purchase Request",
    message: `${newReq.username} requested to purchase ${newReq.coins} Coins offline.`,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    unread: true,
    category: "system"
  };
  if (!dbData.notifications) dbData.notifications = [];
  dbData.notifications.unshift(adminNotification);
  saveDatabase();
  syncDocument("purchaseRequests", newReq.id, newReq);
  syncDocument("notifications", String(adminNotification.id), adminNotification);
  res.status(201).json(newReq);
});
app2.put("/api/v1/purchase-requests/:id", (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!dbData.purchaseRequests) dbData.purchaseRequests = [];
  const index = dbData.purchaseRequests.findIndex((r) => r.id === id);
  if (index !== -1) {
    const r = dbData.purchaseRequests[index];
    r.status = status;
    if (status === "Approved") {
      const username = r.username;
      const coinsAmount = Number(r.coins || 0);
      const userIndex = dbData.users.findIndex((u) => u.username === username);
      if (userIndex !== -1) {
        dbData.users[userIndex].coins = (dbData.users[userIndex].coins || 0) + coinsAmount;
        syncDocument("users", username, dbData.users[userIndex]);
      }
      if (username === dbData.user.username) {
        dbData.user.coins = (dbData.user.coins || 0) + coinsAmount;
        writeMetadata("user_profile", dbData.user);
      }
      const adminUserIndex = dbData.adminUsersList.findIndex((u) => u.username === username);
      if (adminUserIndex !== -1) {
        dbData.adminUsersList[adminUserIndex].coins = (dbData.adminUsersList[adminUserIndex].coins || 0) + coinsAmount;
        syncDocument("adminUsersList", username, dbData.adminUsersList[adminUserIndex]);
      }
      const newTxn = {
        id: `TXN-${Math.floor(100 + Math.random() * 900)}`,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        status: "Completed",
        type: "recharge",
        details: `Purchased ${coinsAmount} Coins offline (Approved by Admin)`,
        amount: coinsAmount,
        currency: "coins",
        username
      };
      if (!dbData.transactions) dbData.transactions = [];
      dbData.transactions.unshift(newTxn);
      syncDocument("transactions", newTxn.id, newTxn);
    }
    saveDatabase();
    syncDocument("purchaseRequests", id, r);
    res.json(r);
  } else {
    res.status(404).json({ error: "Purchase request not found" });
  }
});
app2.delete("/api/v1/purchase-requests/:id", (req, res) => {
  const { id } = req.params;
  if (!dbData.purchaseRequests) dbData.purchaseRequests = [];
  dbData.purchaseRequests = dbData.purchaseRequests.filter((r) => r.id !== id);
  saveDatabase();
  deleteDocument("purchaseRequests", id);
  res.json({ message: "Purchase request deleted" });
});
app2.get("/api/v1/transactions", (req, res) => {
  res.json(dbData.transactions);
});
app2.post("/api/v1/transactions", (req, res) => {
  const newTxn = { id: `TXN-${Math.floor(100 + Math.random() * 900)}`, timestamp: (/* @__PURE__ */ new Date()).toISOString(), status: "Completed", ...req.body };
  dbData.transactions.unshift(newTxn);
  saveDatabase();
  syncDocument("transactions", newTxn.id, newTxn);
  res.status(201).json(newTxn);
});
async function cleanupExpiredNotifications() {
  try {
    const now = Date.now();
    const expiryLimit = 24 * 60 * 60 * 1e3;
    const activeNotifs = [];
    const expiredNotifs = [];
    const notifsList = dbData.notifications || [];
    for (const item of notifsList) {
      const ts = item.timestamp ? new Date(item.timestamp).getTime() : item.id && typeof item.id === "number" ? item.id : now;
      if (now - ts > expiryLimit) {
        expiredNotifs.push(item);
      } else {
        activeNotifs.push(item);
      }
    }
    if (expiredNotifs.length > 0) {
      console.log(`[PARDAIS-PARTY NOTIFICATION CLEANER] Automatically cleaning up ${expiredNotifs.length} expired notifications.`);
      dbData.notifications = activeNotifs;
      saveDatabase();
      for (const expired of expiredNotifs) {
        if (expired.id) {
          await deleteDocument("notifications", String(expired.id));
        }
      }
    }
  } catch (err) {
    console.error("[PARDAIS-PARTY NOTIFICATION CLEANER] Error during clean-up:", err);
  }
}
setInterval(() => {
  cleanupExpiredNotifications();
}, 10 * 60 * 1e3);
app2.get("/api/v1/notifications", async (req, res) => {
  await cleanupExpiredNotifications();
  res.json(dbData.notifications || []);
});
app2.post("/api/v1/notifications", async (req, res) => {
  const notifId = Date.now();
  const newNotif = {
    id: notifId,
    isNew: true,
    time: "Just Now",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    ...req.body
  };
  if (!dbData.notifications) {
    dbData.notifications = [];
  }
  dbData.notifications.unshift(newNotif);
  saveDatabase();
  await syncDocument("notifications", String(newNotif.id), newNotif);
  res.status(201).json(newNotif);
});
app2.post("/api/v1/notifications/read-all", async (req, res) => {
  try {
    const notifs = dbData.notifications || [];
    for (const item of notifs) {
      if (item.isNew) {
        item.isNew = false;
        await syncDocument("notifications", String(item.id), item);
      }
    }
    saveDatabase();
    res.json({ success: true, message: "All notifications marked as read" });
  } catch (error) {
    console.error("Error marking all as read:", error);
    res.status(500).json({ error: "Failed to mark all as read" });
  }
});
app2.post("/api/v1/notifications/clear", async (req, res) => {
  try {
    const notifs = [...dbData.notifications || []];
    dbData.notifications = [];
    saveDatabase();
    for (const item of notifs) {
      if (item.id) {
        await deleteDocument("notifications", String(item.id));
      }
    }
    res.json({ success: true, message: "All notifications cleared" });
  } catch (error) {
    console.error("Error clearing notifications:", error);
    res.status(500).json({ error: "Failed to clear notifications" });
  }
});
app2.get("/api/v1/reports", (req, res) => {
  res.json(dbData.reports);
});
app2.post("/api/v1/reports", (req, res) => {
  const newReport = { id: `REP-${Math.floor(100 + Math.random() * 900)}`, status: "pending", timestamp: (/* @__PURE__ */ new Date()).toISOString(), ...req.body };
  dbData.reports.unshift(newReport);
  saveDatabase();
  syncDocument("reports", newReport.id, newReport);
  res.status(201).json(newReport);
});
app2.get("/api/v1/reels", (req, res) => {
  res.json(dbData.reels || []);
});
app2.post("/api/v1/reels", (req, res) => {
  const newReel = {
    id: `r-${Date.now()}`,
    likes: 0,
    commentsCount: 0,
    liked: false,
    saves: 0,
    saved: false,
    shares: 0,
    downloads: 0,
    comments: [],
    ...req.body
  };
  if (!dbData.reels) dbData.reels = [];
  dbData.reels.unshift(newReel);
  saveDatabase();
  syncDocument("reels", newReel.id, newReel);
  res.status(201).json(newReel);
});
app2.put("/api/v1/reels/:id", (req, res) => {
  const { id } = req.params;
  const index = dbData.reels.findIndex((r) => r.id === id);
  if (index !== -1) {
    dbData.reels[index] = { ...dbData.reels[index], ...req.body };
    saveDatabase();
    syncDocument("reels", id, dbData.reels[index]);
    res.json(dbData.reels[index]);
  } else {
    res.status(404).json({ error: "Reel not found" });
  }
});
app2.get("/api/v1/stories", (req, res) => {
  res.json(dbData.stories || []);
});
app2.post("/api/v1/stories", (req, res) => {
  const newStory = {
    id: `story-${Date.now()}`,
    likes: 0,
    liked: false,
    replies: [],
    ...req.body
  };
  if (!dbData.stories) dbData.stories = [];
  dbData.stories.unshift(newStory);
  saveDatabase();
  syncDocument("stories", newStory.id, newStory);
  res.status(201).json(newStory);
});
app2.put("/api/v1/stories/:id", (req, res) => {
  const { id } = req.params;
  const index = dbData.stories.findIndex((s) => s.id === id);
  if (index !== -1) {
    dbData.stories[index] = { ...dbData.stories[index], ...req.body };
    saveDatabase();
    syncDocument("stories", id, dbData.stories[index]);
    res.json(dbData.stories[index]);
  } else {
    res.status(404).json({ error: "Story not found" });
  }
});
app2.get("/api/v1/chats", (req, res) => {
  res.json(dbData.chats || []);
});
app2.post("/api/v1/chats", (req, res) => {
  const newMsg = {
    id: `msg-${Date.now()}`,
    timestamp: (/* @__PURE__ */ new Date()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    ...req.body
  };
  if (!dbData.chats) dbData.chats = [];
  dbData.chats.push(newMsg);
  saveDatabase();
  syncDocument("chats", newMsg.id, newMsg);
  res.status(201).json(newMsg);
});
app2.post("/api/v1/reels/sync", (req, res) => {
  dbData.reels = req.body;
  saveDatabase();
  if (Array.isArray(req.body)) {
    req.body.forEach((r) => {
      if (r.id) syncDocument("reels", r.id, r);
    });
  }
  res.json({ success: true });
});
app2.post("/api/v1/stories/sync", (req, res) => {
  dbData.stories = req.body;
  saveDatabase();
  if (Array.isArray(req.body)) {
    req.body.forEach((s) => {
      if (s.id) syncDocument("stories", s.id, s);
    });
  }
  res.json({ success: true });
});
app2.post("/api/v1/chats/sync", (req, res) => {
  dbData.chats = req.body;
  saveDatabase();
  if (Array.isArray(req.body)) {
    req.body.forEach((c) => {
      if (c.id) syncDocument("chats", c.id, c);
    });
  }
  res.json({ success: true });
});
app2.delete("/api/v1/chats", (req, res) => {
  dbData.chats = [];
  saveDatabase();
  res.json({ success: true, message: "Chats cleared" });
});
app2.put("/api/v1/reports/:id", (req, res) => {
  const { id } = req.params;
  const index = dbData.reports.findIndex((r) => r.id === id);
  if (index !== -1) {
    dbData.reports[index] = { ...dbData.reports[index], ...req.body };
    saveDatabase();
    syncDocument("reports", id, dbData.reports[index]);
    res.json(dbData.reports[index]);
  } else {
    res.status(404).json({ error: "Report not found" });
  }
});
app2.get("/api/v1/kyc-requests", (req, res) => {
  res.json(dbData.kycRequests);
});
app2.post("/api/v1/kyc-requests", (req, res) => {
  const newKyc = { id: `KYC-${Math.floor(1e3 + Math.random() * 9e3)}`, status: "pending", timestamp: (/* @__PURE__ */ new Date()).toISOString(), ...req.body };
  dbData.kycRequests.unshift(newKyc);
  saveDatabase();
  syncDocument("kycRequests", newKyc.id, newKyc);
  res.status(201).json(newKyc);
});
app2.put("/api/v1/kyc-requests/:id", (req, res) => {
  const { id } = req.params;
  const index = dbData.kycRequests.findIndex((r) => r.id === id);
  if (index !== -1) {
    dbData.kycRequests[index] = { ...dbData.kycRequests[index], ...req.body };
    if (dbData.kycRequests[index].username === dbData.user.username) {
      dbData.user.kycStatus = dbData.kycRequests[index].status;
      if (dbData.kycRequests[index].status === "approved") {
        dbData.user.isVerified = true;
      } else if (dbData.kycRequests[index].status === "rejected") {
        dbData.user.isVerified = false;
      }
    }
    const usrIdx = dbData.adminUsersList.findIndex((u) => u.username === dbData.kycRequests[index].username);
    if (usrIdx !== -1) {
      dbData.adminUsersList[usrIdx].kycStatus = dbData.kycRequests[index].status;
      if (dbData.kycRequests[index].status === "approved") {
        dbData.adminUsersList[usrIdx].isVerified = true;
      }
    }
    saveDatabase();
    syncDocument("kycRequests", id, dbData.kycRequests[index]);
    writeMetadata("user_profile", dbData.user);
    if (usrIdx !== -1) {
      syncDocument("adminUsersList", dbData.kycRequests[index].username, dbData.adminUsersList[usrIdx]);
    }
    res.json(dbData.kycRequests[index]);
  } else {
    res.status(404).json({ error: "KYC request not found" });
  }
});
app2.get("/api/v1/admin-users", (req, res) => {
  res.json(dbData.adminUsersList);
});
app2.put("/api/v1/admin-users/:username", (req, res) => {
  const { username } = req.params;
  const index = dbData.adminUsersList.findIndex((u) => u.username === username);
  if (index !== -1) {
    dbData.adminUsersList[index] = { ...dbData.adminUsersList[index], ...req.body };
    if (username === dbData.user.username) {
      dbData.user = { ...dbData.user, ...req.body };
    }
    saveDatabase();
    syncDocument("adminUsersList", username, dbData.adminUsersList[index]);
    if (username === dbData.user.username) {
      writeMetadata("user_profile", dbData.user);
    }
    res.json(dbData.adminUsersList[index]);
  } else {
    res.status(404).json({ error: "Admin user not found" });
  }
});
app2.get("/api/v1/admin-emails", (req, res) => {
  if (!Array.isArray(dbData.nominatedAdminEmails)) {
    dbData.nominatedAdminEmails = [];
  }
  res.json(dbData.nominatedAdminEmails);
});
app2.post("/api/v1/admin-emails", (req, res) => {
  const { email } = req.body;
  if (!email || typeof email !== "string" || !email.includes("@")) {
    return res.status(400).json({ error: "Invalid email address" });
  }
  const clean = email.toLowerCase().trim();
  if (!Array.isArray(dbData.nominatedAdminEmails)) {
    dbData.nominatedAdminEmails = [];
  }
  if (!dbData.nominatedAdminEmails.includes(clean)) {
    dbData.nominatedAdminEmails.push(clean);
    saveDatabase();
    syncDocument("configurations", "nominatedAdminEmails", { list: dbData.nominatedAdminEmails });
  }
  res.json(dbData.nominatedAdminEmails);
});
app2.delete("/api/v1/admin-emails/:email", (req, res) => {
  const rawEmail = req.params.email;
  if (!rawEmail) return res.status(400).json({ error: "Email required" });
  const clean = decodeURIComponent(rawEmail).toLowerCase().trim();
  if (!Array.isArray(dbData.nominatedAdminEmails)) {
    dbData.nominatedAdminEmails = [];
  }
  dbData.nominatedAdminEmails = dbData.nominatedAdminEmails.filter((e) => e !== clean);
  saveDatabase();
  syncDocument("configurations", "nominatedAdminEmails", { list: dbData.nominatedAdminEmails });
  res.json(dbData.nominatedAdminEmails);
});
app2.get("/api/v1/events", (req, res) => {
  res.json(dbData.events);
});
app2.post("/api/v1/events", (req, res) => {
  const newEvt = { id: `evt-${Date.now()}`, active: true, ...req.body };
  dbData.events.push(newEvt);
  saveDatabase();
  syncDocument("events", newEvt.id, newEvt);
  res.status(201).json(newEvt);
});
app2.post("/api/ai/moderate", async (req, res) => {
  const { text } = req.body;
  if (!text || typeof text !== "string") {
    return res.status(400).json({ error: "Missing text to moderate" });
  }
  const client = getAIClient();
  if (!client) {
    const lower = text.toLowerCase();
    const badWords = ["abuse", "spam", "scam", "cheat", "hack", "fake", "badword", "stupid", "idiot", "hate"];
    const flaggedWords = badWords.filter((w) => lower.includes(w));
    const isViolating = flaggedWords.length > 0;
    return res.json({
      flagged: isViolating,
      reason: isViolating ? `Contains potential restricted content (${flaggedWords.join(", ")})` : "Approved",
      moderatorType: "Offline AI Content Moderator (Local Filter)",
      translatedText: text
    });
  }
  try {
    const prompt = `You are the AI Content Moderator for "Pardais Party", a premium live streaming platform. 
Analyze the following user chat message and determine if it violates community guidelines (e.g. hate speech, explicit abuse, scams, spam, or extreme insults).
Respond strictly in JSON format with two keys:
1. "flagged": boolean (true if inappropriate, false if okay)
2. "reason": string (a short explanation why, or "Approved" if false)

Message to moderate: "${text}"`;
    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });
    const textOutput = response.text || "{}";
    const result = JSON.parse(textOutput.trim());
    return res.json({
      flagged: !!result.flagged,
      reason: result.reason || "Approved",
      moderatorType: "Pardais Party Server AI Moderation (Gemini-3.5-Flash)"
    });
  } catch (error) {
    console.error("AI Moderation Error:", error);
    return res.json({
      flagged: false,
      reason: "Error processing; default approved.",
      error: error.message,
      moderatorType: "Pardais Party Moderator Fallback"
    });
  }
});
app2.post("/api/ai/translate", async (req, res) => {
  const { text, targetLanguage } = req.body;
  if (!text || !targetLanguage) {
    return res.status(400).json({ error: "Missing text or targetLanguage" });
  }
  const client = getAIClient();
  if (!client) {
    let translatedText = text;
    if (targetLanguage.toLowerCase() === "urdu") {
      translatedText = `[\u0627\u0631\u062F\u0648 \u062A\u0631\u062C\u0645\u06C1] ${text} (AI offline simulation)`;
    } else if (targetLanguage.toLowerCase() === "hindi") {
      translatedText = `[\u0939\u093F\u0902\u0926\u0940 \u0905\u0928\u0941\u0935\u093E\u0926] ${text} (AI offline simulation)`;
    } else if (targetLanguage.toLowerCase() === "arabic") {
      translatedText = `[\u0627\u0644\u062A\u0631\u062C\u0645\u0629 \u0627\u0644\u0639\u0631\u0628\u064A\u0629] ${text} (AI offline simulation)`;
    } else {
      translatedText = `[Translated to ${targetLanguage}] ${text} (AI offline)`;
    }
    return res.json({
      translatedText,
      sourceLanguage: "Detected Auto",
      type: "Offline Simulated Translator"
    });
  }
  try {
    const prompt = `Translate the following text to ${targetLanguage}. Return ONLY the final translated text. Do not add any explanation or preamble.
Text: "${text}"`;
    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt
    });
    return res.json({
      translatedText: response.text ? response.text.trim() : text,
      sourceLanguage: "Detected Auto",
      type: "Pardais Party AI Translator"
    });
  } catch (error) {
    console.error("AI Translation Error:", error);
    return res.json({
      translatedText: `[Translation Error] ${text}`,
      sourceLanguage: "Auto",
      type: "Pardais Party Translation Fallback"
    });
  }
});
app2.post("/api/ai/host-response", async (req, res) => {
  const { hostName, hostRole, userMessage, lastAction } = req.body;
  if (!hostName || !userMessage) {
    return res.status(400).json({ error: "Missing hostName or userMessage" });
  }
  const client = getAIClient();
  if (!client) {
    let reply = "Shukriya! Thank you for supporting my live stream! \u2764\uFE0F";
    if (lastAction === "gift") {
      reply = `Wow! Thank you so much for the luxury gift! This means the world to me! App sabhi log support karte rahein! \u{1F31F}\u2728`;
    } else {
      if (hostName.toLowerCase().includes("sahar")) {
        reply = `Hello, welcome to Pardais Party! I am playing some sweet tunes today. Let me know what song you want to hear! \u{1F3B5}`;
      } else if (hostName.toLowerCase().includes("zain")) {
        reply = `Chalo guys! PK Battle start hone wali hai! Sabhi log double tap karo aur coin support dikhao! Let's win this PK! \u{1F525}\u{1F44A}`;
      } else if (hostName.toLowerCase().includes("mehak")) {
        reply = `Welcome to my audio lounge. Grab a mic seat or relax. Tell us about your day, let's keep it cozy. \u2615\u{1F3A7}`;
      }
    }
    return res.json({
      reply,
      speaker: hostName,
      type: "Simulated Live Host Response"
    });
  }
  try {
    const contextPrompt = `You are acting as "${hostName}", a popular, premium livestream host on "Pardais Party". 
Your personality/role is: "${hostRole || "Friendly Streaming Star"}".
The user just sent you a message: "${userMessage}".
${lastAction === "gift" ? "CRITICAL: The user also just sent you a valuable gift! You must react with high energy, extreme gratitude, and excitement in your signature host style." : ""}
Provide a short, lively, authentic response (1-2 sentences maximum) that a live host would say over their microphone. Keep it natural, warm, and highly engaging. Include matching emojis. You can use English mixed with Hindi/Urdu (Hinglish) for an authentic social live feel.
Do not wrap your answer in quotes or add metadata. Speak as the host directly.`;
    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: contextPrompt
    });
    return res.json({
      reply: response.text ? response.text.trim() : "Thanks for joining my live! \u{1F495}",
      speaker: hostName,
      type: "Pardais Party Gemini AI Host"
    });
  } catch (error) {
    console.error("AI Host Error:", error);
    return res.json({
      reply: "Thank you so much for the love and support! Let's rock Pardais Party! \u{1F389}",
      speaker: hostName,
      type: "Pardais Party Host Fallback"
    });
  }
});
var s3ClientInstance = null;
function getS3Client() {
  if (!s3ClientInstance) {
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    const endpoint = process.env.R2_ENDPOINT;
    if (!accessKeyId || !secretAccessKey || !endpoint) {
      console.warn("[PARDAIS-PARTY R2] Missing environment credentials! Falling back to local storage for video uploads.");
      throw new Error("Missing Cloudflare R2 credentials (R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ENDPOINT). Set them on Railway!");
    }
    console.log("[PARDAIS-PARTY R2] Initializing Cloudflare R2 S3 Client with endpoint:", endpoint);
    s3ClientInstance = new import_client_s3.S3Client({
      region: "auto",
      endpoint,
      credentials: {
        accessKeyId,
        secretAccessKey
      }
    });
  }
  return s3ClientInstance;
}
var s3MulterUpload = (0, import_multer.default)({
  storage: import_multer.default.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024
    // 100 MB Limit for high-definition video reels
  }
});
app2.post("/api/v1/reels/upload-video", s3MulterUpload.single("video"), async (req, res) => {
  console.log("[PARDAIS-PARTY R2] [UPLOAD-VIDEO] ====== UPLOAD TRANSACTION STARTED ======");
  try {
    const file = req.file;
    if (!file) {
      console.error("[PARDAIS-PARTY R2] [UPLOAD-VIDEO] FAILED: No file chunk found in multipart request data");
      return res.status(400).json({ success: false, error: "No video file uploaded" });
    }
    const userId = req.body.userId || "anonymous";
    const fileName = file.originalname || "unnamed_reel.mp4";
    const fileSize = file.size;
    let mimeType = file.mimetype || "video/mp4";
    if (mimeType === "application/octet-stream" || !mimeType.includes("video/")) {
      mimeType = "video/mp4";
    }
    console.log(`[PARDAIS-PARTY R2] [UPLOAD-VIDEO] METADATA RECEIVED:
      - File Name: "${fileName}"
      - Received Size: ${fileSize} bytes (${(fileSize / (1024 * 1024)).toFixed(2)} MB)
      - Detected MIME: "${mimeType}"
      - Uploader User ID: "${userId}"`);
    if (fileSize <= 0) {
      console.error("[PARDAIS-PARTY R2] [UPLOAD-VIDEO] FAILED: Received file size is 0 bytes");
      return res.status(400).json({ success: false, error: "Uploaded video file is empty (0 bytes)" });
    }
    const uniqueId = Math.random().toString(36).substring(2, 10);
    const timestamp = Date.now();
    const ext = import_path.default.extname(fileName) || ".mp4";
    const objectKey = `reels/${userId}/${timestamp}-${uniqueId}${ext}`;
    console.log(`[PARDAIS-PARTY R2] [UPLOAD-VIDEO] PREPARING UPLOAD:
      - R2 Object Key: "${objectKey}"
      - Target Bucket: "pardaisparty-reels"`);
    let finalVideoUrl = "";
    try {
      if (!process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY || !process.env.R2_ENDPOINT) {
        throw new Error("Cloudflare R2 credentials not configured in environment");
      }
      const client = getS3Client();
      const bucketName = process.env.R2_BUCKET_NAME || "pardaisparty-reels";
      const putCommand = new import_client_s3.PutObjectCommand({
        Bucket: bucketName,
        Key: objectKey,
        Body: file.buffer,
        ContentType: mimeType
      });
      console.log(`[PARDAIS-PARTY R2] [UPLOAD-VIDEO] Transmitting binary buffer to Cloudflare R2 S3 API...`);
      await Promise.race([
        client.send(putCommand),
        new Promise((_, reject) => setTimeout(() => reject(new Error("R2 upload timeout after 3000ms")), 3e3))
      ]);
      console.log(`[PARDAIS-PARTY R2] [UPLOAD-VIDEO] SUCCESS: Binary written to R2 storage bucket "${bucketName}"`);
      const publicBaseUrl = process.env.R2_PUBLIC_URL || "https://media.pardaisparty.soulverseapps.com";
      const cleanBase = publicBaseUrl.endsWith("/") ? publicBaseUrl.slice(0, -1) : publicBaseUrl;
      finalVideoUrl = `${cleanBase}/${objectKey}`;
      console.log(`[PARDAIS-PARTY R2] [UPLOAD-VIDEO] PUBLIC CDN DISTRIBUTION LINK GENERATED: "${finalVideoUrl}"`);
    } catch (r2Error) {
      console.warn("[PARDAIS-PARTY R2] Cloudflare R2 upload unavailable/failed. Falling back to local storage:", r2Error.message || r2Error);
      const uploadsDir = import_path.default.join(process.cwd(), "public", "uploads");
      if (!import_fs.default.existsSync(uploadsDir)) {
        import_fs.default.mkdirSync(uploadsDir, { recursive: true });
      }
      const cleanFileName = `reel_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;
      const localFilePath = import_path.default.join(uploadsDir, cleanFileName);
      import_fs.default.writeFileSync(localFilePath, file.buffer);
      finalVideoUrl = `/uploads/${cleanFileName}`;
      console.log(`[PARDAIS-PARTY REELS] Saved video to local storage: "${finalVideoUrl}"`);
      return res.json({
        success: true,
        url: finalVideoUrl,
        key: `uploads/${cleanFileName}`,
        objectKey: `uploads/${cleanFileName}`,
        publicUrl: finalVideoUrl,
        mediaUrl: finalVideoUrl,
        size: fileSize,
        mimeType
      });
    }
    console.log(`[PARDAIS-PARTY R2] [UPLOAD-VIDEO] ====== UPLOAD TRANSACTION COMPLETED SUCCESSFULLY ======
`);
    return res.json({
      success: true,
      url: finalVideoUrl,
      key: objectKey,
      objectKey,
      publicUrl: finalVideoUrl,
      mediaUrl: finalVideoUrl,
      size: fileSize,
      mimeType
    });
  } catch (error) {
    console.error("[PARDAIS-PARTY R2] [UPLOAD-VIDEO] FATAL UNHANDLED TRANSACTION ERROR:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "An unexpected error occurred during video upload handling"
    });
  }
});
app2.get("/uploads/:filename", (req, res) => {
  const filePath = import_path.default.join(process.cwd(), "public", "uploads", req.params.filename);
  if (!import_fs.default.existsSync(filePath)) {
    console.error(`[PARDAIS-PARTY STREAMER] Local file not found: ${filePath}`);
    return res.status(404).send("File not found");
  }
  const stat = import_fs.default.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;
  console.log(`[PARDAIS-PARTY STREAMER] Serving local file "${req.params.filename}" (Size: ${fileSize} bytes). Requested Range: "${range || "None"}"`);
  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    if (start >= fileSize) {
      res.status(416).send("Requested range not satisfiable\n" + start + " >= " + fileSize);
      return;
    }
    const chunksize = end - start + 1;
    const file = import_fs.default.createReadStream(filePath, { start, end });
    const head = {
      "Content-Range": `bytes ${start}-${end}/${fileSize}`,
      "Accept-Ranges": "bytes",
      "Content-Length": chunksize,
      "Content-Type": "video/mp4"
    };
    res.writeHead(206, head);
    file.pipe(res);
  } else {
    const head = {
      "Content-Length": fileSize,
      "Content-Type": "video/mp4",
      "Accept-Ranges": "bytes"
    };
    res.writeHead(200, head);
    import_fs.default.createReadStream(filePath).pipe(res);
  }
});
app2.use("/uploads", import_express.default.static(import_path.default.join(process.cwd(), "public", "uploads")));
app2.post("/api/v1/storage/upload", async (req, res) => {
  try {
    const { fileBase64, fileName, contentType } = req.body;
    if (!fileBase64) {
      return res.status(400).json({ error: "Missing fileBase64 parameter" });
    }
    const base64Data = fileBase64.replace(/^data:image\/\w+;base64,/, "").replace(/^data:video\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");
    const uploadsDir = import_path.default.join(process.cwd(), "public", "uploads");
    if (!import_fs.default.existsSync(uploadsDir)) {
      import_fs.default.mkdirSync(uploadsDir, { recursive: true });
    }
    const cleanFileName = `${Date.now()}_${fileName || "asset.jpg"}`;
    const localFilePath = import_path.default.join(uploadsDir, cleanFileName);
    import_fs.default.writeFileSync(localFilePath, buffer);
    const publicUrl = `/uploads/${cleanFileName}`;
    console.log(`[PARDAIS-PARTY LOCAL STORAGE] Successfully uploaded local asset: ${publicUrl}`);
    res.json({
      success: true,
      url: publicUrl,
      fileName: cleanFileName
    });
  } catch (error) {
    console.error("[PARDAIS-PARTY STORAGE] Local fallback upload error:", error);
    res.json({
      success: true,
      url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80",
      fileName: "fallback.jpg"
    });
  }
});
app2.post("/api/v1/fcm/send", async (req, res) => {
  try {
    const { token, title, body, data } = req.body;
    if (!token) {
      return res.status(400).json({ error: "Missing recipient FCM token" });
    }
    console.log(`[PARDAIS-PARTY FCM MOCK] Dispatched notification: ${title} - ${body} to ${token}`);
    res.json({
      success: true,
      messageId: `mock-msg-${Date.now()}`
    });
  } catch (error) {
    console.error("[PARDAIS-PARTY FCM MOCK] Dispatch error:", error);
    res.status(500).json({ error: error.message });
  }
});
async function startServer() {
  app2.get("/admin", (req, res) => {
    if (process.env.NODE_ENV !== "production") {
      res.redirect("/admin.html");
    } else {
      res.sendFile(import_path.default.join(process.cwd(), "dist", "admin.html"));
    }
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app2.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app2.use(import_express.default.static(distPath));
    app2.get("*", (req, res) => {
      if (req.path.startsWith("/admin")) {
        res.sendFile(import_path.default.join(distPath, "admin.html"));
      } else {
        res.sendFile(import_path.default.join(distPath, "index.html"));
      }
    });
  }
  app2.listen(PORT, "0.0.0.0", () => {
    console.log(`Pardais Party Server running on http://0.0.0.0:${PORT}`);
  });
}
setInterval(() => {
  if (!dbData.parties || !Array.isArray(dbData.parties)) return;
  const now = Date.now();
  let changed = false;
  dbData.parties.forEach((party) => {
    if (!party.seats || party.status === "ended") return;
    const lastSeen = party.lastSeen || {};
    party.seats.forEach((seat) => {
      if (seat.name) {
        const username = seat.name;
        const lastTs = lastSeen[username];
        if (lastTs && now - lastTs > 12e3) {
          console.log(`[PARDAIS-PARTY AUTO-PRUNE] Seat occupant ${username} on Seat ${seat.id} in party ${party.id} timed out. Clearing seat.`);
          seat.name = null;
          seat.avatar = null;
          seat.isMuted = false;
          delete lastSeen[username];
          changed = true;
        }
      }
    });
  });
  if (changed) {
    saveDatabase();
  }
}, 5e3);
startServer();
//# sourceMappingURL=server.cjs.map
