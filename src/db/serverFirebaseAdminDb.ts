import { initializeApp as initializeAdminApp, getApps as getAdminApps, cert, applicationDefault } from "firebase-admin/app";
import { getFirestore as getAdminFirestore } from "firebase-admin/firestore";
import { sanitizeForFirestore } from "./firebaseDb";

let adminDb: any = null;

function initRailwayAdminFirestore() {
  try {
    const projectId = process.env.FIREBASE_PROJECT_ID || "pardais-party-production";
    const rawJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
    let adminApp: any;
    if (getAdminApps().length > 0) {
      adminApp = getAdminApps()[0];
    } else if (rawJson) {
      const serviceAccount = JSON.parse(rawJson);
      adminApp = initializeAdminApp({ credential: cert(serviceAccount), projectId: serviceAccount.project_id || projectId });
    } else {
      adminApp = initializeAdminApp({ credential: applicationDefault(), projectId });
    }
    adminDb = getAdminFirestore(adminApp);
    console.log("[PARDAIS-PARTY FIREBASE] Railway Firebase Admin Firestore initialized.");
  } catch (err: any) {
    adminDb = null;
    console.error("[PARDAIS-PARTY FIREBASE] Firebase Admin unavailable on Railway:", err?.message || err);
    console.error("[PARDAIS-PARTY FIREBASE] Set FIREBASE_SERVICE_ACCOUNT_JSON in Railway Variables.");
  }
}

initRailwayAdminFirestore();

function handleAdminError(err: any, operation: string) {
  console.error(`[PARDAIS-PARTY FIREBASE] Admin Firestore error during ${operation}:`, err?.message || err);
}

export async function getPersistedSession(token: string): Promise<any | null> {
  if (!token || !adminDb) return null;
  try {
    const snap = await adminDb.collection("sessions").doc(String(token)).get();
    return snap.exists ? snap.data() : null;
  } catch (err) { handleAdminError(err, "auth session lookup"); return null; }
}

export async function persistAuthChallenge(key: string, data: any): Promise<boolean> {
  if (!key || !adminDb) return false;
  try {
    await adminDb.collection("authChallenges").doc(String(key)).set(sanitizeForFirestore(data), { merge: true });
    return true;
  } catch (err) { handleAdminError(err, `persist auth challenge ${key}`); return false; }
}

export async function getPersistedAuthChallenge(key: string): Promise<any | null> {
  if (!key || !adminDb) return null;
  try {
    const snap = await adminDb.collection("authChallenges").doc(String(key)).get();
    return snap.exists ? snap.data() : null;
  } catch (err) { handleAdminError(err, `get auth challenge ${key}`); return null; }
}

export async function deletePersistedAuthChallenge(key: string): Promise<void> {
  if (!key || !adminDb) return;
  try { await adminDb.collection("authChallenges").doc(String(key)).delete(); }
  catch (err) { handleAdminError(err, `delete auth challenge ${key}`); }
}

export async function getPersistedUserForEmail(email: string): Promise<any | null> {
  const cleanEmail = String(email || "").toLowerCase().trim();
  if (!cleanEmail || !adminDb) return null;
  const emailKey = cleanEmail.replace(/[^a-zA-Z0-9]/g, "_");
  try {
    const registrySnap = await adminDb.collection("emailRegistry").doc(emailKey).get();
    if (registrySnap.exists) {
      const registry = registrySnap.data() || {};
      if (registry.uid) {
        const uidSnap = await adminDb.collection("users").doc(`uid_${registry.uid}`).get();
        if (uidSnap.exists) return uidSnap.data();
      }
    }
    const emailSnap = await adminDb.collection("users").doc(`email_${emailKey}`).get();
    return emailSnap.exists ? emailSnap.data() : null;
  } catch (err) { handleAdminError(err, "auth email account lookup"); return null; }
}

export async function getPersistedEmailRegistry(email: string): Promise<any | null> {
  const cleanEmail = String(email || "").toLowerCase().trim();
  if (!cleanEmail || !adminDb) return null;
  const emailKey = cleanEmail.replace(/[^a-zA-Z0-9]/g, "_");
  try {
    const snap = await adminDb.collection("emailRegistry").doc(emailKey).get();
    return snap.exists ? snap.data() : null;
  } catch (err) { handleAdminError(err, `get email registry ${emailKey}`); return null; }
}

export async function persistEmailRegistry(email: string, user: any): Promise<boolean> {
  const cleanEmail = String(email || "").toLowerCase().trim();
  if (!cleanEmail || !user?.uid || !adminDb) return false;
  const emailKey = cleanEmail.replace(/[^a-zA-Z0-9]/g, "_");
  try {
    const registryRef = adminDb.collection("emailRegistry").doc(emailKey);
    await adminDb.runTransaction(async (tx: any) => {
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
  if (!docId || !adminDb) return false;
  try {
    await adminDb.collection(collectionName).doc(String(docId)).set(sanitizeForFirestore(data), { merge: true });
    return true;
  } catch (err) { handleAdminError(err, `syncDocument ${collectionName}/${docId}`); return false; }
}

export async function deleteDocument(collectionName: string, docId: string): Promise<void> {
  if (!docId || !adminDb) return;
  try { await adminDb.collection(collectionName).doc(String(docId)).delete(); }
  catch (err) { handleAdminError(err, `deleteDocument ${collectionName}/${docId}`); }
}
