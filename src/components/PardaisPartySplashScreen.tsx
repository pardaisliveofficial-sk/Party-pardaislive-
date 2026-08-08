import React, { useEffect, useState } from "react";
import { PardaisPartyLogo } from "./PardaisPartyLogo";

interface PardaisPartySplashScreenProps {
  onComplete?: () => void;
  duration?: number; // total duration in ms
}

export const PardaisPartySplashScreen: React.FC<PardaisPartySplashScreenProps> = ({
  onComplete,
  duration = 3200,
}) => {
  const [step, setStep] = useState<number>(1);
  const [fadingOut, setFadingOut] = useState<boolean>(false);

  useEffect(() => {
    // Sequence timing
    const t1 = setTimeout(() => setStep(2), 300);   // Neon particles appear
    const t2 = setTimeout(() => setStep(3), 800);   // Stage lights switch on
    const t3 = setTimeout(() => setStep(4), 1400);  // Logo glows
    const t4 = setTimeout(() => setStep(5), 2000);  // Dancing light effects & Text tagline
    const t5 = setTimeout(() => {
      setFadingOut(true);
    }, duration - 500);
    const t6 = setTimeout(() => {
      if (onComplete) onComplete();
    }, duration);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
      clearTimeout(t6);
    };
  }, [duration, onComplete]);

  return (
    <div
      className={`fixed inset-0 z-[999999] bg-[#0A0A0A] flex flex-col items-center justify-center overflow-hidden transition-opacity duration-500 select-none ${
        fadingOut ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      {/* 1. Black Background Base (#0A0A0A) */}

      {/* 2. Neon Floating Particles */}
      {step >= 2 && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full animate-float opacity-75"
              style={{
                width: `${Math.random() * 6 + 3}px`,
                height: `${Math.random() * 6 + 3}px`,
                backgroundColor: i % 2 === 0 ? "#FF2DCE" : "#2A7BFF",
                boxShadow: i % 2 === 0 ? "0 0 10px #FF2DCE" : "0 0 10px #2A7BFF",
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDuration: `${Math.random() * 3 + 2}s`,
                animationDelay: `${Math.random() * 1}s`,
              }}
            />
          ))}
        </div>
      )}

      {/* 3. Concert Stage Lights Spotlight Beams */}
      {step >= 3 && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden transition-all duration-700">
          {/* Top Left Spotlight Beam */}
          <div
            className="absolute -top-10 left-1/4 w-32 h-[120vh] bg-gradient-to-b from-[#2A7BFF]/60 via-[#FF2DCE]/30 to-transparent blur-xl origin-top transition-transform duration-1000 animate-pulse"
            style={{ transform: "rotate(-25deg)" }}
          />
          {/* Top Right Spotlight Beam */}
          <div
            className="absolute -top-10 right-1/4 w-32 h-[120vh] bg-gradient-to-b from-[#FF2DCE]/60 via-[#2A7BFF]/30 to-transparent blur-xl origin-top transition-transform duration-1000 animate-pulse"
            style={{ transform: "rotate(25deg)", animationDelay: "0.5s" }}
          />
          {/* Central Stage Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-[#FF2DCE]/20 via-[#A855F7]/30 to-[#2A7BFF]/20 rounded-full blur-3xl animate-pulse" />
        </div>
      )}

      {/* 5. Dancing Light Effects (Bottom Crowd Lights) */}
      {step >= 5 && (
        <div className="absolute bottom-0 inset-x-0 h-48 bg-gradient-to-t from-[#FF2DCE]/20 via-[#2A7BFF]/10 to-transparent pointer-events-none flex justify-around items-end pb-4">
          <div className="w-20 h-20 rounded-full bg-[#FF2DCE]/40 blur-xl animate-bounce" />
          <div className="w-24 h-24 rounded-full bg-[#2A7BFF]/40 blur-xl animate-bounce" style={{ animationDelay: "0.2s" }} />
          <div className="w-16 h-16 rounded-full bg-[#FFD700]/30 blur-xl animate-bounce" style={{ animationDelay: "0.4s" }} />
        </div>
      )}

      {/* 4 & 6. Glowing Logo & Brand Title Text */}
      <div className="relative z-20 flex flex-col items-center justify-center space-y-6 text-center px-4">
        {step >= 4 && (
          <div className="transform transition-all duration-700 scale-100 animate-pop-in">
            <PardaisPartyLogo size="xl" animate={true} />
          </div>
        )}

        {step >= 5 && (
          <div className="space-y-2 animate-fade-in-up transition-all duration-500">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-widest text-white drop-shadow-[0_0_20px_rgba(255,45,206,0.8)]">
              PARDAIS{" "}
              <span className="bg-gradient-to-r from-[#FF2DCE] via-[#A855F7] to-[#2A7BFF] bg-clip-text text-transparent">
                PARTY
              </span>
            </h1>
            <p className="text-xs sm:text-sm font-bold text-[#2A7BFF] uppercase tracking-[0.3em] font-mono drop-shadow-[0_0_8px_rgba(42,123,255,0.7)]">
              Where Every Party Comes Alive ✨
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
