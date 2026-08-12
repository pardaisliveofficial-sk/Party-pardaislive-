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
    return `${PRODUCTION_API_BASE}${cleanPath}`;
  }

  // All production builds (Web + Capacitor/Android) must use the same
  // centralized production API. Do not fall back to the web origin: that
  // causes multipart Reel uploads to hit the frontend host instead of the
  // Railway production API and results in network/abort errors.
  const envApiUrl = (import.meta as any).env?.VITE_API_URL;
  const configuredBase = typeof envApiUrl === "string" && envApiUrl.trim().length > 0
    ? envApiUrl.trim().replace(/\/+$/, "")
    : PRODUCTION_API_BASE;

  // Prefer the known production endpoint even if an old/stale VITE_API_URL
  // was baked into a previous Web/AI-Studio build.
  const base = configuredBase.includes("api.pardaisparty.soulverseapps.com")
    ? configuredBase
    : PRODUCTION_API_BASE;

  return `${base}${cleanPath}`;
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

// Refresh or acquire guest session token from backend
export const refreshSession = async (userInfo?: { username?: string; uid?: string }): Promise<string | null> => {
  try {
    const url = resolveApiUrl("/api/v1/auth/guest-login");
    const res = await window.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userInfo || {})
    });

    if (res.ok) {
      const data = await res.json();
      if (data.token && typeof data.token === "string") {
        setAuthToken(data.token);
        console.log("[PARDAIS-PARTY API CLIENT] Successfully acquired/refreshed application session token.");
        return data.token;
      }
    }
  } catch (err) {
    console.warn("[PARDAIS-PARTY API CLIENT] Session refresh failed:", err);
  }
  return null;
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
    token = await refreshSession(userInfoForRefresh);
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
      const newToken = await refreshSession(userInfoForRefresh);
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
