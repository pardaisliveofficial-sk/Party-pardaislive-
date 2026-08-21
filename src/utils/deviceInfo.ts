import { resolveApiUrl } from "../lib/apiClient";

export interface DeviceInfo {
  deviceId: string;
  deviceModel: string;
  deviceLocation: string;
  ip?: string;
}

// Generates a deterministic hardware signature hash based on Canvas & WebGL parameters
function generateHardwareCanvasHash(): string {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 200;
    canvas.height = 50;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.textBaseline = "top";
      ctx.font = "14px 'Arial'";
      ctx.textBaseline = "alphabetic";
      ctx.fillStyle = "#f60";
      ctx.fillRect(125, 1, 62, 20);
      ctx.fillStyle = "#069";
      ctx.fillText("PardaisPartyHW#2026", 2, 15);
      ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
      ctx.fillText("PardaisPartyHW#2026", 4, 17);
    }
    const dataUrl = canvas.toDataURL();
    let hash = 0;
    for (let i = 0; i < dataUrl.length; i++) {
      const char = dataUrl.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return Math.abs(hash).toString(36).toUpperCase();
  } catch (e) {
    return "9X8B2C";
  }
}

// Cookie getter/setter helpers for permanent persistence
function getCookie(name: string): string | null {
  try {
    if (typeof document === "undefined" || typeof document.cookie !== "string") return null;
    const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
    return match ? decodeURIComponent(match[2]) : null;
  } catch (e) {
    return null;
  }
}

function setCookie(name: string, value: string, days: number = 3650) {
  try {
    if (typeof document === "undefined" || typeof document.cookie === "undefined") return;
    const date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${encodeURIComponent(value)};expires=${date.toUTCString()};path=/;SameSite=Strict`;
  } catch (e) {}
}

let cachedIp: string = "";
let cachedIpLocation: string = "";

export function getDeviceInformation(): DeviceInfo {
  try {
    if (typeof window === "undefined") {
      return {
        deviceId: "DEV-UNKNOWN",
        deviceModel: "Unknown Hardware",
        deviceLocation: "Unknown Location",
      };
    }

    // 1. Multi-layer persistent Device Hardware ID retrieval
    let deviceId: string | null = null;
    try {
      deviceId = localStorage.getItem("pardais_device_id");
    } catch (e) {}
    if (!deviceId) {
      deviceId = getCookie("pardais_device_id");
    }

    if (!deviceId) {
      // Generate deterministic Hardware Canvas/GPU Fingerprint
      const hwHash = generateHardwareCanvasHash();
      const screenWidth = (typeof window !== "undefined" && window.screen) ? (window.screen.width || 390) : 390;
      const screenHeight = (typeof window !== "undefined" && window.screen) ? (window.screen.height || 844) : 844;
      const screenDepth = (typeof window !== "undefined" && window.screen) ? (window.screen.colorDepth || 24) : 24;
      const screenSig = `${screenWidth}x${screenHeight}x${screenDepth}`;
      const uaStr = (typeof navigator !== "undefined" && navigator.userAgent) ? navigator.userAgent : "Mozilla/5.0";
      let strToHash = `${uaStr}-${screenSig}-${hwHash}`;
      let numHash = 0;
      for (let i = 0; i < strToHash.length; i++) {
        numHash = (numHash << 5) - numHash + strToHash.charCodeAt(i);
        numHash |= 0;
      }
      const cleanHash = Math.abs(numHash).toString(36).toUpperCase();
      deviceId = `DEV-HW-${cleanHash}`;

      try { localStorage.setItem("pardais_device_id", deviceId); } catch (e) {}
      setCookie("pardais_device_id", deviceId);
    } else {
      // Ensure both localStorage and cookie stay synced
      try { localStorage.setItem("pardais_device_id", deviceId); } catch (e) {}
      setCookie("pardais_device_id", deviceId);
    }

    // 2. Detect Exact Mobile Brand & Phone Model from UserAgent
    const ua = (typeof navigator !== "undefined" && navigator.userAgent) ? navigator.userAgent : "";
    let deviceModel = "Desktop Web Browser";

    if (/Android/i.test(ua)) {
      const match = ua.match(/Android\s+([\d.]+);?\s*([^;)]+)?/i);
      const androidVer = match?.[1] ? `Android ${match[1]}` : "Android";
      let brand = "";
      
      if (match?.[2] && !match[2].includes("Build")) {
        brand = match[2].trim();
      } else if (ua.includes("SM-") || ua.includes("Samsung") || ua.includes("Galaxy")) {
        brand = "Samsung Galaxy";
      } else if (ua.includes("POCO") || ua.includes("Redmi") || ua.includes("Xiaomi") || ua.includes("Mi ")) {
        brand = "Xiaomi / Redmi / POCO";
      } else if (ua.includes("CPH") || ua.includes("OPPO")) {
        brand = "OPPO Smartphone";
      } else if (ua.includes("V2") || ua.includes("Vivo")) {
        brand = "Vivo Smartphone";
      } else if (ua.includes("RMX") || ua.includes("Realme")) {
        brand = "Realme Phone";
      } else if (ua.includes("X6") || ua.includes("Infinix")) {
        brand = "Infinix Mobile";
      } else if (ua.includes("Tecno") || ua.includes("CK") || ua.includes("LH")) {
        brand = "Tecno Smartphone";
      } else if (ua.includes("Pixel")) {
        brand = "Google Pixel";
      } else {
        brand = "Android Mobile Device";
      }
      deviceModel = `${brand} (${androidVer})`;
    } else if (/iPhone|iPad|iPod/i.test(ua)) {
      const match = ua.match(/OS\s+([\d_]+)/i);
      const iosVer = match ? `iOS ${match[1].replace(/_/g, ".")}` : "iOS";
      const deviceType = ua.includes("iPad") ? "Apple iPad" : "Apple iPhone";
      deviceModel = `${deviceType} (${iosVer})`;
    } else if (/Macintosh|Mac OS X/i.test(ua)) {
      deviceModel = "Apple Mac Workstation";
    } else if (/Windows/i.test(ua)) {
      deviceModel = "Windows PC (Desktop / Laptop)";
    } else if (/Linux/i.test(ua)) {
      deviceModel = "Linux PC Station";
    }

    // 3. Construct Timezone & Regional Location Signature
    let tz = "Asia/Karachi";
    try {
      tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Karachi";
    } catch (e) {}

    const lang = (typeof navigator !== "undefined" && navigator.language) ? navigator.language : "en-US";
    let region = tz.split("/").pop()?.replace(/_/g, " ") || "Pakistan";
    if (tz.includes("Karachi")) region = "Pakistan (Karachi/Lahore)";
    else if (tz.includes("Riyadh")) region = "Saudi Arabia (Riyadh)";
    else if (tz.includes("Dubai")) region = "UAE (Dubai)";
    else if (tz.includes("Doha")) region = "Qatar (Doha)";
    else if (tz.includes("London")) region = "United Kingdom (London)";
    else if (tz.includes("New_York")) region = "United States (New York)";

    let deviceLocation = cachedIpLocation
      ? `${region} • IP: ${cachedIp} • ${cachedIpLocation} [${lang}]`
      : cachedIp
      ? `${region} • IP: ${cachedIp} [${tz}]`
      : `${region} • ${tz} [${lang}]`;

    return { deviceId, deviceModel, deviceLocation, ip: cachedIp };
  } catch (err) {
    return {
      deviceId: "DEV-HW-GENERIC",
      deviceModel: "Standard Smartphone",
      deviceLocation: "Global",
      ip: ""
    };
  }
}

// Asynchronously fetches real public IP and precise geolocation details
export async function fetchRealDeviceLocation(): Promise<DeviceInfo> {
  const current = getDeviceInformation();
  if (typeof window === "undefined") return current;

  try {
    // 1. First fetch IP from local server endpoint or public fallback
    const res = await fetch(resolveApiUrl("/api/v1/ip-info")).catch(() => null);
    if (res && res.ok) {
      const data = await res.json();
      if (data.ip && data.ip !== "127.0.0.1" && data.ip !== "::1") {
        cachedIp = data.ip;
      }
    }

    if (!cachedIp) {
      const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
      const tId = controller ? setTimeout(() => controller.abort(), 3000) : null;
      const resIp = await fetch("https://api.ipify.org?format=json", { ...(controller ? { signal: controller.signal } : {}) }).catch(() => null);
      if (tId) clearTimeout(tId);
      if (resIp && resIp.ok) {
        const ipData = await resIp.json();
        if (ipData.ip) cachedIp = ipData.ip;
      }
    }

    // 2. Fetch Geo Location if IP is resolved
    if (cachedIp && !cachedIpLocation) {
      const controller2 = typeof AbortController !== "undefined" ? new AbortController() : null;
      const tId2 = controller2 ? setTimeout(() => controller2.abort(), 3000) : null;
      const geoRes = await fetch(`https://ipwho.is/${cachedIp}`, { ...(controller2 ? { signal: controller2.signal } : {}) }).catch(() => null);
      if (tId2) clearTimeout(tId2);
      if (geoRes && geoRes.ok) {
        const geo = await geoRes.json();
        if (geo.success) {
          cachedIpLocation = `${geo.city || ""}, ${geo.country || ""} (${geo.connection?.isp || geo.org || "Cellular Network"})`;
        }
      }
    }
  } catch (e) {
    console.warn("Device location fetch notice:", e);
  }

  return getDeviceInformation();
}
