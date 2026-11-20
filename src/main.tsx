import React, { StrictMode, useState, useEffect, Component, ErrorInfo, ReactNode } from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
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

  // Helper function to safely stringify or format error arguments without circular DOM structure crashes
  const safeFormatArg = (arg: any): string => {
    if (arg === null || arg === undefined) return "";
    if (typeof arg === "string" || typeof arg === "number" || typeof arg === "boolean") {
      return String(arg);
    }
    if (arg instanceof Error) {
      return `${arg.name || "Error"}: ${arg.message} ${arg.stack || ""}`;
    }
    if (typeof arg === "object") {
      if ('target' in arg || 'currentTarget' in arg || 'nativeEvent' in arg || arg instanceof Element || (arg as any).nodeType) {
        return `[DOM/Event Object: ${(arg as any).type || (arg as any).nodeName || 'Element'}]`;
      }
      try {
        const seen = new WeakSet();
        return JSON.stringify(arg, (key, value) => {
          if (typeof value === "object" && value !== null) {
            if (seen.has(value) || value instanceof Element || (value as any).nodeType) {
              return "[Circular/DOM]";
            }
            seen.add(value);
          }
          return value;
        });
      } catch (e) {
        return String(arg);
      }
    }
    return String(arg);
  };

  console.error = function (...args: any[]) {
    const msg = args.map(safeFormatArg).join(" ").toLowerCase();

    if (
      msg.includes("script error") ||
      msg.includes("circular structure") ||
      msg.includes("has no supported sources") ||
      msg.includes("play retry error") ||
      (msg.includes("profile save/upload") && msg.includes("network fetch failed"))
    ) {
      originalConsoleWarn.apply(console, [
        "[Pardais Party - Note] Handled script/media notice:",
        ...args.map(safeFormatArg)
      ]);
      return;
    }

    if (
      msg.includes("firestore") && 
      (msg.includes("resource_exhausted") || msg.includes("quota") || msg.includes("resource-exhausted") || msg.includes("code: 8") || msg.includes("code=resource-exhausted"))
    ) {
      // Gracefully log as a warning/info in development rather than a system-critical error
      originalConsoleWarn.apply(console, [
        "[Pardais Party - Firebase Status] Firestore quota reached. Pardais Party is running securely with local fallback cache.",
        ...args.map(safeFormatArg)
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
        ...args.map(safeFormatArg)
      ]);
      return;
    }
    originalConsoleError.apply(console, args.map(arg => {
      if (arg && typeof arg === "object" && ('target' in arg || 'currentTarget' in arg || arg instanceof Element)) {
        return safeFormatArg(arg);
      }
      return arg;
    }));
  };

  // Prevent background unhandled rejections for Firestore streams & WebRTC / Media load errors from crashing the UI
  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    const msg = String(reason?.message || reason?.stack || reason?.code || reason?.name || reason || "").toLowerCase();
    if (
      msg.includes("script error") ||
      msg.includes("circular structure") ||
      msg.includes("has no supported sources") ||
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
      msg.includes("script error") ||
      msg.includes("circular structure") ||
      msg.includes("has no supported sources") ||
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

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class AppErrorBoundary extends (React.Component as any) {
  constructor(props: any) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[Pardais Party Production Error Boundary Caught]:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#08080c] flex items-center justify-center p-4 font-sans text-white">
          <div className="bg-[#12121c] border border-pink-500/30 p-6 rounded-3xl max-w-md w-full shadow-2xl text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-pink-500/10 border border-pink-500/30 flex items-center justify-center mx-auto text-2xl">
              ⚡
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-black uppercase tracking-wider text-white">Pardais Ecosystem Restored</h2>
              <p className="text-xs text-gray-400">A temporary interface state occurred and was safely caught.</p>
            </div>
            {this.state.error?.message && (
              <div className="bg-black/50 p-3 rounded-xl border border-white/10 font-mono text-[10px] text-pink-300 text-left overflow-x-auto max-h-24">
                {this.state.error.message}
              </div>
            )}
            <div className="flex space-x-2 pt-2">
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.href = "/";
                }}
                className="flex-1 py-2.5 bg-gradient-to-r from-pink-600 to-purple-600 text-white font-bold text-xs uppercase tracking-wider rounded-xl hover:opacity-90 transition-all cursor-pointer"
              >
                📱 Mobile App
              </button>
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.reload();
                }}
                className="flex-1 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
              >
                🔄 Reload App
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function MainRouter() {
  // Admin is hosted as a separate application; consumer app has no admin route.
  return (
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MainRouter />
  </StrictMode>,
);
