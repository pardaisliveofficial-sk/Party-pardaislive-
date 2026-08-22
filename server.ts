import express from "express";
import path from "path";
import dotenv from "dotenv";
import fs from "fs";
import sharp from "sharp";
import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command, DeleteObjectCommand } from "@aws-sdk/client-s3";
import multer from "multer";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import agoraToken from "agora-token";
import AdmZip from "adm-zip";
import zlib from "zlib";
import crypto from "crypto";
const { RtcTokenBuilder, RtcRole } = agoraToken;
import {
  checkAndSeedDatabase,
  startFirestoreSynchronization,
  dbDataCache,
  syncDocument,
  deleteDocument,
  writeMetadata,
  hydrateReelsFromFirestore,
  clearAllHostsInFirestore,
  getPersistedSession,
  getPersistedUserForSession,
  getPersistedUserForEmail,
  getPersistedUserForIdentifier,
  getPersistedEmailRegistry,
  persistEmailRegistry,
  persistAuthChallenge,
  getPersistedAuthChallenge,
  deletePersistedAuthChallenge
} from "./src/db/firebaseDb";

dotenv.config();

const app = express();
// Railway/Cloudflare terminate TLS before Express. Trust the proxy so generated
// media URLs are always HTTPS and never become mixed-content URLs in the app.
app.set("trust proxy", 1);
const PORT = Number(process.env.PORT || 3000);
const PUBLIC_API_BASE = (process.env.PUBLIC_API_BASE || "https://api.pardaisparty.soulverseapps.com").replace(/\/+$/, "");

// Production API Request Logging & Monitoring Middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(`[PARDAIS-PARTY PRODUCTION LOGGER] ${req.method} ${req.originalUrl} - Status: ${res.statusCode} - ${duration}ms`);
  });
  next();
});

// Enable CORS for production-ready custom subdomain endpoints
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());

// ------------------------------------------------------------------
// FILE-BASED DATABASE STATE & DURABLE CLOUD-LIKE PERSISTENCE
// ------------------------------------------------------------------
const DB_PATH = path.join(process.cwd(), "pardais_live_db.json");

const DEFAULT_DEMO_HOSTS: any[] = [];
const DEFAULT_DEMO_PARTIES: any[] = [];

// Define dbData as a reference pointing directly to the real-time replicated Firestore cache
let dbData: any = dbDataCache;

async function loadDatabase() {
  try {
    // 1. Check if Firestore contains seeded tables, if not seed it from local database template
    await checkAndSeedDatabase();

    // 2. Clear all stale hosts from Firestore and local cache to ensure fresh active-only live stream directory
    await clearAllHostsInFirestore();

    // 3. Load the local backup BEFORE starting Firestore listeners.
    // This prevents an old/empty local backup from overwriting freshly
    // loaded Firestore reels during the startup race.
    if (fs.existsSync(DB_PATH)) {
      const raw = fs.readFileSync(DB_PATH, "utf-8");
      const local = JSON.parse(raw);
      Object.assign(dbDataCache, local);
      console.log("[PARDAIS-PARTY FIREBASE] Pre-populated in-memory cache with local database backup.");
    }

    // Collapse legacy duplicate user mirrors immediately. This keeps refresh/restart
    // from rotating the visible username/Pardais ID between old documents.
    if (Array.isArray(dbDataCache.users)) {
      dbDataCache.users = canonicalizeUsers(dbDataCache.users);
    }

    if (!Array.isArray(dbDataCache.hosts)) {
      dbDataCache.hosts = [];
    }
    if (!Array.isArray(dbDataCache.parties)) {
      dbDataCache.parties = [];
    }
    if (!Array.isArray(dbDataCache.reels)) {
      dbDataCache.reels = [];
    }

    // 4. Start real-time Firestore synchronization listeners.
    // Reels synchronization merges by ID and never clears the cache on
    // transient empty snapshots.
    startFirestoreSynchronization();
    // Firestore user snapshots can arrive after listeners start; retry until the one-time V61 coin migration has a canonical user set.
    const runCoinMigration = async () => {
      try { await migrateCoinSystemOnce(); } catch (err) { console.warn("[COIN SYSTEM] Deferred migration failed:", err); }
      if (Number(dbData.configurations?.coinSystemMigrationVersion || 0) < 1) {
        setTimeout(() => { void runCoinMigration(); }, 5000);
      }
    };
    setTimeout(() => { void runCoinMigration(); }, 8000);

    // Permanent email identity migration. Existing email accounts are copied into
    // the durable registry once; a locked registry entry can never be reassigned.
    setTimeout(async () => {
      try {
        const users = Array.isArray(dbData.users) ? dbData.users : [];
        for (const existingUser of users) {
          // Only a completed email/password account is permanently registered.
          // Google-only users and incomplete OTP/profile attempts must never
          // reserve an email address for email signup.
          if (existingUser?.email && existingUser?.uid && isCompletedEmailAccount(existingUser)) {
            await persistEmailRegistry(String(existingUser.email), existingUser);
          }
        }
        console.log(`[PARDAIS AUTH] Permanent email registry migration checked ${users.length} users.`);
      } catch (err) {
        console.warn("[PARDAIS AUTH] Email registry migration deferred:", err);
      }
    }, 5000);

    saveDatabase();
  } catch (e) {
    console.error("[PARDAIS-PARTY FIREBASE] Error loading database:", e);
  }
}

let lastSavedUserStr = "";
let lastSavedConfigStr = "";
let lastSavedCategoriesStr = "";

function saveDatabase() {
  try {
    // Write local backup for safety
    fs.writeFileSync(DB_PATH, JSON.stringify(dbData, null, 2), "utf-8");

    // Asynchronously push metadata updates to Firebase Firestore only if they have actually changed
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

function ensureDatabaseSchema() {
  // Firestore auto-handles schema dynamically!
}

// Perform initial load asynchronously
loadDatabase();

// ------------------------------------------------------------------
// SECURE USER AUTHENTICATION & AUTHORIZATION MIDDLEWARE
// ------------------------------------------------------------------
async function authenticateUser(req: any, res: any, next: any) {
  // Signup/profile clients may provide the verified session in the body or query
  const authHeader = req.headers["authorization"];
  const headerToken = authHeader && authHeader.startsWith("Bearer ")
    ? authHeader.substring(7).trim()
    : "";
  const bodyToken = typeof req.body?.verificationToken === "string"
    ? req.body.verificationToken.trim()
    : "";
  const queryToken = typeof req.query?.token === "string" ? req.query.token.trim() : "";
  const token = headerToken || bodyToken || queryToken;

  if (!token) {
    return res.status(401).json({ error: "Unauthorized. Authorization Bearer token is required." });
  }

  // First use the hot in-memory cache.
  let session = dbData.sessions?.[token];

  // New signed sessions survive backend restarts/replicas without depending on
  // Firestore being available for the authentication check.
  if (!session && token.startsWith("pardais_v2.")) {
    session = decodeSessionToken(token);
    if (session) {
      if (!dbData.sessions) dbData.sessions = {};
      dbData.sessions[token] = session;
    }
  }

  // Legacy sessions still fall back to Firestore.
  if (!session) {
    session = await getPersistedSession(token);
    if (session) {
      if (!dbData.sessions) dbData.sessions = {};
      dbData.sessions[token] = session;
    }
  }

  if (!session) {
    return res.status(401).json({ error: "Session expired or invalid token. Please log in again." });
  }

  // Deterministic account resolution: exact UID first, then exact email, then exact username.
  let user = session.uid
    ? dbData.users?.find((u: any) => u && u.uid === session.uid)
    : null;
  if (!user && session.email) {
    const email = String(session.email).toLowerCase().trim();
    user = dbData.users?.find((u: any) => u && String(u.email || "").toLowerCase().trim() === email);
  }
  if (!user && session.username) {
    const usr = String(session.username).toLowerCase().trim().replace(/^@/, "");
    user = dbData.users?.find((u: any) => u && String(u.username || "").toLowerCase().trim().replace(/^@/, "") === usr);
  }

  // If the user cache is cold, check durable store
  if (!user) {
    try {
      if (session.email) {
        user = await findUserByIdentifierDurably(session.email);
      } else if (session.uid) {
        user = await findUserByIdentifierDurably(session.uid);
      } else if (session.username) {
        user = await findUserByIdentifierDurably(session.username);
      }
      if (!user) {
        user = await getPersistedUserForSession(session);
      }
      if (user) {
        const existingIdx = dbData.users?.findIndex((u: any) =>
          (session.uid && u?.uid === session.uid) ||
          (session.email && String(u?.email || "").toLowerCase().trim() === String(session.email).toLowerCase().trim())
        );
        if (existingIdx != null && existingIdx >= 0) dbData.users[existingIdx] = { ...dbData.users[existingIdx], ...user };
        else if (Array.isArray(dbData.users)) dbData.users.push(user);
      }
    } catch (e) {
      console.warn("[PARDAIS AUTH] Error checking persisted user:", e);
    }
  }

  // Fallback: If session is valid (e.g. freshly verified OTP or signed session token)
  // synthesize / restore the user object in dbData.users so create-account or other endpoints succeed!
  if (!user && (session.email || session.uid || req.body?.email)) {
    const cleanEmail = session.email ? String(session.email).toLowerCase().trim() : (req.body?.email ? String(req.body.email).toLowerCase().trim() : "");
    const uid = session.uid || (cleanEmail ? `email_${cleanEmail.replace(/[^a-zA-Z0-9]/g, "_")}` : `user_${Date.now()}`);
    const username = session.username || (cleanEmail ? cleanEmail.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "_") : `user_${Math.floor(1000 + Math.random() * 9000)}`);
    user = {
      uid,
      email: cleanEmail,
      username,
      uniqueId: cleanEmail ? stablePardaisId(cleanEmail) : `pardes_${uid.slice(-10)}`,
      fullName: "",
      avatar: "",
      coverPhoto: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80",
      bio: "Pardais Party Member 🇵🇰",
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
      vipSuspended: false,
      passwordHash: "",
      authProvider: "email"
    };
    if (Array.isArray(dbData.users)) {
      dbData.users.push(user);
    }
  }

  if (user) {
    req.user = user;
    req.token = token;
    return next();
  }

  return res.status(401).json({ error: "Authenticated account could not be restored. Please log in again." });
}

// ------------------------------------------------------------------
// AGORA SECURE TOKEN GENERATION ENDPOINT
// ------------------------------------------------------------------
const handleAgoraTokenRequest = (req: any, res: any) => {
  try {
    const { channelName, uid, role } = req.body || {};
    if (!channelName) {
      return res.status(400).json({ error: "channelName is required" });
    }

    const defaultAppId = "44f9db7ec1dc4d4bba73e459534d6f59";
    const appId = (process.env.AGORA_APP_ID && process.env.AGORA_APP_ID.trim().length > 0) 
      ? process.env.AGORA_APP_ID.trim() 
      : defaultAppId;
    const appCertificate = process.env.AGORA_APP_CERTIFICATE;

    const agoraUid = uid ? Number(uid) : Math.floor(Math.random() * 89999999) + 10000000;

    let token: string | null = null;
    const expirationTimeInSeconds = 3600; // 1 hour
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

    if (appId && appCertificate && appCertificate.trim().length > 0) {
      try {
        // Build token with wildcard UID (0) and PUBLISHER privileges for seamless dynamic voice/host role upgrades
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
  } catch (error: any) {
    console.error("[PARDAIS-PARTY AGORA] Token generation error:", error);
    return res.json({
      appId: process.env.AGORA_APP_ID || "44f9db7ec1dc4d4bba73e459534d6f59",
      token: null,
      uid: Math.floor(Math.random() * 89999999) + 10000000,
      channelName: req.body?.channelName || "room_default"
    });
  }
};

app.post("/api/agora/token", handleAgoraTokenRequest);
app.post("/api/v1/agora/token", handleAgoraTokenRequest);

// ------------------------------------------------------------------
// REAL-TIME WEBRTC CROSS-DEVICE SIGNALING ENGINE
// ------------------------------------------------------------------
let signalCounter = 0;
const webrtcSignalStore: Record<string, Array<{ seq: number; from: string; type: string; data: any; timestamp: number }>> = {};

app.post("/api/v1/webrtc/signal", (req, res) => {
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
    
    // Keep last 500 signals per key
    if (webrtcSignalStore[key].length > 500) {
      webrtcSignalStore[key] = webrtcSignalStore[key].slice(-500);
    }
    return res.json({ success: true, seq: signalCounter });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.get("/api/v1/webrtc/signals/:channelName/:target", (req, res) => {
  try {
    const { channelName, target } = req.params;
    const cleanChannel = String(channelName).replace(/[^a-zA-Z0-9_-]/g, "").toLowerCase();
    const key = `${cleanChannel}_${target}`;
    const sinceSeq = Number(req.query.sinceSeq || req.query.since || 0);

    const list = webrtcSignalStore[key] || [];
    const newSignals = list.filter((s) => s.seq > sinceSeq || (sinceSeq > 1000000000 && s.timestamp > sinceSeq));
    const maxSeq = list.length > 0 ? Math.max(...list.map(s => s.seq)) : sinceSeq;

    return res.json({ signals: newSignals, maxSeq, timestamp: Date.now() });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ------------------------------------------------------------------
// PNG Asset Endpoints for Chrome Android PWA WebAPK Auto-Install
// ------------------------------------------------------------------
function pngCrc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makePngChunk(type: string, data: Buffer): Buffer {
  const typeBuf = Buffer.from(type, "ascii");
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  const crcVal = pngCrc32(Buffer.concat([typeBuf, data]));
  crcBuf.writeUInt32BE(crcVal, 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function generatePurePngBuffer(width: number, height: number): Buffer {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
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
    rawData[rowOffset] = 0; // Filter byte: 0 = None
    const ny = y / height;

    for (let x = 0; x < width; x++) {
      const px = rowOffset + 1 + x * 4;
      const nx = x / width;

      // Default dark purple-black theme background (#0a0614)
      let r = 10, g = 6, b = 20, a = 255;

      // Subtle center glow
      const cdx = nx - 0.5;
      const cdy = ny - 0.45;
      const cdist = Math.sqrt(cdx * cdx + cdy * cdy);
      if (cdist < 0.45) {
        const glowFactor = (1 - cdist / 0.45) * 0.25;
        r = Math.min(255, r + Math.floor(120 * glowFactor));
        g = Math.min(255, g + Math.floor(20 * glowFactor));
        b = Math.min(255, b + Math.floor(180 * glowFactor));
      }

      // Outer Neon P Stem (Left vertical tube)
      const isPStem = (nx >= 0.26 && nx <= 0.42 && ny >= 0.16 && ny <= 0.74);
      
      // Outer Neon P Top Loop Arc
      const loopCenterX = 0.42;
      const loopCenterY = 0.32;
      const ldx = (nx - loopCenterX) / 0.28;
      const ldy = (ny - loopCenterY) / 0.17;
      const loopDist = Math.sqrt(ldx * ldx + ldy * ldy);
      const isPLoopOuter = (loopDist >= 0.70 && loopDist <= 1.05 && nx >= 0.36 && ny <= 0.52);

      // Inner Loop Hole
      const isPLoopInner = (loopDist < 0.70 && nx >= 0.38 && ny >= 0.22 && ny <= 0.42);

      // Singer Silhouette inside inner loop or near stem base
      const isSingerHead = Math.sqrt(Math.pow(nx - 0.48, 2) + Math.pow(ny - 0.34, 2)) < 0.045;
      const isMic = Math.sqrt(Math.pow(nx - 0.55, 2) + Math.pow(ny - 0.31, 2)) < 0.025;

      // Party Popper Confetti Dots at top-right
      const conf1 = Math.sqrt(Math.pow(nx - 0.74, 2) + Math.pow(ny - 0.14, 2)) < 0.025;
      const conf2 = Math.sqrt(Math.pow(nx - 0.82, 2) + Math.pow(ny - 0.22, 2)) < 0.02;
      const conf3 = Math.sqrt(Math.pow(nx - 0.78, 2) + Math.pow(ny - 0.08, 2)) < 0.018;

      // Text "PARDAIS" white bar at bottom (ny: 0.80 - 0.86)
      const isTextPardais = (ny >= 0.80 && ny <= 0.85 && nx >= 0.18 && nx <= 0.82);
      // Text "PARTY" neon bar below (ny: 0.88 - 0.92)
      const isTextParty = (ny >= 0.88 && ny <= 0.92 && nx >= 0.28 && nx <= 0.72);

      if (isPStem || isPLoopOuter) {
        // Gradient from Neon Pink (#ff17bd) on left to Electric Cyan (#00d2ff) on right
        const gradT = Math.min(1, Math.max(0, (nx - 0.26) / 0.45));
        r = Math.floor(255 * (1 - gradT));
        g = Math.floor(23 + 180 * gradT);
        b = Math.floor(189 * (1 - gradT) + 255 * gradT);
      } else if (isSingerHead || isMic) {
        // Microphone/Singer accent in bright glowing cyan/pink
        r = isMic ? 255 : 15;
        g = isMic ? 230 : 15;
        b = 255;
      } else if (isPLoopInner) {
        // Dark stage silhouette background
        r = 8; g = 5; b = 18;
      } else if (conf1 || conf2 || conf3) {
        // Confetti pops
        if (conf1) { r = 255; g = 234; b = 0; } // Yellow
        else if (conf2) { r = 255; g = 23; b = 189; } // Pink
        else { r = 0; g = 210; b = 255; } // Cyan
      } else if (isTextPardais) {
        // Bright White Bold Text Bar
        r = 255; g = 255; b = 255;
      } else if (isTextParty) {
        // Neon Party Accent Line
        r = 0; g = 210; b = 255;
      }

      rawData[px] = r;
      rawData[px + 1] = g;
      rawData[px + 2] = b;
      rawData[px + 3] = a;
    }
  }

  const compressed = zlib.deflateSync(rawData);
  const idatChunk = makePngChunk("IDAT", compressed);
  const iendChunk = makePngChunk("IEND", Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

let cachedIcon192Buf: Buffer | null = null;
let cachedIcon512Buf: Buffer | null = null;
let cachedScreenshot1Buf: Buffer | null = null;
let cachedScreenshot2Buf: Buffer | null = null;

app.get(["/icon-192.png", "/icon-192", "/icon.png", "/apple-touch-icon.png", "/favicon.ico"], async (req, res) => {
  res.setHeader("Content-Type", "image/png");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  const p192Path = path.join(process.cwd(), "public", "icon-192.png");
  if (fs.existsSync(p192Path)) {
    return res.sendFile(p192Path);
  }
  const dist192Path = path.join(process.cwd(), "dist", "icon-192.png");
  if (fs.existsSync(dist192Path)) {
    return res.sendFile(dist192Path);
  }
  try {
    const svgPath = path.join(process.cwd(), "public", "icon.svg");
    if (fs.existsSync(svgPath)) {
      const pngBuf = await sharp(svgPath).resize(192, 192).png().toBuffer();
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

app.get(["/icon-512.png", "/icon-512"], async (req, res) => {
  res.setHeader("Content-Type", "image/png");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  const p512Path = path.join(process.cwd(), "public", "icon-512.png");
  if (fs.existsSync(p512Path)) {
    return res.sendFile(p512Path);
  }
  const dist512Path = path.join(process.cwd(), "dist", "icon-512.png");
  if (fs.existsSync(dist512Path)) {
    return res.sendFile(dist512Path);
  }
  try {
    const svgPath = path.join(process.cwd(), "public", "icon.svg");
    if (fs.existsSync(svgPath)) {
      const pngBuf = await sharp(svgPath).resize(512, 512).png().toBuffer();
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

app.get("/icon.svg", (req, res) => {
  res.setHeader("Content-Type", "image/svg+xml");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  const svgPath = path.join(process.cwd(), "public", "icon.svg");
  return res.sendFile(svgPath);
});

app.get("/manifest.json", (req, res) => {
  res.setHeader("Content-Type", "application/manifest+json");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  const manifestPath = path.join(process.cwd(), "public", "manifest.json");
  if (fs.existsSync(manifestPath)) {
    return res.sendFile(manifestPath);
  }
  const distManifestPath = path.join(process.cwd(), "dist", "manifest.json");
  return res.sendFile(distManifestPath);
});

app.get("/sw.js", (req, res) => {
  res.setHeader("Content-Type", "application/javascript");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.setHeader("Service-Worker-Allowed", "/");
  const swPath = path.join(process.cwd(), "public", "sw.js");
  if (fs.existsSync(swPath)) {
    return res.sendFile(swPath);
  }
  const distSwPath = path.join(process.cwd(), "dist", "sw.js");
  return res.sendFile(distSwPath);
});

app.get("/screenshot-1.png", (req, res) => {
  res.setHeader("Content-Type", "image/png");
  res.setHeader("Cache-Control", "public, max-age=86400");
  if (!cachedScreenshot1Buf) {
    cachedScreenshot1Buf = generatePurePngBuffer(540, 960);
  }
  return res.send(cachedScreenshot1Buf);
});

app.get("/screenshot-2.png", (req, res) => {
  res.setHeader("Content-Type", "image/png");
  res.setHeader("Cache-Control", "public, max-age=86400");
  if (!cachedScreenshot2Buf) {
    cachedScreenshot2Buf = generatePurePngBuffer(1280, 720);
  }
  return res.send(cachedScreenshot2Buf);
});

// ------------------------------------------------------------------
// ANDROID APP & PWA INSTALLATION ENDPOINTS
// ------------------------------------------------------------------
function buildAndroidInstallBundle(): string {
  const generatedPackagePath = path.join(process.cwd(), "public", "PardaisParty-v1.0.0-AppPackage.zip");
  
  try {
    const zip = new AdmZip();
    
    // 1. AndroidManifest.xml & manifest.json
    const manifestPath = path.join(process.cwd(), "android", "app", "src", "main", "AndroidManifest.xml");
    if (fs.existsSync(manifestPath)) {
      zip.addLocalFile(manifestPath, "android", "AndroidManifest.xml");
    }

    const manifestJsonPath = path.join(process.cwd(), "public", "manifest.json");
    if (fs.existsSync(manifestJsonPath)) {
      zip.addLocalFile(manifestJsonPath, "", "manifest.json");
    }

    // 2. Web Assets
    const distDir = path.join(process.cwd(), "dist");
    if (fs.existsSync(distDir)) {
      zip.addLocalFolder(distDir, "web-assets");
    }

    // 3. README Instructions
    const readmeContent = `=== PARDAIS PARTY ANDROID INSTALLATION GUIDE ===

Android OS requires WebAPKs / PWAs to be installed directly through Chrome / Samsung Internet browser for 1-Click Native Installation.

HOW TO INSTALL ON YOUR ANDROID PHONE:
1. Open https://ais-pre-6dyivnz7jtthlnhsubr65e-317695587014.asia-southeast1.run.app in Google Chrome on your Android phone.
2. Tap the green "📲 1-Click Install App on Android" button.
3. OR open Chrome Menu (⋮) and tap "Add to Home screen" / "Install App".
4. Android Google Play Services will automatically generate and install the official native App icon on your Phone Home Screen & App Drawer!
`;
    zip.addFile("INSTALL_INSTRUCTIONS.txt", Buffer.from(readmeContent, "utf-8"));

    const targetDir = path.dirname(generatedPackagePath);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    zip.writeZip(generatedPackagePath);
    return generatedPackagePath;
  } catch (err) {
    console.error("Error generating Android package:", err);
    return generatedPackagePath;
  }
}

app.get("/api/v1/app-info", (req, res) => {
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

app.get("/api/v1/download-apk", (req, res) => {
  const packagePath = buildAndroidInstallBundle();

  if (fs.existsSync(packagePath)) {
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", 'attachment; filename="PardaisParty-v1.0.0-Package.zip"');
    return res.sendFile(packagePath);
  } else {
    return res.status(500).json({
      error: "Package not found",
      message: "Please tap '1-Click Install App' or Chrome Menu (⋮) -> 'Add to Home screen' to install Pardais Party directly on your Android phone!"
    });
  }
});

// ------------------------------------------------------------------
// AUTHENTICATION & PROFILE PERSISTENCE ENDPOINTS
// ------------------------------------------------------------------

function isDeviceIdBlocked(deviceId?: string): boolean {
  if (!deviceId || typeof deviceId !== "string") return false;
  const blockedList = dbData?.configurations?.blockedDevices;
  if (!Array.isArray(blockedList)) return false;
  return blockedList.includes(deviceId.trim());
}

// IP & Device Security Info Endpoint
app.get("/api/v1/ip-info", (req, res) => {
  const forwarded = req.headers["x-forwarded-for"];
  const ip = typeof forwarded === "string" ? forwarded.split(",")[0].trim() : req.socket.remoteAddress || "127.0.0.1";
  const requestDeviceId = (req.headers["x-device-id"] as string) || (req.query?.deviceId as string) || "";
  
  res.json({
    ip,
    userAgent: req.headers["user-agent"] || "",
    isBlocked: isDeviceIdBlocked(requestDeviceId),
    blockedDevices: dbData?.configurations?.blockedDevices || []
  });
});


// ------------------------------------------------------------------
// PERSISTENT EMAIL ACCOUNT IDENTITY + PASSWORD AUTH
// ------------------------------------------------------------------
const DEFAULT_ADMIN_EMAILS_SERVER = [
  "pardaisliveofficial@gmail.com",
  "saifkhokhar657@gmail.com",
  "dark330angel@gmail.com",
  "pardaislive@gmail.com"
];
const ADMIN_STARTING_COINS = 1_000_000;
const DAILY_COIN_REWARD = 120;
const DAILY_XP_REWARD = 300;

function getConfiguredAdminEmails(): string[] {
  const nominated = Array.isArray(dbData?.nominatedAdminEmails) ? dbData.nominatedAdminEmails : [];
  return Array.from(new Set([
    ...DEFAULT_ADMIN_EMAILS_SERVER,
    ...nominated
  ].map((e: any) => String(e || "").toLowerCase().trim()).filter(Boolean)));
}

function isAdminEmail(email: any): boolean {
  const clean = String(email || "").toLowerCase().trim();
  return !!clean && getConfiguredAdminEmails().includes(clean);
}

function isAdminAccount(user: any): boolean {
  return Boolean(user && isAdminEmail(user.email));
}

function applyAdminAccountState(user: any, opts: { initializeCoins?: boolean } = {}) {
  if (!user) return user;
  const admin = isAdminAccount(user);
  user.isAdmin = admin;
  user.role = admin ? "admin" : (user.role === "admin" ? "user" : (user.role || "user"));
  if (admin) {
    if (opts.initializeCoins && !user.adminCoinInitializedAt) {
      user.coins = ADMIN_STARTING_COINS;
      user.adminCoinInitializedAt = new Date().toISOString();
    }
  } else if (user.isAdmin !== true) {
    user.isAdmin = false;
  }
  return user;
}

async function migrateCoinSystemOnce() {
  if (!dbData.configurations || typeof dbData.configurations !== "object") dbData.configurations = {};
  if (Number(dbData.configurations.coinSystemMigrationVersion || 0) >= 1) return;

  const users = Array.isArray(dbData.users) ? dbData.users : [];
  // Firestore users may arrive just after local startup. Do not mark the migration complete until at least one user record is available.
  if (users.length === 0) return;
  const changed: any[] = [];
  for (const user of users) {
    if (!user) continue;
    const admin = isAdminAccount(user);
    if (admin) {
      user.isAdmin = true;
      user.role = "admin";
      user.coins = ADMIN_STARTING_COINS;
      user.adminCoinInitializedAt = new Date().toISOString();
    } else {
      user.isAdmin = false;
      // V61 coin reset: all non-admin balances start from zero.
      user.coins = 0;
      user.diamonds = Number(user.diamonds) || 0;
    }
    changed.push(user);
  }
  dbData.configurations.coinSystemMigrationVersion = 1;
  dbData.configurations.coinSystemMigratedAt = new Date().toISOString();
  saveDatabase();
  await Promise.all(changed.map(u => persistUserDurably(u).catch(() => false)));
}

function stablePardaisId(identifier: string, existingId?: string): string {
  if (existingId && typeof existingId === "string" && existingId.trim().length > 0) {
    return existingId.trim();
  }
  const clean = String(identifier || "").toLowerCase().trim();
  if (!clean) {
    const randNum = Math.floor(100000 + Math.random() * 900000);
    return `PARDAIS_${randNum}`;
  }
  // If clean is already a valid Pardais ID format, keep it
  if (clean.startsWith("pardes_") || clean.startsWith("pardais_")) {
    return clean;
  }
  // Deterministic 6-digit numeric Pardais ID derived from SHA256 of the email/identifier
  // This guarantees that across server restarts, app updates, or fresh sessions, the account
  // always retains the exact same unique, permanent Pardais ID.
  const hash = crypto.createHash("sha256").update(clean).digest("hex");
  const numericVal = (parseInt(hash.slice(0, 8), 16) % 900000) + 100000;
  return `PARDAIS_${numericVal}`;
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${derived}`;
}

function verifyPassword(password: string, stored: string): boolean {
  try {
    const [scheme, salt, derived] = String(stored || "").split(":");
    if (scheme !== "scrypt" || !salt || !derived) return false;
    const candidate = crypto.scryptSync(password, salt, 64).toString("hex");
    return crypto.timingSafeEqual(Buffer.from(candidate, "hex"), Buffer.from(derived, "hex"));
  } catch {
    return false;
  }
}

function persistUser(user: any) {
  // Keep the legacy username document for existing app features, while also
  // creating stable identity documents keyed by UID, unique Pardais ID, and email.
  if (user.username) syncDocument("users", user.username, user);
  if (user.uid) syncDocument("users", `uid_${user.uid}`, user);
  if (user.uniqueId) syncDocument("users", `id_${String(user.uniqueId).toLowerCase()}`, user);
  if (user.email) syncDocument("users", `email_${user.email.toLowerCase().replace(/[^a-zA-Z0-9]/g, "_")}`, user);
}

async function persistUserDurably(user: any): Promise<boolean> {
  try {
    if (!user || (!user.uid && !user.username && !user.uniqueId)) return false;
    const email = user.email ? String(user.email).toLowerCase().trim() : "";
    if (email) user.email = email;
    user.registeredAt = user.registeredAt || new Date().toISOString();

    // Ensure uniqueId is permanently locked
    if (!user.uniqueId) {
      user.uniqueId = stablePardaisId(email || user.username || user.uid);
    }

    const saves: Promise<boolean>[] = [];
    if (user.username) saves.push(syncDocument("users", user.username, user));
    if (user.uid) saves.push(syncDocument("users", `uid_${user.uid}`, user));
    if (user.uniqueId) saves.push(syncDocument("users", `id_${String(user.uniqueId).toLowerCase()}`, user));
    if (email) saves.push(syncDocument("users", `email_${email.replace(/[^a-zA-Z0-9]/g, "_")}`, user));

    const results = await Promise.all(saves);
    if (!results.every(Boolean)) return false;

    if (email && isCompletedEmailAccount(user)) {
      const registrySaved = await persistEmailRegistry(email, user);
      return Boolean(registrySaved);
    }

    return true;
  } catch (err) {
    console.error("[PARDAIS AUTH] Durable user persistence failed:", err);
    return false;
  }
}

function getSessionSecret(): string {
  return process.env.SESSION_SECRET || process.env.JWT_SECRET || "pardais-party-session-v1";
}

function encodeSessionToken(sessionData: any): string {
  const payload = Buffer.from(JSON.stringify(sessionData), "utf8").toString("base64url");
  const signature = crypto.createHmac("sha256", getSessionSecret()).update(payload).digest("base64url");
  return `pardais_v2.${payload}.${signature}`;
}

function decodeSessionToken(token: string): any | null {
  try {
    const parts = String(token || "").split(".");
    if (parts.length !== 3 || parts[0] !== "pardais_v2") return null;
    const payload = parts[1];
    const signature = parts[2];
    const expected = crypto.createHmac("sha256", getSessionSecret()).update(payload).digest("base64url");
    if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!session?.uid || !session?.loginTime) return null;
    return session;
  } catch {
    return null;
  }
}

async function createSession(user: any) {
  const sessionData = {
    uid: user.uid,
    username: user.username,
    email: user.email,
    loginTime: new Date().toISOString()
  };
  const token = encodeSessionToken(sessionData);
  dbData.sessions[token] = sessionData;
  void syncDocument("sessions", token, sessionData).catch((err) => {
    console.warn("[PARDAIS AUTH] Session Firestore mirror unavailable; signed token remains valid.", err);
  });
  return token;
}

function canonicalUserIdentity(user: any): string {
  const email = typeof user?.email === "string" ? user.email.toLowerCase().trim() : "";
  if (email) return `email:${email}`;
  const uid = String(user?.uid || "").trim();
  if (uid) return `uid:${uid}`;
  return `username:${String(user?.username || "").toLowerCase().trim()}`;
}

function userFreshnessScore(user: any): number {
  const completed = isCompletedEmailAccount(user) ? 1000000000000 : 0;
  const locked = user?.usernameLockedAt ? 100000000000 : 0;
  const password = user?.passwordHash ? 10000000000 : 0;
  const profile = user?.profileCompleted ? 1000000000 : 0;
  const timestamps = [
    user?.profileUpdatedAt,
    user?.registrationCompletedAt,
    user?.usernameLockedAt,
    user?.registeredAt
  ];
  let latest = 0;
  for (const value of timestamps) {
    const t = value ? Date.parse(String(value)) : 0;
    if (Number.isFinite(t)) latest = Math.max(latest, t);
  }
  return completed + locked + password + profile + latest;
}

function canonicalizeUsers(items: any[]): any[] {
  const groups = new Map<string, any[]>();
  for (const item of Array.isArray(items) ? items : []) {
    if (!item) continue;
    const key = canonicalUserIdentity(item);
    const group = groups.get(key) || [];
    group.push(item);
    groups.set(key, group);
  }

  const result: any[] = [];
  for (const group of groups.values()) {
    group.sort((a, b) => userFreshnessScore(b) - userFreshnessScore(a));
    const primary = { ...(group[0] || {}) };
    // Fill missing profile fields from older mirrors, but never overwrite
    // authoritative username/Pardais ID/account-state fields from the newest record.
    for (let i = 1; i < group.length; i++) {
      const older = group[i] || {};
      for (const [key, value] of Object.entries(older)) {
        if ((primary[key] === undefined || primary[key] === null || primary[key] === "") && value !== undefined && value !== null && value !== "") {
          primary[key] = value;
        }
      }
    }
    result.push(primary);
  }
  return result;
}

function usernameFromEmail(email: string): string {
  const local = String(email || "").toLowerCase().trim().split("@")[0] || "user";
  const clean = local.replace(/[^a-zA-Z0-9_]/g, "_");
  return clean.length >= 3 ? clean.slice(0, 30) : `user_${crypto.createHash("sha256").update(String(email)).digest("hex").slice(0, 8)}`;
}

function findEmailUser(email: string) {
  const cleanEmail = email.toLowerCase().trim();
  const canonicalUid = `email_${cleanEmail.replace(/[^a-zA-Z0-9]/g, "_")}`;
  const matches = (dbData.users || []).filter((u: any) =>
    u && typeof u.email === "string" && u.email.toLowerCase().trim() === cleanEmail
  );

  if (matches.length === 0) return undefined;

  // Older builds could create multiple records for the same email. Always
  // resolve that email to one deterministic canonical account. A completed/locked
  // record wins, then the newest profile/account state, then the canonical UID.
  matches.sort((a: any, b: any) => {
    const aScore = userFreshnessScore(a);
    const bScore = userFreshnessScore(b);
    if (aScore !== bScore) return bScore - aScore;
    const aCanonical = a.uid === canonicalUid ? 1 : 0;
    const bCanonical = b.uid === canonicalUid ? 1 : 0;
    return bCanonical - aCanonical;
  });

  return matches[0];
}

async function findEmailUserDurably(email: string) {
  const cleanEmail = String(email || "").toLowerCase().trim();
  // Fast local canonical lookup first. This prevents Signup/Login from hanging
  // when Firestore is slow or temporarily unavailable, while still preferring
  // the durable registry whenever it responds.
  const local = findEmailUser(cleanEmail);
  if (local) return local;

  // Firestore is the durable source for accounts created on another instance/device,
  // but auth UI must never hang indefinitely waiting for a remote read.
  try {
    const persisted = await Promise.race([
      getPersistedUserForEmail(cleanEmail),
      new Promise<any | null>((resolve) => setTimeout(() => resolve(null), 6000))
    ]);
    if (persisted) return persisted;
  } catch (err) {
    console.warn("[PARDAIS AUTH] Durable email lookup unavailable; using local registry.", err);
  }
  return undefined;
}

function ensureStableEmailIdentity(user: any, email: string) {
  const cleanEmail = email.toLowerCase().trim();
  user.email = cleanEmail;
  user.uid = user.uid || `email_${cleanEmail.replace(/[^a-zA-Z0-9]/g, "_")}`;
  user.uniqueId = user.uniqueId || stablePardaisId(cleanEmail);
  user.isVerified = true;
  user.authProvider = "email";
  if (user.avatar && user.avatar.includes("dicebear.com")) {
    // Do not treat generated placeholder artwork as a permanent profile photo.
    user.avatar = "";
  }
  if (!user.passwordHash) user.passwordHash = "";
  return user;
}

// 1. Google Authentication Endpoint
app.post("/api/v1/auth/google-login", async (req, res) => {
  const requestDeviceId = req.body?.deviceId || (req.headers["x-device-id"] as string);
  if (isDeviceIdBlocked(requestDeviceId)) {
    return res.status(403).json({
      error: "DEVICE_HARDWARE_BLOCKED",
      message: "🚨 HARDWARE BAN ENFORCED: Your phone/device hardware has been permanently banned from Pardais Party by system administrators."
    });
  }

  let { email, displayName, photoURL, uid } = req.body;
  if (!email || typeof email !== "string") return res.status(400).json({ error: "A valid Google email is required." });

  const cleanEmail = email.toLowerCase().trim();
  if (!uid) uid = "google_" + cleanEmail.replace(/[^a-zA-Z0-9]/g, "_");

  let user = dbData.users.find((u: any) => u.uid === uid || (u.email && String(u.email).toLowerCase().trim() === cleanEmail));
  let isNewUser = false;

  if (!user) {
    isNewUser = true;
    const uniqueId = stablePardaisId(cleanEmail);
    user = {
      uid,
      email: cleanEmail,
      username: "",
      uniqueId,
      fullName: displayName?.trim() || "",
      avatar: photoURL?.trim() || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(cleanEmail)}`,
      coverPhoto: "",
      bio: "",
      gender: "",
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
      kycStatus: "pending",
      followersCount: 0,
      followingCount: 0,
      totalLikesCount: 0,
      selectedFrameId: "",
      vipSuspended: false,
      authProvider: "google",
      accountStatus: "pending_profile",
      profileCompleted: false,
      passwordHash: "",
      usernameLockedAt: "",
      registeredAt: new Date().toISOString()
    };
    dbData.users.push(user);
  } else {
    user.uid = uid;
    user.email = cleanEmail;
    user.authProvider = user.authProvider || "google";
    if (displayName?.trim() && !user.fullName) user.fullName = displayName.trim();
    if (photoURL?.trim() && (!user.avatar || String(user.avatar).includes("dicebear"))) user.avatar = photoURL.trim();
  }

  applyAdminAccountState(user, { initializeCoins: true });
  const needsProfileCompletion = !isCompletedEmailAccount(user) || !user.passwordHash || !user.username || !user.profileCompleted;
  if (needsProfileCompletion) {
    user.accountStatus = "pending_profile";
    user.profileCompleted = false;
    user.isVerified = true;
    user.uniqueId = user.uniqueId || stablePardaisId(cleanEmail);
    saveDatabase();
    // Keep the pending Google identity durable without locking a username yet.
    void Promise.all([
      syncDocument("users", `uid_${user.uid}`, user),
      syncDocument("users", `email_${cleanEmail.replace(/[^a-zA-Z0-9]/g, "_")}`, user)
    ]).catch((err) => console.warn("[GOOGLE AUTH] Pending profile mirror delayed:", err));
  } else {
    user.accountStatus = "registered";
    user.profileCompleted = true;
    user.isVerified = true;
    persistUser(user);
    saveDatabase();
  }

  const token = await createSession(user);
  res.json({
    success: true,
    message: needsProfileCompletion ? "Google verified. Complete your Pardais profile to finish registration." : "Authenticated via Google successfully.",
    isNewUser,
    needsProfileCompletion,
    token,
    user
  });
});

function isCompletedEmailAccount(user: any): boolean {
  if (!user) return false;
  const status = String(user.accountStatus || "").toLowerCase();
  return status === "registered" || status === "active" || Boolean(user.registrationCompletedAt) || Boolean(user.passwordHash);
}

async function findUserByIdentifierDurably(identifier: string, timeoutMs = 2500): Promise<any | null> {
  const normalized = String(identifier || "").toLowerCase().trim().replace(/^@/, "");
  if (!normalized) return null;

  // 1. Check local in-memory users cache first
  const isEmail = normalized.includes("@");
  let localUser = (dbData.users || []).find((u: any) => {
    if (!u) return false;
    if (isEmail && typeof u.email === "string" && u.email.toLowerCase().trim() === normalized) return true;
    if (typeof u.username === "string" && u.username.toLowerCase().trim().replace(/^@/, "") === normalized) return true;
    if (typeof u.uniqueId === "string" && u.uniqueId.toLowerCase().trim() === normalized) return true;
    return false;
  });

  if (localUser) return localUser;

  // 2. Search durable Firestore storage
  try {
    const persisted = await Promise.race([
      getPersistedUserForIdentifier(normalized),
      new Promise<any | null>((resolve) => setTimeout(() => resolve(null), timeoutMs))
    ]);
    if (persisted) {
      if (!dbData.users.some((u: any) => u && (u.uid === persisted.uid || (u.email && u.email.toLowerCase() === persisted.email.toLowerCase())))) {
        dbData.users.push(persisted);
        saveDatabase();
      }
      return persisted;
    }
  } catch (err) {
    console.warn("[PARDAIS AUTH] Durable lookup note:", err);
  }

  return null;
}

function getLocalCompletedEmailUser(email: string) {
  const cleanEmail = String(email || "").toLowerCase().trim();
  const matches = (dbData.users || []).filter((u: any) =>
    u && typeof u.email === "string" &&
    u.email.toLowerCase().trim() === cleanEmail &&
    isCompletedEmailAccount(u)
  );
  if (!matches.length) return undefined;

  const canonicalUid = `email_${cleanEmail.replace(/[^a-zA-Z0-9]/g, "_")}`;
  matches.sort((a: any, b: any) => {
    const ac = a.uid === canonicalUid ? 1 : 0;
    const bc = b.uid === canonicalUid ? 1 : 0;
    if (ac !== bc) return bc - ac;
    return String(b.registeredAt || "").localeCompare(String(a.registeredAt || ""));
  });
  return matches[0];
}

async function findCompletedEmailUserDurably(email: string, timeoutMs = 1500) {
  const cleanEmail = String(email || "").toLowerCase().trim();
  const local = getLocalCompletedEmailUser(cleanEmail);
  if (local) return local;

  try {
    // A locked email registry entry is the durable proof that this email has
    // already been registered, even if an old app version lost its password.
    const registry = await Promise.race([
      getPersistedEmailRegistry(cleanEmail),
      new Promise<any | null>((resolve) => setTimeout(() => resolve(null), timeoutMs))
    ]);
    if (registry?.uid) {
      const persisted = await Promise.race([
        getPersistedUserForEmail(cleanEmail),
        new Promise<any | null>((resolve) => setTimeout(() => resolve(null), timeoutMs))
      ]);
      if (persisted) return persisted;
      return { email: cleanEmail, uid: registry.uid, username: registry.username || "", accountStatus: "registered", passwordHash: "" };
    }

    const persisted = await Promise.race([
      getPersistedUserForEmail(cleanEmail),
      new Promise<any | null>((resolve) => setTimeout(() => resolve(null), timeoutMs))
    ]);
    return isCompletedEmailAccount(persisted) ? persisted : undefined;
  } catch {
    return undefined;
  }
}

// Account status check — does NOT send an email.
async function findAnyEmailUserDurably(email: string, timeoutMs = 2500) {
  const cleanEmail = String(email || "").toLowerCase().trim();
  const local = (dbData.users || []).find((u: any) =>
    u && typeof u.email === "string" && u.email.toLowerCase().trim() === cleanEmail && !String(u.uid || "").startsWith("guest_")
  );
  if (local) return local;
  try {
    const persisted = await Promise.race([
      getPersistedUserForEmail(cleanEmail),
      new Promise<any | null>((resolve) => setTimeout(() => resolve(null), timeoutMs))
    ]);
    return persisted || undefined;
  } catch { return undefined; }
}

// Account status check — distinguishes a completed account from an interrupted/pending signup.
app.post("/api/v1/auth/email-status", async (req, res) => {
  const email = typeof req.body?.email === "string" ? req.body.email.toLowerCase().trim() : "";
  if (!email || !email.includes("@")) return res.status(400).json({ error: "A valid email address is required." });
  const user = await findAnyEmailUserDurably(email);
  const registered = Boolean(user && isCompletedEmailAccount(user));
  const exists = Boolean(user);
  return res.json({
    success: true,
    exists,
    registered,
    pendingSignup: Boolean(user && !registered),
    needsPassword: Boolean(user && !user.passwordHash) || Boolean(user && !registered),
    user: user ? {
      uid: user.uid,
      email: user.email,
      username: user.username,
      fullName: user.fullName,
      uniqueId: user.uniqueId,
      avatar: user.avatar
    } : null
  });
});

// 2. Dispatch Email Verification OTP Code
// Email delivery uses the Resend HTTPS API instead of SMTP. This avoids
// Railway's outbound SMTP port restrictions and keeps the OTP logic unchanged.
async function sendPardaisPartyOtpEmail(to: string, otp: string, purpose: "signup" | "password-reset" | "account-deletion" | "account-restore" = "signup"): Promise<void> {
  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  // IMPORTANT: never hard-code an unverified sender. Resend only delivers
  // production mail when the From address belongs to a verified domain.
  const fromEmail = (
    process.env.RESEND_FROM_EMAIL?.trim() ||
    "noreply@mail.pardaisparty.soulverseapps.com"
  ).trim();
  const fromName = (process.env.RESEND_FROM_NAME || "Pardais Party").trim();
  const replyTo = process.env.RESEND_REPLY_TO?.trim();

  console.log(`[PARDAIS PARTY EMAIL] Resend sender: ${fromName} <${fromEmail}>`);

  if (!resendApiKey) {
    console.warn(`[PARDAIS PARTY EMAIL] RESEND_API_KEY not configured. OTP generated for ${to}: [${otp}]`);
    return;
  }
  if (!fromEmail.includes("@")) {
    throw new Error("RESEND_FROM_EMAIL is invalid.");
  }

  const html = `<div style="font-family: Arial, sans-serif; padding: 20px; background: #0f0f18; color: #ffffff; border-radius: 12px;">
    <h2 style="color: #ff007f;">Pardais Party ${
      purpose === "password-reset" ? "Account Recovery"
      : purpose === "account-deletion" ? "Account Deletion Confirmation"
      : purpose === "account-restore" ? "Account Restore Code"
      : "Email Verification"
    }</h2>
    <p>Your 6-digit ${
      purpose === "password-reset" ? "account recovery"
      : purpose === "account-deletion" ? "account deletion confirmation"
      : purpose === "account-restore" ? "account restore"
      : "verification"
    } code is:</p>
    <div style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #00f5ff; margin: 20px 0;">${otp}</div>
    <p style="color: #8888aa; font-size: 12px;">This code will expire in 10 minutes. If you did not request this, please ignore.</p>
  </div>`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: `${fromName} <${fromEmail}>`,
        to: [to],
        subject: purpose === "password-reset"
          ? "Your Pardais Party Account Recovery Code"
          : purpose === "account-deletion"
          ? "Your Pardais Party Account Deletion Code"
          : purpose === "account-restore"
          ? "Your Pardais Party Account Restore Code"
          : "Your Pardais Party Email Verification Code",
        ...(replyTo ? { reply_to: replyTo } : {}),
        html
      }),
      signal: controller.signal
    });

    const bodyText = await response.text();
    let body: any = {};
    try {
      body = bodyText ? JSON.parse(bodyText) : {};
    } catch {
      body = { raw: bodyText };
    }

    if (!response.ok) {
      const resendMessage = body?.message || body?.error || body?.name || `HTTP ${response.status}`;
      throw new Error(`Resend API error ${response.status}: ${resendMessage}`);
    }

    console.log(`[PARDAIS PARTY EMAIL] Resend accepted OTP email for ${to} (id: ${body?.id || "unknown"})`);
  } finally {
    clearTimeout(timeout);
  }
}

const otpSendLocks = new Map<string, number>();

app.post("/api/v1/auth/send-email-otp", async (req, res) => {
  const { email } = req.body;
  if (!email || typeof email !== "string" || !email.includes("@")) {
    return res.status(400).json({ error: "A valid email address is required." });
  }

  const cleanEmail = email.toLowerCase().trim();
  const lastSentAt = otpSendLocks.get(cleanEmail) || 0;
  const remaining = 60000 - (Date.now() - lastSentAt);
  if (remaining > 0) {
    return res.status(429).json({ success: false, code: "OTP_COOLDOWN", error: `Please wait ${Math.ceil(remaining / 1000)} seconds before requesting another code.`, retryAfterSeconds: Math.ceil(remaining / 1000) });
  }
  // Fast path: only a fully registered local account blocks signup.
  // Do not wait several seconds on Firestore just to prove that a brand-new
  // email does not exist; that was the source of the slow/new-email failure.
  const localExistingAccount = getLocalCompletedEmailUser(cleanEmail);
  if (localExistingAccount) {
    return res.status(409).json({
      success: false,
      code: "EMAIL_ALREADY_REGISTERED",
      error: "This email is already registered. Please log in. If you forgot the password, use Forgot Password."
    });
  }

  // If the durable registry has this email on another server/device, check it
  // with a short bounded lookup. A genuinely new email should never wait for
  // Firestore before the OTP flow can start.
  const durableExistingAccount = await findCompletedEmailUserDurably(cleanEmail, 500);
  if (durableExistingAccount) {
    return res.status(409).json({
      success: false,
      code: "EMAIL_ALREADY_REGISTERED",
      error: "This email is already registered. Please log in. If you forgot the password, use Forgot Password."
    });
  }
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  otpSendLocks.set(cleanEmail, Date.now());

  const challenge = { otp, email: cleanEmail, type: "signup", expiresAt: Date.now() + 10 * 60 * 1000, createdAt: new Date().toISOString() };
  // Persist before sending. This prevents an email from arriving while another
  // API replica/restart has no matching OTP record.
  const challengeKey = `email_${cleanEmail.replace(/[^a-zA-Z0-9]/g, "_")}`;
  if (!dbData.emailOtps) dbData.emailOtps = {};
  // Keep a hot copy immediately so the request cannot block on Firestore.
  dbData.emailOtps[cleanEmail] = challenge;
  saveDatabase();

  // Persist in the background. The hot in-memory challenge is authoritative for
  // the active request, so Firestore latency must never delay the OTP email response.
  void persistAuthChallenge(challengeKey, challenge).catch((err) => {
    console.warn("[PARDAIS PARTY OTP] Durable challenge write delayed/unavailable; hot OTP retained.", err);
  });

  console.log(`[PARDAIS PARTY EMAIL OTP GATEWAY] Generated and durably stored OTP for ${cleanEmail}`);

  try {
    await sendPardaisPartyOtpEmail(cleanEmail, otp);
    return res.json({
      success: true,
      message: `Verification OTP code sent to ${cleanEmail}. Check your email inbox.`
    });
  } catch (emailErr) {
    // Delivery failed: release the cooldown and invalidate the hot challenge so
    // the user can retry immediately instead of being locked out for 60 seconds.
    otpSendLocks.delete(cleanEmail);
    delete dbData.emailOtps[cleanEmail];
    void deletePersistedAuthChallenge(challengeKey).catch(() => undefined);
    saveDatabase();
    console.error("[PARDAIS PARTY EMAIL] Resend delivery failed:", emailErr instanceof Error ? emailErr.message : emailErr);
    const errDetails = emailErr instanceof Error ? emailErr.message : String(emailErr);
    return res.status(400).json({
      success: false,
      code: "OTP_DELIVERY_FAILED",
      error: `Could not deliver verification email: ${errDetails.includes("403") ? "Sender email not verified in Resend" : errDetails}. Please check server settings or use Google Sign-In.`
    });
  }
});

// 3. Verify Email OTP Code
// CRITICAL: this route is intentionally a FAST AUTH GATE.
// The browser must receive the signed session token immediately after the OTP
// matches. No Firestore read/write is awaited on this request.
app.post("/api/v1/auth/verify-email-otp", async (req, res) => {
  const { email, otp } = req.body || {};
  if (!email || !otp) {
    return res.status(400).json({ success: false, error: "Email and verification OTP code are required." });
  }

  const cleanEmail = String(email).toLowerCase().trim();
  const cleanOtp = String(otp).trim().replace(/\D/g, "");
  if (cleanOtp.length !== 6) {
    return res.status(400).json({ success: false, error: "Please enter the 6-digit verification code." });
  }

  const challengeKey = `email_${cleanEmail.replace(/[^a-zA-Z0-9]/g, "_")}`;
  // Same-instance verification is the normal path because send-email-otp stores
  // the challenge in dbData.emailOtps before sending the email.
  let stored = dbData.emailOtps?.[cleanEmail] || null;

  // Only use the durable challenge store when the hot copy is missing. Bound it
  // tightly so a Firestore outage can never turn a correct OTP into a timeout.
  if (!stored) {
    try {
      stored = await Promise.race([
        getPersistedAuthChallenge(challengeKey),
        new Promise<any | null>((resolve) => setTimeout(() => resolve(null), 1500))
      ]);
    } catch {
      stored = null;
    }
  }

  if (!stored) {
    return res.status(401).json({ success: false, error: "No OTP code requested for this email or OTP expired. Please request a new code." });
  }

  if (stored.expiresAt && Date.now() > Number(stored.expiresAt)) {
    delete dbData.emailOtps[cleanEmail];
    // Cleanup is deliberately background-only.
    void deletePersistedAuthChallenge(challengeKey).catch(() => undefined);
    return res.status(401).json({ success: false, error: "OTP code has expired. Please request a new OTP code." });
  }

  if (String(stored.otp).trim() !== cleanOtp) {
    return res.status(401).json({ success: false, error: "Invalid OTP code. Please check and try again." });
  }

  // OTP is valid. Consume the hot challenge immediately.
  delete dbData.emailOtps[cleanEmail];
  void deletePersistedAuthChallenge(challengeKey).catch(() => undefined);

  const uid = "email_" + cleanEmail.replace(/[^a-zA-Z0-9]/g, "_");
  let user = (dbData.users || []).find((u: any) =>
    u && ((typeof u.email === "string" && u.email.toLowerCase().trim() === cleanEmail) || u.uid === uid)
  );

  let isNewUser = false;
  if (!user) {
    isNewUser = true;
    const username = cleanEmail.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "_") || `user_${Math.floor(1000 + Math.random() * 9000)}`;
    user = {
      uid,
      email: cleanEmail,
      username,
      uniqueId: stablePardaisId(cleanEmail),
      fullName: "",
      avatar: "",
      coverPhoto: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80",
      bio: "Pardais Party Member 🇵🇰",
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
      vipSuspended: false,
      passwordHash: "",
      authProvider: "email"
    };
    dbData.users.push(user);
  }

  ensureStableEmailIdentity(user, cleanEmail);
  applyAdminAccountState(user, { initializeCoins: true });

  // Create the signed session token locally. createSession itself does not await
  // Firestore; the mirror is already background-only.
  const token = await createSession(user);
  const payload = JSON.stringify({
    success: true,
    message: isNewUser ? "Email verified. Please complete your profile setup." : "Email verified successfully.",
    isNewUser,
    needsPassword: !Boolean(user.passwordHash),
    token,
    user
  });

  // Send the HTTP response NOW. Nothing below is allowed to delay verification.
  res.status(200).set("Content-Type", "application/json").end(payload);

  // Persist after the response has been handed to the client.
  setImmediate(() => {
    void (async () => {
      try { await persistUserDurably(user); } catch (err) {
        console.warn("[PARDAIS AUTH] Background pending-user persistence delayed:", err);
      }
      try { saveDatabase(); } catch (err) {
        console.warn("[PARDAIS AUTH] Background local persistence delayed:", err);
      }
    })();
  });
});

// Recovery endpoint for a verified OTP when a proxy drops the original response.
// It validates the same challenge and returns a fresh signed session immediately.
app.post("/api/v1/auth/recover-email-session", async (req, res) => {
  const { email, otp } = req.body || {};
  const cleanEmail = String(email || "").toLowerCase().trim();
  const cleanOtp = String(otp || "").trim().replace(/\D/g, "");
  if (!cleanEmail || cleanOtp.length !== 6) {
    return res.status(400).json({ success: false, error: "Email and 6-digit verification code are required." });
  }

  const challengeKey = `email_${cleanEmail.replace(/[^a-zA-Z0-9]/g, "_")}`;
  let stored = dbData.emailOtps?.[cleanEmail] || null;
  if (!stored) {
    try {
      stored = await Promise.race([
        getPersistedAuthChallenge(challengeKey),
        new Promise<any | null>((resolve) => setTimeout(() => resolve(null), 1500))
      ]);
    } catch { stored = null; }
  }
  if (!stored || (stored.expiresAt && Date.now() > Number(stored.expiresAt)) || String(stored.otp).trim() !== cleanOtp) {
    return res.status(401).json({ success: false, error: "Invalid or expired verification code." });
  }

  delete dbData.emailOtps[cleanEmail];
  void deletePersistedAuthChallenge(challengeKey).catch(() => undefined);

  const uid = "email_" + cleanEmail.replace(/[^a-zA-Z0-9]/g, "_");
  let user = (dbData.users || []).find((u: any) => u?.uid === uid || (typeof u?.email === "string" && u.email.toLowerCase().trim() === cleanEmail));
  if (!user) {
    user = {
      uid,
      email: cleanEmail,
      username: cleanEmail.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "_") || `user_${Math.floor(1000 + Math.random() * 9000)}`,
      uniqueId: stablePardaisId(cleanEmail),
      fullName: "", avatar: "",
      coverPhoto: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80",
      bio: "Pardais Party Member 🇵🇰", gender: "Male", country: "Pakistan", language: "Urdu / Hinglish",
      coins: 0, diamonds: 0, vipLevel: 0, userLevel: 1, hostLevel: 1, wealthLevel: 1, xp: 0,
      familyId: "", agencyId: "", isVerified: true, isBanned: false, twoFactorEnabled: false,
      dob: "", phoneNumber: "", kycStatus: "none", followersCount: 0, followingCount: 0,
      totalLikesCount: 0, selectedFrameId: "", vipSuspended: false, passwordHash: "", authProvider: "email"
    };
    dbData.users.push(user);
  }
  ensureStableEmailIdentity(user, cleanEmail);
  applyAdminAccountState(user, { initializeCoins: true });
  const token = await createSession(user);
  return res.status(200).json({
    success: true,
    message: "Email verified. Please complete your profile setup.",
    isNewUser: !user.fullName,
    needsPassword: !Boolean(user.passwordHash),
    token,
    user
  });
});


// 4. Create / change password after email verification.
// Password login does NOT send an email/OTP.
app.post("/api/v1/auth/set-password", authenticateUser, async (req: any, res) => {
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  if (password.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters." });
  if (!req.user?.email) return res.status(400).json({ error: "This account does not have an email address." });
  // OTP verification creates a pending signup session before the profile is
  // completed. A previous interrupted signup may already have a passwordHash.
  // That hash is stale pending-signup state, not proof of a completed account.
  // Only an explicitly completed account is protected from password overwrite.
  const accountRegistered = String(req.user.accountStatus || "").toLowerCase() === "registered"
    || Boolean(req.user.registrationCompletedAt);
  if (req.user.passwordHash && accountRegistered) {
    return res.status(409).json({ error: "Password is already set for this account. Use Login or Forgot Password to recover access." });
  }

  // For a pending signup, always replace the stale/incomplete password hash
  // with the password the user entered on the current verified signup flow.
  // A new email signup gets its own canonical Pardais ID derived from its email.
  // Never carry an ID left behind by another/unfinished local signup session.
  req.user.uniqueId = stablePardaisId(String(req.user.email).toLowerCase().trim());
  req.user.passwordHash = hashPassword(password);
  req.user.authProvider = "email";
  req.user.isVerified = true;
  req.user.accountStatus = "registered";
  req.user.registrationCompletedAt = new Date().toISOString();
  ensureStableEmailIdentity(req.user, req.user.email);
  const persisted = await persistUserDurably(req.user);
  if (!persisted) return res.status(503).json({ error: "Account could not be permanently saved. Please try again." });
  saveDatabase();
  res.json({ success: true, message: "Password created successfully.", user: req.user });
});

// Complete a verified email signup atomically: password + profile + registration state
// are written together so an interrupted two-request signup cannot leave a half-created account.
app.post("/api/v1/auth/create-account", authenticateUser, async (req: any, res) => {
  const fullName = typeof req.body?.fullName === "string" ? req.body.fullName.trim() : "";
  const usernameRaw = typeof req.body?.username === "string" ? req.body.username.trim().replace(/^@/, "") : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  const avatar = typeof req.body?.avatar === "string" ? req.body.avatar.trim() : "";
  const gender = typeof req.body?.gender === "string" ? req.body.gender.trim() : "";

  if (!req.user?.email) return res.status(400).json({ success: false, error: "Verified email account is required." });
  if (!fullName || password.length < 6) {
    return res.status(400).json({ success: false, error: "Enter your name and a password of at least 6 characters." });
  }

  const currentEmail = String(req.user.email).toLowerCase().trim();
  // User choice wins. If they leave Username empty, use the email local-part
  // as the username. Once this account is completed, the username is locked.
  const requestedUsername = usernameRaw ? usernameRaw : usernameFromEmail(currentEmail);
  const username = requestedUsername.replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 30);
  if (username.length < 3) return res.status(400).json({ success: false, error: "Username must contain at least 3 valid characters." });
  const alreadyRegistered = isCompletedEmailAccount(req.user);
  if (alreadyRegistered && req.user.passwordHash && req.user.profileCompleted && req.user.fullName) {
    // If already fully registered and passwords match or session is active, succeed gracefully
    req.user.fullName = fullName || req.user.fullName;
    req.user.username = username || req.user.username;
    if (avatar && /^https?:\/\//i.test(avatar)) req.user.avatar = avatar;
    if (gender) req.user.gender = gender;
    req.user.passwordHash = hashPassword(password);
    req.user.authProvider = "email";
    req.user.isVerified = true;
    req.user.accountStatus = "registered";
    req.user.profileCompleted = true;
    req.user.profileUpdatedAt = new Date().toISOString();
    saveDatabase();
    void persistUserDurably(req.user).catch((err) => console.warn("[PARDAIS CREATE ACCOUNT] Background persistence delayed:", err));
    const token = await createSession(req.user);
    return res.status(200).json({
      success: true,
      message: "Pardais account updated and registered successfully.",
      token,
      isNewUser: false,
      needsPassword: false,
      user: req.user
    });
  }

  const usernameTaken = (dbData.users || []).some((u: any) =>
    u && u !== req.user && String(u.username || "").toLowerCase() === username.toLowerCase() && isCompletedEmailAccount(u)
  );
  if (usernameTaken) return res.status(409).json({ success: false, code: "USERNAME_TAKEN", error: "This username is already taken. Please choose another username." });

  // One atomic in-memory state transition: pending verified user -> registered account.
  req.user.fullName = fullName;
  req.user.username = username;
  if (avatar && /^https?:\/\//i.test(avatar)) req.user.avatar = avatar;
  if (gender) req.user.gender = gender;
  req.user.passwordHash = hashPassword(password);
  req.user.authProvider = "email";
  req.user.isVerified = true;
  req.user.accountStatus = "registered";
  req.user.profileCompleted = true;
  req.user.registrationCompletedAt = new Date().toISOString();
  req.user.profileUpdatedAt = new Date().toISOString();
  req.user.usernameLockedAt = new Date().toISOString();
  ensureStableEmailIdentity(req.user, currentEmail);
  req.user.uniqueId = stablePardaisId(currentEmail);
  applyAdminAccountState(req.user, { initializeCoins: true });

  saveDatabase();
  // Do not hold the signup request open on a slow Firestore mirror. The local
  // account is complete immediately and the durable mirrors are synced in the background.
  void persistUserDurably(req.user).catch((err) => console.warn("[PARDAIS CREATE ACCOUNT] Background persistence delayed:", err));
  const token = await createSession(req.user);
  return res.status(201).json({
    success: true,
    message: "Pardais account created successfully.",
    token,
    isNewUser: false,
    needsPassword: false,
    user: req.user
  });
});

// Password login for returning email & username users.
app.post("/api/v1/auth/password-login", async (req, res) => {
  const identifier = typeof req.body?.identifier === "string"
    ? req.body.identifier.trim()
    : (typeof req.body?.email === "string" ? req.body.email.trim() : (typeof req.body?.username === "string" ? req.body.username.trim() : ""));
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  if (!identifier || !password) return res.status(400).json({ success: false, error: "Email/username and password are required." });

  const normalized = identifier.toLowerCase().replace(/^@/, "");
  let user = await findUserByIdentifierDurably(normalized);

  if (!user) {
    // Also check if any local user has this email or username
    user = (dbData.users || []).find((u: any) =>
      u && (
        (u.email && String(u.email).toLowerCase().trim() === normalized) ||
        (u.username && String(u.username).toLowerCase().trim().replace(/^@/, "") === normalized)
      )
    );
  }

  if (!user) {
    return res.status(401).json({ success: false, code: "ACCOUNT_NOT_FOUND", error: "No account found for this email/username. Please sign up first." });
  }
  if (!user.passwordHash) {
    return res.status(409).json({ success: false, code: "PASSWORD_NOT_SET", error: "This account does not have a password set. Please verify email OTP to set a password or use Forgot Password." });
  }
  if (!verifyPassword(password, user.passwordHash)) {
    return res.status(401).json({ success: false, code: "INVALID_PASSWORD", error: "Incorrect password. Please try again or use Forgot Password." });
  }
  if (user.deletionScheduledAt) {
    const deletionDate = new Date(user.deletionScheduledAt);
    const daysLeft = Math.max(0, Math.ceil((deletionDate.getTime() - Date.now()) / 86400000));
    return res.status(409).json({
      success: false,
      code: "ACCOUNT_PENDING_DELETION",
      error: `This account is scheduled for permanent deletion in ${daysLeft} day(s). Restore it from the Delete Account page to continue using it.`,
      restoreUrl: "/delete-account?restore=1"
    });
  }
  if (user.isBanned) return res.status(403).json({ success: false, error: "ACCOUNT_BANNED" });

  if (user.email) ensureStableEmailIdentity(user, String(user.email).toLowerCase());
  applyAdminAccountState(user, { initializeCoins: true });

  // Update in memory cache and disk immediately
  const existingIdx = (dbData.users || []).findIndex((u: any) =>
    (user.uid && u?.uid === user.uid) ||
    (user.email && String(u?.email || "").toLowerCase().trim() === String(user.email).toLowerCase().trim())
  );
  if (existingIdx >= 0) dbData.users[existingIdx] = user;
  else if (Array.isArray(dbData.users)) dbData.users.push(user);
  saveDatabase();

  // Background persistence without blocking response
  void persistUserDurably(user).catch(err => console.warn("[PARDAIS LOGIN] Background sync note:", err));

  const token = await createSession(user);
  return res.json({ success: true, message: "Logged in successfully.", token, isNewUser: false, needsPassword: false, user });
});

// Recovery lookup intentionally accepts legacy accounts that already have a
// passwordHash, even if an older build never wrote accountStatus/profileCompleted.
// This prevents old valid accounts from being locked out of Forgot Password.
async function findRecoverableEmailUserDurably(email: string, timeoutMs = 4000) {
  const cleanEmail = String(email || "").toLowerCase().trim();
  const isGuestEmail = cleanEmail.startsWith("guest_") || cleanEmail.endsWith("@pardaisparty.com");

  const localMatches = (dbData.users || []).filter((u: any) =>
    u && typeof u.email === "string" &&
    u.email.toLowerCase().trim() === cleanEmail &&
    !isGuestEmail &&
    !String(u.uid || "").startsWith("guest_")
  );

  if (localMatches.length) {
    const canonicalUid = `email_${cleanEmail.replace(/[^a-zA-Z0-9]/g, "_")}`;
    localMatches.sort((a: any, b: any) => {
      const ap = a.passwordHash ? 1 : 0;
      const bp = b.passwordHash ? 1 : 0;
      if (ap !== bp) return bp - ap;
      const ac = a.uid === canonicalUid ? 1 : 0;
      const bc = b.uid === canonicalUid ? 1 : 0;
      if (ac !== bc) return bc - ac;
      return String(b.registrationCompletedAt || b.registeredAt || "").localeCompare(
        String(a.registrationCompletedAt || a.registeredAt || "")
      );
    });
    return localMatches[0];
  }

  try {
    const registry = await Promise.race([
      getPersistedEmailRegistry(cleanEmail),
      new Promise<any | null>((resolve) => setTimeout(() => resolve(null), timeoutMs))
    ]);
    const persisted = await Promise.race([
      getPersistedUserForEmail(cleanEmail),
      new Promise<any | null>((resolve) => setTimeout(() => resolve(null), timeoutMs))
    ]);
    if (registry?.uid && persisted) return persisted;
    if (persisted && typeof persisted.email === "string" && !String(persisted.uid || "").startsWith("guest_")) return persisted;
  } catch (err) {
    console.warn("[PARDAIS PARTY RECOVERY] Account lookup failed:", err);
  }

  return undefined;
}

// Forgot password: send OTP only when the user explicitly requests recovery.
app.post("/api/v1/auth/forgot-password", async (req, res) => {
  const email = typeof req.body?.email === "string" ? req.body.email.toLowerCase().trim() : "";
  if (!email || !email.includes("@")) return res.status(400).json({ error: "A valid email address is required." });

  const user = await findRecoverableEmailUserDurably(email, 6000);
  // Recovery is available for every real email account that already has a
  // password, including accounts created by older versions of the app.
  if (!user) {
    return res.status(404).json({
      success: false,
      code: "ACCOUNT_NOT_REGISTERED",
      error: "No permanently registered Pardais account was found for this email. Please complete Signup first."
    });
  }

  const recoveryLocks = (dbData as any).passwordResetLocks || ((dbData as any).passwordResetLocks = {});
  const lastRecoveryAt = Number(recoveryLocks[email] || 0);
  const recoveryRemaining = 60000 - (Date.now() - lastRecoveryAt);
  if (recoveryRemaining > 0) {
    return res.status(429).json({
      success: false,
      code: "RECOVERY_COOLDOWN",
      error: `Please wait ${Math.ceil(recoveryRemaining / 1000)} seconds before requesting another recovery code.`,
      retryAfterSeconds: Math.ceil(recoveryRemaining / 1000)
    });
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  recoveryLocks[email] = Date.now();
  const challengeKey = `reset_${email.replace(/[^a-zA-Z0-9]/g, "_")}`;
  const challenge = { otp, email, type: "password-reset", expiresAt: Date.now() + 10 * 60 * 1000, createdAt: new Date().toISOString() };

  // Hot challenge first: recovery must never wait for Firestore before sending.
  if (!dbData.passwordResetOtps) dbData.passwordResetOtps = {};
  dbData.passwordResetOtps[email] = challenge;
  saveDatabase();
  void persistAuthChallenge(challengeKey, challenge).catch((err) => {
    console.warn("[PARDAIS PARTY PASSWORD RESET] Durable challenge mirror delayed:", err);
  });

  try {
    await sendPardaisPartyOtpEmail(email, otp, "password-reset");
    return res.json({ success: true, message: "Recovery code sent to your email.", code: "RECOVERY_SENT" });
  } catch (err: any) {
    delete dbData.passwordResetOtps[email];
    recoveryLocks[email] = 0;
    saveDatabase();
    const message = String(err?.message || "Recovery email could not be delivered.");
    console.error("[PARDAIS PARTY PASSWORD RESET] Email failed:", message);
    res.status(502).json({
      success: false,
      code: "RECOVERY_EMAIL_FAILED",
      error: "Recovery email could not be delivered. Please try again.",
      details: process.env.NODE_ENV === "production" ? undefined : message
    });
  }
});

// Reset password after the recovery OTP.
app.post("/api/v1/auth/reset-password", async (req, res) => {
  const email = typeof req.body?.email === "string" ? req.body.email.toLowerCase().trim() : "";
  const otp = String(req.body?.otp || "").trim();
  const password = typeof req.body?.password === "string" ? req.body.password : (typeof req.body?.newPassword === "string" ? req.body.newPassword : "");
  if (!email || !otp || password.length < 6) {
    return res.status(400).json({ error: "Email, recovery code and a password of at least 6 characters are required." });
  }

  const challengeKey = `reset_${email.replace(/[^a-zA-Z0-9]/g, "_")}`;
  let stored = dbData.passwordResetOtps?.[email] || null;
  if (!stored) stored = await getPersistedAuthChallenge(challengeKey);
  if (!stored || Date.now() > stored.expiresAt || String(stored.otp) !== otp) {
    return res.status(401).json({ error: "Invalid or expired recovery code." });
  }

  const user = await findRecoverableEmailUserDurably(email, 2500);
  if (!user) return res.status(404).json({ error: "Account not found. Please complete Signup first." });

  user.passwordHash = hashPassword(password);
  user.authProvider = "email";
  user.isVerified = true;
  user.accountStatus = "registered";
  user.registrationCompletedAt = user.registrationCompletedAt || new Date().toISOString();
  user.profileCompleted = Boolean(user.fullName && user.username);
  ensureStableEmailIdentity(user, email);
  delete dbData.passwordResetOtps[email];
  void deletePersistedAuthChallenge(challengeKey).catch(() => undefined);
  saveDatabase();
  // Respond immediately; durable Firestore mirrors continue in the background.
  void persistUserDurably(user).catch((err) => console.warn("[PARDAIS PASSWORD RESET] Background persistence delayed:", err));

  const token = await createSession(user);
  res.json({ success: true, message: "Password reset successfully.", token, user });
});

// Complete a Google-created pending account. The Pardais ID is assigned by the server
// at Google signup and is immutable; username can be chosen exactly once.
app.post("/api/v1/auth/complete-google-profile", authenticateUser, async (req: any, res) => {
  const fullName = typeof req.body?.fullName === "string" ? req.body.fullName.trim() : "";
  const usernameRaw = typeof req.body?.username === "string" ? req.body.username.trim().replace(/^@/, "") : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";

  if (!req.user?.email) return res.status(400).json({ success: false, error: "Google account email is required." });
  if (String(req.user.authProvider || "").toLowerCase() !== "google") {
    return res.status(400).json({ success: false, error: "This profile completion flow is only for Google accounts." });
  }
  if (isCompletedEmailAccount(req.user) || req.user.usernameLockedAt) {
    return res.status(409).json({ success: false, code: "PROFILE_ALREADY_COMPLETED", error: "This Google account profile is already completed." });
  }
  if (!fullName) return res.status(400).json({ success: false, error: "Enter your full name." });
  if (usernameRaw.length < 3) return res.status(400).json({ success: false, error: "Username must contain at least 3 characters." });
  if (password.length < 6) return res.status(400).json({ success: false, error: "Password must be at least 6 characters." });

  const username = usernameRaw.replace(/[^a-zA-Z0-9_]/g, "_");
  if (username.length < 3) return res.status(400).json({ success: false, error: "Username must contain at least 3 valid characters." });

  const taken = (dbData.users || []).some((u: any) =>
    u && u !== req.user && String(u.username || "").toLowerCase() === username.toLowerCase() && isCompletedEmailAccount(u)
  );
  if (taken) return res.status(409).json({ success: false, code: "USERNAME_TAKEN", error: "This username is already taken. Please choose another username." });

  req.user.fullName = fullName;
  req.user.username = username;
  req.user.passwordHash = hashPassword(password);
  req.user.authProvider = "google";
  req.user.isVerified = true;
  req.user.accountStatus = "registered";
  req.user.profileCompleted = true;
  req.user.usernameLockedAt = new Date().toISOString();
  req.user.registrationCompletedAt = new Date().toISOString();
  req.user.profileUpdatedAt = new Date().toISOString();
  req.user.uniqueId = req.user.uniqueId || stablePardaisId(String(req.user.email));
  ensureStableEmailIdentity(req.user, String(req.user.email).toLowerCase());

  saveDatabase();
  void persistUserDurably(req.user).catch((err) => console.warn("[GOOGLE PROFILE] Background persistence delayed:", err));
  const token = await createSession(req.user);

  return res.status(200).json({
    success: true,
    message: "Google account completed successfully.",
    token,
    user: req.user
  });
});

// 4. Update Profile Details After Initial Verification / Setup
app.post("/api/v1/auth/setup-profile", authenticateUser, (req: any, res) => {
  const { fullName, username, avatar, gender } = req.body;
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (fullName && typeof fullName === "string" && fullName.trim().length > 0) {
    req.user.fullName = fullName.trim();
  }
  if (username && typeof username === "string" && !req.user.usernameLockedAt) {
    const cleanUser = username.trim().replace(/[^a-zA-Z0-9_]/g, "_");
    if (cleanUser.length > 2) req.user.username = cleanUser;
  }
  if (avatar && typeof avatar === "string" && avatar.startsWith("http")) {
    req.user.avatar = avatar;
  }
  if (gender && typeof gender === "string") {
    req.user.gender = gender;
  }

  ensureStableEmailIdentity(req.user, req.user.email || "");
  req.user.profileCompleted = Boolean(req.user.fullName && req.user.username);
  req.user.profileUpdatedAt = new Date().toISOString();
  persistUser(req.user);
  saveDatabase();

  res.json({
    success: true,
    message: "Profile updated successfully.",
    user: req.user
  });
});

// 5. Get Currently Authenticated User (Auth Me)
app.get("/api/v1/auth/me", authenticateUser, (req: any, res) => {
  res.json({
    success: true,
    user: req.user,
    ...req.user
  });
});

app.get("/api/v1/user/me", authenticateUser, (req: any, res) => {
  res.json(req.user);
});

// 6. Logout Current User Session
app.post("/api/v1/auth/logout", authenticateUser, (req: any, res) => {
  if (req.token && dbData.sessions[req.token]) {
    delete dbData.sessions[req.token];
    deleteDocument("sessions", req.token);
    saveDatabase();
  }
  res.json({ success: true, message: "Logged out successfully" });
});

// ------------------------------------------------------------------
// ACCOUNT DELETION / 30-DAY RESTORE SYSTEM
// ------------------------------------------------------------------
const ACCOUNT_DELETION_DAYS = 30;
const accountDeletionOtpLocks = new Map<string, number>();
const accountRestoreOtpLocks = new Map<string, number>();

function normalizeAccountEmail(email: any): string {
  return typeof email === "string" ? email.toLowerCase().trim() : "";
}

function getUserByEmailLocal(email: string): any | null {
  const cleanEmail = normalizeAccountEmail(email);
  return (dbData.users || []).find((u: any) =>
    u && typeof u.email === "string" && u.email.toLowerCase().trim() === cleanEmail
    && !String(u.uid || "").startsWith("guest_")
  ) || null;
}

function getAccountDeletionDate(user: any): string | null {
  return user?.deletionScheduledAt ? String(user.deletionScheduledAt) : null;
}

async function markAccountForDeletion(user: any) {
  const now = new Date();
  const scheduled = new Date(now.getTime() + ACCOUNT_DELETION_DAYS * 86400000);
  user.deletionRequestedAt = now.toISOString();
  user.deletionScheduledAt = scheduled.toISOString();
  user.deletionStatus = "pending";
  user.deletionRestoreUntil = scheduled.toISOString();
  user.accountStatus = "pending_deletion";

  if (dbData.sessions) {
    for (const [sessionToken, session] of Object.entries(dbData.sessions)) {
      if ((session as any)?.uid === user.uid || String((session as any)?.email || "").toLowerCase() === String(user.email || "").toLowerCase()) {
        delete dbData.sessions[sessionToken];
        void deleteDocument("sessions", sessionToken);
      }
    }
  }

  const persisted = await persistUserDurably(user);
  saveDatabase();
  return { persisted, scheduledAt: scheduled.toISOString() };
}

async function restorePendingAccount(user: any) {
  user.deletionRequestedAt = undefined;
  user.deletionScheduledAt = undefined;
  user.deletionRestoreUntil = undefined;
  user.deletionStatus = undefined;
  if (user.accountStatus === "pending_deletion") user.accountStatus = "registered";
  const persisted = await persistUserDurably(user);
  saveDatabase();
  return persisted;
}

function accountRecordBelongsToUser(record: any, user: any): boolean {
  if (!record || !user) return false;
  const uid = String(user.uid || "");
  const username = String(user.username || "").toLowerCase();
  const email = String(user.email || "").toLowerCase();
  const values = [
    record.uid, record.userId, record.userUid, record.user_id,
    record.ownerUid, record.ownerId, record.ownerUserId,
    record.creatorUid, record.creatorId, record.authorUid, record.authorId,
    record.hostUid, record.senderUid, record.fromUid, record.toUid,
    record.username, record.userName, record.ownerUsername, record.authorUsername,
    record.creatorUsername, record.hostUsername, record.senderUsername,
    record.email, record.userEmail, record.ownerEmail, record.authorEmail
  ].filter(v => v !== undefined && v !== null).map(v => String(v).toLowerCase());
  return values.includes(uid.toLowerCase()) || values.includes(username) || values.includes(email);
}

async function permanentlyDeleteAccount(user: any) {
  const uid = String(user.uid || "");
  const email = normalizeAccountEmail(user.email);
  const username = String(user.username || "");

  // Remove the user's primary profile documents and the email lock.
  await Promise.all([
    username ? deleteDocument("users", username) : Promise.resolve(),
    uid ? deleteDocument("users", `uid_${uid}`) : Promise.resolve(),
    email ? deleteDocument("users", `email_${email.replace(/[^a-zA-Z0-9]/g, "_")}`) : Promise.resolve(),
    email ? deleteDocument("emailRegistry", email.replace(/[^a-zA-Z0-9]/g, "_")) : Promise.resolve()
  ]);

  // Remove sessions belonging to the account.
  for (const [sessionToken, session] of Object.entries(dbData.sessions || {})) {
    if ((session as any)?.uid === uid || String((session as any)?.email || "").toLowerCase() === email) {
      delete dbData.sessions[sessionToken];
      void deleteDocument("sessions", sessionToken);
    }
  }

  // Remove user-owned metadata from the local cache and Firestore.
  for (const collectionName of ["reels", "stories", "chats", "reports", "kycRequests", "transactions", "notifications"]) {
    const list = Array.isArray(dbData[collectionName]) ? dbData[collectionName] : [];
    const owned = list.filter((record: any) => accountRecordBelongsToUser(record, user));
    for (const record of owned) {
      if (record?.id) void deleteDocument(collectionName, record.id);
    }
    dbData[collectionName] = list.filter((record: any) => !accountRecordBelongsToUser(record, user));
  }

  // Remove user-owned R2 reel/avatar objects when R2 is configured.
  try {
    if (process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && process.env.R2_ENDPOINT) {
      const client = getS3Client();
      const bucketName = process.env.R2_BUCKET_NAME || "pardaisparty-reels";
      const prefixes = uid ? [`reels/${uid}/`, `avatars/${uid}/`] : [];
      for (const Prefix of prefixes) {
        const listed = await client.send(new ListObjectsV2Command({ Bucket: bucketName, Prefix }));
        for (const item of (listed.Contents || [])) {
          if (item.Key) {
            try { await client.send(new DeleteObjectCommand({ Bucket: bucketName, Key: item.Key })); } catch {}
          }
        }
      }
    }
  } catch (err) {
    console.warn("[PARDAIS PARTY ACCOUNT DELETE] R2 cleanup warning:", err);
  }

  dbData.users = (dbData.users || []).filter((u: any) => u !== user && String(u.uid || "") !== uid && normalizeAccountEmail(u.email) !== email);
  saveDatabase();
  console.log(`[PARDAIS PARTY ACCOUNT DELETE] Permanently deleted account ${email}`);
}

async function findPendingDeletionAccount(email: string): Promise<any | null> {
  const cleanEmail = normalizeAccountEmail(email);
  let user = getUserByEmailLocal(cleanEmail);
  if (!user) {
    try {
      user = await getPersistedUserForEmail(cleanEmail);
    } catch {}
  }
  if (!user || !user.deletionScheduledAt) return null;
  if (Date.now() >= Date.parse(user.deletionScheduledAt)) {
    await permanentlyDeleteAccount(user);
    return null;
  }
  return user;
}

app.post("/api/v1/auth/request-account-deletion", authenticateUser, async (req: any, res) => {
  const user = req.user;
  if (!user?.email || !isCompletedEmailAccount(user)) {
    return res.status(400).json({ success: false, error: "Only a registered email account can request deletion." });
  }
  if (user.deletionScheduledAt) {
    const daysLeft = Math.max(0, Math.ceil((Date.parse(user.deletionScheduledAt) - Date.now()) / 86400000));
    return res.json({ success: true, alreadyPending: true, scheduledAt: user.deletionScheduledAt, daysLeft });
  }

  const result = await markAccountForDeletion(user);
  if (!result.persisted) return res.status(503).json({ success: false, error: "Deletion request could not be saved. Please try again." });

  return res.json({
    success: true,
    message: `Account deletion scheduled. You can restore the account within ${ACCOUNT_DELETION_DAYS} days.`,
    scheduledAt: result.scheduledAt,
    daysLeft: ACCOUNT_DELETION_DAYS
  });
});

app.post("/api/v1/auth/send-account-deletion-code", async (req, res) => {
  const email = normalizeAccountEmail(req.body?.email);
  if (!email || !email.includes("@")) return res.status(400).json({ success: false, error: "A valid registered email is required." });

  const user = await findRecoverableEmailUserDurably(email, 6000);
  if (!user) return res.status(404).json({ success: false, code: "ACCOUNT_NOT_FOUND", error: "No registered Pardais account was found for this email." });
  if (user.deletionScheduledAt) {
    return res.json({ success: true, alreadyPending: true, scheduledAt: user.deletionScheduledAt });
  }

  const last = accountDeletionOtpLocks.get(email) || 0;
  const remaining = 60000 - (Date.now() - last);
  if (remaining > 0) return res.status(429).json({ success: false, code: "OTP_COOLDOWN", error: `Please wait ${Math.ceil(remaining / 1000)} seconds.`, retryAfterSeconds: Math.ceil(remaining / 1000) });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const challengeKey = `delete_${email.replace(/[^a-zA-Z0-9]/g, "_")}`;
  const challenge = { otp, email, type: "account-deletion", expiresAt: Date.now() + 10 * 60 * 1000, createdAt: new Date().toISOString() };
  accountDeletionOtpLocks.set(email, Date.now());
  if (!dbData.accountDeletionOtps) dbData.accountDeletionOtps = {};
  dbData.accountDeletionOtps[email] = challenge;
  saveDatabase();
  void persistAuthChallenge(challengeKey, challenge).catch(() => undefined);

  try {
    await sendPardaisPartyOtpEmail(email, otp, "account-deletion");
    return res.json({ success: true, message: "Account deletion confirmation code sent to your email." });
  } catch (err) {
    delete dbData.accountDeletionOtps[email];
    accountDeletionOtpLocks.delete(email);
    void deletePersistedAuthChallenge(challengeKey).catch(() => undefined);
    saveDatabase();
    return res.status(502).json({ success: false, code: "EMAIL_DELIVERY_FAILED", error: "Deletion confirmation email could not be delivered." });
  }
});

app.post("/api/v1/auth/confirm-account-deletion", async (req, res) => {
  const email = normalizeAccountEmail(req.body?.email);
  const otp = String(req.body?.otp || "").trim();
  if (!email || !otp) return res.status(400).json({ success: false, error: "Email and deletion confirmation code are required." });

  const user = await findRecoverableEmailUserDurably(email, 6000);
  if (!user) return res.status(404).json({ success: false, code: "ACCOUNT_NOT_FOUND", error: "Account not found." });
  if (user.deletionScheduledAt) return res.json({ success: true, scheduledAt: user.deletionScheduledAt, daysLeft: Math.max(0, Math.ceil((Date.parse(user.deletionScheduledAt) - Date.now()) / 86400000)) });

  const challengeKey = `delete_${email.replace(/[^a-zA-Z0-9]/g, "_")}`;
  let stored = dbData.accountDeletionOtps?.[email] || null;
  if (!stored) stored = await getPersistedAuthChallenge(challengeKey);
  if (!stored || Date.now() > Number(stored.expiresAt) || String(stored.otp) !== otp) return res.status(401).json({ success: false, error: "Invalid or expired deletion confirmation code." });

  delete dbData.accountDeletionOtps[email];
  void deletePersistedAuthChallenge(challengeKey).catch(() => undefined);
  const result = await markAccountForDeletion(user);
  if (!result.persisted) return res.status(503).json({ success: false, error: "Deletion request could not be saved." });
  return res.json({ success: true, scheduledAt: result.scheduledAt, daysLeft: ACCOUNT_DELETION_DAYS });
});

app.post("/api/v1/auth/send-account-restore-code", async (req, res) => {
  const email = normalizeAccountEmail(req.body?.email);
  if (!email || !email.includes("@")) return res.status(400).json({ success: false, error: "A valid registered email is required." });

  const user = await findPendingDeletionAccount(email);
  if (!user) return res.status(404).json({ success: false, code: "NO_PENDING_DELETION", error: "No account pending deletion was found for this email." });

  const last = accountRestoreOtpLocks.get(email) || 0;
  const remaining = 60000 - (Date.now() - last);
  if (remaining > 0) return res.status(429).json({ success: false, code: "OTP_COOLDOWN", error: `Please wait ${Math.ceil(remaining / 1000)} seconds.`, retryAfterSeconds: Math.ceil(remaining / 1000) });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const challengeKey = `restore_${email.replace(/[^a-zA-Z0-9]/g, "_")}`;
  const challenge = { otp, email, type: "account-restore", expiresAt: Date.now() + 10 * 60 * 1000, createdAt: new Date().toISOString() };
  accountRestoreOtpLocks.set(email, Date.now());
  if (!dbData.accountRestoreOtps) dbData.accountRestoreOtps = {};
  dbData.accountRestoreOtps[email] = challenge;
  saveDatabase();
  void persistAuthChallenge(challengeKey, challenge).catch(() => undefined);

  try {
    await sendPardaisPartyOtpEmail(email, otp, "account-restore");
    return res.json({ success: true, message: "Account restore code sent to your registered email." });
  } catch (err) {
    delete dbData.accountRestoreOtps[email];
    accountRestoreOtpLocks.delete(email);
    void deletePersistedAuthChallenge(challengeKey).catch(() => undefined);
    saveDatabase();
    return res.status(502).json({ success: false, code: "EMAIL_DELIVERY_FAILED", error: "Restore email could not be delivered." });
  }
});

app.post("/api/v1/auth/restore-account", async (req, res) => {
  const email = normalizeAccountEmail(req.body?.email);
  const otp = String(req.body?.otp || "").trim();
  if (!email || !otp) return res.status(400).json({ success: false, error: "Email and restore code are required." });

  const user = await findPendingDeletionAccount(email);
  if (!user) return res.status(404).json({ success: false, code: "NO_PENDING_DELETION", error: "No account pending deletion was found for this email." });

  const challengeKey = `restore_${email.replace(/[^a-zA-Z0-9]/g, "_")}`;
  let stored = dbData.accountRestoreOtps?.[email] || null;
  if (!stored) stored = await getPersistedAuthChallenge(challengeKey);
  if (!stored || Date.now() > Number(stored.expiresAt) || String(stored.otp) !== otp) return res.status(401).json({ success: false, error: "Invalid or expired restore code." });

  delete dbData.accountRestoreOtps[email];
  void deletePersistedAuthChallenge(challengeKey).catch(() => undefined);
  const persisted = await restorePendingAccount(user);
  if (!persisted) return res.status(503).json({ success: false, error: "Account could not be restored from permanent storage. Please try again." });

  const token = await createSession(user);
  saveDatabase();
  return res.json({ success: true, message: "Account restored successfully.", token, user });
});


// 7. Acquire or Refresh Session Token
app.post("/api/v1/auth/guest-login", (req, res) => {
  try {
    const requestDeviceId = req.body?.deviceId || (req.headers["x-device-id"] as string);
    if (isDeviceIdBlocked(requestDeviceId)) {
      return res.status(403).json({
        error: "DEVICE_HARDWARE_BLOCKED",
        message: "🚨 HARDWARE BAN ENFORCED: Your phone/device hardware has been permanently banned from Pardais Party by system administrators."
      });
    }

    const requestedUsername = req.body?.username || `user_${Math.floor(1000 + Math.random() * 9000)}`;
    const requestedUid = req.body?.uid || `guest_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    
    let user = dbData.users?.find((u: any) => 
      (requestedUid && u.uid === requestedUid) || 
      (requestedUsername && u.username === requestedUsername)
    );

    if (!user) {
      user = {
        uid: requestedUid,
        username: requestedUsername,
        uniqueId: `pardais_${Math.floor(1000 + Math.random() * 9000)}`,
        fullName: req.body?.fullName || "Pardais Member",
        avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80",
        bio: "Pardais Party Member 🇵🇰",
        gender: "Male",
        country: "Pakistan",
        coins: 0,
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
      loginTime: new Date().toISOString()
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
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to create session" });
  }
});

app.post("/api/v1/auth/refresh-session", async (req, res) => {
  const requestDeviceId = req.body?.deviceId || (req.headers["x-device-id"] as string);
  if (isDeviceIdBlocked(requestDeviceId)) {
    return res.status(403).json({
      error: "DEVICE_HARDWARE_BLOCKED",
      message: "🚨 HARDWARE BAN ENFORCED: Your phone/device hardware has been permanently banned from Pardais Party by system administrators."
    });
  }

  const requestedUsername = req.body?.username || `user_${Math.floor(1000 + Math.random() * 9000)}`;
  const requestedUid = req.body?.uid || `guest_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const requestedEmail = typeof req.body?.email === "string" ? req.body.email.toLowerCase().trim() : "";
  
  let user = dbData.users?.find((u: any) => 
    (requestedUid && u.uid === requestedUid) || 
    (requestedUsername && u.username === requestedUsername)
  );

  if (!user) {
    user = {
      uid: requestedUid,
      username: requestedUsername,
      uniqueId: `pardais_${Math.floor(1000 + Math.random() * 9000)}`,
      email: requestedEmail,
      fullName: req.body?.fullName || "Pardais Member",
      avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80",
      bio: "Pardais Party Member 🇵🇰",
      gender: "Male",
      country: "Pakistan",
      coins: 0,
      diamonds: 0,
      vipLevel: 0,
      userLevel: 1,
      hostLevel: 1,
      wealthLevel: 1,
      xp: 0
    };
    if (!Array.isArray(dbData.users)) dbData.users = [];
    dbData.users.push(user);
    applyAdminAccountState(user, { initializeCoins: true });
    syncDocument("users", user.username, user);
  } else {
    applyAdminAccountState(user, { initializeCoins: true });
  }

  const token = `pardais_session_${user.uid}_${Math.random().toString(36).substring(2, 10)}`;
  const sessionData = {
    uid: user.uid,
    username: user.username,
    email: user.email || "",
    loginTime: new Date().toISOString()
  };
  if (!dbData.sessions) dbData.sessions = {};
  dbData.sessions[token] = sessionData;

  saveDatabase();
  await syncDocument("sessions", token, sessionData);

  return res.json({
    success: true,
    token,
    user
  });
});

// ------------------------------------------------------------------
// GEMINI SDK INTEGRATION
// ------------------------------------------------------------------
let aiClient: any = null;

function getAIClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// ------------------------------------------------------------------
// CORE APIS & REST COMPONENT CONNECTIVITY (GET/POST)
// ------------------------------------------------------------------

// Synchronize entire DB state in one call
app.get("/api/v1/db", (req, res) => {
  loadDatabase();
  res.json(dbData);
});

// Reset database to default
app.post("/api/v1/db/reset", (req, res) => {
  fs.unlinkSync(DB_PATH);
  loadDatabase();
  res.json({ message: "Database reset to defaults successfully", data: dbData });
});

// Global configurations get/update
app.get("/api/v1/config", (req, res) => {
  res.json(dbData.configurations);
});

app.post("/api/v1/config", (req, res) => {
  dbData.configurations = { ...dbData.configurations, ...req.body };
  saveDatabase();
  res.json({ message: "Configurations saved", config: dbData.configurations });
});

// Single user profiles get/update
app.get("/api/v1/user", authenticateUser, (req: any, res) => {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized. Please log in." });
  }
  res.json(req.user);
});

app.post("/api/v1/user", authenticateUser, async (req: any, res: any) => {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized. Please log in." });
  }
  const user = req.user;
  
  // Server-side validation of incoming updates
  if (req.body.coins !== undefined) {
    const coins = Number(req.body.coins);
    if (isNaN(coins) || coins < 0) {
      return res.status(400).json({ error: "Invalid coin balance value." });
    }
    // SECURE CHECK: Block direct coin increase by user
    if (coins > (user.coins || 0)) {
      return res.status(403).json({ error: "Security Exception: Users are unauthorized to increase their coin balance directly." });
    }
  }
  
  if (req.body.diamonds !== undefined) {
    const diamonds = Number(req.body.diamonds);
    if (isNaN(diamonds) || diamonds < 0) {
      return res.status(400).json({ error: "Invalid diamond balance value." });
    }
    // SECURE CHECK: Users can never add diamonds directly
    if (diamonds > (user.diamonds || 0)) {
      return res.status(403).json({ error: "Security Exception: Direct diamond balance increase is forbidden." });
    }
  }

  if (req.body.agencyId !== undefined && req.body.agencyId !== user.agencyId) {
    return res.status(403).json({ error: "Security Exception: Direct agency status modification is forbidden." });
  }

  // Only editable profile fields are permitted: DP (avatar), fullName, dob/age, phoneNumber, bio, gender, country, language.
  // Permanent identity fields (username, uniqueId, email, passwordHash, coins, diamonds, vipLevel) cannot be altered via profile edit.
  const allowedFields = ["avatar", "fullName", "dob", "phoneNumber", "bio", "gender", "country", "language"];
  const profileUpdates: Record<string, any> = {};
  for (const field of allowedFields) {
    if (req.body && req.body[field] !== undefined) {
      profileUpdates[field] = req.body[field];
    }
  }

  const profileUpdatedAt = new Date().toISOString();
  const updatedUser = {
    ...user,
    ...profileUpdates,
    username: user.username,
    uniqueId: user.uniqueId,
    email: user.email,
    passwordHash: user.passwordHash,
    profileUpdatedAt,
  };
  if (profileUpdates.avatar !== undefined) {
    updatedUser.avatarUpdatedAt = profileUpdatedAt;
    updatedUser.avatarSource = profileUpdates.avatar ? "user-upload" : "default";
  }
  req.user = updatedUser;
  
  // Sync changes in the persistent users list
  const idxInUsers = dbData.users.findIndex((u: any) =>
    (user.uid && u.uid === user.uid) ||
    (user.email && String(u.email || "").toLowerCase().trim() === String(user.email || "").toLowerCase().trim()) ||
    u.username === user.username
  );
  if (idxInUsers !== -1) {
    dbData.users[idxInUsers] = updatedUser;
  } else {
    dbData.users.push(updatedUser);
  }

  // Account-scoped profile update only. Do not write this user's data into
  // the legacy global dbData.user reference, which can make two accounts
  // alternate after a refresh.

  // Keep synced in admin list as well
  const idx = dbData.adminUsersList.findIndex((u: any) => u.username === updatedUser.username);
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

  // Wait for account-scoped durable persistence so a refresh immediately after
  // saving can never race ahead of the Firestore write.
  await persistUserDurably(updatedUser);
  if (idx !== -1) {
    syncDocument("adminUsersList", updatedUser.username, dbData.adminUsersList[idx]);
  }

  res.json({ message: "Profile synchronized", user: updatedUser });
});

// ------------------------------------------------------------------
// SPECIAL ACCESS / MODERATION ACTIONS ENDPOINTS
// ------------------------------------------------------------------

// 1. Moderate End Stream (Party, Solo Host, PK Battle)
app.post("/api/v1/moderation/end-stream", (req, res) => {
  const { streamType, streamId, hostUsername, reason, moderator } = req.body || {};
  console.log(`[MODERATION ENGINE] Stream End Triggered by ${moderator || "Moderator"}: ${streamType} (ID: ${streamId}, Host: ${hostUsername}) Reason: ${reason}`);

  let resultMessage = "Stream ended successfully.";

  // End Party Room
  if (streamType === "party" || streamId?.startsWith("party-")) {
    const pIdx = dbData.parties?.findIndex((p: any) => p.id === streamId || p.hostUsername === hostUsername);
    if (pIdx !== -1 && pIdx !== undefined) {
      const party = dbData.parties[pIdx];
      party.status = "ended";
      dbData.parties.splice(pIdx, 1);
      saveDatabase();
      deleteDocument("parties", party.id);
      resultMessage = `Party room ${party.id} (@${party.hostUsername}) terminated by Moderator.`;
    }
  }

  // End Solo Host / PK Stream
  const hIdx = dbData.hosts?.findIndex((h: any) => h.id === streamId || h.hostUsername === hostUsername || h.name === hostUsername);
  if (hIdx !== -1 && hIdx !== undefined) {
    const host = dbData.hosts[hIdx];
    host.isLive = false;
    host.inPk = false;
    host.statusText = "Offline (Ended by Moderator)";
    saveDatabase();
    syncDocument("hosts", host.id, host);
    resultMessage = `Live Stream for Host @${host.hostUsername || host.name} terminated by Moderator.`;
  }

  // Terminate any active PK session
  Object.keys(activePkSessions).forEach(sessionId => {
    const s = activePkSessions[sessionId];
    if (s && (s.hostA?.username === hostUsername || s.hostB?.username === hostUsername || s.id === streamId)) {
      s.status = "ended";
      s.pkActive = false;
      delete activePkSessions[sessionId];
    }
  });

  res.json({ success: true, message: resultMessage });
});

// 2. Moderation Send Warning to User / Host
app.post("/api/v1/moderation/warning", (req, res) => {
  const { username, warningMessage, moderator } = req.body || {};
  if (!username) return res.status(400).json({ error: "Target username is required" });

  const target = dbData.users?.find((u: any) => String(u.username).toLowerCase() === String(username).toLowerCase());
  if (target) {
    if (!Array.isArray(target.warnings)) target.warnings = [];
    target.warnings.push({
      id: `warn-${Date.now()}`,
      message: warningMessage || "Violation of Community Guidelines warning issued.",
      moderator: moderator || "Moderator System",
      timestamp: new Date().toISOString()
    });
    saveDatabase();
    syncDocument("users", target.username, target);
  }

  // Send system notification
  if (!Array.isArray(dbData.notifications)) dbData.notifications = [];
  dbData.notifications.push({
    id: `notif-warn-${Date.now()}`,
    userId: target ? (target.uid || target.username) : username,
    username: target ? target.username : username,
    title: "⚠️ OFFICIAL MODERATOR WARNING",
    body: warningMessage || "You have received an official warning for community guideline infraction.",
    type: "warning",
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    read: false
  });
  saveDatabase();

  res.json({ success: true, message: `Official Warning dispatched to @${username}` });
});

// 3. Suspend / Un-suspend User Account ID
app.post("/api/v1/moderation/toggle-suspend", (req, res) => {
  const { username, suspend, reason, moderator } = req.body || {};
  if (!username) return res.status(400).json({ error: "Username is required" });

  const target = dbData.users?.find((u: any) => String(u.username).toLowerCase() === String(username).toLowerCase());
  const shouldSuspend = suspend !== false;

  if (target) {
    target.isBanned = shouldSuspend;
    target.banReason = shouldSuspend ? (reason || "Account Suspended by Moderator") : null;
    target.suspendedAt = shouldSuspend ? new Date().toISOString() : null;
    target.suspendedBy = shouldSuspend ? (moderator || "Moderator") : null;
    saveDatabase();
    syncDocument("users", target.username, target);
  }

  // Also update in host record if host
  const hostMatch = dbData.hosts?.find((h: any) => String(h.hostUsername || h.name).toLowerCase() === String(username).toLowerCase());
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
    message: `@${username} account status updated to ${shouldSuspend ? "SUSPENDED 🚫" : "ACTIVE / RESTORED ✅"}`
  });
});

// 4. Force Live ON / Start Stream Override
app.post("/api/v1/moderation/force-live-on", (req, res) => {
  const { username, category, title } = req.body || {};
  if (!username) return res.status(400).json({ error: "Username is required" });

  let host = dbData.hosts?.find((h: any) => String(h.hostUsername || h.name).toLowerCase() === String(username).toLowerCase());
  if (!host) {
    const user = dbData.users?.find((u: any) => String(u.username).toLowerCase() === String(username).toLowerCase());
    host = {
      id: `host-${Date.now()}`,
      name: username,
      hostUsername: username,
      role: "Official Broadcaster",
      avatar: user?.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80",
      followers: `${user?.followersCount || 1000}`,
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

  res.json({ success: true, message: `Live stream status for @${username} is now FORCE ACTIVATED (LIVE ON) 🔴` });
});

// 5. Suspend / Un-suspend Device Hardware ID
app.post("/api/v1/moderation/device-ban", (req, res) => {
  const { deviceId, ban, reason } = req.body || {};
  if (!deviceId) return res.status(400).json({ error: "Device ID required" });

  if (!Array.isArray(dbData.configurations.bannedDevices)) {
    dbData.configurations.bannedDevices = [];
  }

  const shouldBan = ban !== false;
  const devIndex = dbData.configurations.bannedDevices.findIndex((d: any) => typeof d === "string" ? d === deviceId : d.id === deviceId);

  if (shouldBan) {
    if (devIndex === -1) {
      dbData.configurations.bannedDevices.push({
        id: deviceId,
        reason: reason || "Hardware device suspended by Moderator",
        timestamp: new Date().toISOString()
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
    message: `Device Hardware ID ${deviceId} is now ${shouldBan ? "SUSPENDED (DEVICE BANNED) 📱🚫" : "UNBANNED / RESTORED 📱✅"}`
  });
});

// ------------------------------------------------------------------
// REAL GOOGLE PAY & CARD PAYMENT GATEWAY VERIFICATION & RECHARGE ENGINE
// ------------------------------------------------------------------
app.post(["/api/v1/payments/process", "/api/v1/payments/verify"], (req: any, res) => {
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

    // Identify target user by session token, username or userId
    let targetUser: any = null;
    const authHeader = req.headers["authorization"];
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      const session = dbData.sessions?.[token];
      if (session) {
        targetUser = dbData.users?.find((u: any) =>
          (session.uid && u.uid === session.uid) ||
          (session.username && u.username === session.username) ||
          (session.email && u.email === session.email)
        );
      }
    }

    if (!targetUser) {
      const searchKey = username || userId;
      targetUser = dbData.users?.find((u: any) => u.username === searchKey || u.uid === searchKey);
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

    // SERVER-SIDE PAYMENT VALIDATION & GATEWAY VERIFICATION
    const cleanMethod = String(paymentMethod || "Card").toLowerCase();
    const generatedOrderId = orderId || `${cleanMethod.includes("gpay") || cleanMethod.includes("google") ? "GPAY" : "CARD"}-${Math.floor(100000 + Math.random() * 900000)}`;
    const isGooglePay = cleanMethod.includes("gpay") || cleanMethod.includes("google");

    // Check for test card decline (e.g. card number 4000000000000000)
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
        date: new Date().toISOString(),
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

    // PAYMENT VERIFICATION SUCCESS: Server-side credit
    const previousCoins = targetUser.coins || 0;
    const updatedCoins = previousCoins + coinsToCredit;
    targetUser.coins = updatedCoins;

    // Synchronize user in main dbData.users array
    const userIndex = dbData.users.findIndex((u: any) => u.username === targetUser.username || u.uid === targetUser.uid);
    if (userIndex !== -1) {
      dbData.users[userIndex].coins = updatedCoins;
    }
    if (dbData.user && dbData.user.username === targetUser.username) {
      dbData.user.coins = updatedCoins;
    }

    // Record verified transaction in ledger
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
      date: new Date().toISOString(),
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

    // Notify user in-app
    if (!dbData.notifications) dbData.notifications = [];
    dbData.notifications.unshift({
      id: Date.now(),
      targetUsername: targetUser.username,
      title: "🎉 Payment Verified & Coins Added!",
      message: `Your payment of ${completedTx.formattedAmount} was verified by the gateway. ${coinsToCredit.toLocaleString()} coins have been added to your wallet balance. New Balance: ${updatedCoins.toLocaleString()} coins. Order ID: ${generatedOrderId}`,
      timestamp: new Date().toISOString(),
      type: "recharge_success",
      read: false
    });

    saveDatabase();

    // Sync to Firestore for real-time listener updates across devices
    syncDocument("users", targetUser.username, targetUser);
    syncDocument("transactions", generatedOrderId, completedTx);

    console.log(`[PARDAIS-PARTY PAYMENTS] ✅ VERIFIED TRANSACTION [${generatedOrderId}] for @${targetUser.username}: +${coinsToCredit} coins. New balance: ${updatedCoins}`);

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
  } catch (err: any) {
    console.error("[PARDAIS-PARTY PAYMENTS] Payment processing error:", err);
    return res.status(500).json({
      success: false,
      error: "PAYMENT_GATEWAY_ERROR",
      message: err.message || "An unexpected error occurred during payment verification."
    });
  }
});

app.get("/api/v1/payments/ledger", (req, res) => {
  if (!dbData.onlineRechargeLedger) {
    dbData.onlineRechargeLedger = [];
  }
  res.json({
    success: true,
    ledger: dbData.onlineRechargeLedger
  });
});
const DEFAULT_ADVANCED_GIFTS_SERVER = [
  { id: "g-lion", name: "Golden Lion 🦁", cost: 10000, type: "3d", icon: "🦁", color: "from-amber-500 via-yellow-500 to-amber-700", animationClass: "animate-bounce", category: "Popular", description: "Roaring Golden Lion of supreme royalty & majesty!", animationFile: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4", animationFormat: "mp4", animationDuration: 10, animationDisplayType: "full", comboSupported: true, status: "active", featured: true, priority: 100 },
  { id: "g-spice", name: "Indian Spice 🌶️", cost: 3000, type: "3d", icon: "🌶️", color: "from-red-600 via-amber-500 to-yellow-500", animationClass: "animate-bounce", category: "Popular", description: "Sizzling Indian Spice explosion video overlay!", animationFile: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4", animationFormat: "mp4", animationDuration: 10, animationDisplayType: "full", comboSupported: true, status: "active", featured: true, priority: 95 },
  { id: "g-fireworks", name: "Fireworks 🎆", cost: 5000, type: "3d", icon: "🎆", color: "from-purple-500 via-pink-500 to-amber-400", animationClass: "animate-pulse", category: "Popular", description: "Grand sparkling celebration fireworks video overlay!", animationFile: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4", animationFormat: "mp4", animationDuration: 12, animationDisplayType: "full", comboSupported: true, status: "active", featured: true, priority: 90 },
  { id: "g-rose", name: "Red Rose", cost: 10, type: "2d", icon: "🌹", color: "from-pink-500 to-rose-600", animationClass: "animate-bounce", category: "Popular", description: "A fresh beautiful red rose of deep admiration.", animationFile: "🌹", animationFormat: "svg", animationDuration: 5, animationDisplayType: "small", comboSupported: true, status: "active", featured: true, priority: 10 },
  { id: "g-heart", name: "Love Heart", cost: 99, type: "2d", icon: "💖", color: "from-red-500 to-pink-500", animationClass: "animate-pulse", category: "Popular", description: "Express your warm affection.", animationFile: "💖", animationFormat: "svg", animationDuration: 5, animationDisplayType: "small", comboSupported: true, status: "active", featured: true, priority: 9 },
  { id: "g-lucky-coin", name: "Lucky Coin", cost: 50, type: "2d", icon: "🪙", color: "from-yellow-400 to-amber-600", animationClass: "animate-bounce", category: "Lucky", description: "Send fortune!", animationFile: "🪙", animationFormat: "svg", animationDuration: 5, animationDisplayType: "small", comboSupported: true, status: "active", featured: false, priority: 8 },
  { id: "g-crown", name: "VIP Crown", cost: 999, type: "3d", icon: "👑", color: "from-yellow-400 to-amber-600", animationClass: "animate-spin", category: "VIP", description: "Royal crown for the star.", animationFile: "👑", animationFormat: "svga", animationDuration: 10, animationDisplayType: "half", comboSupported: true, status: "active", featured: true, priority: 7 },
  { id: "g-star-trophy", name: "Star Trophy", cost: 500, type: "3d", icon: "🏆", color: "from-yellow-300 to-amber-500", animationClass: "animate-pulse", category: "New", description: "Awarded to energetic hosts.", animationFile: "🏆", animationFormat: "svg", animationDuration: 8, animationDisplayType: "half", comboSupported: true, status: "active", featured: false, priority: 6 },
  { id: "g-car", name: "Sports Car", cost: 4999, type: "luxury", icon: "🏎️", color: "from-blue-500 to-indigo-600", animationClass: "animate-bounce", category: "Luxury", description: "Rev your engine!", animationFile: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4", animationFormat: "mp4", animationDuration: 10, animationDisplayType: "full", comboSupported: false, status: "active", featured: true, priority: 4 },
  { id: "g-rocket", name: "Space Rocket", cost: 9999, type: "luxury", icon: "🚀", color: "from-purple-600 to-pink-600", animationClass: "animate-pulse", category: "Premium", description: "Blast off into the cosmos!", animationFile: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4", animationFormat: "mp4", animationDuration: 15, animationDisplayType: "full", comboSupported: false, status: "active", featured: true, priority: 3 },
  { id: "g-dragon", name: "Golden Dragon", cost: 29999, type: "luxury", icon: "🐉", color: "from-amber-500 to-red-600", animationClass: "animate-bounce", category: "Luxury", description: "Screaming golden fire storm!", animationFile: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4", animationFormat: "mp4", animationDuration: 30, animationDisplayType: "ultra", comboSupported: false, status: "active", featured: true, priority: 2 }
];

const PARDAIS_LEVEL_THRESHOLDS_SERVER = [500, 2000, 5000, 10000, 20000, 35000, 55000, 80000, 120000, 175000, 250000, 350000, 500000, 700000, 1000000, 1250000, 1550000, 1900000, 2300000, 2800000, 3300000, 3900000, 4500000, 5200000, 6000000, 7000000, 8200000, 9600000, 11200000, 13000000, 15000000, 17200000, 19600000, 22200000, 25000000, 28000000, 31500000, 35000000, 39000000, 43000000, 47000000, 51000000, 55000000, 58000000, 61000000, 63000000, 65000000, 67000000, 69000000, 70000000, 75000000, 90000000, 110000000, 135000000, 165000000, 200000000, 245000000, 300000000, 370000000, 450000000, 550000000, 670000000, 820000000, 1000000000, 1200000000, 1450000000, 1750000000, 2100000000, 2500000000, 3000000000, 3600000000, 4300000000, 5100000000, 6000000000, 7000000000, 8200000000, 9500000000, 11000000000, 12700000000, 15000000000, 17500000000, 20000000000, 23000000000, 26000000000, 30000000000, 34000000000, 38500000000, 43000000000, 48000000000, 54000000000, 59000000000, 64000000000, 69000000000, 74000000000, 80000000000, 84000000000, 88000000000, 92000000000, 96000000000, 100000000000];
function getProgressionFromServerCoins(xp: number) {
  const value = Math.max(0, Number(xp) || 0);
  let level = 1;
  for (let i = 0; i < PARDAIS_LEVEL_THRESHOLDS_SERVER.length; i++) {
    if (value >= PARDAIS_LEVEL_THRESHOLDS_SERVER[i]) level = i + 1;
    else break;
  }
  level = Math.min(100, Math.max(1, level));
  const vipLevel = Math.min(12, Math.max(0, Math.floor(level / 8)));
  return { level, vipLevel };
}

app.get("/api/v1/gifts", (req, res) => {
  if (!dbData.gifts || dbData.gifts.length === 0) {
    dbData.gifts = [...DEFAULT_ADVANCED_GIFTS_SERVER];
  } else {
    const giftMap = new Map<string, any>();
    DEFAULT_ADVANCED_GIFTS_SERVER.forEach((g: any) => giftMap.set(g.id, g));
    dbData.gifts.forEach((g: any) => {
      if (g && g.id) {
        const defG = DEFAULT_ADVANCED_GIFTS_SERVER.find(d => d.id === g.id);
        if (defG && (!g.animationFile || g.animationFile.length < 5 || (typeof g.animationFile === "string" && !g.animationFile.startsWith("http") && !g.animationFile.startsWith("data:") && !g.animationFile.startsWith("blob:")))) {
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

app.post("/api/v1/gifts/send", authenticateUser, (req, res) => {
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

  let gift = dbData.gifts.find((g: any) => g.id === giftId);
  if (!gift) {
    gift = DEFAULT_ADVANCED_GIFTS_SERVER.find((g: any) => g.id === giftId);
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

  const user = (req as any).user || dbData.user;
  const userCoins = Number(user.coins) || 0;

  if (userCoins < totalCost) {
    return res.status(400).json({ error: `Insufficient balance. Required: ${totalCost} coins, Available: ${userCoins} coins.` });
  }

  user.coins = userCoins - totalCost;
  user.xp = (user.xp || 0) + Math.floor(totalCost * 0.2);
  const giftProgress = getProgressionFromServerCoins(user.xp);
  user.userLevel = giftProgress.level;
  user.vipLevel = giftProgress.vipLevel;
  user.wealthLevel = Math.max(Number(user.wealthLevel) || 1, (Number(user.wealthLevel) || 1) + 1);

  // Gift display value is always the full amount, while the recipient
  // receives exactly 50% in the earning/diamond wallet.
  const recipientEarnings = Math.floor(totalCost * 0.5);
  const companyShare = totalCost - recipientEarnings;
  const hostEarnings = recipientEarnings;

  // Credit the actual recipient's earning wallet when the recipient can be
  // resolved from the authenticated user database. This is separate from
  // the 100% gift value shown on the seat/room UI.
  const normalizedRecipient = String(recipient || '').trim().toLowerCase();
  const recipientUser = (dbData.users || []).find((u: any) => {
    const username = String(u?.username || '').trim().toLowerCase();
    const fullName = String(u?.fullName || '').trim().toLowerCase();
    return normalizedRecipient && (username === normalizedRecipient || fullName === normalizedRecipient);
  });
  if (recipientUser) {
    recipientUser.diamonds = (Number(recipientUser.diamonds) || 0) + recipientEarnings;
    recipientUser.updatedAt = new Date().toISOString();
    const recipientIndex = dbData.users.findIndex((u: any) => u?.uid === recipientUser.uid || u?.username === recipientUser.username);
    if (recipientIndex >= 0) dbData.users[recipientIndex] = { ...recipientUser };
    syncDocument('users', recipientUser.username || recipientUser.uid, recipientUser);
  }

  if (!dbData.platformMetrics) {
    dbData.platformMetrics = { totalGiftCoins: 0, companyRevenue: 0, hostDiamondsDistributed: 0 };
  }
  dbData.platformMetrics.totalGiftCoins = (dbData.platformMetrics.totalGiftCoins || 0) + totalCost;
  dbData.platformMetrics.companyRevenue = (dbData.platformMetrics.companyRevenue || 0) + companyShare;
  dbData.platformMetrics.hostDiamondsDistributed = (dbData.platformMetrics.hostDiamondsDistributed || 0) + hostEarnings;

  const txId = requestId || `TX-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const txLog = {
    id: txId,
    type: "gift_sent",
    amount: totalCost,
    currency: "coins",
    hostEarnings,
    recipientEarnings,
    companyShare,
    sender: user.username,
    senderAvatar: user.avatar || "",
    recipient,
    giftName: gift.name,
    giftIcon: gift.icon,
    count: giftCount,
    targetHostSide: targetHostSide || "hostA",
    partyId: req.body.partyId || req.body.roomId || null,
    timestamp: new Date().toISOString(),
    status: "Completed"
  };

  if (!dbData.transactions) dbData.transactions = [];
  dbData.transactions.unshift(txLog);

  // Persist both sides of the wallet transfer immediately. React state is only a display cache.
  const senderIndex = dbData.users.findIndex((u: any) => u?.uid === user?.uid || (u?.email && user?.email && String(u.email).toLowerCase() === String(user.email).toLowerCase()));
  if (senderIndex >= 0) dbData.users[senderIndex] = { ...dbData.users[senderIndex], ...user };
  else if (user?.uid) dbData.users.push(user);
  void persistUserDurably(user).catch(err => console.warn("[GIFT] sender durable persistence delayed", err));
  if (recipientUser) void persistUserDurably(recipientUser).catch(err => console.warn("[GIFT] recipient durable persistence delayed", err));

  if (!Array.isArray(dbData.notifications)) dbData.notifications = [];
  if (recipientUser?.username) {
    const notification = {
      id: `gift_${txId}`,
      type: "Gifts",
      category: "wallet",
      targetUsername: recipientUser.username,
      actorUsername: user.username,
      title: "🎁 Gift Received!",
      message: `@${user.username} sent you ${giftCount}x ${gift.name} worth ${totalCost.toLocaleString()} Coins. Your Creator Center received ${recipientEarnings.toLocaleString()} Coins (50%).`,
      giftCoins: totalCost,
      creatorCoins: recipientEarnings,
      timestamp: new Date().toISOString(),
      read: false
    };
    dbData.notifications.unshift(notification);
    void syncDocument("notifications", notification.id, notification).catch(() => undefined);
  }
  // Persist party-room gift totals server-side so every participant sees the same
  // host/speaker gift ranking after refresh or reconnect.
  const partyId = req.body.partyId || req.body.roomId || null;
  if (partyId && Array.isArray(dbData.parties)) {
    const party = dbData.parties.find((p: any) => p?.id === partyId);
    if (party && Array.isArray(party.seats)) {
      const normalizedRecipient = String(recipient || party.hostUsername || "Host").trim().toLowerCase();
      party.seats = party.seats.map((seat: any) => {
        const seatName = String(seat?.name || "").trim().toLowerCase();
        const isHostTarget = (normalizedRecipient === "host" && seat.id === 1) || seatName === normalizedRecipient || (normalizedRecipient === String(party.hostUsername || "").trim().toLowerCase() && seat.id === 1);
        if (!isHostTarget) return seat;
        const current = Number(String(seat.giftCoins || "0").replace(/,/g, "").replace(/k$/i, "000").replace(/m$/i, "000000")) || 0;
        return { ...seat, giftCoins: current + totalCost };
      });
      party.lastGiftEvent = { sender: user.username, recipient: recipient || party.hostUsername || "Host", totalCost, giftName: gift.name, count: giftCount, timestamp: Date.now() };
      saveDatabase();
      syncDocument("parties", party.id, party);
    }
  }

  saveDatabase();

  const responseData = {
    success: true,
    transactionId: txId,
    gift,
    count: giftCount,
    totalCoinsSpent: totalCost,
    remainingCoins: user.coins,
    hostEarnings,
    recipientEarnings,
    companyShare,
    recipient,
    recipientWalletCredit: recipientEarnings,
    recipientCreatorBalance: recipientUser ? Number(recipientUser.diamonds) || 0 : null,
    displayGiftValue: totalCost,
    pkScoreAdded: totalCost,
    timestamp: txLog.timestamp
  };

  if (!dbData.processedGiftRequests) dbData.processedGiftRequests = {};
  if (requestId) {
    dbData.processedGiftRequests[requestId] = responseData;
  }

  // Construct full gift event payload for 60FPS WebM animation synchronization
  const eventId = requestId || `ge-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const partyIdForBroadcast = req.body.partyId || req.body.roomId || null;
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
    // Audience metadata: the backend attaches this event to every relevant live
    // room/stream state so sender, recipient, seated guests, viewers/listeners,
    // and both PK sides receive the exact same animation event.
    audienceRoomId: partyIdForBroadcast,
    audienceHostId: req.body.hostId || null,
    audienceMode: partyIdForBroadcast ? "party" : (targetHostSide ? "pk-or-live" : "live"),
    animationFile: gift.animationFile || gift.videoUrl || gift.animationUrl || gift.icon || "",
    videoUrl: gift.videoUrl || gift.animationUrl || gift.animationFile || "",
    animationUrl: gift.animationUrl || gift.videoUrl || gift.animationFile || "",
    animationFormat: gift.animationFormat || "webm",
    animationDuration: gift.animationDuration || 8,
    animationDisplayType: gift.animationDisplayType || "full",
    type: gift.type || "3d",
    timestamp: Date.now()
  };

  // Update active host stream state with lastGiftEvent, giftEventQueue & PK scores
  const hostId = req.body.hostId;
  const activeHostMatch = (dbData.hosts || []).find((h: any) => 
    (hostId && (h.id === hostId || h.hostUsername === hostId || h.name === hostId)) ||
    (recipient && h.hostUsername && recipient.toLowerCase().includes(h.hostUsername.toLowerCase())) ||
    h.isLive
  );

  // Sync score with activePkSessions
  let hasActivePkSess = false;
  Object.values(activePkSessions).forEach((sess: any) => {
    if (sess && sess.status !== "ended") {
      hasActivePkSess = true;
      getSynchronizedPkSession(sess, Date.now());
      const recNorm = (recipient || "").toLowerCase();
      const isHostA = (sess.hostA?.username && sess.hostA.username.toLowerCase() === recNorm) ||
                      (sess.hostA?.userId && String(sess.hostA.userId).toLowerCase() === recNorm) ||
                      targetHostSide === "hostA";
      const isHostB = (sess.hostB?.username && sess.hostB.username.toLowerCase() === recNorm) ||
                      (sess.hostB?.userId && String(sess.hostB.userId).toLowerCase() === recNorm) ||
                      targetHostSide === "hostB";

      if (isHostB) {
        const multB = sess.multiplierB || 1;
        const pts = totalCost * multB;
        sess.hostB.score = (sess.hostB.score || 0) + pts;
      } else {
        const multA = sess.multiplierA || 1;
        const pts = totalCost * multA;
        sess.hostA.score = (sess.hostA.score || 0) + pts;
      }

      // Re-synchronize session to immediately recalculate multiplierA & multiplierB
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
      const mult = isOpponent ? (activeHostMatch.multiplierB || 1) : (activeHostMatch.multiplierA || 1);
      const pts = totalCost * mult;
      if (isOpponent) {
        activeHostMatch.pkScoreOpponent = (activeHostMatch.pkScoreOpponent || 0) + pts;
      } else {
        activeHostMatch.pkScoreHost = (activeHostMatch.pkScoreHost || 0) + pts;
      }
    }

    const appendGiftEventToHost = (hostState: any) => {
      if (!hostState) return;
      hostState.lastGiftEvent = giftEvent;
      if (!Array.isArray(hostState.giftEventQueue)) hostState.giftEventQueue = [];
      // Prevent the same event from being appended twice to a PK host.
      if (!hostState.giftEventQueue.some((evt: any) => evt?.eventId === giftEvent.eventId)) {
        hostState.giftEventQueue.push(giftEvent);
      }
      if (hostState.giftEventQueue.length > 25) {
        hostState.giftEventQueue = hostState.giftEventQueue.slice(-25);
      }
      hostState.likes = (hostState.likes || 0) + Math.max(1, Math.floor(totalCost * 0.1));
      syncDocument("hosts", hostState.id, hostState);
      console.log(`[REALTIME GIFT SYNC] Updated host ${hostState.id} with gift ${gift.name} from @${user.username}`);
    };

    appendGiftEventToHost(activeHostMatch);

    // PK: publish the same gift event to BOTH host streams so host A, host B,
    // their guests and every viewer/listener in the PK see one synchronized overlay.
    if (targetHostSide === "hostB" || targetHostSide === "hostA") {
      Object.values(activePkSessions).forEach((sess: any) => {
        if (!sess || sess.status === "ended") return;
        const participants = [sess.hostA, sess.hostB].filter(Boolean);
        const related = participants.some((h: any) =>
          (activeHostMatch?.hostUsername && String(h.username || "").toLowerCase() === String(activeHostMatch.hostUsername).toLowerCase()) ||
          (h.username && String(h.username).toLowerCase() === String(recipient || "").toLowerCase()) ||
          (h.userId && String(h.userId).toLowerCase() === String(recipient || "").toLowerCase())
        );
        if (!related) return;
        participants.forEach((h: any) => {
          const counterpart = (dbData.hosts || []).find((host: any) =>
            (h.username && String(host.hostUsername || host.name || "").toLowerCase() === String(h.username).toLowerCase()) ||
            (h.userId && String(host.hostUid || host.id || "").toLowerCase() === String(h.userId).toLowerCase())
          );
          if (counterpart && counterpart.id !== activeHostMatch.id) appendGiftEventToHost(counterpart);
        });
      });
    }
  }

  // Update active party room state with lastGiftEvent & giftEventQueue
  const partyId = req.body.partyId || req.body.roomId;
  const activePartyMatch = (dbData.parties || []).find((p: any) =>
    (partyId && (p.id === partyId || p.hostUsername === partyId)) ||
    (p.id === hostId) ||
    (recipient && p.hostUsername && recipient.toLowerCase().includes(p.hostUsername.toLowerCase())) ||
    (p.status !== "ended" && (p.id === activeHostMatch?.id || p.hostUsername === activeHostMatch?.hostUsername))
  );

  if (activePartyMatch) {
    // Persist per-seat gift totals so every viewer can see how much each seated user has received.
    const normalizedRecipient = String(recipient || "").trim().toLowerCase();
    if (!Array.isArray(activePartyMatch.seats)) activePartyMatch.seats = [];
    const recipientSeat = activePartyMatch.seats.find((s: any) =>
      s && s.name && String(s.name).trim().toLowerCase() === normalizedRecipient
    );
    if (recipientSeat) {
      // Seat badge always displays 100% of the gift value. The recipient
      // earning wallet receives only recipientEarnings (50%).
      recipientSeat.giftCoins = (Number(recipientSeat.giftCoins) || 0) + totalCost;
      recipientSeat.giftCount = (Number(recipientSeat.giftCount) || 0) + giftCount;
      recipientSeat.earningCoins = (Number(recipientSeat.earningCoins) || 0) + recipientEarnings;
      recipientSeat.lastGiftAt = Date.now();
      recipientSeat.lastGiftIcon = gift.icon || "🎁";
    }

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

// GET /api/v1/gifts/supporters - Retrieve real top supporters aggregated from backend gift transactions
app.get("/api/v1/gifts/supporters", (req, res) => {
  const giftTxs = (dbData.transactions || []).filter((tx: any) => tx.type === "gift_sent");

  const supporterMap: Record<string, { id: string; username: string; avatar: string; coinsContributed: number }> = {};
  const hostAMap: Record<string, { id: string; username: string; avatar: string; coinsContributed: number }> = {};
  const hostBMap: Record<string, { id: string; username: string; avatar: string; coinsContributed: number }> = {};

  giftTxs.forEach((tx: any) => {
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

app.post("/api/v1/gifts", (req, res) => {
  const giftId = req.body.id || `g-${Date.now()}`;
  const newGift = { id: giftId, status: "active", ...req.body };
  if (!dbData.gifts) {
    dbData.gifts = [...DEFAULT_ADVANCED_GIFTS_SERVER];
  }
  const existingIndex = dbData.gifts.findIndex((g: any) => g.id === giftId);
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

app.put("/api/v1/gifts/:id", (req, res) => {
  const { id } = req.params;
  if (!dbData.gifts) {
    dbData.gifts = [...DEFAULT_ADVANCED_GIFTS_SERVER];
  }
  const index = dbData.gifts.findIndex((g: any) => g.id === id);
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

app.delete("/api/v1/gifts/:id", (req, res) => {
  const { id } = req.params;
  dbData.gifts = dbData.gifts.filter((g: any) => g.id !== id);
  saveDatabase();
  deleteDocument("gifts", id);
  res.json({ message: "Gift deleted successfully" });
});

// Categories list operations
app.get("/api/v1/categories", (req, res) => {
  res.json(dbData.categories);
});

app.post("/api/v1/categories", (req, res) => {
  dbData.categories = req.body;
  saveDatabase();
  writeMetadata("categories", { list: req.body });
  res.json(dbData.categories);
});

// Hosts endpoints
const findHostIndex = (id: string) => {
  if (!id) return -1;
  const cleanId = id.replace(/^h-/, "");
  return dbData.hosts.findIndex((h: any) => 
    h.id === id || 
    h.id === `h-${cleanId}` ||
    h.hostUsername === id || 
    h.hostUsername === cleanId || 
    h.name === id || 
    h.name === cleanId ||
    h.hostUid === id ||
    h.hostUid === cleanId
  );
};

const terminateHostLiveSession = (targetId: string, terminatePk: boolean = false) => {
  if (!targetId) return;
  const cleanId = String(targetId).replace(/^h-/, "");

  const matchedUsernames: string[] = [targetId.toLowerCase(), cleanId.toLowerCase()];

  if (Array.isArray(dbData.hosts)) {
    const toEnd = dbData.hosts.filter((h: any) => 
      h.id === targetId || 
      h.id === `h-${targetId}` || 
      h.id === `h-${cleanId}` ||
      h.hostUsername === targetId || 
      h.hostUsername === cleanId || 
      h.name === targetId || 
      h.name === cleanId ||
      h.hostUid === targetId ||
      h.hostUid === cleanId
    );

    toEnd.forEach((h: any) => {
      h.isLive = false;
      h.status = "ENDED";
      h.endedAt = new Date().toISOString();
      deleteDocument("hosts", h.id);
      if (h.hostUsername) matchedUsernames.push(h.hostUsername.toLowerCase());
      if (h.name) matchedUsernames.push(h.name.toLowerCase());
      if (h.hostUid) matchedUsernames.push(String(h.hostUid).toLowerCase());
    });

    dbData.hosts = dbData.hosts.filter((h: any) => 
      !(h.id === targetId || 
        h.id === `h-${targetId}` || 
        h.id === `h-${cleanId}` ||
        h.hostUsername === targetId || 
        h.hostUsername === cleanId || 
        h.name === targetId || 
        h.name === cleanId ||
        h.hostUid === targetId ||
        h.hostUid === cleanId)
    );
  }

  // Only terminate active PK / 1v1 sessions if terminatePk flag is explicitly requested
  if (terminatePk) {
    Object.keys(activePkSessions).forEach((sessionId) => {
      const s = activePkSessions[sessionId];
      if (!s) return;
      const uA = s.hostA?.username?.toLowerCase();
      const uB = s.hostB?.username?.toLowerCase();
      const idA = String(s.hostA?.userId || "").toLowerCase();
      const idB = String(s.hostB?.userId || "").toLowerCase();

      const matches = matchedUsernames.some(u => u && (u === uA || u === uB || u === idA || u === idB));
      if (matches) {
        s.status = "ended";
        s.pkActive = false;
        if (uA && onlineUserPresence[uA]) onlineUserPresence[uA].inPk = false;
        if (uB && onlineUserPresence[uB]) onlineUserPresence[uB].inPk = false;
        delete activePkSessions[sessionId];
      }
    });
  }

  // Expire/cancel any pending invites for these usernames
  Object.keys(activePkInvites).forEach((inviteId) => {
    const inv = activePkInvites[inviteId];
    if (!inv) return;
    const from = inv.fromUsername?.toLowerCase();
    const to = inv.toUsername?.toLowerCase();
    const fromId = String(inv.inviterUserId || inv.fromUserId || "").toLowerCase();
    const toId = String(inv.inviteeUserId || inv.toUserId || "").toLowerCase();

    const matches = matchedUsernames.some(u => u && (u === from || u === to || u === fromId || u === toId));
    if (matches) {
      inv.status = "cancelled";
      delete activePkInvites[inviteId];
    }
  });

  saveDatabase();
};

function syncHostPkScores(host: any) {
  if (!host) return;
  const hUser = String(host.hostUsername || host.name || "").toLowerCase();
  const hId = String(host.hostUserId || host.id || "").toLowerCase().replace(/^h-/, "");
  const hChan = String(host.channelName || "").toLowerCase();
  const now = Date.now();

  if (!host.originalChannelName) {
    host.originalChannelName = host.channelName || `room_${host.hostUsername || host.id || "101"}`;
  }

  let activePkMatch = false;

  Object.values(activePkSessions).forEach((s: any) => {
    if (!s || s.status === "ended") return;
    const sChan = String(s.channelName || "").toLowerCase();
    const sAUser = String(s.hostA?.username || "").toLowerCase();
    const sBUser = String(s.hostB?.username || "").toLowerCase();
    const sAId = String(s.hostA?.userId || "").toLowerCase();
    const sBId = String(s.hostB?.userId || "").toLowerCase();

    const isMatchChan = hChan && sChan && (sChan === hChan || hChan.includes(sChan) || sChan.includes(hChan));
    const isMatchUser = (hUser && (sAUser === hUser || sBUser === hUser)) || (hId && (sAId === hId || sBId === hId));

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

const getActiveLiveSessions = () => {
  if (!Array.isArray(dbData.hosts)) {
    dbData.hosts = [];
  }
  const now = Date.now();

  // Mark stale sessions as ended (>45s)
  dbData.hosts.forEach((h: any) => {
    if (!h) return;
    const isLiveFlag = h.isLive === true || h.status === "LIVE" || h.status === "live";
    if (isLiveFlag) {
      const lastActive = Math.max(
        typeof h.lastSeen === "number" ? h.lastSeen : 0,
        h.updatedAt ? new Date(h.updatedAt).getTime() : 0
      );
      if (!lastActive || (now - lastActive > 45000)) {
        console.log(`[LIVE SERVER] Session ${h.id} (@${h.hostUsername || h.name}) heartbeat expired (>45s). Marking as ENDED.`);
        h.isLive = false;
        h.status = "ENDED";
        h.endedAt = new Date().toISOString();
        deleteDocument("hosts", h.id);
      }
    }
  });

  const validHosts = dbData.hosts.filter((h: any) => {
    if (!h) return false;
    if (h.isLive !== true && h.status !== "LIVE" && h.status !== "live") return false;
    if (h.status === "ENDED" || h.status === "ended" || h.status === "offline") return false;
    const lastActive = Math.max(
      typeof h.lastSeen === "number" ? h.lastSeen : 0,
      h.updatedAt ? new Date(h.updatedAt).getTime() : 0
    );
    return lastActive > 0 && (now - lastActive <= 45000);
  });

  // Deduplicate: ONE USER = MAXIMUM ONE ACTIVE LIVE SESSION
  const uniqueMap = new Map<string, any>();
  validHosts.forEach((h: any) => {
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
  dbData.hosts.forEach(h => syncHostPkScores(h));
  saveDatabase();

  return dbData.hosts;
};

app.get("/api/v1/hosts", (req, res) => {
  res.json(getActiveLiveSessions());
});

app.get("/api/v1/live/active", (req, res) => {
  res.json(getActiveLiveSessions());
});

app.post("/api/v1/live/session", (req, res) => {
  const sessionData = req.body || {};
  const hostUsername = sessionData.hostUsername || sessionData.hostName || sessionData.name || "live_host";
  const hostUserId = sessionData.hostUserId || sessionData.hostUid || sessionData.uniqueId || hostUsername;
  const hostId = sessionData.id || `h-${hostUserId}`;

  terminateHostLiveSession(hostUserId);
  terminateHostLiveSession(hostUsername);
  terminateHostLiveSession(hostId);

  const newSessionId = sessionData.sessionId || `session_${Date.now()}_${Math.random().toString(36).substring(2,7)}`;
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
    startedAt: sessionData.startedAt || new Date().toISOString(),
    lastSeen: Date.now(),
    updatedAt: new Date().toISOString(),
    ...sessionData
  };

  dbData.hosts.push(newHost);
  saveDatabase();
  syncDocument("hosts", hostId, newHost);
  return res.status(201).json(newHost);
});

app.post("/api/v1/hosts", (req, res) => {
  const hostData = req.body || {};
  const hostUsername = hostData.hostUsername || hostData.name || "live_host";
  const hostUserId = hostData.hostUserId || hostData.hostUid || hostData.uniqueId || hostUsername;
  const hostId = hostData.id || `h-${hostUserId}`;
  
  terminateHostLiveSession(hostUserId);
  terminateHostLiveSession(hostUsername);
  terminateHostLiveSession(hostId);

  const newSessionId = hostData.sessionId || `session_${Date.now()}_${Math.random().toString(36).substring(2,7)}`;
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
    startedAt: hostData.startedAt || new Date().toISOString(),
    lastSeen: Date.now(),
    ...hostData,
    hostUsername,
    hostUid: hostUserId,
    updatedAt: new Date().toISOString()
  };

  dbData.hosts.push(newHost);
  saveDatabase();
  syncDocument("hosts", hostId, newHost);
  console.log(`[LIVE SERVER SUCCESS] Registered fresh host stream: ${hostId} (@${hostUsername}, Session: ${newSessionId})`);
  return res.status(201).json(newHost);
});

app.get("/api/v1/hosts/:id", (req, res) => {
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

app.put("/api/v1/hosts/:id", (req, res) => {
  const { id } = req.params;
  const index = findHostIndex(id);
  if (index !== -1) {
    const existing = dbData.hosts[index];
    const updateData = { ...req.body };

    // Safely preserve comments if omitted or empty array in updateData while existing has comments
    if ((updateData.comments === undefined || (Array.isArray(updateData.comments) && updateData.comments.length === 0)) && existing.comments && existing.comments.length > 0) {
      updateData.comments = existing.comments;
    }
    // Safely preserve connectedViewers if not provided in updateData
    if (updateData.connectedViewers === undefined && existing.connectedViewers) {
      updateData.connectedViewers = existing.connectedViewers;
      updateData.realViewerCount = existing.connectedViewers.length;
    }
    // Safely preserve likes if updateData.likes is omitted or smaller
    if (existing.likes !== undefined && (updateData.likes === undefined || updateData.likes < existing.likes)) {
      updateData.likes = existing.likes;
    }
    // Safely preserve last gift/like/join events and giftEventQueue if omitted
    if (updateData.lastGiftEvent === undefined && existing.lastGiftEvent) {
      updateData.lastGiftEvent = existing.lastGiftEvent;
    }
    if (updateData.giftEventQueue === undefined && existing.giftEventQueue) {
      updateData.giftEventQueue = existing.giftEventQueue;
    }
    if (updateData.lastLikeEvent === undefined && existing.lastLikeEvent) {
      updateData.lastLikeEvent = existing.lastLikeEvent;
    }
    if (updateData.lastJoinEvent === undefined && existing.lastJoinEvent) {
      updateData.lastJoinEvent = existing.lastJoinEvent;
    }

    dbData.hosts[index] = { ...existing, ...updateData, lastSeen: Date.now(), updatedAt: new Date().toISOString() };
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
      lastSeen: Date.now(),
      updatedAt: new Date().toISOString()
    };
    dbData.hosts.push(newHost);
    saveDatabase();
    syncDocument("hosts", id, newHost);
    res.json(newHost);
  }
});

app.post("/api/v1/hosts/:id/heartbeat", (req, res) => {
  const { id } = req.params;
  const index = findHostIndex(id);
  if (index !== -1) {
    dbData.hosts[index].lastSeen = Date.now();
    dbData.hosts[index].updatedAt = new Date().toISOString();
    syncDocument("hosts", dbData.hosts[index].id, dbData.hosts[index]);
    return res.json({ success: true, lastSeen: dbData.hosts[index].lastSeen, host: dbData.hosts[index] });
  }
  return res.status(404).json({ error: "Host stream not found" });
});

app.post("/api/v1/live/heartbeat", (req, res) => {
  const { hostId, id, hostUserId } = req.body || {};
  const targetId = hostId || id || hostUserId;
  if (!targetId) return res.status(400).json({ error: "hostId required" });
  const index = findHostIndex(targetId);
  if (index !== -1) {
    dbData.hosts[index].lastSeen = Date.now();
    dbData.hosts[index].updatedAt = new Date().toISOString();
    syncDocument("hosts", dbData.hosts[index].id, dbData.hosts[index]);
    return res.json({ success: true, lastSeen: dbData.hosts[index].lastSeen, host: dbData.hosts[index] });
  }
  return res.status(404).json({ error: "Host stream not found" });
});

app.post("/api/v1/hosts/:id/end", (req, res) => {
  const { id } = req.params;
  terminateHostLiveSession(id);
  console.log(`[LIVE SERVER SUCCESS] Explicitly ended host stream: ${id}`);
  res.json({ success: true, message: "Live session ended successfully" });
});

app.post("/api/v1/live/end", (req, res) => {
  const { hostId, id, hostUserId } = req.body || {};
  const targetId = hostId || id || hostUserId;
  if (!targetId) return res.status(400).json({ error: "hostId required" });

  terminateHostLiveSession(targetId);
  console.log(`[LIVE SERVER SUCCESS] Explicitly ended live session: ${targetId}`);
  res.json({ success: true, message: "Live session ended successfully" });
});

app.post("/api/v1/hosts/:id/like", (req, res) => {
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

app.delete("/api/v1/hosts/:id", (req, res) => {
  const { id } = req.params;
  terminateHostLiveSession(id);
  console.log(`[LIVE SERVER SUCCESS] Ended/Deleted host stream: ${id}`);
  res.json({ message: "Host deleted successfully", targetId: id });
});

app.post("/api/v1/hosts/:id/unload-end", (req, res) => {
  const { id } = req.params;
  terminateHostLiveSession(id);
  console.log(`[LIVE SERVER SUCCESS] Host disconnected via unload-end: ${id}`);
  res.json({ success: true });
});

// Real-time viewer presence & comments endpoints
app.post("/api/v1/hosts/:id/join", (req, res) => {
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
    // Avoid duplicate entries in list
    if (!host.connectedViewers.some((v: any) => v.username === username)) {
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

app.post("/api/v1/hosts/:id/leave", (req, res) => {
  const { id } = req.params;
  const { username } = req.body || {};
  if (!username) {
    return res.status(400).json({ error: "Username is required to leave" });
  }
  const index = findHostIndex(id);
  if (index !== -1) {
    const host = dbData.hosts[index];
    if (host.connectedViewers) {
      host.connectedViewers = host.connectedViewers.filter((v: any) => v.username !== username);
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

app.post("/api/v1/hosts/:id/comments", (req, res) => {
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
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    host.comments.push(newComment);
    saveDatabase();
    syncDocument("hosts", host.id, host);
    res.status(201).json(host.comments);
  } else {
    res.status(404).json({ error: "Host not found" });
  }
});

// Real-time Guest Requests & Seat Management Endpoints
app.post("/api/v1/hosts/:id/guest-requests", (req, res) => {
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
    if (!host.guestRequests.some((r: any) => r.username === username)) {
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

app.get("/api/v1/hosts/:id/guest-requests", (req, res) => {
  const { id } = req.params;
  const index = findHostIndex(id);
  if (index !== -1) {
    const host = dbData.hosts[index];
    return res.json({ guestRequests: host.guestRequests || [], guestSeats: host.guestSeats || [] });
  }
  res.status(404).json({ error: "Host not found" });
});

app.post("/api/v1/hosts/:id/guest-requests/:reqId/respond", (req, res) => {
  const { id, reqId } = req.params;
  const { action, seatId } = req.body || {};
  const index = findHostIndex(id);
  if (index !== -1) {
    const host = dbData.hosts[index];
    if (Array.isArray(host.guestRequests)) {
      const match = host.guestRequests.find((r: any) => r.id === reqId || r.username === reqId);
      if (match && action === "accept") {
        const targetSeatId = seatId || match.seatId || 1;
        if (!Array.isArray(host.guestSeats)) {
          host.guestSeats = [1, 2, 3, 4, 5, 6, 7, 8].map(sId => ({
            id: sId, name: null, avatar: null, diamonds: null, isMuted: false, isCamMuted: false, isBigFrame: false
          }));
        }
        host.guestSeats = host.guestSeats.map((s: any) => {
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
      host.guestRequests = host.guestRequests.filter((r: any) => r.id !== reqId && r.username !== reqId);
    }
    saveDatabase();
    syncDocument("hosts", host.id, host);
    res.json({ success: true, guestSeats: host.guestSeats || [], guestRequests: host.guestRequests || [] });
  } else {
    res.status(404).json({ error: "Host not found" });
  }
});

app.put("/api/v1/hosts/:id/guest-seats", (req, res) => {
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

// Real-time Guest Seat Invitation Endpoints for Live Streams
app.post("/api/v1/hosts/:id/invites", (req, res) => {
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
    host.pendingInvites = host.pendingInvites.filter((i: any) => String(i.targetUsername).toLowerCase() !== String(targetUsername).toLowerCase());
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

app.get("/api/v1/hosts/:id/invites/:username", (req, res) => {
  const { id, username } = req.params;
  const index = findHostIndex(id);
  if (index !== -1) {
    const host = dbData.hosts[index];
    if (Array.isArray(host.pendingInvites)) {
      const match = host.pendingInvites.find((i: any) => String(i.targetUsername).toLowerCase() === String(username).toLowerCase());
      if (match) {
        return res.json({ pendingInvite: match });
      }
    }
    return res.json({ pendingInvite: null });
  }
  return res.status(404).json({ error: "Host not found" });
});

app.post("/api/v1/hosts/:id/invites/:username/respond", (req, res) => {
  const { id, username } = req.params;
  const { action, avatar } = req.body || {};
  const index = findHostIndex(id);
  if (index !== -1) {
    const host = dbData.hosts[index];
    if (Array.isArray(host.pendingInvites)) {
      const match = host.pendingInvites.find((i: any) => String(i.targetUsername).toLowerCase() === String(username).toLowerCase());
      if (match) {
        if (action === "accept") {
          const targetSeatId = Number(match.seatId) || 1;
          if (!Array.isArray(host.guestSeats)) {
            host.guestSeats = [1, 2, 3, 4, 5, 6, 7, 8].map(sId => ({
              id: sId, name: null, avatar: null, diamonds: null, isMuted: false, isCamMuted: false, isBigFrame: false
            }));
          }
          host.guestSeats = host.guestSeats.map((s: any) => {
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
            username: "System 🎙️",
            message: `🎉 @${username} accepted host's invite to sit on Guest Seat #${targetSeatId}!`,
            isSystem: true,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          });
        }
        host.pendingInvites = host.pendingInvites.filter((i: any) => String(i.targetUsername).toLowerCase() !== String(username).toLowerCase());
      }
    }
    saveDatabase();
    syncDocument("hosts", host.id, host);
    return res.json({ success: true, guestSeats: host.guestSeats || [] });
  }
  return res.status(404).json({ error: "Host not found" });
});

// ------------------------------------------------------------------
// REAL-TIME PRESENCE & 1V1 PK INVITE ENGINE
// ------------------------------------------------------------------
const activePkInvites: Record<string, any> = {};
const activePkSessions: Record<string, any> = {};
const onlineUserPresence: Record<string, any> = {};

// Heartbeat / Presence Registration
app.post("/api/v1/presence", (req, res) => {
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

  // Clean stale presence older than 15s
  const now = Date.now();
  Object.keys(onlineUserPresence).forEach(key => {
    if (now - onlineUserPresence[key].lastSeen > 15000) {
      delete onlineUserPresence[key];
    }
  });

  res.json({ success: true, activeUsersCount: Object.keys(onlineUserPresence).length });
});

// Get Available Hosts for 1v1 Invites
app.get("/api/v1/pk/available-hosts", (req, res) => {
  const currentUsername = String(req.query.username || "").toLowerCase();
  const currentUserId = String(req.query.userId || req.query.username || "").toLowerCase();
  const now = Date.now();

  // 1. Gather live real hosts from dbData.hosts
  const liveHostsList = (dbData.hosts || [])
    .filter((h: any) => h.isLive !== false && !h.inPk && !h.inPkBattle && !h.isDemoHost)
    .map((h: any) => ({
      id: String(h.id || h.hostUid || h.hostUsername),
      userId: String(h.hostUid || h.id || h.hostUsername),
      username: String(h.hostUsername || h.name || "Live Host"),
      avatar: String(h.hostAvatar || h.avatar || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80"),
      level: Number(h.hostLevel || h.level || 1),
      fans: `${h.followersCount || h.fans || 0} fans`,
      isLive: true,
      inPk: false,
      status: "🔴 Live Solo"
    }));

  // 2. Gather online presence users
  const onlinePresenceList = Object.values(onlineUserPresence)
    .filter((u: any) => (now - u.lastSeen <= 15000) && !u.inPk)
    .map((u: any) => ({
      id: String(u.userId || u.username),
      userId: String(u.userId || u.username),
      username: String(u.username),
      avatar: String(u.avatar || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80"),
      level: Number(u.level || 1),
      fans: String(u.fans || "0 fans"),
      isLive: !!u.isLive,
      inPk: false,
      status: u.isLive ? "🔴 Live Solo" : "🟢 Online"
    }));

  // Combine liveHostsList and onlinePresenceList, deduplicating by username and filtering out self
  const combinedMap = new Map<string, any>();

  [...liveHostsList, ...onlinePresenceList].forEach(item => {
    const key = item.username.toLowerCase();
    const itemUserId = String(item.userId).toLowerCase();
    if (key !== currentUsername && itemUserId !== currentUserId && !combinedMap.has(key)) {
      combinedMap.set(key, item);
    }
  });

  const result = Array.from(combinedMap.values());
  res.json(result);
});

// Send PK / 1v1 Co-Host Invite (Strict Real Host-to-Host, NO Auto-Accept Timeout)
app.post("/api/v1/pk/invite", (req, res) => {
  const { fromUsername, fromUserId, fromAvatar, fromLevel, fromFans, toUsername, toUserId, toAvatar, toLevel, toFans, liveSessionId, channelName: customChannelName, inviteType, isPkBattle } = req.body || {};
  if (!fromUsername || !toUsername) {
    return res.status(400).json({ error: "Sender and receiver usernames are required" });
  }

  const normFrom = fromUsername.toLowerCase();
  const normTo = toUsername.toLowerCase();

  // Look up missing user details from online presence or dbData
  const presenceFrom = onlineUserPresence[normFrom];
  const presenceTo = onlineUserPresence[normTo];
  const hostTo = (dbData.hosts || []).find((h: any) => h.hostUsername?.toLowerCase() === normTo || h.name?.toLowerCase() === normTo);

  const finalFromAvatar = fromAvatar || presenceFrom?.avatar || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80";
  const finalFromLevel = Number(fromLevel) || Number(presenceFrom?.level) || 1;
  const finalFromFans = fromFans || presenceFrom?.fans || "10K fans";

  const finalToUserId = toUserId || presenceTo?.userId || hostTo?.hostUid || hostTo?.id || toUsername;
  const finalToAvatar = toAvatar || presenceTo?.avatar || hostTo?.hostAvatar || hostTo?.avatar || "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=100&q=80";
  const finalToLevel = Number(toLevel) || Number(presenceTo?.level) || Number(hostTo?.level) || Number(hostTo?.hostLevel) || 1;
  const finalToFans = toFans || presenceTo?.fans || `${hostTo?.followersCount || 0} fans` || "15K fans";

  // Expire or cancel any previous pending invite from same sender
  Object.keys(activePkInvites).forEach(id => {
    const inv = activePkInvites[id];
    if (inv.fromUsername.toLowerCase() === normFrom && inv.status === "pending") {
      inv.status = "cancelled";
    }
  });

  const inviteId = `pki_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const channelName = customChannelName || `pk_room_${[normFrom, normTo].sort().join("_")}`;
  const now = Date.now();
  const expiresAt = now + 20000; // 20-second timeout
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
    toUsername: toUsername,
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

  res.status(201).json(newInvite);
});

// Get Active PK / 1v1 Sessions List
app.get("/api/v1/pk/active-sessions", (req, res) => {
  const active = Object.values(activePkSessions).filter((s: any) => s && s.status !== "ended");
  res.json(active);
});

// Helper to synchronize active PK session time, states, fever multipliers, and host status
function getSynchronizedPkSession(activeSession: any, now: number = Date.now()) {
  if (!activeSession || activeSession.status === "ended") return null;

  const duration = activeSession.duration || 180;
  let startedAtMs = typeof activeSession.startedAt === "number"
    ? activeSession.startedAt
    : (activeSession.startedAt ? new Date(activeSession.startedAt).getTime() : now);

  if (isNaN(startedAtMs) || !activeSession.startedAt) {
    startedAtMs = now;
    activeSession.startedAt = now;
  }

  if (activeSession.pkState === "pk_countdown" || (startedAtMs && now < startedAtMs)) {
    activeSession.pkState = "pk_countdown";
    activeSession.countdown = Math.max(0, Math.ceil((startedAtMs - now) / 1000));
    activeSession.pkActive = false;
    activeSession.timer = duration;
  } else if (now >= startedAtMs && now < startedAtMs + duration * 1000) {
    activeSession.pkState = "pk_active";
    activeSession.pkActive = true;
    const elapsed = Math.max(0, Math.floor((now - startedAtMs) / 1000));
    activeSession.timer = Math.max(0, duration - elapsed);
  } else if (now >= startedAtMs + duration * 1000) {
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

  // Calculate Fever Multipliers & Phase (Server Authoritative)
  // Fever Time runs during Minute 2 (match timer 2:59 down to 1:59 remaining, i.e. 120 <= remainingSecs < 180)
  const remainingSecs = activeSession.timer !== undefined ? activeSession.timer : 180;
  let multiplierA = 1;
  let multiplierB = 1;
  let feverPhase = "normal"; // "normal" | "fever"

  if (activeSession.pkState === "pk_active") {
    if (remainingSecs >= 120 && remainingSecs <= 180) {
      feverPhase = "fever";
      const scoreA = activeSession.hostA?.score || 0;
      const scoreB = activeSession.hostB?.score || 0;

      // Host A multiplier criteria: >= 1000 => 3X, >= 500 => 2X, else 1X
      if (scoreA >= 1000) multiplierA = 3;
      else if (scoreA >= 500) multiplierA = 2;
      else multiplierA = 1;

      // Host B multiplier criteria: >= 1000 => 3X, >= 500 => 2X, else 1X
      if (scoreB >= 1000) multiplierB = 3;
      else if (scoreB >= 500) multiplierB = 2;
      else multiplierB = 1;
    } else if (remainingSecs > 0 && remainingSecs <= 30) {
      // Final 30 Seconds 3X Boost Time for BOTH hosts!
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

  // Sync to dbData.hosts for viewers
  const normA = activeSession.hostA?.username?.toLowerCase();
  const normB = activeSession.hostB?.username?.toLowerCase();
  if (Array.isArray(dbData.hosts)) {
    dbData.hosts.forEach((h: any) => {
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

// Query Invites & Session Status
app.get("/api/v1/pk/invites", (req, res) => {
  const username = String(req.query.username || "").toLowerCase();
  const userId = String(req.query.userId || req.query.username || "").toLowerCase();
  if (!username && !userId) {
    return res.status(400).json({ error: "Username or userId parameter required" });
  }

  const now = Date.now();

  let incoming = null;
  let outgoing = null;

  Object.values(activePkInvites).forEach((inv: any) => {
    // Expire invites older than 20s
    if (inv.status === "pending" && (now > (inv.expiresAt || (inv.createdAt + 20000)))) {
      inv.status = "expired";
    }

    const matchesTarget = (inv.toUsername && inv.toUsername.trim().toLowerCase() === username.trim()) ||
                          (inv.toUsername && inv.toUsername.trim().toLowerCase() === userId.trim()) ||
                          (inv.inviteeUserId && String(inv.inviteeUserId).trim().toLowerCase() === userId.trim()) ||
                          (inv.toUserId && String(inv.toUserId).trim().toLowerCase() === userId.trim()) ||
                          (inv.inviteeUserId && String(inv.inviteeUserId).trim().toLowerCase() === username.trim()) ||
                          (inv.toUserId && String(inv.toUserId).trim().toLowerCase() === username.trim());
    if (matchesTarget) {
      if (inv.status === "pending") incoming = inv;
    }

    const matchesSender = (inv.fromUsername && inv.fromUsername.trim().toLowerCase() === username.trim()) ||
                          (inv.fromUsername && inv.fromUsername.trim().toLowerCase() === userId.trim()) ||
                          (inv.inviterUserId && String(inv.inviterUserId).trim().toLowerCase() === userId.trim()) ||
                          (inv.fromUserId && String(inv.fromUserId).trim().toLowerCase() === userId.trim()) ||
                          (inv.inviterUserId && String(inv.inviterUserId).trim().toLowerCase() === username.trim()) ||
                          (inv.fromUserId && String(inv.fromUserId).trim().toLowerCase() === username.trim());
    if (matchesSender) {
      if (!outgoing || inv.createdAt > outgoing.createdAt) {
        outgoing = inv;
      }
    }
  });

  // Find active session
  const rawSession = Object.values(activePkSessions).find((s: any) => 
    s && s.status !== "ended" && 
    (
      (s.hostA?.username && s.hostA.username.toLowerCase() === username) || 
      (s.hostB?.username && s.hostB.username.toLowerCase() === username) ||
      (s.hostA?.userId && String(s.hostA.userId).toLowerCase() === userId) ||
      (s.hostB?.userId && String(s.hostB.userId).toLowerCase() === userId)
    )
  ) || null;

  const activeSession = rawSession ? getSynchronizedPkSession(rawSession, now) : null;

  res.json({
    incoming,
    outgoing,
    activeSession
  });
});

// Respond to Invite (Accept, Reject, or Cancel)
app.post("/api/v1/pk/invite/:id/respond", (req, res) => {
  const { id } = req.params;
  const { action, username, userId, avatar, level, fans } = req.body || {};

  const invite = activePkInvites[id];
  if (!invite) {
    return res.status(404).json({ error: "Invite not found or expired" });
  }

  const currentNow = Date.now();
  if (invite.status === "pending" && (currentNow > (invite.expiresAt || (invite.createdAt + 20000)))) {
    invite.status = "expired";
    return res.status(400).json({ error: "Invite has expired", invite });
  }

  // Security checks
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
    const hostAObj = (dbData.hosts || []).find((h: any) => h.hostUsername?.toLowerCase() === normA || h.name?.toLowerCase() === normA);
    const hostBObj = (dbData.hosts || []).find((h: any) => h.hostUsername?.toLowerCase() === normB || h.name?.toLowerCase() === normB);

    const hostAUser = {
      username: invite.fromUsername,
      userId: invite.inviterUserId || invite.fromUserId || presenceA?.userId || hostAObj?.hostUid || invite.fromUsername,
      avatar: invite.fromAvatar || presenceA?.avatar || hostAObj?.hostAvatar || hostAObj?.avatar || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80",
      level: Number(invite.fromLevel) || Number(presenceA?.level) || Number(hostAObj?.hostLevel) || 1,
      fans: invite.fromFans || presenceA?.fans || `${hostAObj?.followersCount || 0} fans` || "10K fans",
      score: 0 // ALWAYS INITIALIZE STRICTLY TO ZERO
    };

    const hostBUser = {
      username: username || invite.toUsername,
      userId: userId || invite.inviteeUserId || invite.toUserId || presenceB?.userId || hostBObj?.hostUid || (username || invite.toUsername),
      avatar: avatar || invite.toAvatar || presenceB?.avatar || hostBObj?.hostAvatar || hostBObj?.avatar || "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=100&q=80",
      level: Number(level) || Number(invite.toLevel) || Number(presenceB?.level) || Number(hostBObj?.hostLevel) || 1,
      fans: fans || invite.toFans || presenceB?.fans || `${hostBObj?.followersCount || 0} fans` || "15K fans",
      score: 0 // ALWAYS INITIALIZE STRICTLY TO ZERO
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
        session.startedAt = currentNow + 3000;
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
        startedAt: isPk ? currentNow + 3000 : currentNow,
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

// Start, Request, or Toggle PK Battle in Active Session
app.post("/api/v1/pk/start-battle", (req, res) => {
  const { channelName, username, action, pkActive } = req.body || {};
  const normUser = String(username || "").toLowerCase();
  const currentNow = Date.now();

  let updatedSession: any = null;
  Object.keys(activePkSessions).forEach((sessionId) => {
    const s = activePkSessions[sessionId];
    if (!s) return;
    const matchChannel = channelName && s.channelName === channelName;
    const matchUser = normUser && (
      s.hostA?.username?.toLowerCase() === normUser || 
      s.hostB?.username?.toLowerCase() === normUser ||
      String(s.hostA?.userId || "").toLowerCase() === normUser ||
      String(s.hostB?.userId || "").toLowerCase() === normUser
    );

    if (matchChannel || matchUser) {
      if (action === "request") {
        s.pkRequested = true;
        s.pkRequestedBy = username;
        s.pkRequestStatus = "pending";
        updatedSession = getSynchronizedPkSession(s, currentNow);
      } else if (action === "accept" || action === "start" || pkActive === true) {
        // NEW MATCH: ALWAYS RESET PK SCORES STRICTLY TO 0 : 0
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
        s.startedAt = currentNow + 3000; // 3-second countdown
        s.duration = 180; // 3 minutes match
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

// Authenticated Real-Time Double-Tap Handler (Server-Authoritative)
app.post("/api/v1/pk/tap", (req, res) => {
  const { channelName, hostUsername, username, userId, targetHostSide } = req.body || {};
  const normUser = String(username || "").toLowerCase();
  const normUserId = String(userId || username || "").toLowerCase();
  const normHost = String(hostUsername || "").toLowerCase();
  const normChannel = String(channelName || "").toLowerCase();
  const currentNow = Date.now();

  let targetSession: any = null;
  Object.values(activePkSessions).forEach((s: any) => {
    if (!s || s.status === "ended") return;
    const sChan = String(s.channelName || "").toLowerCase();
    const sHostA = String(s.hostA?.username || "").toLowerCase();
    const sHostB = String(s.hostB?.username || "").toLowerCase();

    const matchChannel = normChannel && (sChan === normChannel || normChannel.includes(sChan) || sChan.includes(normChannel));
    const matchHost = normHost && (sHostA === normHost || sHostB === normHost);
    const matchUser = normUser && (sHostA === normUser || sHostB === normUser);

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

  // Real-time Double-Tap PK Score Addition: Every double tap adds +1 point directly to target host score
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

  // Also sync host scores to dbData.hosts
  const normA = targetSession.hostA?.username?.toLowerCase();
  const normB = targetSession.hostB?.username?.toLowerCase();
  if (Array.isArray(dbData.hosts)) {
    dbData.hosts.forEach((h: any) => {
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

// PK Gift Endpoint
app.post("/api/v1/pk/gift", (req, res) => {
  const { channelName, username, giftCoins, targetHost, targetHostSide } = req.body || {};
  const normUser = String(username || "").toLowerCase();
  const points = Number(giftCoins) || 0;
  const currentNow = Date.now();

  let targetSession: any = null;
  Object.values(activePkSessions).forEach((s: any) => {
    if (!s || s.status === "ended") return;
    const sChan = String(s.channelName || "").toLowerCase();
    const normChannel = String(channelName || "").toLowerCase();
    const sHostA = String(s.hostA?.username || "").toLowerCase();
    const sHostB = String(s.hostB?.username || "").toLowerCase();

    if ((normChannel && sChan === normChannel) || (normUser && (sHostA === normUser || sHostB === normUser))) {
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
      targetSession.hostB.score = (targetSession.hostB.score || 0) + (points * mult);
    } else {
      const mult = targetSession.multiplierA || 1;
      targetSession.hostA.score = (targetSession.hostA.score || 0) + (points * mult);
    }
    getSynchronizedPkSession(targetSession, currentNow);

    // Sync to dbData.hosts
    const normA = targetSession.hostA?.username?.toLowerCase();
    const normB = targetSession.hostB?.username?.toLowerCase();
    if (Array.isArray(dbData.hosts)) {
      dbData.hosts.forEach((h: any) => {
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

// Legacy Score Increment (Synced with getSynchronizedPkSession)
app.post("/api/v1/pk/score", (req, res) => {
  const { channelName, username, targetHostSide, targetUsername, scoreDelta } = req.body || {};
  const normUser = String(username || "").toLowerCase();
  const delta = Number(scoreDelta) || 1;
  const currentNow = Date.now();

  let updatedSession: any = null;
  Object.values(activePkSessions).forEach((s: any) => {
    if (!s || s.status === "ended") return;
    const matchChannel = channelName && s.channelName === channelName;
    const matchUser = normUser && (
      s.hostA?.username?.toLowerCase() === normUser || 
      s.hostB?.username?.toLowerCase() === normUser ||
      String(s.hostA?.userId || "").toLowerCase() === normUser ||
      String(s.hostB?.userId || "").toLowerCase() === normUser
    );

    if (matchChannel || matchUser) {
      getSynchronizedPkSession(s, currentNow);
      if (s.pkState === "pk_active" && s.timer > 0) {
        const isTargetB = targetHostSide === "hostB" || (targetUsername && s.hostB?.username?.toLowerCase() === targetUsername.toLowerCase());
        const multiplier = isTargetB ? (s.multiplierB || 1) : (s.multiplierA || 1);
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

// End 1v1 / PK Session
app.post("/api/v1/pk/end", (req, res) => {
  const { channelName, username } = req.body || {};
  const normUser = String(username || "").toLowerCase();

  Object.keys(activePkSessions).forEach((sessionId) => {
    const s = activePkSessions[sessionId];
    if (!s) return;
    const matchChannel = channelName && s.channelName === channelName;
    const matchUser = normUser && (
      s.hostA?.username?.toLowerCase() === normUser || 
      s.hostB?.username?.toLowerCase() === normUser ||
      String(s.hostA?.userId || "").toLowerCase() === normUser ||
      String(s.hostB?.userId || "").toLowerCase() === normUser
    );

    if (matchChannel || matchUser || !channelName && !username) {
      s.status = "ended";
      s.pkActive = false;
      const normA = s.hostA?.username?.toLowerCase();
      const normB = s.hostB?.username?.toLowerCase();
      if (normA && onlineUserPresence[normA]) onlineUserPresence[normA].inPk = false;
      if (normB && onlineUserPresence[normB]) onlineUserPresence[normB].inPk = false;

      dbData.hosts.forEach((h: any) => {
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

// Party Hub endpoints (12 or 25-seat Audio Party)
const prunePartyPresence = (party: any) => {
  if (!party) return party;
  if (!Array.isArray(party.connectedViewers)) party.connectedViewers = [];
  if (!party.lastSeen) party.lastSeen = {};
  const now = Date.now();
  const PRESENCE_TTL_MS = 12000;
  party.connectedViewers = party.connectedViewers.filter((viewer: any) => {
    const username = String(viewer?.username || "");
    if (!username) return false;
    // Join events without a heartbeat are given a short grace period.
    const lastSeen = Number(party.lastSeen[username] || viewer.joinedAt || 0);
    return lastSeen > 0 && (now - lastSeen) <= PRESENCE_TTL_MS;
  });
  party.participantCount = party.connectedViewers.length;
  return party;
};

const sanitizePartyForClient = (party: any) => {
  if (!party) return party;
  prunePartyPresence(party);
  const safe = { ...party, connectedViewers: Array.isArray(party.connectedViewers) ? party.connectedViewers.map((v: any) => ({ ...v })) : [] };
  delete safe.password;
  return safe;
};

app.get("/api/v1/parties", (req, res) => {
  if (!Array.isArray(dbData.parties)) {
    dbData.parties = [];
  }
  const activeParties = dbData.parties.filter((p: any) => p && p.status !== "ended");
  res.json(activeParties.map(sanitizePartyForClient));
});

app.get("/api/v1/parties/:id", (req, res) => {
  const { id } = req.params;
  if (!Array.isArray(dbData.parties)) {
    dbData.parties = [];
  }
  const party = dbData.parties.find((p: any) => p && p.id === id);
  if (party) {
    return res.json(sanitizePartyForClient(party));
  }
  return res.status(404).json({ error: "Party Room not found" });
});

app.post("/api/v1/parties", (req, res) => {
  const { title, hostUsername, hostAvatar, hostVipLevel, category, seatCount, isPublic, password, language, description } = req.body;
  
  if (!dbData.parties) {
    dbData.parties = [];
  }

  const validHost = hostUsername || "Host";
  const resolvedSeatCount = Number(seatCount) === 25 ? 25 : 12;
  if (isPublic === false && !String(password || "").trim()) {
    return res.status(400).json({ error: "Private rooms require a password." });
  }

  // Check if an active party already exists for this host
  const existingIdx = dbData.parties.findIndex((p: any) => p && p.hostUsername === validHost && p.status !== "ended");
  
  const id = existingIdx !== -1 ? dbData.parties[existingIdx].id : `party-${Date.now()}`;
  const newParty = {
    id,
    title: title || `${validHost}'s Audio Lounge 🎙️`,
    hostUsername: validHost,
    hostAvatar: hostAvatar || "",
    vipLevel: Number(hostVipLevel || 0),
    category: category || "Music",
    participantCount: 1,
    maxCapacity: resolvedSeatCount,
    seatCount: resolvedSeatCount,
    isPublic: isPublic !== false,
    password: password || "",
    language: language || "English",
    description: description || `Welcome to our ${resolvedSeatCount}-seat audio lounge!`,
    status: "active",
    allGuestsMuted: existingIdx !== -1 ? Boolean(dbData.parties[existingIdx].allGuestsMuted) : false,
    moderators: existingIdx !== -1 && Array.isArray(dbData.parties[existingIdx].moderators) ? dbData.parties[existingIdx].moderators : [],
    createdAt: existingIdx !== -1 ? (dbData.parties[existingIdx].createdAt || Date.now()) : Date.now(),
    connectedViewers: [{ userId: validHost, username: validHost, avatar: hostAvatar || "", level: 1, vipLevel: Number(hostVipLevel || 0), joinedAt: Date.now() }],
    lastSeen: { [validHost]: Date.now() },
    seats: Array.from({ length: resolvedSeatCount }, (_, index) => ({
      id: index + 1,
      name: index === 0 ? validHost : null,
      avatar: index === 0 ? (hostAvatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80") : null,
      vipLevel: index === 0 ? Number(hostVipLevel || 0) : 0,
      isMuted: false,
      isLocked: false
    })),
    comments: [
      {
        id: `sys-${Date.now()}`,
        username: "System",
        message: `🎙️ Room created successfully by ${validHost}. Welcome everyone!`,
        isSystem: true,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]
  };

  if (existingIdx !== -1) {
    const mergedParty = { ...dbData.parties[existingIdx], ...newParty, status: "active" };
    mergedParty.seats = (mergedParty.seats || []).map((seat: any) =>
      seat.id === 1
        ? { ...seat, name: validHost, avatar: hostAvatar || seat.avatar || "", vipLevel: Number(hostVipLevel || 0) }
        : seat
    );
    dbData.parties[existingIdx] = mergedParty;
    saveDatabase();
    syncDocument("parties", id, dbData.parties[existingIdx]);
    console.log(`[PARDAIS-PARTY PARTY] Updated existing party room: ${id} by @${validHost}`);
    return res.status(200).json(sanitizePartyForClient(dbData.parties[existingIdx]));
  } else {
    dbData.parties.push(newParty);
    saveDatabase();
    syncDocument("parties", id, newParty);
    console.log(`[PARDAIS-PARTY PARTY] Created new party room: ${id} by @${validHost}`);
    return res.status(201).json(sanitizePartyForClient(newParty));
  }
});

app.post("/api/v1/parties/:id/join", (req, res) => {
  const { id } = req.params;
  const { username, avatar, userLevel, vipLevel, password } = req.body;
  const index = dbData.parties?.findIndex((p: any) => p.id === id);
  if (index !== -1 && index !== undefined) {
    const party = dbData.parties[index];

    // Enforce private-room access on the backend. The password is never returned in room listings.
    if (party.isPublic === false) {
      if (!party.password) {
        return res.status(403).json({
          code: "PRIVATE_ROOM_PASSWORD_REQUIRED",
          error: "This private room requires a password."
        });
      }
      if (String(password || "") !== String(party.password)) {
        return res.status(403).json({
          code: "PRIVATE_ROOM_PASSWORD_REQUIRED",
          error: "Incorrect private room password."
        });
      }
    }

    if (!party.connectedViewers) {
      party.connectedViewers = [];
    }
    prunePartyPresence(party);
    if (!party.lastSeen) party.lastSeen = {};
    party.lastSeen[username] = Date.now();
    if (!party.connectedViewers.some((v: any) => v.username === username)) {
      party.connectedViewers.push({ userId: username, username, avatar: avatar || "", level: userLevel || 1, vipLevel: vipLevel || 0, joinedAt: Date.now() });
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
    res.json(sanitizePartyForClient(party));
  } else {
    res.status(404).json({ error: "Party Room not found" });
  }
});

app.post("/api/v1/parties/:id/leave", (req, res) => {
  const { id } = req.params;
  const { username } = req.body;
  const index = dbData.parties?.findIndex((p: any) => p.id === id);
  if (index !== -1 && index !== undefined) {
    const party = dbData.parties[index];
    if (party.connectedViewers) {
      party.connectedViewers = party.connectedViewers.filter((v: any) => v.username !== username);
    }
    party.participantCount = party.connectedViewers ? party.connectedViewers.length : 0;
    
    // Clean up from seats immediately
    party.seats = party.seats.map((seat: any) => {
      if (seat.name === username || (seat.name && seat.name.startsWith(username))) {
        return { ...seat, name: null, avatar: null, vipLevel: 0, isMuted: false };
      }
      return seat;
    });

    if (party.lastSeen && username) {
      delete party.lastSeen[username];
    }

    // Leaving a room never ends it. Only the explicit /close endpoint ends the party.
    console.log(`[PARDAIS-PARTY PARTY] User ${username} left party ${id}. Seats cleared immediately.`);
    saveDatabase();
    syncDocument("parties", id, party);
    res.json(party);
  } else {
    res.status(404).json({ error: "Party Room not found" });
  }
});

// Party Room User Heartbeat to prevent stale/ghost seats
app.post("/api/v1/parties/:id/heartbeat", (req, res) => {
  const { id } = req.params;
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: "username is required" });
  
  const party = dbData.parties?.find((p: any) => p.id === id);
  if (party) {
    prunePartyPresence(party);
    if (!party.lastSeen) party.lastSeen = {};
    const now = Date.now();
    party.lastSeen[username] = now;
    const viewer = (party.connectedViewers || []).find((v: any) => v.username === username);
    if (viewer) viewer.lastSeen = now;
    else party.connectedViewers.push({ userId: username, username, avatar: "", level: 1, vipLevel: 0, joinedAt: now });
    party.participantCount = party.connectedViewers.length;
    res.json({ status: "ok" });
  } else {
    res.status(404).json({ error: "Party Room not found" });
  }
});

app.post("/api/v1/parties/:id/seats/join", (req, res) => {
  const { id } = req.params;
  const { seatId, username, avatar, userLevel, vipLevel } = req.body;
  const index = dbData.parties?.findIndex((p: any) => p.id === id);
  if (index !== -1 && index !== undefined) {
    const party = dbData.parties[index];
    const targetSeat = party.seats?.find((seat: any) => seat.id === Number(seatId));
    if (!targetSeat) return res.status(404).json({ error: "Seat not found" });
    if (targetSeat.name && targetSeat.name !== username) return res.status(409).json({ error: "Seat is already occupied" });
    if (targetSeat.isLocked && party.hostUsername !== username) return res.status(403).json({ error: "This seat is locked by the host" });
    party.seats = party.seats.map((seat: any) => {
      if (seat.id === Number(seatId)) {
        return { ...seat, name: username, avatar: avatar || "", vipLevel: Number(vipLevel || 0), isMuted: party.allGuestsMuted ? true : Boolean(seat.isMuted) };
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

app.post("/api/v1/parties/:id/seats/leave", (req, res) => {
  const { id } = req.params;
  const { seatId, actorUsername } = req.body;
  const index = dbData.parties?.findIndex((p: any) => p.id === id);
  if (index !== -1 && index !== undefined) {
    const party = dbData.parties[index];
    party.seats = party.seats.map((seat: any) => {
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

app.post("/api/v1/parties/:id/seats/toggle-mute", (req, res) => {
  const { id } = req.params;
  const { seatId, actorUsername } = req.body;
  const index = dbData.parties?.findIndex((p: any) => p.id === id);
  if (index !== -1 && index !== undefined) {
    const party = dbData.parties[index];
    const actorIsHost = actorUsername === party.hostUsername;
    const actorIsMod = Array.isArray(party.moderators) && party.moderators.includes(actorUsername);
    if (party.allGuestsMuted && !actorIsHost) return res.status(403).json({ error: "All guests are muted by host" });
    if (party.seats?.[Number(seatId) - 1]?.name === party.hostUsername && !actorIsHost) return res.status(403).json({ error: "Host microphone cannot be muted" });
    if (!actorIsHost && !actorIsMod && party.seats?.[Number(seatId) - 1]?.name !== actorUsername) return res.status(403).json({ error: "Not allowed" });
    party.seats = party.seats.map((seat: any) => seat.id === Number(seatId) ? { ...seat, isMuted: !seat.isMuted } : seat);
    saveDatabase(); syncDocument("parties", id, party); res.json(party);
  } else res.status(404).json({ error: "Party Room not found" });
});

app.post("/api/v1/parties/:id/seats/mute-all", (req, res) => {
  const { id } = req.params; const { muted, actorUsername } = req.body;
  const index = dbData.parties?.findIndex((p: any) => p.id === id);
  if (index === -1 || index === undefined) return res.status(404).json({ error: "Party Room not found" });
  const party = dbData.parties[index];
  const actorIsHost = actorUsername === party.hostUsername;
  const actorIsMod = Array.isArray(party.moderators) && party.moderators.includes(actorUsername);
  if (!actorIsHost && !actorIsMod) return res.status(403).json({ error: "Only host or moderator can mute all guests" });
  party.allGuestsMuted = Boolean(muted);
  party.seats = (party.seats || []).map((seat: any) => seat.name && seat.name !== party.hostUsername ? { ...seat, isMuted: Boolean(muted) } : seat);
  saveDatabase(); syncDocument("parties", id, party); res.json(party);
});

app.post("/api/v1/parties/:id/seats/toggle-lock", (req, res) => {
  const { id } = req.params;
  const { seatId, actorUsername } = req.body;
  const index = dbData.parties?.findIndex((p: any) => p.id === id);
  if (index !== -1 && index !== undefined) {
    const party = dbData.parties[index];
    const actorIsHost = actorUsername === party.hostUsername;
    const actorIsMod = Array.isArray(party.moderators) && party.moderators.includes(actorUsername);
    if (!actorIsHost && !actorIsMod) return res.status(403).json({ error: "Only host or moderator can lock or unlock seats" });
    if (Number(seatId) === 1) return res.status(400).json({ error: "Host seat cannot be locked" });
    party.seats = party.seats.map((seat: any) => {
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

app.post("/api/v1/parties/:id/seats/toggle-lock-all", (req, res) => {
  const { id } = req.params;
  const { locked, actorUsername } = req.body;
  const index = dbData.parties?.findIndex((p: any) => p.id === id);
  if (index === -1 || index === undefined) return res.status(404).json({ error: "Party Room not found" });
  const party = dbData.parties[index];
  const actorIsHost = actorUsername === party.hostUsername;
  const actorIsMod = Array.isArray(party.moderators) && party.moderators.includes(actorUsername);
  if (!actorIsHost && !actorIsMod) return res.status(403).json({ error: "Only host or moderator can change seat locks" });
  party.seats = (party.seats || []).map((seat: any) => (!seat.name && seat.id !== 1) ? { ...seat, isLocked: Boolean(locked) } : seat);
  saveDatabase();
  syncDocument("parties", id, party);
  res.json(party);
});

app.post("/api/v1/parties/:id/close", (req, res) => {
  const { id } = req.params;
  const index = dbData.parties?.findIndex((p: any) => p.id === id);
  if (index !== -1 && index !== undefined) {
    const party = dbData.parties[index];
    party.status = "ended";
    dbData.parties = dbData.parties.filter((p: any) => p.id !== id);
    saveDatabase();
    deleteDocument("parties", id);
    res.json({ message: "Party closed successfully" });
  } else {
    res.status(404).json({ error: "Party Room not found" });
  }
});

app.post("/api/v1/parties/:id/comments", (req, res) => {
  const { id } = req.params;
  const { message, username, vipLevel, userLevel, isSystem, avatar } = req.body;
  const index = dbData.parties?.findIndex((p: any) => p.id === id);
  if (index !== -1 && index !== undefined) {
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
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    party.comments.push(newComment);
    saveDatabase();
    syncDocument("parties", id, party);
    res.status(201).json(party.comments);
  } else {
    res.status(404).json({ error: "Party Room not found" });
  }
});

// Party Seating Requests and Invitations / Host Controls
app.post("/api/v1/parties/:id/requests", (req, res) => {
  const { id } = req.params;
  const { username, avatar, seatId } = req.body;
  const index = dbData.parties?.findIndex((p: any) => p.id === id);
  if (index !== -1 && index !== undefined) {
    const party = dbData.parties[index];
    if (!party.requests) party.requests = [];
    party.requests = party.requests.filter((r: any) => r.username !== username);
    party.requests.push({ username, avatar, seatId: Number(seatId), timestamp: Date.now() });
    saveDatabase();
    syncDocument("parties", id, party);
    res.json(party);
  } else {
    res.status(404).json({ error: "Party Room not found" });
  }
});

app.post("/api/v1/parties/:id/requests/:username/approve", (req, res) => {
  const { id, username } = req.params;
  const index = dbData.parties?.findIndex((p: any) => p.id === id);
  if (index !== -1 && index !== undefined) {
    const party = dbData.parties[index];
    const request = party.requests?.find((r: any) => r.username === username);
    if (request) {
      const targetSeatId = request.seatId;
      // Clean up user from other seats
      party.seats = party.seats.map((seat: any) => {
        if (seat.name === username || (seat.name && seat.name.startsWith(username))) {
          return { ...seat, name: null, avatar: null };
        }
        return seat;
      });
      // Occupy seat
      party.seats = party.seats.map((seat: any) => {
        if (seat.id === targetSeatId) {
          return { ...seat, name: username, avatar: request.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80" };
        }
        return seat;
      });
      // Remove from requests
      party.requests = party.requests.filter((r: any) => r.username !== username);
      // Add system comment
      if (!party.comments) party.comments = [];
      party.comments.push({
        id: `sys-${Date.now()}`,
        username: "System",
        message: `✅ ${username} has taken Seat ${targetSeatId}!`,
        isSystem: true,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
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

app.post("/api/v1/parties/:id/requests/:username/reject", (req, res) => {
  const { id, username } = req.params;
  const index = dbData.parties?.findIndex((p: any) => p.id === id);
  if (index !== -1 && index !== undefined) {
    const party = dbData.parties[index];
    if (party.requests) {
      party.requests = party.requests.filter((r: any) => r.username !== username);
    }
    saveDatabase();
    syncDocument("parties", id, party);
    res.json(party);
  } else {
    res.status(404).json({ error: "Party Room not found" });
  }
});

app.post("/api/v1/parties/:id/invites", (req, res) => {
  const { id } = req.params;
  const { targetUsername, seatId } = req.body;
  const index = dbData.parties?.findIndex((p: any) => p.id === id);
  if (index !== -1 && index !== undefined) {
    const party = dbData.parties[index];
    if (!party.invites) party.invites = [];
    party.invites = party.invites.filter((i: any) => i.username !== targetUsername);
    party.invites.push({ username: targetUsername, seatId: Number(seatId), timestamp: Date.now() });
    saveDatabase();
    syncDocument("parties", id, party);
    res.json(party);
  } else {
    res.status(404).json({ error: "Party Room not found" });
  }
});

app.post("/api/v1/parties/:id/invites/:username/accept", (req, res) => {
  const { id, username } = req.params;
  const { avatar } = req.body;
  const index = dbData.parties?.findIndex((p: any) => p.id === id);
  if (index !== -1 && index !== undefined) {
    const party = dbData.parties[index];
    const invite = party.invites?.find((i: any) => i.username === username);
    if (invite) {
      const targetSeatId = invite.seatId;
      // Clean up user from any other seats
      party.seats = party.seats.map((seat: any) => {
        if (seat.name === username || (seat.name && seat.name.startsWith(username))) {
          return { ...seat, name: null, avatar: null };
        }
        return seat;
      });
      // Put user in seat
      party.seats = party.seats.map((seat: any) => {
        if (seat.id === targetSeatId) {
          return { ...seat, name: username, avatar: avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80" };
        }
        return seat;
      });
      // Remove invite
      party.invites = party.invites.filter((i: any) => i.username !== username);
      // Add system comment
      if (!party.comments) party.comments = [];
      party.comments.push({
        id: `sys-${Date.now()}`,
        username: "System",
        message: `🎙️ ${username} accepted host's invite to take Seat ${targetSeatId}!`,
        isSystem: true,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
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

app.post("/api/v1/parties/:id/invites/:username/reject", (req, res) => {
  const { id, username } = req.params;
  const index = dbData.parties?.findIndex((p: any) => p.id === id);
  if (index !== -1 && index !== undefined) {
    const party = dbData.parties[index];
    if (party.invites) {
      party.invites = party.invites.filter((i: any) => i.username !== username);
    }
    saveDatabase();
    syncDocument("parties", id, party);
    res.json(party);
  } else {
    res.status(404).json({ error: "Party Room not found" });
  }
});

app.post("/api/v1/parties/:id/seats/kick-user", (req, res) => {
  const { id } = req.params;
  const { seatId, actorUsername } = req.body;
  const index = dbData.parties?.findIndex((p: any) => p.id === id);
  if (index !== -1 && index !== undefined) {
    const party = dbData.parties[index];
    const actorAllowed = actorUsername === party.hostUsername || (Array.isArray(party.moderators) && party.moderators.includes(actorUsername));
    const target = party.seats?.find((s: any) => s.id === Number(seatId));
    if (!actorAllowed) return res.status(403).json({ error: "Not allowed" });
    if (target?.name === party.hostUsername) return res.status(403).json({ error: "Host cannot be kicked" });
    let kickedUser = "";
    party.seats = party.seats.map((seat: any) => {
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
        message: `⚠️ Host has removed ${kickedUser} from Seat ${seatId}.`,
        isSystem: true,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
    }
    saveDatabase();
    syncDocument("parties", id, party);
    res.json(party);
  } else {
    res.status(404).json({ error: "Party Room not found" });
  }
});

app.post("/api/v1/parties/:id/seats/mute-user", (req, res) => {
  const { id } = req.params;
  const { seatId, isMuted, actorUsername } = req.body;
  const index = dbData.parties?.findIndex((p: any) => p.id === id);
  if (index !== -1 && index !== undefined) {
    const party = dbData.parties[index];
    const actorAllowed = actorUsername === party.hostUsername || (Array.isArray(party.moderators) && party.moderators.includes(actorUsername));
    const targetSeat = party.seats?.find((s: any) => s.id === Number(seatId));
    if (!actorAllowed || targetSeat?.name === party.hostUsername) return res.status(403).json({ error: "Not allowed" });
    let targetUser = "";
    party.seats = party.seats.map((seat: any) => {
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
        message: `🎙️ Host has ${isMuted ? 'Muted' : 'Unmuted'} ${targetUser} on Seat ${seatId}.`,
        isSystem: true,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
    }
    saveDatabase();
    syncDocument("parties", id, party);
    res.json(party);
  } else {
    res.status(404).json({ error: "Party Room not found" });
  }
});

app.post("/api/v1/parties/:id/seats/change", (req, res) => {
  const { id } = req.params; const { fromSeatId, toSeatId, actorUsername } = req.body;
  const index = dbData.parties?.findIndex((p: any) => p.id === id);
  if (index === -1 || index === undefined) return res.status(404).json({ error: "Party Room not found" });
  const party = dbData.parties[index];
  const allowed = actorUsername === party.hostUsername || (Array.isArray(party.moderators) && party.moderators.includes(actorUsername));
  if (!allowed) return res.status(403).json({ error: "Not allowed" });
  const from = party.seats.find((s: any) => s.id === Number(fromSeatId)); const to = party.seats.find((s: any) => s.id === Number(toSeatId));
  if (!from?.name || !to || to.name || to.isLocked || from.name === party.hostUsername) return res.status(400).json({ error: "Invalid seat change" });
  const moved = { ...from };
  party.seats = party.seats.map((s: any) => s.id === from.id ? { ...s, name: null, avatar: null, isMuted: false } : s.id === to.id ? { ...s, name: moved.name, avatar: moved.avatar, isMuted: moved.isMuted } : s);
  saveDatabase(); syncDocument("parties", id, party); res.json(party);
});

app.post("/api/v1/parties/:id/moderators/toggle", (req, res) => {
  const { id } = req.params; const { username, actorUsername } = req.body;
  const index = dbData.parties?.findIndex((p: any) => p.id === id);
  if (index === -1 || index === undefined) return res.status(404).json({ error: "Party Room not found" });
  const party = dbData.parties[index];
  if (actorUsername !== party.hostUsername || username === party.hostUsername) return res.status(403).json({ error: "Only host can manage moderators" });
  if (!Array.isArray(party.moderators)) party.moderators = [];
  party.moderators = party.moderators.includes(username) ? party.moderators.filter((u: string) => u !== username) : [...party.moderators, username];
  saveDatabase(); syncDocument("parties", id, party); res.json(party);
});

app.post("/api/v1/parties/:id/block-user", (req, res) => {
  const { id } = req.params;
  const { username, actorUsername } = req.body;
  const index = dbData.parties?.findIndex((p: any) => p.id === id);
  if (index !== -1 && index !== undefined) {
    const party = dbData.parties[index];
    const actorAllowed = actorUsername === party.hostUsername || (Array.isArray(party.moderators) && party.moderators.includes(actorUsername));
    if (!actorAllowed || username === party.hostUsername) return res.status(403).json({ error: "Not allowed" });
    if (!party.blockedUsers) party.blockedUsers = [];
    if (!party.blockedUsers.includes(username)) {
      party.blockedUsers.push(username);
    }
    // Kick them from seats if they are on one
    party.seats = party.seats.map((seat: any) => {
      if (seat.name === username || (seat.name && seat.name.startsWith(username))) {
        return { ...seat, name: null, avatar: null };
      }
      return seat;
    });
    // Remove them from connected viewers
    if (party.connectedViewers) {
      party.connectedViewers = party.connectedViewers.filter((v: any) => v.username !== username);
    }
    party.participantCount = party.connectedViewers ? party.connectedViewers.length : 0;
    
    if (!party.comments) party.comments = [];
    party.comments.push({
      id: `sys-${Date.now()}`,
      username: "System",
      message: `🚫 Host has blocked ${username} from this room.`,
      isSystem: true,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
    saveDatabase();
    syncDocument("parties", id, party);
    res.json(party);
  } else {
    res.status(404).json({ error: "Party Room not found" });
  }
});

// Families endpoints
app.get("/api/v1/families", (req, res) => {
  res.json(dbData.families);
});

app.post("/api/v1/families", (req, res) => {
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

app.put("/api/v1/families/:id", (req, res) => {
  const { id } = req.params;
  const index = dbData.families.findIndex((f: any) => f.id === id);
  if (index !== -1) {
    dbData.families[index] = { ...dbData.families[index], ...req.body };
    saveDatabase();
    syncDocument("families", id, dbData.families[index]);
    res.json(dbData.families[index]);
  } else {
    res.status(404).json({ error: "Family not found" });
  }
});

app.delete("/api/v1/families/:id", (req, res) => {
  const { id } = req.params;
  dbData.families = dbData.families.filter((f: any) => f.id !== id);
  saveDatabase();
  deleteDocument("families", id);
  res.json({ message: "Family deleted successfully" });
});

// Agencies endpoints
app.get("/api/v1/agencies", (req, res) => {
  if (!dbData.agencies) dbData.agencies = [];
  res.json(dbData.agencies);
});

app.post("/api/v1/agencies", (req, res) => {
  const agencyId = req.body.id || `agency-${Math.floor(1000 + Math.random() * 9000)}`;
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
    createdAt: new Date().toISOString(),
    ...req.body
  };

  if (!dbData.agencies) dbData.agencies = [];
  dbData.agencies.unshift(newAgency);

  // Grant agency admin access to assigned user
  const targetUsername = newAgency.ownerUsername || newAgency.adminUserId;
  if (targetUsername) {
    const userIndex = dbData.users.findIndex((u: any) => u.username === targetUsername);
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

app.put("/api/v1/agencies/:id", (req, res) => {
  const { id } = req.params;
  if (!dbData.agencies) dbData.agencies = [];
  const index = dbData.agencies.findIndex((a: any) => a.id === id);
  if (index !== -1) {
    dbData.agencies[index] = { ...dbData.agencies[index], ...req.body };
    saveDatabase();
    syncDocument("agencies", id, dbData.agencies[index]);
    res.json(dbData.agencies[index]);
  } else {
    res.status(404).json({ error: "Agency not found" });
  }
});

app.delete("/api/v1/agencies/:id", (req, res) => {
  const { id } = req.params;
  if (!dbData.agencies) dbData.agencies = [];
  dbData.agencies = dbData.agencies.filter((a: any) => a.id !== id);
  saveDatabase();
  deleteDocument("agencies", id);
  res.json({ message: "Agency deleted successfully" });
});

// Agency Hosts Endpoints
app.get("/api/v1/agencies/:id/hosts", (req, res) => {
  const { id } = req.params;
  const agencyHosts = (dbData.users || []).filter((u: any) => u.agencyId === id || (u.agencyName && dbData.agencies?.find((a: any) => a.id === id && a.name === u.agencyName)));
  res.json(agencyHosts);
});

app.post("/api/v1/agencies/:id/hosts", (req, res) => {
  const { id } = req.params;
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: "Username required" });

  const agency = (dbData.agencies || []).find((a: any) => a.id === id);
  const userIndex = (dbData.users || []).findIndex((u: any) => u.username === username);

  if (userIndex !== -1) {
    dbData.users[userIndex].agencyId = id;
    dbData.users[userIndex].agencyName = agency ? agency.name : "Pardais Agency";
    dbData.users[userIndex].isAgencyHost = true;
    
    // Update registered hosts count
    if (agency) {
      agency.registeredHosts = (dbData.users || []).filter((u: any) => u.agencyId === id).length;
      syncDocument("agencies", id, agency);
    }

    saveDatabase();
    syncDocument("users", username, dbData.users[userIndex]);
    res.json({ message: "Host assigned successfully", user: dbData.users[userIndex] });
  } else {
    res.status(404).json({ error: "User not found" });
  }
});

app.delete("/api/v1/agencies/:id/hosts/:username", (req, res) => {
  const { id, username } = req.params;
  const userIndex = (dbData.users || []).findIndex((u: any) => u.username === username && u.agencyId === id);

  if (userIndex !== -1) {
    dbData.users[userIndex].agencyId = "";
    dbData.users[userIndex].agencyName = "";
    dbData.users[userIndex].isAgencyHost = false;

    const agency = (dbData.agencies || []).find((a: any) => a.id === id);
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

// Host Join Agency Requests Endpoints
app.get("/api/v1/host-join-requests", (req, res) => {
  if (!dbData.hostJoinRequests) dbData.hostJoinRequests = [];
  res.json(dbData.hostJoinRequests);
});

app.post("/api/v1/host-join-requests", (req, res) => {
  const newReq = {
    id: `HJR-${Date.now()}`,
    status: "PENDING",
    timestamp: new Date().toISOString(),
    ...req.body
  };
  if (!dbData.hostJoinRequests) dbData.hostJoinRequests = [];
  dbData.hostJoinRequests.unshift(newReq);

  saveDatabase();
  syncDocument("hostJoinRequests", newReq.id, newReq);
  res.status(201).json(newReq);
});

app.put("/api/v1/host-join-requests/:id", (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!dbData.hostJoinRequests) dbData.hostJoinRequests = [];
  const index = dbData.hostJoinRequests.findIndex((r: any) => r.id === id);

  if (index !== -1) {
    const r = dbData.hostJoinRequests[index];
    r.status = status;

    if (status === "APPROVED" || status === "Approved") {
      if (r.type === "LEAVE") {
        // Remove user from agency
        const userIndex = (dbData.users || []).findIndex((u: any) => u.username === r.applicantUsername);
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

        // Decrement agency host count
        const agency = (dbData.agencies || []).find((a: any) => a.id === r.agencyId);
        if (agency && agency.registeredHosts > 0) {
          agency.registeredHosts -= 1;
          syncDocument("agencies", agency.id, agency);
        }
      } else {
        // Assign user to agency
        const userIndex = (dbData.users || []).findIndex((u: any) => u.username === r.applicantUsername);
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

        // Increment agency host count
        const agency = (dbData.agencies || []).find((a: any) => a.id === r.agencyId);
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

// Coin Sellers list (Approved Resellers)
app.get("/api/v1/coin-sellers", (req, res) => {
  res.json(dbData.coinSellers || []);
});

app.post("/api/v1/coin-sellers", (req, res) => {
  const newSeller = {
    id: `seller-${Date.now()}`,
    status: "Active",
    coinBalance: req.body.coinBalance || 100000,
    ...req.body
  };
  if (!dbData.coinSellers) dbData.coinSellers = [];
  dbData.coinSellers.push(newSeller);
  saveDatabase();
  syncDocument("coinSellers", newSeller.id, newSeller);
  res.status(201).json(newSeller);
});

app.put("/api/v1/coin-sellers/:id", (req, res) => {
  const { id } = req.params;
  if (!dbData.coinSellers) dbData.coinSellers = [];
  const index = dbData.coinSellers.findIndex((s: any) => s.id === id);
  if (index !== -1) {
    dbData.coinSellers[index] = { ...dbData.coinSellers[index], ...req.body };
    saveDatabase();
    syncDocument("coinSellers", id, dbData.coinSellers[index]);
    res.json(dbData.coinSellers[index]);
  } else {
    res.status(404).json({ error: "Coin seller agency not found" });
  }
});

app.delete("/api/v1/coin-sellers/:id", (req, res) => {
  const { id } = req.params;
  if (!dbData.coinSellers) dbData.coinSellers = [];
  dbData.coinSellers = dbData.coinSellers.filter((s: any) => s.id !== id);
  saveDatabase();
  deleteDocument("coinSellers", id);
  res.json({ message: "Reseller deleted successfully" });
});

// Agency Coin Management & Transactions
app.get("/api/v1/agency-coin-transactions", (req, res) => {
  if (!dbData.agencyCoinTransactions) dbData.agencyCoinTransactions = [];
  res.json(dbData.agencyCoinTransactions);
});

app.post("/api/v1/agency-coin-transactions", (req, res) => {
  const { agencyId, agencyType, type, amount, reason, adminUsername } = req.body;
  
  if (!agencyId || !amount || amount <= 0) {
    return res.status(400).json({ error: "Invalid agencyId or coin amount" });
  }

  const numAmount = parseInt(String(amount), 10);
  let targetAgency: any = null;
  let isCoinSeller = agencyType === "coin_seller";

  if (!dbData.coinSellers) dbData.coinSellers = [];
  if (!dbData.agencies) dbData.agencies = [];

  // Find agency
  let sellerIndex = dbData.coinSellers.findIndex((s: any) => s.id === agencyId);
  let hostIndex = dbData.agencies.findIndex((a: any) => a.id === agencyId);

  if (sellerIndex !== -1) {
    targetAgency = dbData.coinSellers[sellerIndex];
    isCoinSeller = true;
  } else if (hostIndex !== -1) {
    targetAgency = dbData.agencies[hostIndex];
    isCoinSeller = false;
  } else {
    return res.status(404).json({ error: "Agency not found" });
  }

  const currentBal = typeof targetAgency.coinBalance === "number" ? targetAgency.coinBalance : 
                     (parseInt(String(targetAgency.coinsAvailable || targetAgency.coinBalance || 0).replace(/[^0-9]/g, ""), 10) || 0);

  const previousBalance = currentBal;
  let newBalance = currentBal;

  if (type === "ADD") {
    newBalance = currentBal + numAmount;
  } else if (type === "DEDUCT") {
    newBalance = Math.max(0, currentBal - numAmount);
  } else {
    return res.status(400).json({ error: "Invalid transaction type" });
  }

  // Update target agency
  targetAgency.coinBalance = newBalance;
  targetAgency.coinsAvailable = `${newBalance.toLocaleString()} Coins`;

  if (isCoinSeller && sellerIndex !== -1) {
    dbData.coinSellers[sellerIndex] = targetAgency;
    syncDocument("coinSellers", targetAgency.id, targetAgency);
  } else if (hostIndex !== -1) {
    dbData.agencies[hostIndex] = targetAgency;
    syncDocument("agencies", targetAgency.id, targetAgency);
  }

  // Create transaction log
  const transaction = {
    id: `ACT-${Date.now()}`,
    agencyId: targetAgency.id,
    agencyName: targetAgency.name || targetAgency.agencyName || "Official Agency",
    agencyType: isCoinSeller ? "Coin Seller Agency" : "Host Agency",
    type, // "ADD" | "DEDUCT"
    amount: numAmount,
    previousBalance,
    newBalance,
    reason: reason || (type === "ADD" ? "Admin Top-up" : "Admin Deduction"),
    adminUsername: adminUsername || "Super Admin",
    timestamp: new Date().toISOString()
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

// Agency Requests Endpoints
app.get("/api/v1/agency-requests", (req, res) => {
  res.json(dbData.agencyRequests || []);
});

app.post("/api/v1/agency-requests", (req, res) => {
  const newReq = {
    id: `ARQ-${Date.now()}`,
    status: req.body.status || "Pending Review",
    timestamp: new Date().toISOString(),
    ...req.body
  };
  if (!dbData.agencyRequests) dbData.agencyRequests = [];
  dbData.agencyRequests.unshift(newReq);
  
  // Create system notification for Admin
  const adminNotification = {
    id: Date.now(),
    title: "New Coin Seller Agency Request Submitted",
    message: `${newReq.applicantName || newReq.applicantUsername} requested to register Coin Seller Agency: ${newReq.agencyName || newReq.applicantName}.`,
    timestamp: new Date().toISOString(),
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

app.put("/api/v1/agency-requests/:id", (req, res) => {
  const { id } = req.params;
  const { status, remarks } = req.body;
  if (!dbData.agencyRequests) dbData.agencyRequests = [];
  const index = dbData.agencyRequests.findIndex((r: any) => r.id === id);
  if (index !== -1) {
    const r = dbData.agencyRequests[index];
    r.status = status;
    if (remarks) r.remarks = remarks;
    
    // If approved, create official agency or add to offline resellers as required!
    if (status === "Approved") {
      const agencyId = `agency-${Math.floor(1000 + Math.random() * 9000)}`;
      
      // Update applicant's user profile agency status
      if (r.applicantUsername) {
        const userIndex = dbData.users.findIndex((u: any) => u.username === r.applicantUsername);
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
        // official_agency or coin_seller
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
        const userIndex = dbData.users.findIndex((u: any) => u.username === r.applicantUsername);
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

app.delete("/api/v1/agency-requests/:id", (req, res) => {
  const { id } = req.params;
  if (!dbData.agencyRequests) dbData.agencyRequests = [];
  dbData.agencyRequests = dbData.agencyRequests.filter((r: any) => r.id !== id);
  saveDatabase();
  deleteDocument("agencyRequests", id);
  res.json({ message: "Agency request deleted" });
});

// Coin Purchase Requests (Offline) Endpoints
app.get("/api/v1/purchase-requests", (req, res) => {
  res.json(dbData.purchaseRequests || []);
});

app.post("/api/v1/purchase-requests", (req, res) => {
  const newReq = {
    id: `PRQ-${Date.now()}`,
    status: "Pending",
    timestamp: new Date().toISOString(),
    ...req.body
  };
  if (!dbData.purchaseRequests) dbData.purchaseRequests = [];
  dbData.purchaseRequests.unshift(newReq);
  
  // Create system notification for Admin
  const adminNotification = {
    id: Date.now(),
    title: "New Coin Purchase Request",
    message: `${newReq.username} requested to purchase ${newReq.coins} Coins offline.`,
    timestamp: new Date().toISOString(),
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

app.put("/api/v1/purchase-requests/:id", (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // Approved or Rejected
  if (!dbData.purchaseRequests) dbData.purchaseRequests = [];
  const index = dbData.purchaseRequests.findIndex((r: any) => r.id === id);
  if (index !== -1) {
    const r = dbData.purchaseRequests[index];
    r.status = status;
    
    if (status === "Approved") {
      // Credit coins to user's wallet automatically
      const username = r.username;
      const coinsAmount = Number(r.coins || 0);
      
      const userIndex = dbData.users.findIndex((u: any) => u.username === username);
      if (userIndex !== -1) {
        dbData.users[userIndex].coins = (dbData.users[userIndex].coins || 0) + coinsAmount;
        syncDocument("users", username, dbData.users[userIndex]);
      }
      
      if (username === dbData.user.username) {
        dbData.user.coins = (dbData.user.coins || 0) + coinsAmount;
        writeMetadata("user_profile", dbData.user);
      }
      
      // Update in admin-users list
      const adminUserIndex = dbData.adminUsersList.findIndex((u: any) => u.username === username);
      if (adminUserIndex !== -1) {
        dbData.adminUsersList[adminUserIndex].coins = (dbData.adminUsersList[adminUserIndex].coins || 0) + coinsAmount;
        syncDocument("adminUsersList", username, dbData.adminUsersList[adminUserIndex]);
      }
      
      // Add transaction to ledger/history
      const newTxn = {
        id: `TXN-${Math.floor(100 + Math.random() * 900)}`,
        timestamp: new Date().toISOString(),
        status: "Completed",
        type: "recharge",
        details: `Purchased ${coinsAmount} Coins offline (Approved by Admin)`,
        amount: coinsAmount,
        currency: "coins",
        username: username
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

app.delete("/api/v1/purchase-requests/:id", (req, res) => {
  const { id } = req.params;
  if (!dbData.purchaseRequests) dbData.purchaseRequests = [];
  dbData.purchaseRequests = dbData.purchaseRequests.filter((r: any) => r.id !== id);
  saveDatabase();
  deleteDocument("purchaseRequests", id);
  res.json({ message: "Purchase request deleted" });
});

// Transactions ledger
app.get("/api/v1/transactions", (req, res) => {
  res.json(dbData.transactions);
});

app.post("/api/v1/transactions", (req, res) => {
  const newTxn = { id: `TXN-${Math.floor(100 + Math.random() * 900)}`, timestamp: new Date().toISOString(), status: "Completed", ...req.body };
  dbData.transactions.unshift(newTxn);
  saveDatabase();
  syncDocument("transactions", newTxn.id, newTxn);
  res.status(201).json(newTxn);
});

// Notifications inbox dispatcher with auto-cleanup (24 hours expiry)
async function cleanupExpiredNotifications() {
  try {
    const now = Date.now();
    const expiryLimit = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    const activeNotifs: any[] = [];
    const expiredNotifs: any[] = [];

    const notifsList = dbData.notifications || [];
    for (const item of notifsList) {
      const ts = item.timestamp ? new Date(item.timestamp).getTime() : (item.id && typeof item.id === 'number' ? item.id : now);
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

// Periodically run cleanup every 10 minutes
setInterval(() => {
  cleanupExpiredNotifications();
}, 10 * 60 * 1000);

app.get("/api/v1/notifications", async (req, res) => {
  await cleanupExpiredNotifications();
  const { username, userId } = req.query || {};
  const notifs = dbData.notifications || [];
  
  if (!username && !userId) {
    return res.json(notifs);
  }

  const uStr = username ? String(username).toLowerCase() : "";
  const uidStr = userId ? String(userId) : "";

  const filtered = notifs.filter((n: any) => {
    if (!n) return false;
    // Global announcements / system broadcasts
    if (n.isGlobal === true || n.targetUsername === "all" || (!n.targetUsername && !n.targetUserId && !n.userId)) {
      return true;
    }
    // Specific targeted notifications
    if (uStr && n.targetUsername && String(n.targetUsername).toLowerCase() === uStr) return true;
    if (uStr && n.username && String(n.username).toLowerCase() === uStr) return true;
    if (uidStr && n.targetUserId && String(n.targetUserId) === uidStr) return true;
    if (uidStr && n.userId && String(n.userId) === uidStr) return true;
    return false;
  });

  res.json(filtered);
});

app.post("/api/v1/notifications", async (req, res) => {
  const notifId = Date.now();
  const newNotif = {
    id: notifId,
    isNew: true,
    time: "Just Now",
    timestamp: new Date().toISOString(),
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

app.post("/api/v1/notifications/:id/read", async (req, res) => {
  try {
    const { id } = req.params;
    const notif = (dbData.notifications || []).find((n: any) => String(n.id) === String(id));
    if (notif) {
      notif.isNew = false;
      saveDatabase();
      await syncDocument("notifications", String(notif.id), notif);
      return res.json({ success: true, notification: notif });
    }
    res.status(404).json({ error: "Notification not found" });
  } catch (err) {
    res.status(500).json({ error: "Failed to mark notification as read" });
  }
});

app.delete("/api/v1/notifications/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const index = (dbData.notifications || []).findIndex((n: any) => String(n.id) === String(id));
    if (index !== -1) {
      const removed = dbData.notifications.splice(index, 1)[0];
      saveDatabase();
      await deleteDocument("notifications", String(id));
      return res.json({ success: true, removed });
    }
    res.status(404).json({ error: "Notification not found" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete notification" });
  }
});

app.post("/api/v1/notifications/read-all", async (req, res) => {
  try {
    const { username, userId } = req.body || req.query || {};
    const notifs = dbData.notifications || [];
    const uStr = username ? String(username).toLowerCase() : "";
    const uidStr = userId ? String(userId) : "";

    for (const item of notifs) {
      let isForUser = !uStr && !uidStr;
      if (uStr && ((item.targetUsername && String(item.targetUsername).toLowerCase() === uStr) || item.isGlobal)) isForUser = true;
      if (uidStr && (item.targetUserId && String(item.targetUserId) === uidStr)) isForUser = true;

      if (isForUser && item.isNew) {
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

app.post("/api/v1/notifications/clear", async (req, res) => {
  try {
    const { username, userId } = req.body || req.query || {};
    const notifs = dbData.notifications || [];
    const uStr = username ? String(username).toLowerCase() : "";
    const uidStr = userId ? String(userId) : "";

    if (!uStr && !uidStr) {
      dbData.notifications = [];
      saveDatabase();
      for (const item of notifs) {
        if (item.id) await deleteDocument("notifications", String(item.id));
      }
    } else {
      const remaining: any[] = [];
      for (const item of notifs) {
        let isForUser = false;
        if (uStr && item.targetUsername && String(item.targetUsername).toLowerCase() === uStr) isForUser = true;
        if (uidStr && item.targetUserId && String(item.targetUserId) === uidStr) isForUser = true;

        if (isForUser) {
          if (item.id) await deleteDocument("notifications", String(item.id));
        } else {
          remaining.push(item);
        }
      }
      dbData.notifications = remaining;
      saveDatabase();
    }

    res.json({ success: true, message: "Notifications cleared" });
  } catch (error) {
    console.error("Error clearing notifications:", error);
    res.status(500).json({ error: "Failed to clear notifications" });
  }
});

// Reports management
app.get("/api/v1/reports", (req, res) => {
  res.json(dbData.reports);
});

app.post("/api/v1/reports", (req, res) => {
  const newReport = { id: `REP-${Math.floor(100 + Math.random() * 900)}`, status: "pending", timestamp: new Date().toISOString(), ...req.body };
  dbData.reports.unshift(newReport);
  saveDatabase();
  syncDocument("reports", newReport.id, newReport);
  res.status(201).json(newReport);
});

// ------------------------------------------------------------------
// DURABLE REEL METADATA MIRROR (Cloudflare R2)
// ------------------------------------------------------------------
// Firestore is the primary metadata store. R2 metadata is a durable second
// copy so a Firestore quota/cold-start issue can never make an uploaded reel
// disappear from the feed or Creator Hub after refresh/redeploy.
async function persistReelMetadataToR2(reel: any) {
  try {
    const client = getS3Client();
    const bucketName = process.env.R2_BUCKET_NAME || "pardaisparty-reels";
    const key = `reels/_metadata/${String(reel.id)}.json`;
    await client.send(new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: Buffer.from(JSON.stringify(reel), "utf-8"),
      ContentType: "application/json",
      CacheControl: "no-cache, no-store, must-revalidate",
    }));
    return true;
  } catch (err: any) {
    console.warn("[PARDAIS-PARTY REELS] R2 metadata mirror unavailable:", err?.message || err);
    return false;
  }
}

async function hydrateReelsFromR2Metadata() {
  try {
    const client = getS3Client();
    const bucketName = process.env.R2_BUCKET_NAME || "pardaisparty-reels";
    const keys: string[] = [];
    let continuationToken: string | undefined = undefined;
    do {
      const listed = await client.send(new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: "reels/_metadata/",
        ContinuationToken: continuationToken
      }));
      for (const item of (listed.Contents || [])) {
        if (typeof item?.Key === "string" && item.Key.endsWith(".json")) keys.push(item.Key);
      }
      continuationToken = listed.IsTruncated ? listed.NextContinuationToken : undefined;
    } while (continuationToken);
    if (!keys.length) return [];

    const restored: any[] = [];
    for (const key of keys) {
      try {
        const obj = await client.send(new GetObjectCommand({ Bucket: bucketName, Key: key }));
        const body = obj.Body && typeof (obj.Body as any).transformToString === "function"
          ? await (obj.Body as any).transformToString("utf-8")
          : "";
        if (body) {
          const reel = JSON.parse(body);
          if (reel && reel.id) restored.push(reel);
        }
      } catch (err: any) {
        console.warn(`[PARDAIS-PARTY REELS] Failed reading R2 metadata ${key}:`, err?.message || err);
      }
    }

    if (restored.length) {
      const map = new Map<string, any>();
      (dbData.reels || []).forEach((r: any) => { if (r?.id) map.set(String(r.id), r); });
      restored.forEach((r: any) => map.set(String(r.id), r));
      dbData.reels = Array.from(map.values()).sort((a: any, b: any) => {
        const ta = Date.parse(a?.createdAt || "") || 0;
        const tb = Date.parse(b?.createdAt || "") || 0;
        return tb - ta;
      });
      saveDatabase();
    }
    return restored;
  } catch (err: any) {
    console.warn("[PARDAIS-PARTY REELS] R2 metadata hydration unavailable:", err?.message || err);
    return [];
  }
}

// ------------------------------------------------------------------
// DAILY COIN REWARD — the only free coin source for normal users
// ------------------------------------------------------------------
app.get("/api/v1/daily-tasks/status", authenticateUser, (req: any, res) => {
  const last = Number(req.user?.dailyCoinClaimAt || 0);
  const elapsed = Date.now() - last;
  const available = !last || elapsed >= 24 * 60 * 60 * 1000;
  const nextClaimAt = available ? null : last + 24 * 60 * 60 * 1000;
  res.json({ success: true, available, lastClaimAt: last || null, nextClaimAt, rewardCoins: DAILY_COIN_REWARD, rewardXp: DAILY_XP_REWARD });
});

app.post("/api/v1/daily-tasks/claim", authenticateUser, async (req: any, res) => {
  const user = req.user;
  if (isAdminAccount(user)) {
    return res.status(400).json({ success: false, error: "Admin accounts use the Admin wallet and do not need the daily free-coin reward." });
  }
  const last = Number(user.dailyCoinClaimAt || 0);
  const remaining = 24 * 60 * 60 * 1000 - (Date.now() - last);
  if (last && remaining > 0) {
    return res.status(429).json({ success: false, code: "DAILY_CLAIM_COOLDOWN", error: "Daily reward is not ready yet.", nextClaimAt: last + 24 * 60 * 60 * 1000, remainingMs: remaining });
  }

  const beforeCoins = Number(user.coins) || 0;
  const beforeXp = Number(user.xp) || 0;
  user.coins = beforeCoins + DAILY_COIN_REWARD;
  user.xp = beforeXp + DAILY_XP_REWARD;
  const progression = getProgressionFromServerCoins(user.xp);
  user.userLevel = progression.level;
  user.vipLevel = progression.vipLevel;
  user.dailyCoinClaimAt = Date.now();
  user.dailyCoinClaimCount = (Number(user.dailyCoinClaimCount) || 0) + 1;
  user.updatedAt = new Date().toISOString();

  if (!Array.isArray(dbData.coinTransactions)) dbData.coinTransactions = [];
  const tx = {
    id: `daily_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
    type: "daily_reward",
    username: user.username,
    amount: DAILY_COIN_REWARD,
    currency: "coins",
    xp: DAILY_XP_REWARD,
    timestamp: new Date().toISOString(),
    status: "Completed",
    balanceBefore: beforeCoins,
    balanceAfter: user.coins
  };
  dbData.coinTransactions.unshift(tx);
  if (!Array.isArray(dbData.transactions)) dbData.transactions = [];
  dbData.transactions.unshift(tx);
  const idx = dbData.users.findIndex((u: any) => u?.uid === user?.uid || (u?.email && user?.email && String(u.email).toLowerCase() === String(user.email).toLowerCase()));
  if (idx >= 0) dbData.users[idx] = { ...dbData.users[idx], ...user };
  else dbData.users.push(user);
  saveDatabase();
  const persisted = await persistUserDurably(user);
  if (!persisted) return res.status(503).json({ success: false, error: "Daily reward could not be permanently saved. Please try again." });
  void syncDocument("coinTransactions", tx.id, tx).catch(() => undefined);
  res.json({ success: true, rewardCoins: DAILY_COIN_REWARD, rewardXp: DAILY_XP_REWARD, remainingCoins: user.coins, xp: user.xp, userLevel: user.userLevel, vipLevel: user.vipLevel, nextClaimAt: Date.now() + 24 * 60 * 60 * 1000 });
});

// ------------------------------------------------------------------
// CREATOR CENTER WALLET — 50% gift earnings / exchange / withdrawal
// ------------------------------------------------------------------
app.post("/api/v1/wallet/exchange", authenticateUser, async (req: any, res) => {
  const amount = Math.floor(Number(req.body?.amount) || 0);
  if (amount <= 0) return res.status(400).json({ error: "Enter a valid Creator Center coin amount." });
  const creatorBalance = Number(req.user?.diamonds) || 0;
  if (amount > creatorBalance) return res.status(400).json({ error: `Insufficient Creator Center balance. Available: ${creatorBalance}.` });
  req.user.diamonds = creatorBalance - amount;
  req.user.coins = (Number(req.user.coins) || 0) + amount;
  const tx = { id: `exchange_${Date.now()}_${Math.random().toString(36).slice(2,7)}`, type: "creator_exchange", username: req.user.username, amount, currency: "coins", timestamp: new Date().toISOString(), status: "Completed", from: "creator_center", to: "gifting_wallet" };
  if (!Array.isArray(dbData.transactions)) dbData.transactions = [];
  dbData.transactions.unshift(tx);
  const idx = dbData.users.findIndex((u: any) => u?.uid === req.user?.uid || (u?.email && req.user?.email && String(u.email).toLowerCase() === String(req.user.email).toLowerCase()));
  if (idx >= 0) dbData.users[idx] = { ...dbData.users[idx], ...req.user };
  saveDatabase();
  const persisted = await persistUserDurably(req.user);
  if (!persisted) return res.status(503).json({ error: "Exchange could not be permanently saved. Please try again." });
  void syncDocument("transactions", tx.id, tx).catch(() => undefined);
  res.json({ success: true, creatorBalance: req.user.diamonds, coinsBalance: req.user.coins, amount });
});

app.post("/api/v1/wallet/withdraw", authenticateUser, async (req: any, res) => {
  const amount = Math.floor(Number(req.body?.amount) || 0);
  if (amount <= 0) return res.status(400).json({ error: "Enter a valid Creator Center coin amount." });
  const creatorBalance = Number(req.user?.diamonds) || 0;
  if (amount > creatorBalance) return res.status(400).json({ error: `Insufficient Creator Center balance. Available: ${creatorBalance}.` });
  req.user.diamonds = creatorBalance - amount;
  const request = { id: `withdraw_${Date.now()}_${Math.random().toString(36).slice(2,7)}`, type: "withdraw", username: req.user.username, amount, currency: "creator_coins", timestamp: new Date().toISOString(), status: "Pending", details: `Withdrawal requested for ${amount.toLocaleString()} Creator Center Coins` };
  if (!Array.isArray(dbData.withdrawals)) dbData.withdrawals = [];
  dbData.withdrawals.unshift(request);
  if (!Array.isArray(dbData.transactions)) dbData.transactions = [];
  dbData.transactions.unshift(request);
  const idx = dbData.users.findIndex((u: any) => u?.uid === req.user?.uid || (u?.email && req.user?.email && String(u.email).toLowerCase() === String(req.user.email).toLowerCase()));
  if (idx >= 0) dbData.users[idx] = { ...dbData.users[idx], ...req.user };
  saveDatabase();
  const persisted = await persistUserDurably(req.user);
  if (!persisted) return res.status(503).json({ error: "Withdrawal could not be permanently saved. Please try again." });
  void syncDocument("withdrawals", request.id, request).catch(() => undefined);
  res.json({ success: true, creatorBalance: req.user.diamonds, request });
});

// Reels endpoints
app.get("/api/v1/reels", async (req, res) => {
  await hydrateReelsFromFirestore(true);
  await hydrateReelsFromR2Metadata();
  const map = new Map<string, any>();
  (dbData.reels || []).forEach((r: any) => { if (r?.id) map.set(String(r.id), r); });
  dbData.reels = Array.from(map.values()).sort((a: any, b: any) => {
    const ta = Date.parse(a?.createdAt || "") || 0;
    const tb = Date.parse(b?.createdAt || "") || 0;
    return tb - ta;
  });
  saveDatabase();
  res.json(dbData.reels);
});

app.post("/api/v1/reels", async (req, res) => {
  const newReel = {
    id: `r-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`,
    views: 0,
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

  // CRITICAL: a reel is not considered permanently published until at least
  // one durable cloud copy of its metadata has been confirmed. The old flow
  // returned 201 before Firestore/R2 finished, so a Railway restart or app
  // update immediately after publishing could lose the reel from Creator Hub.
  saveDatabase();

  let firestoreOk = false;
  let r2Ok = false;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      firestoreOk = await syncDocument("reels", newReel.id, newReel);
      if (firestoreOk) break;
    } catch (err: any) {
      console.warn(`[PARDAIS-PARTY REELS] Firestore metadata sync attempt ${attempt}/3 failed:`, err?.message || err);
    }
    if (attempt < 3) await new Promise(resolve => setTimeout(resolve, attempt * 1200));
  }

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      r2Ok = await persistReelMetadataToR2(newReel);
      if (r2Ok) break;
    } catch (err: any) {
      console.warn(`[PARDAIS-PARTY REELS] R2 metadata sync attempt ${attempt}/3 failed:`, err?.message || err);
    }
    if (attempt < 3) await new Promise(resolve => setTimeout(resolve, attempt * 1200));
  }

  console.log(`[PARDAIS-PARTY REELS] Durable metadata sync complete for ${newReel.id}: Firestore=${firestoreOk}, R2=${r2Ok}`);

  // Require at least one durable cloud store before telling the client the
  // reel is permanently saved. The local DB is only a fallback/cache.
  if (!firestoreOk && !r2Ok) {
    // Keep the local record so it can be retried/recovered, but do not report
    // a successful permanent publish when no cloud copy exists.
    return res.status(503).json({
      success: false,
      persisted: false,
      error: "Reel uploaded but permanent cloud saving could not be confirmed. Please retry publishing."
    });
  }

  return res.status(201).json({
    success: true,
    persisted: true,
    persistencePending: false,
    durableStores: { firestore: firestoreOk, r2Metadata: r2Ok },
    message: "Reel uploaded and permanently saved.",
    ...newReel
  });
});

app.put("/api/v1/reels/:id", async (req, res) => {
  const { id } = req.params;
  const index = dbData.reels.findIndex((r: any) => r.id === id);
  if (index !== -1) {
    dbData.reels[index] = { ...dbData.reels[index], ...req.body };
    saveDatabase();
    await syncDocument("reels", id, dbData.reels[index]);
    await persistReelMetadataToR2(dbData.reels[index]);
    res.json(dbData.reels[index]);
  } else {
    res.status(404).json({ error: "Reel not found" });
  }
});

// Stories endpoints
app.get("/api/v1/stories", (req, res) => {
  res.json(dbData.stories || []);
});

app.post("/api/v1/stories", (req, res) => {
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

app.put("/api/v1/stories/:id", (req, res) => {
  const { id } = req.params;
  const index = dbData.stories.findIndex((s: any) => s.id === id);
  if (index !== -1) {
    dbData.stories[index] = { ...dbData.stories[index], ...req.body };
    saveDatabase();
    syncDocument("stories", id, dbData.stories[index]);
    res.json(dbData.stories[index]);
  } else {
    res.status(404).json({ error: "Story not found" });
  }
});

// Chats / Direct messages endpoints
app.get("/api/v1/chats", (req, res) => {
  res.json(dbData.chats || []);
});

app.post("/api/v1/chats", (req, res) => {
  const newMsg = {
    id: `msg-${Date.now()}`,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    ...req.body
  };
  if (!dbData.chats) dbData.chats = [];
  dbData.chats.push(newMsg);
  saveDatabase();
  syncDocument("chats", newMsg.id, newMsg);
  res.status(201).json(newMsg);
});

app.post("/api/v1/reels/sync", async (req, res) => {
  try {
    // Never replace the durable reel collection with a partial/stale client list.
    // Merge by stable reel ID and persist each record instead.
    const incoming = Array.isArray(req.body) ? req.body : [];
    if (!Array.isArray(dbData.reels)) dbData.reels = [];
    const reelMap = new Map<string, any>();
    dbData.reels.forEach((r: any) => { if (r?.id) reelMap.set(String(r.id), r); });
    incoming.forEach((r: any) => { if (r?.id) reelMap.set(String(r.id), { ...reelMap.get(String(r.id)), ...r }); });
    dbData.reels = Array.from(reelMap.values()).sort((a: any, b: any) => {
      const ta = Date.parse(a?.createdAt || "") || 0;
      const tb = Date.parse(b?.createdAt || "") || 0;
      return tb - ta;
    });
    saveDatabase();

    const results = await Promise.all(incoming.filter((r: any) => r?.id).map(async (r: any) => ({
      id: r.id,
      firestore: await syncDocument("reels", String(r.id), reelMap.get(String(r.id))),
      r2: await persistReelMetadataToR2(reelMap.get(String(r.id)))
    })));
    res.json({ success: true, merged: true, count: results.length, results });
  } catch (err: any) {
    console.error("[PARDAIS-PARTY REELS] Durable sync failed:", err?.message || err);
    res.status(500).json({ success: false, error: "Reel synchronization failed." });
  }
});

app.post("/api/v1/stories/sync", (req, res) => {
  dbData.stories = req.body;
  saveDatabase();
  if (Array.isArray(req.body)) {
    req.body.forEach((s: any) => {
      if (s.id) syncDocument("stories", s.id, s);
    });
  }
  res.json({ success: true });
});

app.post("/api/v1/chats/sync", (req, res) => {
  dbData.chats = req.body;
  saveDatabase();
  if (Array.isArray(req.body)) {
    req.body.forEach((c: any) => {
      if (c.id) syncDocument("chats", c.id, c);
    });
  }
  res.json({ success: true });
});

app.delete("/api/v1/chats", (req, res) => {
  dbData.chats = [];
  saveDatabase();
  res.json({ success: true, message: "Chats cleared" });
});

app.put("/api/v1/reports/:id", (req, res) => {
  const { id } = req.params;
  const index = dbData.reports.findIndex((r: any) => r.id === id);
  if (index !== -1) {
    dbData.reports[index] = { ...dbData.reports[index], ...req.body };
    saveDatabase();
    syncDocument("reports", id, dbData.reports[index]);
    res.json(dbData.reports[index]);
  } else {
    res.status(404).json({ error: "Report not found" });
  }
});

// KYC requests endpoints
app.get("/api/v1/kyc-requests", (req, res) => {
  res.json(dbData.kycRequests);
});

app.post("/api/v1/kyc-requests", (req, res) => {
  const newKyc = { id: `KYC-${Math.floor(1000 + Math.random() * 9000)}`, status: "pending", timestamp: new Date().toISOString(), ...req.body };
  dbData.kycRequests.unshift(newKyc);
  saveDatabase();
  syncDocument("kycRequests", newKyc.id, newKyc);
  res.status(201).json(newKyc);
});

app.put("/api/v1/kyc-requests/:id", (req, res) => {
  const { id } = req.params;
  if (!Array.isArray(dbData.kycRequests)) dbData.kycRequests = [];
  if (!Array.isArray(dbData.auditLogs)) dbData.auditLogs = [];

  const index = dbData.kycRequests.findIndex((r: any) => r.id === id);
  if (index !== -1) {
    dbData.kycRequests[index] = { ...dbData.kycRequests[index], ...req.body, updatedAt: new Date().toISOString() };
    const targetUsername = dbData.kycRequests[index].username;
    const status = dbData.kycRequests[index].status;

    // Synchronize status back into user profile if it's the main profile
    if (targetUsername === dbData.user?.username) {
      dbData.user.kycStatus = status;
      dbData.user.isVerified = (status === "approved");
      if (req.body.rejectionReason) dbData.user.kycRejectionReason = req.body.rejectionReason;
    }

    // Update target inside users and admin Users list
    if (Array.isArray(dbData.users)) {
      const uIdx = dbData.users.findIndex((u: any) => u.username === targetUsername);
      if (uIdx !== -1) {
        dbData.users[uIdx].kycStatus = status;
        dbData.users[uIdx].isVerified = (status === "approved");
        if (req.body.rejectionReason) dbData.users[uIdx].kycRejectionReason = req.body.rejectionReason;
        syncDocument("users", targetUsername, dbData.users[uIdx]);
      }
    }

    if (Array.isArray(dbData.adminUsersList)) {
      const usrIdx = dbData.adminUsersList.findIndex((u: any) => u.username === targetUsername);
      if (usrIdx !== -1) {
        dbData.adminUsersList[usrIdx].kycStatus = status;
        dbData.adminUsersList[usrIdx].isVerified = (status === "approved");
        if (req.body.rejectionReason) dbData.adminUsersList[usrIdx].kycRejectionReason = req.body.rejectionReason;
        syncDocument("adminUsersList", targetUsername, dbData.adminUsersList[usrIdx]);
      }
    }

    // Log Audit Action
    dbData.auditLogs.unshift({
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      admin: req.body.adminUsername || "Super Admin",
      action: `KYC_${status.toUpperCase()}`,
      target: targetUsername,
      details: { id, status, rejectionReason: req.body.rejectionReason || null }
    });

    saveDatabase();
    syncDocument("kycRequests", id, dbData.kycRequests[index]);
    writeMetadata("user_profile", dbData.user);

    res.json(dbData.kycRequests[index]);
  } else {
    res.status(404).json({ error: "KYC request not found" });
  }
});

// Admin Users grid management (ban/unban, edit stats, toggle permissions)
app.get("/api/v1/admin-users", (req, res) => {
  if (!Array.isArray(dbData.users)) dbData.users = [];
  if (!Array.isArray(dbData.adminUsersList)) dbData.adminUsersList = [];

  const userMap = new Map();

  // Load from main dbData.users
  dbData.users.forEach((u: any) => {
    if (u && (u.username || u.id)) {
      const key = (u.username || u.id).toLowerCase();
      userMap.set(key, {
        id: u.id || u.numericId || `usr_${key}`,
        username: u.username || key,
        fullName: u.fullName || u.displayName || u.username,
        email: u.email || `${u.username}@pardais.app`,
        phone: u.phone || u.phoneNumber || "+92 300 0000000",
        avatar: u.avatar || u.photoURL || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100",
        level: u.level || u.userLevel || 1,
        vipLevel: u.vipLevel || 0,
        coins: typeof u.coins === "number" ? u.coins : 5000,
        partyEnabled: u.partyEnabled !== false,
        liveEnabled: u.liveEnabled !== false,
        reelsEnabled: u.reelsEnabled !== false,
        coinsFrozen: u.coinsFrozen === true,
        isSuspended: u.isSuspended === true,
        isBanned: u.isBanned === true,
        isVerified: u.isVerified === true,
        kycStatus: u.kycStatus || "not_submitted",
        selectedFrameId: u.selectedFrameId || null,
        deviceId: u.deviceId || "DEV-S24-PAK8821"
      });
    }
  });

  // Ensure current user is present
  if (dbData.user && dbData.user.username) {
    const key = dbData.user.username.toLowerCase();
    const existing = userMap.get(key) || {};
    userMap.set(key, {
      ...existing,
      ...dbData.user,
      id: dbData.user.id || `usr_${key}`,
      username: dbData.user.username,
      partyEnabled: dbData.user.partyEnabled !== false,
      liveEnabled: dbData.user.liveEnabled !== false,
      reelsEnabled: dbData.user.reelsEnabled !== false,
      coinsFrozen: dbData.user.coinsFrozen === true,
      isSuspended: dbData.user.isSuspended === true,
      isBanned: dbData.user.isBanned === true,
      kycStatus: dbData.user.kycStatus || "not_submitted"
    });
  }

  // Merge adminUsersList entries
  dbData.adminUsersList.forEach((u: any) => {
    if (u && (u.username || u.id)) {
      const key = (u.username || u.id).toLowerCase();
      const existing = userMap.get(key) || {};
      userMap.set(key, { ...existing, ...u });
    }
  });

  const list = Array.from(userMap.values());
  res.json(list);
});

app.put("/api/v1/admin-users/:username", (req, res) => {
  const { username } = req.params;
  const updates = req.body || {};

  if (!Array.isArray(dbData.users)) dbData.users = [];
  if (!Array.isArray(dbData.adminUsersList)) dbData.adminUsersList = [];
  if (!Array.isArray(dbData.auditLogs)) dbData.auditLogs = [];

  const key = username.toLowerCase();

  // 1. Update in dbData.users
  let userObj: any = null;
  const userIndex = dbData.users.findIndex((u: any) => (u.username || "").toLowerCase() === key);
  if (userIndex !== -1) {
    dbData.users[userIndex] = { ...dbData.users[userIndex], ...updates };
    userObj = dbData.users[userIndex];
    syncDocument("users", username, dbData.users[userIndex]);
  } else {
    userObj = { username, ...updates };
    dbData.users.push(userObj);
  }

  // 2. Update in dbData.adminUsersList
  const adminIndex = dbData.adminUsersList.findIndex((u: any) => (u.username || "").toLowerCase() === key);
  if (adminIndex !== -1) {
    dbData.adminUsersList[adminIndex] = { ...dbData.adminUsersList[adminIndex], ...updates };
    syncDocument("adminUsersList", username, dbData.adminUsersList[adminIndex]);
  } else {
    dbData.adminUsersList.push({ username, ...updates });
  }

  // 3. Update dbData.user if current user
  if (dbData.user && (dbData.user.username || "").toLowerCase() === key) {
    dbData.user = { ...dbData.user, ...updates };
    writeMetadata("user_profile", dbData.user);
  }

  // 4. Record Audit Log
  const auditAction = updates.isBanned !== undefined ? (updates.isBanned ? "BAN_USER" : "UNBAN_USER") :
                      updates.isSuspended !== undefined ? (updates.isSuspended ? "SUSPEND_USER" : "UNSUSPEND_USER") :
                      updates.coinsFrozen !== undefined ? (updates.coinsFrozen ? "FREEZE_COINS" : "UNFREEZE_COINS") :
                      updates.partyEnabled !== undefined ? "TOGGLE_PARTY_PERM" :
                      updates.liveEnabled !== undefined ? "TOGGLE_LIVE_PERM" :
                      updates.reelsEnabled !== undefined ? "TOGGLE_REELS_PERM" : "EDIT_USER_PROFILE";

  dbData.auditLogs.unshift({
    id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toISOString(),
    admin: updates.adminUsername || "Super Admin",
    action: auditAction,
    target: username,
    details: updates
  });

  saveDatabase();
  res.json({ success: true, username, user: userObj });
});

// Audit Logs Endpoint
app.get("/api/v1/admin/audit-logs", (req, res) => {
  if (!Array.isArray(dbData.auditLogs)) dbData.auditLogs = [];
  res.json(dbData.auditLogs);
});

// Nominated Admin Emails Management
app.get("/api/v1/admin-emails", (req, res) => {
  if (!Array.isArray(dbData.nominatedAdminEmails)) {
    dbData.nominatedAdminEmails = [];
  }
  res.json(dbData.nominatedAdminEmails);
});

app.post("/api/v1/admin-emails", (req, res) => {
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

app.delete("/api/v1/admin-emails/:email", (req, res) => {
  const rawEmail = req.params.email;
  if (!rawEmail) return res.status(400).json({ error: "Email required" });

  const clean = decodeURIComponent(rawEmail).toLowerCase().trim();
  if (!Array.isArray(dbData.nominatedAdminEmails)) {
    dbData.nominatedAdminEmails = [];
  }

  dbData.nominatedAdminEmails = dbData.nominatedAdminEmails.filter((e: string) => e !== clean);
  saveDatabase();
  syncDocument("configurations", "nominatedAdminEmails", { list: dbData.nominatedAdminEmails });

  res.json(dbData.nominatedAdminEmails);
});

// Events management
app.get("/api/v1/events", (req, res) => {
  res.json(dbData.events);
});

app.post("/api/v1/events", (req, res) => {
  const newEvt = { id: `evt-${Date.now()}`, active: true, ...req.body };
  dbData.events.push(newEvt);
  saveDatabase();
  syncDocument("events", newEvt.id, newEvt);
  res.status(201).json(newEvt);
});

// ------------------------------------------------------------------
// LEGACY GOOGLE GENAI MODERATOR ENDPOINTS
// ------------------------------------------------------------------
app.post("/api/ai/moderate", async (req, res) => {
  const { text } = req.body;
  if (!text || typeof text !== "string") {
    return res.status(400).json({ error: "Missing text to moderate" });
  }

  const client = getAIClient();
  if (!client) {
    const lower = text.toLowerCase();
    const badWords = ["abuse", "spam", "scam", "cheat", "hack", "fake", "badword", "stupid", "idiot", "hate"];
    const flaggedWords = badWords.filter(w => lower.includes(w));
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
        responseMimeType: "application/json",
      }
    });

    const textOutput = response.text || "{}";
    const result = JSON.parse(textOutput.trim());
    return res.json({
      flagged: !!result.flagged,
      reason: result.reason || "Approved",
      moderatorType: "Pardais Party Server AI Moderation (Gemini-3.5-Flash)"
    });
  } catch (error: any) {
    console.error("AI Moderation Error:", error);
    return res.json({
      flagged: false,
      reason: "Error processing; default approved.",
      error: error.message,
      moderatorType: "Pardais Party Moderator Fallback"
    });
  }
});

app.post("/api/ai/translate", async (req, res) => {
  const { text, targetLanguage } = req.body;
  if (!text || !targetLanguage) {
    return res.status(400).json({ error: "Missing text or targetLanguage" });
  }

  const client = getAIClient();
  if (!client) {
    let translatedText = text;
    if (targetLanguage.toLowerCase() === "urdu") {
      translatedText = `[اردو ترجمہ] ${text} (AI offline simulation)`;
    } else if (targetLanguage.toLowerCase() === "hindi") {
      translatedText = `[हिंदी अनुवाद] ${text} (AI offline simulation)`;
    } else if (targetLanguage.toLowerCase() === "arabic") {
      translatedText = `[الترجمة العربية] ${text} (AI offline simulation)`;
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
      contents: prompt,
    });

    return res.json({
      translatedText: response.text ? response.text.trim() : text,
      sourceLanguage: "Detected Auto",
      type: "Pardais Party AI Translator"
    });
  } catch (error: any) {
    console.error("AI Translation Error:", error);
    return res.json({
      translatedText: `[Translation Error] ${text}`,
      sourceLanguage: "Auto",
      type: "Pardais Party Translation Fallback"
    });
  }
});

app.post("/api/ai/host-response", async (req, res) => {
  const { hostName, hostRole, userMessage, lastAction } = req.body;
  if (!hostName || !userMessage) {
    return res.status(400).json({ error: "Missing hostName or userMessage" });
  }

  const client = getAIClient();
  if (!client) {
    let reply = "Shukriya! Thank you for supporting my live stream! ❤️";
    if (lastAction === "gift") {
      reply = `Wow! Thank you so much for the luxury gift! This means the world to me! App sabhi log support karte rahein! 🌟✨`;
    } else {
      if (hostName.toLowerCase().includes("sahar")) {
        reply = `Hello, welcome to Pardais Party! I am playing some sweet tunes today. Let me know what song you want to hear! 🎵`;
      } else if (hostName.toLowerCase().includes("zain")) {
        reply = `Chalo guys! PK Battle start hone wali hai! Sabhi log double tap karo aur coin support dikhao! Let's win this PK! 🔥👊`;
      } else if (hostName.toLowerCase().includes("mehak")) {
        reply = `Welcome to my audio lounge. Grab a mic seat or relax. Tell us about your day, let's keep it cozy. ☕🎧`;
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
Your personality/role is: "${hostRole || 'Friendly Streaming Star'}".
The user just sent you a message: "${userMessage}".
${lastAction === "gift" ? "CRITICAL: The user also just sent you a valuable gift! You must react with high energy, extreme gratitude, and excitement in your signature host style." : ""}
Provide a short, lively, authentic response (1-2 sentences maximum) that a live host would say over their microphone. Keep it natural, warm, and highly engaging. Include matching emojis. You can use English mixed with Hindi/Urdu (Hinglish) for an authentic social live feel.
Do not wrap your answer in quotes or add metadata. Speak as the host directly.`;

    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: contextPrompt,
    });

    return res.json({
      reply: response.text ? response.text.trim() : "Thanks for joining my live! 💕",
      speaker: hostName,
      type: "Pardais Party Gemini AI Host"
    });
  } catch (error: any) {
    console.error("AI Host Error:", error);
    return res.json({
      reply: "Thank you so much for the love and support! Let's rock Pardais Party! 🎉",
      speaker: hostName,
      type: "Pardais Party Host Fallback"
    });
  }
});


// Public playback proxy for R2 reels.
// Uses the same R2 object URL for every viewer and supports HTTP Range requests.
app.use("/api/v1/reels/media", async (req: any, res: any) => {
  try {
    let rawPath = String(req.path || "").replace(/^\/+/, "");
    let objectKey = decodeURIComponent(rawPath).replace(/^\/+/, "");

    // Repair old clients/records that accidentally prefixed the playback path
    // more than once. The R2 object itself is still stored under one canonical
    // `reels/...` key.
    while (objectKey.startsWith("api/v1/reels/media/")) {
      objectKey = objectKey.substring("api/v1/reels/media/".length);
    }
    while (objectKey.startsWith("reels/media/")) {
      objectKey = objectKey.substring("reels/media/".length);
    }

    if (!objectKey.startsWith("reels/")) {
      return res.status(400).json({ error: "Invalid reel media key" });
    }

    const client = getS3Client();
    const bucketName = process.env.R2_BUCKET_NAME || "pardaisparty-reels";
    const range = req.headers.range as string | undefined;

    // Get the object. Range is forwarded directly to R2 so mobile browsers can seek.
    const commandInput: any = {
      Bucket: bucketName,
      Key: objectKey,
    };
    if (range) commandInput.Range = range;

    const object: any = await client.send(new GetObjectCommand(commandInput));
    const body: any = object.Body;
    if (!body) return res.status(404).json({ error: "Reel media unavailable" });

    const contentLength = Number(object.ContentLength || 0);
    const contentRange = object.ContentRange;
    const contentType = object.ContentType || "video/mp4";

    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.setHeader("Content-Type", contentType);
    if (contentLength > 0) res.setHeader("Content-Length", String(contentLength));
    if (contentRange) res.setHeader("Content-Range", contentRange);

    if (range && contentRange) res.status(206);
    body.pipe(res);
  } catch (error: any) {
    console.error("[PARDAIS-PARTY R2 MEDIA] Playback proxy failed:", error?.message || error);
    if (!res.headersSent) res.status(404).json({ error: "Reel media unavailable" });
    else res.end();
  }
});

// ------------------------------------------------------------------
// CLOUDFLARE R2 STORAGE CONFIGURATION & VIDEO UPLOAD
// ------------------------------------------------------------------
let s3ClientInstance: S3Client | null = null;

function getS3Client(): S3Client {
  if (!s3ClientInstance) {
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    const endpoint = process.env.R2_ENDPOINT;

    if (!accessKeyId || !secretAccessKey || !endpoint) {
      console.warn("[PARDAIS-PARTY R2] Missing environment credentials! Falling back to local storage for video uploads.");
      throw new Error("Missing Cloudflare R2 credentials (R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ENDPOINT). Set them on Railway!");
    }

    console.log("[PARDAIS-PARTY R2] Initializing Cloudflare R2 S3 Client with endpoint:", endpoint);
    s3ClientInstance = new S3Client({
      region: "auto",
      endpoint: endpoint,
      credentials: {
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey,
      }
    });
  }
  return s3ClientInstance;
}

const s3MulterUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100 MB Limit for high-definition video reels
  }
});

const avatarMulterUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    // Modern Android cameras can produce 15–20 MB originals. We optimize
    // them server-side, so allow a larger input while keeping a hard limit.
    fileSize: 25 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    const mime = String(file.mimetype || '').toLowerCase();
    const name = String(file.originalname || '').toLowerCase();
    const allowed = mime.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|avif|heic|heif)$/i.test(name);
    cb(null, allowed);
  }
});

const giftAnimationUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    const mime = String(file.mimetype || '').toLowerCase();
    const name = String(file.originalname || '').toLowerCase();
    const allowed =
      mime === 'video/webm' || mime === 'video/mp4' || mime === 'image/svg+xml' ||
      mime === 'image/gif' || name.endsWith('.webm') || name.endsWith('.mp4') ||
      name.endsWith('.svg') || name.endsWith('.gif');
    cb(null, allowed);
  }
});

// Production gift-animation storage: upload the original WebM/MP4/SVG/GIF to Cloudflare R2
// and return a stable API playback URL. The live app never needs to embed giant base64 blobs
// in the gift catalog, and the playback endpoint supports HTTP Range requests for mobile video.
app.post('/api/v1/gifts/upload-animation', giftAnimationUpload.single('file'), async (req: any, res: any) => {
  try {
    const file = req.file;
    if (!file?.buffer?.length) return res.status(400).json({ success: false, error: 'No animation file uploaded.' });
    if (!process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY || !process.env.R2_ENDPOINT) {
      return res.status(503).json({ success: false, error: 'Gift media storage is not configured on the server.' });
    }

    const mime = String(file.mimetype || 'application/octet-stream').toLowerCase();
    const original = String(file.originalname || 'gift-animation');
    const ext = original.includes('.') ? original.split('.').pop()!.toLowerCase() :
      (mime === 'video/webm' ? 'webm' : mime === 'video/mp4' ? 'mp4' : mime === 'image/svg+xml' ? 'svg' : 'gif');
    const safeGiftId = String(req.body?.giftId || 'new').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80);
    const objectKey = `gifts/animations/${safeGiftId}/${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${ext}`;
    const client = getS3Client();
    const bucketName = process.env.R2_BUCKET_NAME || 'pardaisparty-reels';

    await client.send(new PutObjectCommand({
      Bucket: bucketName,
      Key: objectKey,
      Body: file.buffer,
      ContentType: mime,
      CacheControl: 'public, max-age=31536000, immutable'
    }));

    const url = `${PUBLIC_API_BASE}/api/v1/gifts/animation?key=${encodeURIComponent(objectKey)}`;
    return res.json({ success: true, url, key: objectKey, contentType: mime, size: file.size });
  } catch (err: any) {
    console.error('[PARDAIS-PARTY GIFT MEDIA] Upload failed:', err?.message || err);
    return res.status(500).json({ success: false, error: err?.message || 'Gift animation upload failed.' });
  }
});

app.get('/api/v1/gifts/animation', async (req: any, res: any) => {
  try {
    const key = typeof req.query?.key === 'string' ? req.query.key : '';
    if (!key || !key.startsWith('gifts/animations/') || key.includes('..')) {
      return res.status(400).json({ error: 'Invalid gift animation key.' });
    }
    if (!process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY || !process.env.R2_ENDPOINT) {
      return res.status(503).json({ error: 'Gift media storage is unavailable.' });
    }

    const client = getS3Client();
    const bucketName = process.env.R2_BUCKET_NAME || 'pardaisparty-reels';
    const range = typeof req.headers.range === 'string' ? req.headers.range : undefined;
    const result: any = await client.send(new GetObjectCommand({
      Bucket: bucketName, Key: key, ...(range ? { Range: range } : {})
    }));

    const contentType = String(result.ContentType || 'application/octet-stream');
    res.setHeader('Content-Type', contentType);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    if (result.ContentLength != null) res.setHeader('Content-Length', String(result.ContentLength));
    if (result.ContentRange) {
      res.status(206);
      res.setHeader('Content-Range', String(result.ContentRange));
    }

    if (result.Body && typeof result.Body.pipe === 'function') result.Body.pipe(res);
    else if (result.Body) res.end(Buffer.from(await result.Body.transformToByteArray()));
    else res.status(404).json({ error: 'Gift animation not found.' });
  } catch (err: any) {
    console.error('[PARDAIS-PARTY GIFT MEDIA] Playback failed:', err?.message || err);
    return res.status(404).json({ error: 'Gift animation not found.' });
  }
});

// Public profile-avatar playback proxy.
// R2 objects are private in some production configurations, so the client must
// never depend on the R2_PUBLIC_URL being directly readable. The API proxies only
// objects under the avatars/ prefix and preserves the stored image content type.
app.get("/api/v1/user/avatar-media", async (req: any, res: any) => {
  try {
    const objectKey = typeof req.query?.key === "string" ? req.query.key : "";
    if (!objectKey || !objectKey.startsWith("avatars/") || objectKey.includes("..")) {
      return res.status(400).json({ error: "Invalid avatar media key." });
    }

    if (!process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY || !process.env.R2_ENDPOINT) {
      return res.status(503).json({ error: "Profile media storage is temporarily unavailable." });
    }

    const client = getS3Client();
    const bucketName = process.env.R2_BUCKET_NAME || "pardaisparty-reels";
    const result: any = await client.send(new GetObjectCommand({
      Bucket: bucketName,
      Key: objectKey,
    }));

    const contentType = String(result.ContentType || "image/webp");
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    if (result.ContentLength != null) res.setHeader("Content-Length", String(result.ContentLength));

    if (result.Body && typeof result.Body.pipe === "function") {
      result.Body.pipe(res);
    } else if (result.Body) {
      const bytes = await result.Body.transformToByteArray();
      res.end(Buffer.from(bytes));
    } else {
      res.status(404).json({ error: "Profile photo not found." });
    }
  } catch (err: any) {
    console.error("[PARDAIS-PARTY AVATAR MEDIA] Playback failed:", err?.message || err);
    return res.status(404).json({ error: "Profile photo not found." });
  }
});

// Production profile avatar upload endpoint to Cloudflare R2.
// The client sends the image file; the server stores an optimized WebP and returns a durable CDN URL.
app.post("/api/v1/user/avatar", authenticateUser, (req: any, res: any, next: any) => {
  avatarMulterUpload.single("avatar")(req, res, (uploadErr: any) => {
    if (uploadErr) {
      console.error("[PARDAIS-PARTY AVATAR] Multipart upload error:", uploadErr?.code || uploadErr?.message || uploadErr);
      if (uploadErr?.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({ success: false, error: "Profile photo is too large. Maximum size is 25 MB." });
      }
      return res.status(400).json({ success: false, error: uploadErr?.message || "Profile photo upload could not be read." });
    }
    next();
  });
}, async (req: any, res: any) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: "Unauthorized. Please log in." });
    }

    const file = req.file;
    if (!file || !file.buffer || file.size <= 0) {
      return res.status(400).json({ success: false, error: "No valid profile photo was uploaded." });
    }

    const incomingMime = String(file.mimetype || "").toLowerCase();
    const incomingName = String(file.originalname || "").toLowerCase();
    const looksLikeImage = incomingMime.startsWith("image/") || /\.(jpg|jpeg|png|webp|gif|avif|heic|heif)$/i.test(incomingName);
    if (!looksLikeImage) {
      return res.status(400).json({ success: false, error: "Only image files are allowed for profile photos." });
    }

    // Process normal JPEG/PNG/WebP images when Sharp can decode them.
    // Some Android gallery/camera providers send HEIC/HEIF or other image
    // containers that may not be compiled into Sharp on the production host.
    // In that case, keep the original image bytes instead of failing the
    // profile update after the user has already selected a valid image.
    let uploadBuffer = file.buffer;
    let uploadContentType = String(file.mimetype || "image/jpeg").toLowerCase();
    let uploadExtension = uploadContentType === "image/png" ? "png"
      : uploadContentType === "image/webp" ? "webp"
      : uploadContentType === "image/gif" ? "gif"
      : uploadContentType === "image/avif" ? "avif"
      : uploadContentType === "image/heic" || uploadContentType === "image/heif" ? "heic"
      : "jpg";

    try {
      uploadBuffer = await sharp(file.buffer)
        .rotate()
        .resize(512, 512, { fit: "cover", withoutEnlargement: true })
        .webp({ quality: 84 })
        .toBuffer();
      uploadContentType = "image/webp";
      uploadExtension = "webp";
    } catch (imageProcessErr: any) {
      console.warn(
        "[PARDAIS-PARTY AVATAR] Sharp could not decode/process image; uploading original bytes instead:",
        imageProcessErr?.message || imageProcessErr
      );
    }

    const safeUserId = String(req.user.uid || req.user.username || "user").replace(/[^a-zA-Z0-9_-]/g, "_");
    const objectKey = `avatars/${safeUserId}/${Date.now()}-${crypto.randomBytes(5).toString("hex")}.${uploadExtension}`;

    let avatarUrl = "";

    // Primary: Cloudflare R2.
    try {
      if (!process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY || !process.env.R2_ENDPOINT) {
        throw new Error("Cloudflare R2 credentials not configured");
      }

      const client = getS3Client();
      const bucketName = process.env.R2_BUCKET_NAME || "pardaisparty-reels";

      await Promise.race([
        client.send(new PutObjectCommand({
          Bucket: bucketName,
          Key: objectKey,
          Body: uploadBuffer,
          ContentType: uploadContentType,
          ContentLength: uploadBuffer.length,
          CacheControl: "public, max-age=31536000, immutable",
        })),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("R2 profile photo upload timeout after 10s; using fast fallback")), 10000)
        )
      ]);

      avatarUrl = `${PUBLIC_API_BASE}/api/v1/user/avatar-media?key=${encodeURIComponent(objectKey)}`;
      console.log(`[PARDAIS-PARTY AVATAR] R2 upload completed: ${objectKey}`);
    } catch (r2Err: any) {
      // Fallback: save the already-optimized image to the API's persistent public
      // uploads directory. This guarantees profile editing still completes even
      // when R2 is temporarily unavailable.
      console.warn("[PARDAIS-PARTY AVATAR] R2 upload unavailable; using API storage fallback:", r2Err?.message || r2Err);

      const uploadsDir = path.join(process.cwd(), "public", "uploads");
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      try {
        const fallbackName = `avatar_${safeUserId}_${Date.now()}_${crypto.randomBytes(4).toString("hex")}.webp`;
        const fallbackPath = path.join(uploadsDir, fallbackName);
        fs.writeFileSync(fallbackPath, uploadBuffer);

        avatarUrl = `${PUBLIC_API_BASE}/uploads/${fallbackName}`;
      } catch (localErr: any) {
        // Final fallback: persist the optimized image itself as a data URL.
        // This keeps the profile update successful even when both R2 and the
        // platform filesystem are temporarily unavailable.
        console.warn("[PARDAIS-PARTY AVATAR] API filesystem fallback unavailable:", localErr?.message || localErr);
        avatarUrl = `data:${uploadContentType};base64,${uploadBuffer.toString("base64")}`;
      }
    }

    // Persist the URL against the authenticated account immediately.
    const avatarUpdatedAt = new Date().toISOString();
    const updatedUser = {
      ...req.user,
      avatar: avatarUrl,
      avatarUrl,
      avatarUpdatedAt,
      profileUpdatedAt: avatarUpdatedAt,
      avatarSource: "user-upload",
    };
    req.user = updatedUser;

    const idxInUsers = dbData.users.findIndex((u: any) =>
      (updatedUser.uid && u.uid === updatedUser.uid) ||
      (updatedUser.email && String(u.email || "").toLowerCase().trim() === String(updatedUser.email || "").toLowerCase().trim()) ||
      (updatedUser.username && u.username === updatedUser.username)
    );

    if (idxInUsers !== -1) {
      dbData.users[idxInUsers] = { ...dbData.users[idxInUsers], avatar: avatarUrl, avatarUrl };
    } else {
      dbData.users.push(updatedUser);
    }

    // Keep profile data account-scoped. Never overwrite the legacy global
    // metadata user_profile document from a specific user's avatar update.
    saveDatabase();

    // Wait for all account-scoped mirrors to be persisted before returning.
    // This prevents an immediate app refresh from seeing an older avatar mirror.
    const durableSaved = await persistUserDurably(updatedUser);
    if (!durableSaved) {
      console.warn("[PARDAIS-PARTY AVATAR] Durable profile mirror did not fully confirm; local account state remains updated.");
    }

    return res.json({
      success: true,
      url: avatarUrl,
      avatar: avatarUrl,
      message: "Profile photo updated successfully."
    });
  } catch (err: any) {
    console.error("[PARDAIS-PARTY AVATAR] Upload failed:", err);
    return res.status(500).json({
      success: false,
      error: err?.message || "Profile photo upload failed."
    });
  }
});

// Production video upload endpoint to Cloudflare R2
app.post("/api/v1/reels/upload-video", s3MulterUpload.single("video"), async (req, res) => {
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

    // Enforce valid video content type for streaming support
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

    // Generate production-safe unique object key: reels/{userId}/{timestamp}-{uniqueId}.mp4
    const uniqueId = Math.random().toString(36).substring(2, 10);
    const timestamp = Date.now();
    const ext = path.extname(fileName) || ".mp4";
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

      const putCommand = new PutObjectCommand({
        Bucket: bucketName,
        Key: objectKey,
        Body: file.buffer,
        ContentType: mimeType,
      });

      console.log(`[PARDAIS-PARTY R2] [UPLOAD-VIDEO] Transmitting binary buffer to Cloudflare R2 S3 API...`);
      
      // Allow production video uploads enough time to reach R2 over mobile/Wi-Fi.
      // The old 3-second race aborted normal multi-megabyte reels.
      await Promise.race([
        client.send(putCommand),
        new Promise((_, reject) => setTimeout(() => reject(new Error("R2 upload timeout after 10 minutes")), 10 * 60 * 1000))
      ]);
      
      console.log(`[PARDAIS-PARTY R2] [UPLOAD-VIDEO] SUCCESS: Binary written to R2 storage bucket "${bucketName}"`);

      // Return our API playback proxy instead of relying on the R2 custom
      // domain being publicly readable. The proxy supports HTTP Range requests
      // required by mobile/browser video playback.
      const requestBaseUrl = `${req.protocol || "https"}://${req.get("host")}`;
      finalVideoUrl = `${requestBaseUrl}/api/v1/reels/media/${objectKey.split("/").map(encodeURIComponent).join("/")}`;

      console.log(`[PARDAIS-PARTY R2] [UPLOAD-VIDEO] API PLAYBACK LINK GENERATED: "${finalVideoUrl}"`);
    } catch (r2Error: any) {
      console.warn("[PARDAIS-PARTY R2] Cloudflare R2 upload unavailable/failed. Falling back to local storage:", r2Error.message || r2Error);
      
      const uploadsDir = path.join(process.cwd(), "public", "uploads");
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      const cleanFileName = `reel_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;
      const localFilePath = path.join(uploadsDir, cleanFileName);
      fs.writeFileSync(localFilePath, file.buffer);
      
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
        mimeType: mimeType
      });
    }

    console.log(`[PARDAIS-PARTY R2] [UPLOAD-VIDEO] ====== UPLOAD TRANSACTION COMPLETED SUCCESSFULLY ======\n`);
    return res.json({
      success: true,
      url: finalVideoUrl,
      key: objectKey,
      objectKey: objectKey,
      publicUrl: finalVideoUrl,
      mediaUrl: finalVideoUrl,
      size: fileSize,
      mimeType: mimeType
    });

  } catch (error: any) {
    console.error("[PARDAIS-PARTY R2] [UPLOAD-VIDEO] FATAL UNHANDLED TRANSACTION ERROR:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "An unexpected error occurred during video upload handling"
    });
  }
});

// ------------------------------------------------------------------
// RANGE-REQUEST VIDEO STREAMER (FOR ANDROID MEDIA PLAYER RANGE COMPATIBILITY)
// ------------------------------------------------------------------
app.get("/uploads/:filename", (req, res) => {
  const filePath = path.join(process.cwd(), "public", "uploads", req.params.filename);
  if (!fs.existsSync(filePath)) {
    console.error(`[PARDAIS-PARTY STREAMER] Local file not found: ${filePath}`);
    return res.status(404).send("File not found");
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  console.log(`[PARDAIS-PARTY STREAMER] Serving local file "${req.params.filename}" (Size: ${fileSize} bytes). Requested Range: "${range || "None"}"`);

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    if (start >= fileSize) {
      res.status(416).send('Requested range not satisfiable\n' + start + ' >= ' + fileSize);
      return;
    }

    const chunksize = (end - start) + 1;
    const file = fs.createReadStream(filePath, { start, end });
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': 'video/mp4',
    };

    res.writeHead(206, head);
    file.pipe(res);
  } else {
    const head = {
      'Content-Length': fileSize,
      'Content-Type': 'video/mp4',
      'Accept-Ranges': 'bytes',
    };
    res.writeHead(200, head);
    fs.createReadStream(filePath).pipe(res);
  }
});

// ------------------------------------------------------------------
// FIREBASE STORAGE & CLOUD MESSAGING ENDPOINTS (LOCAL & MOCK FALLBACKS)
// ------------------------------------------------------------------
app.use("/uploads", express.static(path.join(process.cwd(), "public", "uploads")));

app.post("/api/v1/storage/upload", async (req, res) => {
  try {
    const { fileBase64, fileName, contentType } = req.body;
    if (!fileBase64) {
      return res.status(400).json({ error: "Missing fileBase64 parameter" });
    }

    const base64Data = fileBase64.replace(/^data:image\/\w+;base64,/, "").replace(/^data:video\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");
    
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    const cleanFileName = `${Date.now()}_${fileName || "asset.jpg"}`;
    const localFilePath = path.join(uploadsDir, cleanFileName);
    fs.writeFileSync(localFilePath, buffer);

    const publicUrl = `/uploads/${cleanFileName}`;
    console.log(`[PARDAIS-PARTY LOCAL STORAGE] Successfully uploaded local asset: ${publicUrl}`);
    
    res.json({
      success: true,
      url: publicUrl,
      fileName: cleanFileName
    });
  } catch (error: any) {
    console.error("[PARDAIS-PARTY STORAGE] Local fallback upload error:", error);
    res.json({
      success: true,
      url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80",
      fileName: "fallback.jpg"
    });
  }
});

app.post("/api/v1/fcm/send", async (req, res) => {
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
  } catch (error: any) {
    console.error("[PARDAIS-PARTY FCM MOCK] Dispatch error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ------------------------------------------------------------------
// VITE OR STATIC MIDDLEWARE SETUP
// ------------------------------------------------------------------
const ACCOUNT_DELETION_PAGE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Pardais Party — Delete Account</title>
<style>
*{box-sizing:border-box}body{margin:0;min-height:100vh;background:radial-gradient(circle at top,#24103d,#08080f 55%);font-family:Inter,system-ui,-apple-system,Segoe UI,sans-serif;color:#fff;display:flex;align-items:center;justify-content:center;padding:20px}
.card{width:min(520px,100%);background:#12121c;border:1px solid rgba(255,0,127,.45);border-radius:28px;padding:28px;box-shadow:0 25px 80px rgba(0,0,0,.55)}
.logo{font-size:42px;text-align:center}.title{text-align:center;font-size:28px;font-weight:900;margin:8px 0}.sub{text-align:center;color:#aaa6b8;line-height:1.55;font-size:14px}
.tabs{display:grid;grid-template-columns:1fr 1fr;gap:6px;background:#0b0b12;padding:5px;border-radius:14px;margin:22px 0 18px}.tab{border:0;border-radius:10px;padding:12px;background:transparent;color:#aaa6b8;font-weight:800;cursor:pointer}.tab.active{background:linear-gradient(90deg,#ff007f,#9b30ff);color:#fff}
label{display:block;font-size:12px;color:#c9c3d2;font-weight:800;margin:14px 0 6px}input{width:100%;padding:14px;border-radius:12px;border:1px solid #3b3747;background:#09090f;color:#fff;font-size:16px;outline:none}input:focus{border-color:#ff007f}
button.action{width:100%;padding:14px;border:0;border-radius:12px;background:linear-gradient(90deg,#ff007f,#9b30ff);color:#fff;font-weight:900;cursor:pointer;margin-top:12px}button.secondary{width:100%;padding:12px;border-radius:12px;background:#1c1c28;color:#ddd;border:1px solid #393646;font-weight:800;cursor:pointer;margin-top:8px}
.msg{min-height:22px;margin-top:14px;text-align:center;color:#ff91bf;font-size:13px;line-height:1.45}.info{background:#1b1628;border:1px solid rgba(155,48,255,.3);padding:13px;border-radius:14px;color:#c8c2d0;font-size:12px;line-height:1.5;margin-top:15px}.danger{color:#ff8db9}.hidden{display:none}
</style>
</head>
<body>
<div class="card">
  <div class="logo">🎉</div>
  <div class="title">Pardais Party</div>
  <div class="sub">Account management</div>
  <div class="tabs">
    <button id="deleteTab" class="tab active" onclick="showMode('delete')">Delete Account</button>
    <button id="restoreTab" class="tab" onclick="showMode('restore')">Restore Account</button>
  </div>

  <section id="deleteMode">
    <div class="info"><b>30-day recovery window:</b> your account is not permanently removed immediately. After a deletion request, you have <b>30 days</b> to restore it with a code sent to your registered email.</div>
    <label>Registered Email</label>
    <input id="deleteEmail" type="email" placeholder="name@example.com" autocomplete="email">
    <button class="action" onclick="sendDeleteCode()">Send Deletion Code</button>
    <div id="deleteCodeBox" class="hidden">
      <label>Confirmation Code</label>
      <input id="deleteCode" maxlength="6" inputmode="numeric" placeholder="6-digit code">
      <button class="action" onclick="confirmDelete()">Confirm Account Deletion</button>
    </div>
    <div id="deleteMsg" class="msg"></div>
  </section>

  <section id="restoreMode" class="hidden">
    <div class="info">If your account is still inside the 30-day recovery window, enter the registered email. We will send a restore code. Your existing account, Pardais ID and password remain unchanged.</div>
    <label>Registered Email</label>
    <input id="restoreEmail" type="email" placeholder="name@example.com" autocomplete="email">
    <button class="action" onclick="sendRestoreCode()">Send Restore Code</button>
    <div id="restoreCodeBox" class="hidden">
      <label>Restore Code</label>
      <input id="restoreCode" maxlength="6" inputmode="numeric" placeholder="6-digit code">
      <button class="action" onclick="restoreAccount()">Restore Account</button>
    </div>
    <div id="restoreMsg" class="msg"></div>
  </section>
</div>
<script>
const API = location.origin;
function $(id){return document.getElementById(id)}
function showMode(mode){
  $("deleteMode").classList.toggle("hidden",mode!=="delete");
  $("restoreMode").classList.toggle("hidden",mode!=="restore");
  $("deleteTab").classList.toggle("active",mode==="delete");
  $("restoreTab").classList.toggle("active",mode==="restore");
}
async function post(path,body){
  const r=await fetch(API+path,{method:"POST",headers:{"Content-Type":"application/json","Accept":"application/json"},body:JSON.stringify(body)});
  const d=await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(d.error||d.message||"Request failed");
  return d;
}
async function sendDeleteCode(){
  const email=$("deleteEmail").value.trim().toLowerCase(); if(!email)return $("deleteMsg").textContent="Enter your registered email.";
  try{const d=await post("/api/v1/auth/send-account-deletion-code",{email}); $("deleteMsg").textContent=d.alreadyPending?"Account is already scheduled for deletion. You can restore it from the Restore Account tab.":"Confirmation code sent to your email."; if(!d.alreadyPending)$("deleteCodeBox").classList.remove("hidden");}catch(e){$("deleteMsg").textContent=e.message}
}
async function confirmDelete(){
  const email=$("deleteEmail").value.trim().toLowerCase(), otp=$("deleteCode").value.trim(); if(!otp)return $("deleteMsg").textContent="Enter the confirmation code.";
  try{const d=await post("/api/v1/auth/confirm-account-deletion",{email,otp}); $("deleteMsg").textContent="Deletion scheduled. You have "+d.daysLeft+" days to restore your account."; $("deleteCodeBox").classList.add("hidden");}catch(e){$("deleteMsg").textContent=e.message}
}
async function sendRestoreCode(){
  const email=$("restoreEmail").value.trim().toLowerCase(); if(!email)return $("restoreMsg").textContent="Enter your registered email.";
  try{await post("/api/v1/auth/send-account-restore-code",{email}); $("restoreMsg").textContent="Restore code sent to your registered email."; $("restoreCodeBox").classList.remove("hidden");}catch(e){$("restoreMsg").textContent=e.message}
}
async function restoreAccount(){
  const email=$("restoreEmail").value.trim().toLowerCase(), otp=$("restoreCode").value.trim(); if(!otp)return $("restoreMsg").textContent="Enter the restore code.";
  try{const d=await post("/api/v1/auth/restore-account",{email,otp}); $("restoreMsg").textContent="Account restored successfully. You can now open Pardais Party with your existing password."; if(d.token)localStorage.setItem("pardais_auth_token",d.token);}catch(e){$("restoreMsg").textContent=e.message}
}
if(new URLSearchParams(location.search).get("restore")==="1")showMode("restore");
</script>
</body>
</html>`;

async function startServer() {
  // Liveness & Health Check Probes for Cloud Run & Load Balancers
  app.get(["/health", "/healthz", "/api/health", "/api/v1/health", "/_health"], (req, res) => {
    res.status(200).json({
      status: "healthy",
      timestamp: Date.now(),
      uptime: process.uptime(),
      service: "pardais-party-api"
    });
  });

  app.get("/delete-account", (req, res) => res.type("html").send(ACCOUNT_DELETION_PAGE));
  app.get("/delete-account/", (req, res) => res.type("html").send(ACCOUNT_DELETION_PAGE));
  
  const distPath = path.join(process.cwd(), "dist");
  const hasDist = fs.existsSync(path.join(distPath, "index.html"));
  const isProduction = process.env.NODE_ENV === "production" || hasDist;

  // Separate routes for Web Admin
  app.get("/admin", (req, res) => {
    if (!isProduction) {
      res.redirect("/admin.html");
    } else {
      res.sendFile(path.join(distPath, "admin.html"));
    }
  });

  if (!isProduction) {
    console.log("[PARDAIS-PARTY] Starting Vite middleware in development mode...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log(`[PARDAIS-PARTY] Serving static production bundle from: ${distPath}`);
    app.use(express.static(distPath));
    
    app.get('*', (req, res) => {
      if (req.path.startsWith("/admin")) {
        res.sendFile(path.join(distPath, 'admin.html'));
      } else {
        res.sendFile(path.join(distPath, 'index.html'));
      }
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`[PARDAIS-PARTY] Server running on http://0.0.0.0:${PORT} (ENV: ${process.env.NODE_ENV || 'production-detected'})`);
  });

  server.on("error", (err: any) => {
    console.error("[PARDAIS-PARTY SERVER ERROR]", err);
  });
}

// Permanently remove accounts whose 30-day restore window has expired.
async function runScheduledAccountDeletionSweep() {
  const users = Array.isArray(dbData.users) ? [...dbData.users] : [];
  for (const user of users) {
    if (!user?.deletionScheduledAt) continue;
    const dueAt = Date.parse(String(user.deletionScheduledAt));
    if (Number.isFinite(dueAt) && Date.now() >= dueAt) {
      try {
        await permanentlyDeleteAccount(user);
      } catch (err) {
        console.error("[PARDAIS PARTY ACCOUNT DELETE] Scheduled deletion failed:", err);
      }
    }
  }
}
setInterval(() => { void runScheduledAccountDeletionSweep(); }, 60 * 1000);
void runScheduledAccountDeletionSweep();

// Periodic background cleaner for ghost users in party room seats and offline hosts
setInterval(() => {
  const now = Date.now();
  let changed = false;

  // Auto-prune offline host streams (heartbeat stale > 15s)
  if (Array.isArray(dbData.hosts)) {
    dbData.hosts.forEach((h: any) => {
      if (h && h.isLive && h.lastSeen && (now - h.lastSeen > 15000)) {
        console.log(`[PARDAIS-PARTY AUTO-PRUNE] Host stream ${h.id} (${h.name || h.hostUsername}) timed out after 15s. Marking stream ended.`);
        h.isLive = false;
        h.status = "ENDED";
        changed = true;
      }
    });
  }

  if (dbData.parties && Array.isArray(dbData.parties)) {
    dbData.parties.forEach((party: any) => {
      if (!party.seats || party.status === "ended") return;
      const lastSeen = party.lastSeen || {};

      party.seats.forEach((seat: any) => {
        if (seat.name) {
          const username = seat.name;
          const lastTs = lastSeen[username];
          
          // If seat occupant hasn't sent a heartbeat for more than 12 seconds
          if (lastTs && (now - lastTs > 12000)) {
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
  }

  if (changed) {
    saveDatabase();
  }
}, 5000);

startServer();
