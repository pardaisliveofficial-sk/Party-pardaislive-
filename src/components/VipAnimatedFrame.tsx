import React from "react";

export interface VipFrameConfig {
  id: string;
  vipLevel: number;
  name: string;
  minLevel: number;
  glowColor: string;
  gradientFrom: string;
  gradientTo: string;
  badgeEmoji: string;
  isActive: boolean;
  description?: string;
}

export const VIP_FRAMES_LIST: VipFrameConfig[] = [
  {
    id: "vip-frame-1",
    vipLevel: 1,
    name: "VIP 1 Royal Bronze",
    minLevel: 10,
    glowColor: "#cd7f32",
    gradientFrom: "from-amber-700",
    gradientTo: "to-amber-500",
    badgeEmoji: "🥉",
    isActive: true,
    description: "Royal Bronze knight frame with glowing bronze aura & sparkling accents."
  },
  {
    id: "vip-frame-2",
    vipLevel: 2,
    name: "VIP 2 Sky Silver Wings",
    minLevel: 20,
    glowColor: "#cbd5e1",
    gradientFrom: "from-slate-300",
    gradientTo: "to-blue-300",
    badgeEmoji: "🥈",
    isActive: true,
    description: "Sky Silver angel wings frame with gentle flapping & starlight."
  },
  {
    id: "vip-frame-3",
    vipLevel: 3,
    name: "VIP 3 Golden Dragon",
    minLevel: 30,
    glowColor: "#fbbf24",
    gradientFrom: "from-yellow-500",
    gradientTo: "to-amber-300",
    badgeEmoji: "👑",
    isActive: true,
    description: "Golden Royal Dragon crown with rotating golden halo & light beam."
  },
  {
    id: "vip-frame-4",
    vipLevel: 4,
    name: "VIP 4 Ruby Phoenix",
    minLevel: 40,
    glowColor: "#ef4444",
    gradientFrom: "from-red-600",
    gradientTo: "to-pink-500",
    badgeEmoji: "🔥",
    isActive: true,
    description: "Blazing Phoenix fiery red frame with animated fire embers & flame pulse."
  },
  {
    id: "vip-frame-5",
    vipLevel: 5,
    name: "VIP 5 Emerald Panther",
    minLevel: 5,
    glowColor: "#10b981",
    gradientFrom: "from-emerald-500",
    gradientTo: "to-green-300",
    badgeEmoji: "🐉",
    isActive: true,
    description: "Emerald Panther laser frame with neon green pulse ring & crest."
  },
  {
    id: "vip-frame-6",
    vipLevel: 6,
    name: "VIP 6 Celestial Diamond",
    minLevel: 60,
    glowColor: "#06b6d4",
    gradientFrom: "from-cyan-400",
    gradientTo: "to-blue-500",
    badgeEmoji: "💎",
    isActive: true,
    description: "Celestial Diamond starburst frame with rotating cyan crystals."
  },
  {
    id: "vip-frame-7",
    vipLevel: 7,
    name: "VIP 7 Sovereign Neon Pulsar",
    minLevel: 70,
    glowColor: "#d946ef",
    gradientFrom: "from-fuchsia-600",
    gradientTo: "to-pink-600",
    badgeEmoji: "🌀",
    isActive: true,
    description: "Neon Pulsar dual laser orbit frame with intense fuchsia wave pulses."
  },
  {
    id: "vip-frame-8",
    vipLevel: 8,
    name: "VIP 8 Cyber Emperor",
    minLevel: 80,
    glowColor: "#eab308",
    gradientFrom: "from-amber-400",
    gradientTo: "to-cyan-400",
    badgeEmoji: "⚡",
    isActive: true,
    description: "Cyberpunk matrix wings frame with electric arcs & golden holograms."
  },
  {
    id: "vip-frame-9",
    vipLevel: 9,
    name: "VIP 9 Galactic Overlord",
    minLevel: 90,
    glowColor: "#8b5cf6",
    gradientFrom: "from-violet-600",
    gradientTo: "to-fuchsia-500",
    badgeEmoji: "🌌",
    isActive: true,
    description: "Galactic Cosmic Nebula orbit with revolving star planets & stardust."
  },
  {
    id: "vip-frame-10",
    vipLevel: 10,
    name: "VIP 10 Supreme Sun Deity",
    minLevel: 100,
    glowColor: "#ff007f",
    gradientFrom: "from-amber-300",
    gradientTo: "to-rose-600",
    badgeEmoji: "☀️",
    isActive: true,
    description: "Supreme Solar Flare corona with 12 rotating sun rays & bouncing diamond crown."
  },
  {
    id: "vip-frame-11",
    vipLevel: 11,
    name: "VIP 11 Imperial Titan",
    minLevel: 110,
    glowColor: "#f43f5e",
    gradientFrom: "from-rose-600",
    gradientTo: "to-purple-700",
    badgeEmoji: "🛡️",
    isActive: true,
    description: "Imperial Shield titan frame with rotating lightning arcs & ruby crest."
  },
  {
    id: "vip-frame-12",
    vipLevel: 12,
    name: "VIP 12 Universe Sovereign",
    minLevel: 120,
    glowColor: "#3b82f6",
    gradientFrom: "from-pink-500",
    gradientTo: "to-indigo-600",
    badgeEmoji: "🪐",
    isActive: true,
    description: "Ultimate Rainbow Cosmic Plasma tri-orbit with bouncing sovereign rainbow crown."
  }
];

interface VipAnimatedFrameProps {
  frameId?: string | null;
  vipLevel?: number;
  showLevelBadge?: boolean;
  className?: string;
  children: React.ReactNode;
}

export const VipAnimatedFrame: React.FC<VipAnimatedFrameProps> = ({
  frameId,
  vipLevel,
  showLevelBadge = true,
  className = "",
  children
}) => {
  // Determine matching frame config
  let frame: VipFrameConfig | undefined;

  if (frameId) {
    frame = VIP_FRAMES_LIST.find((f) => f.id === frameId && f.isActive);
  }

  if (!frame && vipLevel && vipLevel > 0) {
    frame = VIP_FRAMES_LIST.find((f) => f.vipLevel === vipLevel && f.isActive);
    if (!frame) {
      // Fallback to highest available <= vipLevel or highest frame
      frame = VIP_FRAMES_LIST.reduce((prev, curr) => (curr.vipLevel <= vipLevel && curr.vipLevel > prev.vipLevel ? curr : prev), VIP_FRAMES_LIST[0]);
    }
  }

  // If no active frame matches, just render children cleanly
  if (!frame) {
    return <div className={`relative inline-block ${className}`}>{children}</div>;
  }

  const vNum = frame.vipLevel;

  return (
    <div className={`relative inline-block ${className}`}>
      {/* 🌟 1. BACKGROUND GLOW PULSE */}
      <div
        className="absolute inset-[-6px] rounded-full blur-md opacity-70 animate-pulse pointer-events-none z-0"
        style={{ backgroundColor: frame.glowColor }}
      />

      {/* 🌟 2. MAIN ROTATING SVG FRAME */}
      <div className="absolute inset-[-10px] pointer-events-none z-10">
        <svg
          className="w-full h-full animate-spin-slow"
          viewBox="0 0 100 100"
          style={{ animationDuration: vNum > 8 ? "6s" : vNum > 4 ? "9s" : "12s" }}
        >
          <defs>
            <linearGradient id={`grad-vip-frame-${frame.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{ stopColor: frame.glowColor }} />
              <stop offset="50%" style={{ stopColor: "#ffffff" }} />
              <stop offset="100%" style={{ stopColor: frame.glowColor }} />
            </linearGradient>

            <filter id={`glow-vip-${frame.id}`}>
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Outer Dashed/Gradient Ring */}
          <circle
            cx="50"
            cy="50"
            r="42"
            stroke={`url(#grad-vip-frame-${frame.id})`}
            strokeWidth={vNum >= 10 ? "6" : vNum >= 6 ? "5" : "4.5"}
            fill="none"
            strokeDasharray={
              vNum === 1 ? "12, 6" :
              vNum === 2 ? "15, 5, 5, 5" :
              vNum === 3 ? "25, 8" :
              vNum === 4 ? "10, 3" :
              vNum === 5 ? "18, 6, 6, 6" :
              vNum === 6 ? "30, 10" :
              vNum === 7 ? "8, 4, 16, 4" :
              vNum === 8 ? "35, 8" :
              vNum === 9 ? "12, 4, 12, 4" :
              vNum === 10 ? "40, 6" :
              vNum === 11 ? "15, 3, 15, 3" : "none"
            }
            filter={`url(#glow-vip-${frame.id})`}
          />

          {/* Secondary Inner Counter-Rotating Orbit Ring for higher VIPs */}
          {vNum >= 4 && (
            <circle
              cx="50"
              cy="50"
              r="45.5"
              stroke={frame.glowColor}
              strokeWidth="1.5"
              strokeOpacity="0.6"
              fill="none"
              strokeDasharray="6, 12"
            />
          )}

          {/* Solar Rays for VIP 10, 11, 12 */}
          {vNum >= 10 && (
            <g opacity="0.8">
              {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
                <line
                  key={deg}
                  x1="50"
                  y1="3"
                  x2="50"
                  y2="8"
                  stroke={frame.glowColor}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  transform={`rotate(${deg} 50 50)`}
                />
              ))}
            </g>
          )}
        </svg>

        {/* 🪶 3. ANIMATED WINGS / FLAME / SIDE ORNAMENTS */}
        {/* VIP 2: Angel Wings */}
        {vNum === 2 && (
          <div className="absolute top-1/2 -translate-y-1/2 -left-4 -right-4 flex justify-between pointer-events-none text-xs animate-pulse">
            <span className="scale-x-[-1]">🪶</span>
            <span>🪶</span>
          </div>
        )}

        {/* VIP 4: Fire Phoenix Embers */}
        {vNum === 4 && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-between px-0.5 animate-ping opacity-80 text-[10px]">
            <span>🔥</span>
            <span>🔥</span>
          </div>
        )}

        {/* VIP 5: Emerald Lasers */}
        {vNum === 5 && (
          <div className="absolute top-1/2 -translate-y-1/2 -left-3 -right-3 flex justify-between pointer-events-none text-[11px] animate-pulse">
            <span>🐉</span>
            <span>🐉</span>
          </div>
        )}

        {/* VIP 6: Diamond Crystals */}
        {vNum === 6 && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-between text-[11px] animate-spin-slow" style={{ animationDuration: "8s" }}>
            <span className="translate-x-[-2px]">💎</span>
            <span className="translate-x-[2px]">💎</span>
          </div>
        )}

        {/* VIP 7: Neon Pulsar Wave */}
        {vNum === 7 && (
          <div className="absolute -inset-1 rounded-full border border-fuchsia-400 animate-ping opacity-40 pointer-events-none" />
        )}

        {/* VIP 8: Cyber Wings */}
        {vNum === 8 && (
          <div className="absolute top-1/2 -translate-y-1/2 -left-4.5 -right-4.5 flex justify-between pointer-events-none text-xs animate-bounce" style={{ animationDuration: "2s" }}>
            <span>⚡</span>
            <span>⚡</span>
          </div>
        )}

        {/* VIP 9: Cosmic Nebula Stars */}
        {vNum === 9 && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-between text-[11px] animate-spin-slow" style={{ animationDuration: "5s" }}>
            <span>✨</span>
            <span>✨</span>
          </div>
        )}

        {/* VIP 11 & 12: Imperial Titan / Universe Orbs */}
        {vNum >= 11 && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-between text-xs animate-pulse">
            <span>🪐</span>
            <span>🪐</span>
          </div>
        )}

        {/* 👑 4. TOP CROWN ORNAMENT */}
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-20 text-xs sm:text-sm animate-bounce" style={{ animationDuration: "3s" }}>
          {frame.badgeEmoji}
        </div>
      </div>

      {/* 🏷️ 5. ANIMATED LIVE BADGE (NUMBER WISE) */}
      {showLevelBadge && (
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 z-20">
          <span
            className={`px-1.5 py-0.2 rounded-full text-[7.5px] font-black font-mono uppercase tracking-wider text-white shadow-lg border border-white/40 flex items-center space-x-0.5 animate-pulse bg-gradient-to-r ${frame.gradientFrom} ${frame.gradientTo}`}
            style={{ textShadow: "0 1px 2px rgba(0,0,0,0.8)" }}
          >
            <span>VIP</span>
            <span className="text-yellow-300 font-extrabold">{vNum}</span>
          </span>
        </div>
      )}

      {/* 👤 6. AVATAR CONTENT */}
      <div className="relative z-10">{children}</div>
    </div>
  );
};
