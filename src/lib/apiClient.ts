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
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  const cleanPath = path.startsWith("/") ? path : `/${path}`;

  // Capacitor native builds MUST use the production API. A relative /api URL
  // points at the WebView origin (for example https://localhost) inside the APK
  // instead of the Railway API, which makes email OTP/recovery fail only in APK.
  if (typeof window !== "undefined") {
    const loc = window.location;
    const cap = (window as any).Capacitor;
    const nativeCapacitor = !!cap && (
      cap.isNativePlatform?.() === true ||
      cap.getPlatform?.() === "android" ||
      cap.getPlatform?.() === "ios"
    );
    const nativeProtocol = !!loc && (
      loc.protocol === "file:" ||
      loc.protocol.includes("capacitor") ||
      loc.origin === "null"
    );
    const nativeLocalhost = !!loc && (loc.hostname === "localhost" || loc.hostname === "127.0.0.1");

    if (nativeCapacitor || nativeProtocol || nativeLocalhost) {
      return `${PRODUCTION_API_BASE}${cleanPath}`;
    }
  }

  // Web builds may override the API base through VITE_API_URL.
  const envApiUrl = (import.meta as any).env?.VITE_API_URL;
  if (typeof envApiUrl === "string" && envApiUrl.trim()) {
    return `${envApiUrl.trim().replace(/\/+$/, "")}${cleanPath}`;
  }

  // In standard web browser environments (AI Studio dev/preview, localhost, cloud run, etc.), use the relative path
  return cleanPath;
};

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
// Pardais Party resilient authentication helpers
// ------------------------------------------------------------------
export async function safeAuthFetch(path: string, options: RequestInit = {}): Promise<{ ok: boolean; status: number; data: any }> {
  const primaryUrl = resolveApiUrl(path);
  const fallbackUrl = path.startsWith("/") ? path : `/${path}`;

  const executeFetch = async (url: string) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const res = await window.fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(timeout);
      const data = await res.json().catch(() => ({}));
      return { ok: res.ok, status: res.status, data };
    } catch (err: any) {
      clearTimeout(timeout);
      throw err;
    }
  };

  try {
    return await executeFetch(primaryUrl);
  } catch (primaryErr: any) {
    if (primaryUrl !== fallbackUrl) {
      try {
        console.warn(`[PARDAIS AUTH] Primary url ${primaryUrl} failed, falling back to relative ${fallbackUrl}...`);
        return await executeFetch(fallbackUrl);
      } catch (fallbackErr: any) {
        console.warn("[PARDAIS AUTH] Fallback url also failed:", fallbackErr);
      }
    }
    const isTimeout = primaryErr?.name === "AbortError";
    const msg = isTimeout 
      ? "Request timed out. Please check your network and try again." 
      : "Could not reach the server. Please check your network connection.";
    return {
      ok: false,
      status: 0,
      data: { success: false, error: msg, code: isTimeout ? "TIMEOUT" : "NETWORK_ERROR" }
    };
  }
}

export async function emailStatus(email: string) {
  const { data } = await safeAuthFetch("/api/v1/auth/email-status", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: email.trim().toLowerCase() })
  });
  return data || { success: false, exists: false };
}

export async function sendEmailOtp(email: string) {
  const cleanEmail = email.trim().toLowerCase();
  const { ok, data } = await safeAuthFetch("/api/v1/auth/send-email-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: cleanEmail })
  });
  if (!ok || !data?.success) {
    const err: any = new Error(data?.error || "Could not send verification code. Please try again.");
    err.code = data?.code;
    throw err;
  }
  return data;
}

export async function verifyEmailOtp(email: string, otp: string) {
  const cleanEmail = email.trim().toLowerCase();
  const cleanOtp = otp.trim().replace(/\D/g, "");
  const { ok, data } = await safeAuthFetch("/api/v1/auth/verify-email-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: cleanEmail, otp: cleanOtp })
  });
  if (!ok || !data?.success || !data?.token) {
    const err: any = new Error(data?.error || "Invalid or expired verification code.");
    err.code = data?.code;
    throw err;
  }
  return data;
}

export async function createAccount(params: {
  fullName: string;
  username: string;
  password: string;
  gender?: string;
  avatar?: string;
  email?: string;
  verificationToken: string;
}) {
  const token = params.verificationToken;
  const { ok, data } = await safeAuthFetch("/api/v1/auth/create-account", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify(params)
  });

  if (!ok || !data?.success || !data?.user) {
    if (data?.code === "USERNAME_TAKEN") {
      throw new Error("This username is already taken. Please choose another username.");
    }
    throw new Error(data?.error || "Account creation failed. Please try again.");
  }
  return data;
}

export async function emailPasswordLogin(identifier: string, password: string) {
  const cleanIdentifier = identifier.trim();
  const { ok, data } = await safeAuthFetch("/api/v1/auth/password-login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier: cleanIdentifier, password })
  });
  if (!ok || !data?.success || !data?.token || !data?.user) {
    if (data?.code === "PASSWORD_NOT_SET") {
      throw new Error("This account does not have a password set. Use Forgot Password to set one.");
    }
    if (data?.code === "ACCOUNT_NOT_FOUND") {
      throw new Error("No account found for this email/username. Please sign up first.");
    }
    throw new Error(data?.error || "Incorrect email/username or password.");
  }
  return data;
}

export async function createEmailPassword(token: string, password: string) {
  const { ok, data } = await safeAuthFetch("/api/v1/auth/set-password", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({ password })
  });
  return data;
}

export async function requestPasswordReset(email: string) {
  const cleanEmail = email.trim().toLowerCase();
  const { ok, data } = await safeAuthFetch("/api/v1/auth/forgot-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: cleanEmail })
  });
  if (!ok || !data?.success) {
    throw new Error(data?.error || "Could not send recovery code. Please try again.");
  }
  return data;
}

export async function resetEmailPassword(email: string, otp: string, password: string) {
  const cleanEmail = email.trim().toLowerCase();
  const cleanOtp = otp.trim().replace(/\D/g, "");
  const { ok, data } = await safeAuthFetch("/api/v1/auth/reset-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: cleanEmail, otp: cleanOtp, newPassword: password })
  });
  if (!ok || !data?.success || !data?.token || !data?.user) {
    throw new Error(data?.error || "Password reset failed. Please verify your code and try again.");
  }
  return data;
}
