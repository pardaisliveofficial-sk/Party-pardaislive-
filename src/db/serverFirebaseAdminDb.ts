import { initializeApp as initializeAdminApp, getApps as getAdminApps, cert, applicationDefault } from "firebase-admin/app";
import { getFirestore as getAdminFirestore } from "firebase-admin/firestore";
import { sanitizeForFirestore } from "./firebaseDb";

let adminDb: any = null;
let adminInitAttempted = false;

function getServiceAccountFromEnv(): any | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  if (raw?.trim()) {
    try { return JSON.parse(raw); } catch (err: any) {
      console.error("[PARDAIS-PARTY FIREBASE] Invalid FIREBASE_SERVICE_ACCOUNT_JSON:", err?.message || err);
    }
  }

  const encoded = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64?.trim();
  if (encoded) {
    try { return JSON.parse(Buffer.from(encoded, "base64").toString("utf8")); } catch (err: any) {
      console.error("[PARDAIS-PARTY FIREBASE] Invalid FIREBASE_SERVICE_ACCOUNT_BASE64:", err?.message || err);
    }
  }

  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;
  if (clientEmail && privateKeyRaw) {
    return {
      project_id: process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || "pardais-party-production",
      client_email: clientEmail,
      private_key: privateKeyRaw.replace(/\\n/g, "\n")
    };
  }

  return null;
}

function ensureRailwayAdminFirestore(): any | null {
  if (adminDb) return adminDb;

  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || "pardais-party-production";
  try {
    let adminApp: any;
    const existingApps = getAdminApps();
    if (existingApps.length > 0) {
      adminApp = existingApps[0];
    } else {
      const serviceAccount = getServiceAccountFromEnv();
      if (serviceAccount) {
        adminApp = initializeAdminApp({
          credential: cert(serviceAccount),
          projectId: serviceAccount.project_id || projectId
        });
      } else {
        adminApp = initializeAdminApp({ credential: applicationDefault(), projectId });
      }
    }
    adminDb = getAdminFirestore(adminApp);
    if (!adminInitAttempted) {
      console.log("[PARDAIS-PARTY FIREBASE] Railway Firebase Admin Firestore initialized.");
    }
    adminInitAttempted = true;
    return adminDb;
  } catch (err: any) {
    adminInitAttempted = true;
    adminDb = null;
    console.error("[PARDAIS-PARTY FIREBASE] Firebase Admin unavailable on Railway:", err?.message || err);
    console.error("[PARDAIS-PARTY FIREBASE] Configure FIREBASE_SERVICE_ACCOUNT_JSON (or BASE64 / CLIENT_EMAIL + PRIVATE_KEY) in Railway Variables.");
    return null;
  }
}

function handleAdminError(err: any, operation: string) {
  console.error(`[PARDAIS-PARTY FIREBASE] Admin Firestore error during ${operation}:`, err?.message || err);
}

export async function getPersistedSession(token: string): Promise<any | null> {
  const db = ensureRailwayAdminFirestore();
  if (!token || !db) return null;
  try {
    const snap = await db.collection("sessions").doc(String(token)).get();
    return snap.exists ? snap.data() : null;
  } catch (err) { handleAdminError(err, "auth session lookup"); return null; }
}

export async function persistAuthChallenge(key: string, data: any): Promise<boolean> {
  const db = ensureRailwayAdminFirestore();
  if (!key || !db) return false;
  try {
    await db.collection("authChallenges").doc(String(key)).set(sanitizeForFirestore(data), { merge: true });
    return true;
  } catch (err) { handleAdminError(err, `persist auth challenge ${key}`); return false; }
}

export async function getPersistedAuthChallenge(key: string): Promise<any | null> {
  const db = ensureRailwayAdminFirestore();
  if (!key || !db) return null;
  try {
    const snap = await db.collection("authChallenges").doc(String(key)).get();
    return snap.exists ? snap.data() : null;
  } catch (err) { handleAdminError(err, `get auth challenge ${key}`); return null; }
}

export async function deletePersistedAuthChallenge(key: string): Promise<void> {
  const db = ensureRailwayAdminFirestore();
  if (!key || !db) return;
  try { await db.collection("authChallenges").doc(String(key)).delete(); }
  catch (err) { handleAdminError(err, `delete auth challenge ${key}`); }
}

export async function getPersistedUserForSession(session: any): Promise<any | null> {
  const db = ensureRailwayAdminFirestore();
  if (!session || !db) return null;
  const candidates: any[] = [];
  try {
    if (session.uid) {
      const snap = await db.collection("users").doc(`uid_${session.uid}`).get();
      if (snap.exists) candidates.push(snap.data());
    }
    if (session.email) {
      const emailKey = String(session.email).toLowerCase().trim().replace(/[^a-zA-Z0-9]/g, "_");
      const snap = await db.collection("users").doc(`email_${emailKey}`).get();
      if (snap.exists) candidates.push(snap.data());
    }
    if (session.username) {
      const snap = await db.collection("users").doc(String(session.username)).get();
      if (snap.exists) candidates.push(snap.data());
    }
  } catch (err) {
    handleAdminError(err, "auth user/session restore lookup");
    return null;
  }
  return candidates.find((u: any) => session.uid && u?.uid === session.uid)
    || candidates.find((u: any) => session.email && String(u?.email || "").toLowerCase().trim() === String(session.email).toLowerCase().trim())
    || candidates.find((u: any) => session.username && u?.username === session.username)
    || null;
}

export async function getPersistedUserForEmail(email: string): Promise<any | null> {
  const db = ensureRailwayAdminFirestore();
  const cleanEmail = String(email || "").toLowerCase().trim();
  if (!cleanEmail || !db) return null;
  const emailKey = cleanEmail.replace(/[^a-zA-Z0-9]/g, "_");
  try {
    const registrySnap = await db.collection("emailRegistry").doc(emailKey).get();
    if (registrySnap.exists) {
      const registry = registrySnap.data() || {};
      if (registry.uid) {
        const uidSnap = await db.collection("users").doc(`uid_${registry.uid}`).get();
        if (uidSnap.exists) return uidSnap.data();
      }
    }
    const emailSnap = await db.collection("users").doc(`email_${emailKey}`).get();
    return emailSnap.exists ? emailSnap.data() : null;
  } catch (err) { handleAdminError(err, "auth email account lookup"); return null; }
}

export async function getPersistedEmailRegistry(email: string): Promise<any | null> {
  const db = ensureRailwayAdminFirestore();
  const cleanEmail = String(email || "").toLowerCase().trim();
  if (!cleanEmail || !db) return null;
  const emailKey = cleanEmail.replace(/[^a-zA-Z0-9]/g, "_");
  try {
    const snap = await db.collection("emailRegistry").doc(emailKey).get();
    return snap.exists ? snap.data() : null;
  } catch (err) { handleAdminError(err, `get email registry ${emailKey}`); return null; }
}

export async function persistEmailRegistry(email: string, user: any): Promise<boolean> {
  const db = ensureRailwayAdminFirestore();
  const cleanEmail = String(email || "").toLowerCase().trim();
  if (!cleanEmail || !user?.uid || !db) return false;
  const emailKey = cleanEmail.replace(/[^a-zA-Z0-9]/g, "_");
  try {
    const registryRef = db.collection("emailRegistry").doc(emailKey);
    await db.runTransaction(async (tx: any) => {
      const existing = await tx.get(registryRef);
      if (existing.exists) {
        const current = existing.data() || {};
        if (String(current.uid || "") !== String(user.uid)) throw new Error("EMAIL_ALREADY_REGISTERED");
      } else {
        tx.set(registryRef, sanitizeForFirestore({
          uid: user.uid, email: cleanEmail, username: user.username || "", uniqueId: user.uniqueId || "",
          registeredAt: user.registrationCompletedAt || user.registeredAt || new Date().toISOString(), locked: true
        }), { merge: true });
      }
    });
    return true;
  } catch (err) { handleAdminError(err, `persist email registry ${emailKey}`); return false; }
}

export async function syncDocument(collectionName: string, docId: string, data: any): Promise<boolean> {
  const db = ensureRailwayAdminFirestore();
  if (!docId || !db) return false;
  try {
    await db.collection(collectionName).doc(String(docId)).set(sanitizeForFirestore(data), { merge: true });
    return true;
  } catch (err) { handleAdminError(err, `syncDocument ${collectionName}/${docId}`); return false; }
}

export async function deleteDocument(collectionName: string, docId: string): Promise<void> {
  const db = ensureRailwayAdminFirestore();
  if (!docId || !db) return;
  try { await db.collection(collectionName).doc(String(docId)).delete(); }
  catch (err) { handleAdminError(err, `deleteDocument ${collectionName}/${docId}`); }
}
