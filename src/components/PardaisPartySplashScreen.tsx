import React, { useEffect, useState, useRef } from "react";

interface PardaisPartySplashScreenProps {
  onComplete?: () => void;
  duration?: number;
}

export const PardaisPartySplashScreen: React.FC<PardaisPartySplashScreenProps> = ({ onComplete, duration = 1800 }) => {
  const [fadingOut, setFadingOut] = useState(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    const fadeAt = Math.max(0, duration - 300);
    const t1 = window.setTimeout(() => setFadingOut(true), fadeAt);
    const t2 = window.setTimeout(() => {
      if (onCompleteRef.current) {
        onCompleteRef.current();
      }
    }, duration);

    // Fallback safety timer in case anything delays execution
    const fallbackTimer = window.setTimeout(() => {
      if (onCompleteRef.current) {
        onCompleteRef.current();
      }
    }, duration + 600);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(fallbackTimer);
    };
  }, [duration]);

  return (
    <div
      onClick={() => onCompleteRef.current?.()}
      className={`fixed inset-0 z-[999999] bg-[#09090e] flex flex-col items-center justify-center overflow-hidden transition-opacity duration-300 cursor-pointer select-none ${
        fadingOut ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      <div className="relative flex flex-col items-center justify-center space-y-4 max-w-xs px-6 text-center">
        {/* Animated App Logo / Brand Icon with Exact Neon P Emblem */}
        <div className="relative w-32 h-32 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#ff007f] via-[#7b2cbf] to-[#00d2ff] animate-pulse blur-xl opacity-70"></div>
          <div className="relative w-28 h-28 rounded-3xl bg-[#090514] border-2 border-[#ff007f]/70 p-2 flex items-center justify-center shadow-[0_0_35px_rgba(255,0,127,0.5)] overflow-hidden">
            <img
              src="/pardais-party-exact.png"
              alt="Pardais Party"
              className="w-full h-full object-contain filter drop-shadow-[0_0_12px_rgba(255,0,127,0.8)] select-none"
              draggable={false}
            />
          </div>
        </div>

        <div className="space-y-1">
          <h1 className="text-xl font-black tracking-wider uppercase text-white font-mono">
            PARDAIS PARTY
          </h1>
          <p className="text-[11px] text-pink-400 font-medium tracking-wide">
            Where Every Party Comes Alive ✨
          </p>
        </div>

        {/* Loading shimmer bar */}
        <div className="w-36 h-1.5 bg-white/10 rounded-full overflow-hidden relative mt-2">
          <div className="h-full w-full bg-gradient-to-r from-[#ff007f] via-[#00f5ff] to-[#7b2cbf] animate-shimmer rounded-full"></div>
        </div>
      </div>
    </div>
  );
};

