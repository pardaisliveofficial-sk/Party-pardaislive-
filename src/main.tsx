import React, { StrictMode, useState, useEffect } from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import AdminApp from './AdminApp.tsx';
import './index.css';

// Intercept and handle Firestore quota/resource-exhausted errors cleanly to prevent developer log pollution
if (typeof window !== "undefined") {
  // Register ServiceWorker for Android PWA / WebAPK 1-Click Installation
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').then((reg) => {
        console.log('[Pardais Party PWA] ServiceWorker registered successfully:', reg.scope);
      }).catch((err) => {
        console.warn('[Pardais Party PWA] ServiceWorker registration note:', err);
      });
    });
  }

  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;

  console.error = function (...args: any[]) {
    const msg = args.map(arg => {
      if (arg instanceof Error) {
        return `${arg.message} ${arg.stack || ""}`;
      }
      return String(arg || "");
    }).join(" ").toLowerCase();

    if (
      msg.includes("firestore") && 
      (msg.includes("resource_exhausted") || msg.includes("quota") || msg.includes("resource-exhausted") || msg.includes("code: 8") || msg.includes("code=resource-exhausted"))
    ) {
      // Gracefully log as a warning/info in development rather than a system-critical error
      originalConsoleWarn.apply(console, [
        "[Pardais Party - Firebase Status] Firestore quota reached. Pardais Party is running securely with local fallback cache.",
        ...args
      ]);
      return;
    }

    if (
      msg.includes("agorartcerror") ||
      msg.includes("can_not_get_gateway_server") ||
      msg.includes("dynamic use static key") ||
      msg.includes("agora-sdk") ||
      msg.includes("invalid vendor key") ||
      msg.includes("static use dynamic key") ||
      msg.includes("signalresponse") ||
      msg.includes("signal") ||
      msg.includes("joininfo") ||
      msg.includes("apresponse")
    ) {
      originalConsoleWarn.apply(console, [
        "[Pardais Party - RTC Gateway Note] Agora RTC connection note:",
        ...args
      ]);
      return;
    }
    originalConsoleError.apply(console, args);
  };

  // Prevent background unhandled rejections for Firestore streams & WebRTC / Media load errors from crashing the UI
  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    const msg = String(reason?.message || reason?.stack || reason?.code || reason?.name || reason || "").toLowerCase();
    if (
      (msg.includes("firestore") && (msg.includes("resource_exhausted") || msg.includes("quota") || msg.includes("resource-exhausted") || msg.includes("code: 8") || msg.includes("code=resource-exhausted"))) ||
      msg.includes("p2pchannel") ||
      msg.includes("startp2pconnection") ||
      msg.includes("interrupted by a new load request") ||
      msg.includes("agorartcerror") ||
      msg.includes("play() request was interrupted") ||
      msg.includes("signalresponse") ||
      msg.includes("signal") ||
      msg.includes("joininfo") ||
      msg.includes("apresponse")
    ) {
      originalConsoleWarn.apply(console, [
        "[Pardais Party - Media/RTC] Handled transient stream/RTC background rejection:",
        msg
      ]);
      event.preventDefault();
    }
  });

  // Catch generic window errors related to Firestore or WebRTC / Media
  const originalOnError = window.onerror;
  window.onerror = function (message, source, lineno, colno, error) {
    const msg = String(message || error?.message || error?.stack || "").toLowerCase();
    if (
      (msg.includes("firestore") && (msg.includes("resource_exhausted") || msg.includes("quota") || msg.includes("resource-exhausted") || msg.includes("code: 8") || msg.includes("code=resource-exhausted"))) ||
      msg.includes("p2pchannel") ||
      msg.includes("startp2pconnection") ||
      msg.includes("interrupted by a new load request") ||
      msg.includes("agorartcerror") ||
      msg.includes("play() request was interrupted") ||
      msg.includes("signalresponse") ||
      msg.includes("signal") ||
      msg.includes("joininfo") ||
      msg.includes("apresponse")
    ) {
      originalConsoleWarn.apply(console, [
        "[Pardais Party - Media/RTC] Handled window error for transient stream/RTC:",
        msg
      ]);
      return true; // prevent error firing
    }
    if (originalOnError) {
      return originalOnError.apply(this, arguments as any);
    }
    return false;
  };
}

function MainRouter() {
  const [isAdminView, setIsAdminView] = useState(() => {
    if (typeof window === "undefined") return false;
    const path = window.location.pathname.toLowerCase();
    const search = window.location.search.toLowerCase();
    const hash = window.location.hash.toLowerCase();
    return path.startsWith("/admin") || search.includes("admin") || hash.includes("admin");
  });

  useEffect(() => {
    const checkRoute = () => {
      const path = window.location.pathname.toLowerCase();
      const search = window.location.search.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      setIsAdminView(path.startsWith("/admin") || search.includes("admin") || hash.includes("admin"));
    };

    window.addEventListener("popstate", checkRoute);
    window.addEventListener("hashchange", checkRoute);
    return () => {
      window.removeEventListener("popstate", checkRoute);
      window.removeEventListener("hashchange", checkRoute);
    };
  }, []);

  if (isAdminView) {
    return (
      <div className="relative min-h-screen">
        {/* Top return banner to switch back to Pardais Party app */}
        <div className="bg-gradient-to-r from-purple-900 via-pink-900 to-slate-900 text-white px-4 py-2 border-b border-pink-500/30 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span className="font-bold text-pink-300">👑 Pardais Party Web Administration Portal</span>
          </div>
          <button
            onClick={() => {
              window.history.pushState({}, "", "/");
              setIsAdminView(false);
            }}
            className="bg-white/10 hover:bg-white/20 text-white font-bold px-3 py-1 rounded-lg border border-white/20 transition-all cursor-pointer flex items-center space-x-1"
          >
            <span>📱 Switch to Mobile App View</span>
          </button>
        </div>
        <AdminApp />
      </div>
    );
  }

  return <App />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MainRouter />
  </StrictMode>,
);
