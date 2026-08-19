import React, { useEffect, useState } from "react";

interface PardaisPartySplashScreenProps {
  onComplete?: () => void;
  duration?: number;
}

export const PardaisPartySplashScreen: React.FC<PardaisPartySplashScreenProps> = ({ onComplete, duration = 2200 }) => {
  const [fadingOut, setFadingOut] = useState(false);

  useEffect(() => {
    const fadeAt = Math.max(0, duration - 350);
    const t1 = window.setTimeout(() => setFadingOut(true), fadeAt);
    const t2 = window.setTimeout(() => onComplete?.(), duration);
    return () => { window.clearTimeout(t1); window.clearTimeout(t2); };
  }, [duration, onComplete]);

  return (
    <div className={`fixed inset-0 z-[999999] bg-black flex items-center justify-center overflow-hidden transition-opacity duration-300 ${fadingOut ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
      <img
        src="/pardais-party-exact.png?v=8"
        alt="Pardais Party"
        className="w-full h-full object-contain select-none"
        draggable={false}
      />
    </div>
  );
};
