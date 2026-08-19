// Shared Authenticated API Client for Pardais Party Application
// Manages API URL resolution, Authorization headers, session refresh, and request retry

export const PRODUCTION_API_BASE = "https://api.pardaisparty.soulverseapps.com";

export const isCapacitorOrAndroid = (): boolean => {
  if (typeof window === "undefined") return false;

  // Explicit Capacitor object check
  if ((window as any).Capacitor || (window as any).CapacitorNative) return true;

  const loc = window.location;
  if (!loc) return false;

  // File or capacitor scheme
  if (loc.protocol === "file:" || loc.protocol.includes("capacitor") || loc.origin === "null") {
    return true;
  }

  const ua = (navigator.userAgent || "").toLowerCase();
  const isAndroidUA = ua.includes("android") || ua.includes("capacitor") || ua.includes("wv");

  // If running on a web domain (e.g. *.run.app or *.soulverseapps.com or custom web domain), it is Web environment
  const host = (loc.hostname || "").toLowerCase();
  const isWebDomain = host.includes("run.app") || host.includes("soulverseapps.com") || host.includes("github.io");

  if (isWebDomain) {
    return false;
  }

  // If running on localhost / 127.0.0.1 in an Android UserAgent or Capacitor context, it is APK
  if (isAndroidUA || host === "localhost" || host === "127.0.0.1" || !host) {
    return true;
  }

  return false;
};

export const resolveApiUrl = (path: string): string => {
  if (!path) {
    return isCapacitorOrAndroid() ? PRODUCTION_API_BASE : "";
  }
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  const cleanPath = path.startsWith("/") ? path : `/${path}`;

  // In Android APK / Capacitor environment, route to central production API base
  if (isCapacitorOrAndroid()) {
    const envApiUrl = (import.meta as any).env?.VITE_API_URL;
    const base = typeof envApiUrl === "string" && envApiUrl.trim()
      ? envApiUrl.trim().replace(/\/+$/, "")
      : PRODUCTION_API_BASE;
    return `${base}${cleanPath}`;
  }

  // In Web environment, prioritize VITE_API_URL if explicitly provided, else use relative /api routes on the same host
  const envApiUrl = (import.meta as any).env?.VITE_API_URL;
  if (typeof envApiUrl === "string" && envApiUrl.trim()) {
    const base = envApiUrl.trim().replace(/\/+$/, "");
    return `${base}${cleanPath}`;
  }
  return cleanPath;
};

// Global fetch interceptor to guarantee relative API requests resolve to production API base on Android APK
if (typeof window !== "undefined" && !(window as any).__pardais_fetch_patched) {
  (window as any).__pardais_fetch_patched = true;

  try {
    const originalFetch = window.fetch ? window.fetch.bind(window) : globalThis.fetch.bind(globalThis);

    const customFetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
      let urlString = "";
      if (typeof input === "string") {
        urlString = input;
      } else if (input instanceof URL) {
        urlString = input.toString();
      } else if (input && typeof input === "object" && "url" in input) {
        urlString = (input as Request).url;
      }

      if (urlString && (urlString.startsWith("/api/") || urlString.startsWith("api/"))) {
        const resolved = resolveApiUrl(urlString);
        if (typeof input === "string") {
          input = resolved;
        } else if (input instanceof URL) {
          input = new URL(resolved);
        } else if (input && typeof input === "object" && "url" in input) {
          input = new Request(resolved, input as RequestInit);
        }
      }

      return originalFetch(input, init);
    };

    // Check if property descriptor allows redefinition before attempting
    let desc: PropertyDescriptor | undefined;
    let targetObj: any = window;
    while (targetObj) {
      desc = Object.getOwnPropertyDescriptor(targetObj, "fetch");
      if (desc) break;
      targetObj = Object.getPrototypeOf(targetObj);
    }

    if (!desc || desc.configurable !== false) {
      Object.defineProperty(window, "fetch", {
        value: customFetch,
        writable: true,
        configurable: true,
        enumerable: true,
      });
    }
  } catch (err) {
    console.warn("[PARDAIS API] Global fetch patching skipped:", err);
  }
}

export const getAuthToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("pardais_auth_token");
};

export const setAuthToken = (token: string): void => {
  if (typeof window === "undefined") return;
  localStorage.setItem("pardais_auth_token", token);
};

export const removeAuthToken = (): void => {
  if (typeof window === "undefined") return;
  localStorage.removeItem("pardais_auth_token");
};

// Refresh the server session when the local token is missing/expired.
// This uses the native browser fetch deliberately so it never recurses through
// authenticatedFetch while trying to repair authentication. The server refresh
// endpoint resolves the existing account by uid/username and returns a fresh
// session token that survives Railway restarts.
export const refreshSession = async (): Promise<string | null> => {
  if (typeof window === "undefined") return null;

  const existingToken = getAuthToken();
  const savedRaw = localStorage.getItem("pardais_user_profile");
  if (!savedRaw) return existingToken;

  let saved: any = null;
  try { saved = JSON.parse(savedRaw); } catch { saved = null; }
  if (!saved?.uid && !saved?.username) return existingToken;

  try {
    const deviceId = localStorage.getItem("pardais_device_id") || "";
    const response = await window.fetch(resolveApiUrl("/api/v1/auth/refresh-session"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        uid: saved.uid || "",
        username: saved.username || "",
        fullName: saved.fullName || "Pardais Member",
        email: saved.email || "",
        deviceId
      })
    });

    const data = await response.json().catch(() => ({}));
    if (response.ok && data?.token) {
      setAuthToken(String(data.token));
      if (data.user) {
        localStorage.setItem("pardais_user_profile", JSON.stringify(data.user));
      }
      localStorage.setItem("pardais_is_logged_in", "true");
      return String(data.token);
    }
  } catch (err) {
    console.warn("[PARDAIS-PARTY API CLIENT] Session refresh failed:", err);
  }

  return existingToken || null;
};

// Shared Authenticated Fetch wrapper
export const authenticatedFetch = async (
  input: RequestInfo | URL, 
  init?: RequestInit,
  userInfoForRefresh?: { username?: string; uid?: string },
  retryCount = 0
): Promise<Response> => {
  let targetUrl: string;
  if (typeof input === "string") {
    targetUrl = resolveApiUrl(input);
  } else if (input instanceof URL) {
    targetUrl = input.toString();
  } else {
    targetUrl = resolveApiUrl((input as Request).url);
  }

  let token = getAuthToken();
  if (!token && retryCount === 0) {
    token = await refreshSession();
  }
  let headers: HeadersInit = init?.headers ? { ...init.headers } : {};

  if (token) {
    if (headers instanceof Headers) {
      headers.set("Authorization", `Bearer ${token}`);
    } else if (Array.isArray(headers)) {
      const authIdx = headers.findIndex(h => h[0].toLowerCase() === "authorization");
      if (authIdx !== -1) {
        headers[authIdx] = ["Authorization", `Bearer ${token}`];
      } else {
        headers.push(["Authorization", `Bearer ${token}`]);
      }
    } else {
      (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
    }
  }

  try {
    const response = await window.fetch(targetUrl, { ...init, headers });

    // Handle 401 Session Expired -> Try single session refresh if retryCount === 0
    if (response.status === 401 && retryCount === 0) {
      console.warn("[PARDAIS-PARTY API CLIENT] 401 Unauthorized received. Attempting session refresh...");
      const newToken = await refreshSession();
      if (newToken) {
        // Retry once with refreshed token
        return authenticatedFetch(input, init, userInfoForRefresh, 1);
      }
    }

    return response;
  } catch (err) {
    // Return a synthetic offline/error response instead of letting fetch throw unhandled network exception
    return new Response(JSON.stringify({ error: "Network fetch failed", details: String(err) }), {
      status: 503,
      statusText: "Service Unavailable",
      headers: { "Content-Type": "application/json" }
    });
  }
};


// ------------------------------------------------------------------
// Pardais Party persistent email authentication helpers
// ------------------------------------------------------------------
export async function emailStatus(email: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 9000);
  try {
    const res = await fetch(resolveApiUrl("/api/v1/auth/email-status"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
      signal: controller.signal
    });
    return await res.json().catch(() => ({ success: false }));
  } catch (err: any) {
    if (err?.name === "AbortError") return { success: false, exists: false, timedOut: true };
    return { success: false, exists: false };
  } finally {
    clearTimeout(timeout);
  }
}

export async function sendEmailOtp(email: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);
  try {
    const res = await fetch(resolveApiUrl("/api/v1/auth/send-email-otp"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
      signal: controller.signal
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { success: false, error: data?.error || `Verification request failed (HTTP ${res.status}).`, code: data?.code };
    return data;
  } catch (err: any) {
    if (err?.name === "AbortError") return { success: false, error: "Verification request timed out. Please try again." };
    return { success: false, error: "Could not reach the verification service. Please try again." };
  } finally {
    clearTimeout(timeout);
  }
}

export async function verifyEmailOtp(email: string, otp: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);
  try {
    const res = await fetch(resolveApiUrl("/api/v1/auth/verify-email-otp"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim().toLowerCase(), otp: otp.trim() }),
      signal: controller.signal
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { success: false, error: data?.error || `Verification failed (HTTP ${res.status}).`, code: data?.code };
    return data;
  } catch (err: any) {
    if (err?.name === "AbortError") return { success: false, error: "Verification is taking too long. Please try again.", code: "VERIFY_TIMEOUT" };
    return { success: false, error: "Could not reach the verification service. Please try again.", code: "NETWORK_ERROR" };
  } finally {
    clearTimeout(timeout);
  }
}

export async function emailPasswordLogin(email: string, password: string) {
  const res = await fetch(resolveApiUrl("/api/v1/auth/password-login"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  return res.json();
}

export async function createEmailPassword(token: string, password: string) {
  const res = await fetch(resolveApiUrl("/api/v1/auth/set-password"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({ password })
  });
  return res.json();
}

export async function requestPasswordReset(email: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetch(resolveApiUrl("/api/v1/auth/forgot-password"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
      signal: controller.signal
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { success: false, error: data?.error || `Recovery request failed (HTTP ${res.status}).`, code: data?.code };
    return data;
  } catch (err: any) {
    if (err?.name === "AbortError") return { success: false, error: "Recovery service timed out. Please try again.", code: "RECOVERY_TIMEOUT" };
    return { success: false, error: "Could not reach the recovery service. Please try again.", code: "NETWORK_ERROR" };
  } finally {
    clearTimeout(timeout);
  }
}

export async function resetEmailPassword(email: string, otp: string, password: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetch(resolveApiUrl("/api/v1/auth/reset-password"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim().toLowerCase(), otp: otp.trim(), password }),
      signal: controller.signal
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { success: false, error: data?.error || `Password reset failed (HTTP ${res.status}).`, code: data?.code };
    return data;
  } catch (err: any) {
    if (err?.name === "AbortError") return { success: false, error: "Password reset is taking too long. Please try again.", code: "RESET_TIMEOUT" };
    return { success: false, error: "Could not reach the recovery service. Please try again.", code: "NETWORK_ERROR" };
  } finally {
    clearTimeout(timeout);
  }
}
