import React, { useEffect, useState } from "react";
import { Sparkles, Crown, X, Volume2 } from "lucide-react";
import { VipEntryEffect, getVipEntryEffect } from "../vipEntryConfig";
import { VipSvgMount } from "./VipSvgMounts";

interface VipRideAnimationOverlayProps {
  vipLevel: number;
  username: string;
  onClose?: () => void;
}

export const VipRideAnimationOverlay: React.FC<VipRideAnimationOverlayProps> = ({
  vipLevel,
  username,
  onClose
}) => {
  const effect: VipEntryEffect = getVipEntryEffect(vipLevel);
  const [stage, setStage] = useState<"entering" | "active" | "exiting">("entering");

  useEffect(() => {
    // Stage 1: Entering drive/fly across (0 to 800ms)
    const t1 = setTimeout(() => {
      setStage("active");
    }, 800);

    // Stage 2: Exiting (after 5200ms - total ~5.8s animation)
    const t2 = setTimeout(() => {
      setStage("exiting");
    }, 5200);

    // Stage 3: Close (after 5800ms)
    const t3 = setTimeout(() => {
      if (onClose) onClose();
    }, 5800);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none select-none flex flex-col items-center justify-center overflow-hidden">
      {/* Background Dim & Glowing Particle Backdrop */}
      <div 
        className={`absolute inset-0 bg-black/60 backdrop-blur-[3px] transition-opacity duration-700 ${
          stage === "exiting" ? "opacity-0" : "opacity-100"
        }`}
      />

      {/* Speed Trail Rays Across Screen */}
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-48 flex items-center justify-center overflow-hidden pointer-events-none opacity-90">
        <div className="w-full h-1 bg-gradient-to-r from-transparent via-white to-transparent animate-pulse" />
        <div className={`absolute w-full h-32 bg-gradient-to-r ${effect.bannerBg} opacity-40 blur-2xl`} />
      </div>

      {/* Main Animated SVG Vehicle Ride Racing Across Screen (5.8s Entrance) */}
      <div 
        className={`relative z-10 w-full max-w-xl px-4 flex flex-col items-center transition-all duration-1000 ease-out ${
          stage === "entering"
            ? "-translate-x-full opacity-0 scale-75 rotate-3"
            : stage === "exiting"
            ? "translate-x-full opacity-0 scale-90 -rotate-3"
            : "translate-x-0 opacity-100 scale-100 rotate-0"
        }`}
      >
        {/* Top Announcement & Sound Text */}
        <div className={`mb-3 px-4 py-1.5 rounded-full bg-black/90 border-2 ${effect.borderColor} ${effect.bannerGlow} flex items-center space-x-2 shadow-2xl animate-bounce`}>
          <Volume2 className="w-4 h-4 text-yellow-400 animate-pulse shrink-0" />
          <span className="text-xs font-black uppercase font-mono tracking-wider text-white">
            {effect.soundText}
          </span>
        </div>

        {/* Live Vector Animated SVG Mount / Vehicle */}
        <div className="relative mb-2 flex items-center justify-center filter drop-shadow-[0_0_25px_rgba(255,255,255,0.4)] transform hover:scale-105 transition-transform">
          <VipSvgMount vipLevel={effect.vipLevel} className="w-48 h-28 sm:w-64 sm:h-36" />
        </div>

        {/* Animated Vehicle/Mount Platform Banner Box */}
        <div className={`w-full rounded-2xl border-2 ${effect.borderColor} bg-gradient-to-r ${effect.bannerBg} p-4 ${effect.bannerGlow} shadow-2xl relative overflow-hidden flex flex-col sm:flex-row items-center justify-between gap-3 text-left backdrop-blur-md`}>
          
          {/* Shimmer gloss effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full animate-[shimmer_2s_infinite]" />

          {/* Left Side: Vehicle Icon with Speed Rays & Flame aura */}
          <div className="relative flex items-center justify-center shrink-0">
            {/* Pulsing Backlight */}
            <div className={`absolute w-16 h-16 rounded-full bg-gradient-to-tr ${effect.mountBgGradient} blur-md opacity-80 animate-ping`} />
            
            <div className={`w-16 h-16 rounded-2xl bg-gradient-to-tr ${effect.mountBgGradient} border-2 border-white/40 flex items-center justify-center text-3xl shadow-xl relative z-10 transform hover:scale-110 transition-transform`}>
              <span>{effect.icon}</span>
            </div>

            {/* Vehicle Type Pill */}
            <span className="absolute -bottom-2 bg-black/90 text-yellow-300 border border-yellow-400/50 font-mono font-black text-[8px] px-2 py-0.5 rounded-full uppercase tracking-tighter shadow-md z-20">
              {effect.category}
            </span>
          </div>

          {/* Middle: VIP User Info & Mount Title */}
          <div className="flex-1 min-w-0 text-center sm:text-left z-10 space-y-1">
            <div className="flex items-center justify-center sm:justify-start space-x-2">
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider font-mono border ${effect.badgeBg} flex items-center shadow-md`}>
                <Crown className="w-3.5 h-3.5 mr-1 text-amber-300 fill-amber-300" />
                <span>VIP {effect.vipLevel}</span>
              </span>
              <span className="text-[9.5px] font-bold text-gray-300 uppercase tracking-widest font-mono">
                ROYAL ENTRANCE (5.8s)
              </span>
            </div>

            {/* Username Heading */}
            <h3 className="text-lg font-black text-white truncate drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] font-mono">
              {username}
            </h3>

            {/* Mount Vehicle Title */}
            <p className="text-xs font-extrabold text-amber-300 flex items-center justify-center sm:justify-start space-x-1">
              <span>{effect.icon}</span>
              <span className="uppercase tracking-wider font-mono">{effect.name}</span>
            </p>
          </div>

          {/* Right Side: Sparkle Tag */}
          <div className="hidden sm:flex flex-col items-center justify-center text-center z-10 shrink-0 pl-2 border-l border-white/10">
            <Sparkles className="w-7 h-7 text-yellow-300 animate-spin-slow" />
            <span className="text-[8px] font-mono font-extrabold text-gray-300 uppercase mt-0.5">
              5.8S RIDE
            </span>
          </div>

          {/* Manual Close Button for preview mode */}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="pointer-events-auto absolute top-2 right-2 p-1.5 rounded-full bg-black/70 hover:bg-black text-gray-400 hover:text-white transition-colors z-30 cursor-pointer"
              title="Close VIP Entrance"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Speed Line Particles under mount */}
        <div className="mt-2 flex items-center justify-center space-x-1 text-[9px] font-mono text-gray-300">
          <span className="animate-pulse">⚡ VIP {effect.vipLevel} {effect.vehicleName.toUpperCase()} ENTRANCE EFFECT ACTIVATED ⚡</span>
        </div>
      </div>
    </div>
  );
};
