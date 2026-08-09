// Shared Authenticated API Client for Pardais Party Application
// Manages API URL resolution, Authorization headers, session refresh, and request retry

export const resolveApiUrl = (path: string): string => {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  const envApiUrl = (import.meta as any).env?.VITE_API_URL;
  if (envApiUrl && typeof envApiUrl === "string" && envApiUrl.trim().length > 0) {
    const base = envApiUrl.trim().replace(/\/+$/, "");
    return `${base}${path.startsWith("/") ? path : `/${path}`}`;
  }

  if (typeof window !== "undefined" && window.location.origin && window.location.origin !== "null" && !window.location.origin.startsWith("file:") && !window.location.origin.startsWith("capacitor:")) {
    const base = window.location.origin;
    return `${base}${path.startsWith("/") ? path : `/${path}`}`;
  }

  return path;
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
