// Authorized Admin Email Accounts for Pardais Party Web Admin Portal
import { resolveApiUrl, getAuthToken } from "./lib/apiClient";

export const DEFAULT_ADMIN_EMAILS: string[] = [
  "pardaisliveofficial@gmail.com",
  "saifkhokhar657@gmail.com",
  "dark330angel@gmail.com",
  "pardaislive@gmail.com"
];

export const ALLOWED_ADMIN_EMAILS: string[] = DEFAULT_ADMIN_EMAILS;

function adminRequestHeaders(): Record<string, string> {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Get nominated admin emails stored in local memory / localStorage
export function getNominatedAdminEmails(): string[] {
  try {
    const raw = localStorage.getItem("pardais_nominated_admin_emails");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}
  return [];
}

// Get all allowed admin emails (defaults + nominated)
export function getAllowedAdminEmails(): string[] {
  const nominated = getNominatedAdminEmails();
  const set = new Set([
    ...DEFAULT_ADMIN_EMAILS.map((e) => e.toLowerCase().trim()),
    ...nominated.map((e) => e.toLowerCase().trim())
  ]);
  return Array.from(set);
}

// Save nominated list locally
export function setNominatedAdminEmailsLocally(emails: string[]): void {
  try {
    const cleaned = Array.from(new Set(emails.map((e) => e.toLowerCase().trim())));
    localStorage.setItem("pardais_nominated_admin_emails", JSON.stringify(cleaned));
  } catch (e) {}
}

/**
 * Checks if a user profile or email string belongs to an authorized Pardais Admin.
 */
export function isAuthorizedAdmin(
  userOrEmail?: { email?: string | null; isAdmin?: boolean; role?: string } | string | null
): boolean {
  if (!userOrEmail) return false;

  let emailToCheck = "";
  if (typeof userOrEmail === "string") {
    emailToCheck = userOrEmail;
  } else if (typeof userOrEmail === "object" && userOrEmail !== null) {
    emailToCheck = userOrEmail.email || "";
  }

  if (!emailToCheck) return false;

  const normalized = emailToCheck.toLowerCase().trim();
  const allowed = getAllowedAdminEmails();
  return allowed.includes(normalized);
}

// Fetch nominated emails from backend server & sync to localStorage
export async function syncNominatedAdminEmails(): Promise<string[]> {
  try {
    const res = await fetch(resolveApiUrl("/api/v1/admin-emails"), { headers: adminRequestHeaders() });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        setNominatedAdminEmailsLocally(data);
        return getAllowedAdminEmails();
      }
    }
  } catch (e) {
    console.warn("Error syncing nominated admin emails:", e);
  }
  return getAllowedAdminEmails();
}

// Nominate a new email as Admin
export async function addNominatedAdminEmail(email: string): Promise<{ success: boolean; list: string[]; error?: string }> {
  const cleaned = email.toLowerCase().trim();
  if (!cleaned || !cleaned.includes("@")) {
    return { success: false, list: getAllowedAdminEmails(), error: "Invalid email format" };
  }

  try {
    const res = await fetch(resolveApiUrl("/api/v1/admin-emails"), {
      method: "POST",
      headers: { "Content-Type": "application/json", ...adminRequestHeaders() },
      body: JSON.stringify({ email: cleaned })
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        setNominatedAdminEmailsLocally(data);
        return { success: true, list: getAllowedAdminEmails() };
      }
    }
  } catch (e) {
    console.warn("Server sync error, fallback local nomination:", e);
  }

  // Local fallback
  const current = getNominatedAdminEmails();
  if (!current.includes(cleaned)) {
    current.push(cleaned);
    setNominatedAdminEmailsLocally(current);
  }
  return { success: true, list: getAllowedAdminEmails() };
}

// Remove a nominated admin email
export async function removeNominatedAdminEmail(email: string): Promise<{ success: boolean; list: string[] }> {
  const cleaned = email.toLowerCase().trim();

  try {
    const res = await fetch(resolveApiUrl(`/api/v1/admin-emails/${encodeURIComponent(cleaned)}`), {
      method: "DELETE",
      headers: adminRequestHeaders()
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        setNominatedAdminEmailsLocally(data);
        return { success: true, list: getAllowedAdminEmails() };
      }
    }
  } catch (e) {
    console.warn("Server deletion error, fallback local removal:", e);
  }

  // Local fallback
  const current = getNominatedAdminEmails().filter((e) => e !== cleaned);
  setNominatedAdminEmailsLocally(current);
  return { success: true, list: getAllowedAdminEmails() };
}
