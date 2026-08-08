import React, { useState, useEffect } from "react";
import { dbDataCache } from "../db/firebaseDb";

interface PardaisPartyLogoProps {
  size?: "sm" | "md" | "lg" | "xl" | "custom";
  customSizeClass?: string;
  showText?: boolean;
  textPosition?: "right" | "bottom";
  className?: string;
  animate?: boolean;
  overrideIconUrl?: string;
}

export const PardaisPartyLogo: React.FC<PardaisPartyLogoProps> = ({
  size = "md",
  customSizeClass = "",
  showText = false,
  textPosition = "right",
  className = "",
  animate = true,
  overrideIconUrl,
}) => {
  const [currentIconUrl, setCurrentIconUrl] = useState<string>(() => {
    if (overrideIconUrl) return overrideIconUrl;
    try {
      const cached = dbDataCache?.configurations?.appIconUrl;
      if (cached) return cached;
      const stored = localStorage.getItem("pardais_app_icon_url");
      if (stored) return stored;
    } catch (e) {}
    return "";
  });

  useEffect(() => {
    const updateIcon = () => {
      if (overrideIconUrl) {
        setCurrentIconUrl(overrideIconUrl);
        return;
      }
      const url = dbDataCache?.configurations?.appIconUrl || localStorage.getItem("pardais_app_icon_url") || "";
      setCurrentIconUrl(url);
    };

    updateIcon();
    window.addEventListener("pardais_app_icon_changed", updateIcon);
    const interval = setInterval(updateIcon, 1000);
    return () => {
      window.removeEventListener("pardais_app_icon_changed", updateIcon);
      clearInterval(interval);
    };
  }, [overrideIconUrl]);

  const iconSizeMap = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-24 h-24",
    xl: "w-36 h-36",
    custom: customSizeClass,
  };

  const iconClass = iconSizeMap[size];

  return (
    <div
      className={`inline-flex items-center justify-center ${
        textPosition === "bottom" ? "flex-col space-y-3" : "space-x-3.5"
      } ${className}`}
    >
      {/* Dynamic Pardais Party Neon Logo Icon */}
      <div className={`relative ${iconClass} flex items-center justify-center select-none shrink-0`}>
        {/* Neon Pink & Electric Blue Dual Glow Background */}
        <div className="absolute inset-0 bg-gradient-to-tr from-[#FF2DCE] via-[#7B2CBF] to-[#2A7BFF] rounded-[28%] opacity-40 blur-lg pointer-events-none animate-pulse"></div>

        {currentIconUrl ? (
          /* Render Admin Custom App Icon */
          <div className="relative w-full h-full rounded-[26%] bg-[#0A0A0A] p-1 border-2 border-[#FF2DCE] shadow-[0_0_20px_rgba(255,45,206,0.6)] flex items-center justify-center overflow-hidden group">
            <img
              src={currentIconUrl}
              alt="Pardais Live App Icon"
              className="w-full h-full object-cover rounded-[20%] shadow-inner transition-transform group-hover:scale-105"
              onError={() => setCurrentIconUrl("")}
            />
            {/* Glossy Overlay Reflection */}
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent rounded-[26%] pointer-events-none"></div>
          </div>
        ) : (
          /* Default SVG App Icon */
          <svg
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full drop-shadow-[0_4px_16px_rgba(255,45,206,0.45)]"
          >
            <defs>
              <linearGradient id="pardaisNeonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FF2DCE" />
                <stop offset="50%" stopColor="#A855F7" />
                <stop offset="100%" stopColor="#2A7BFF" />
              </linearGradient>

              <linearGradient id="pardaisBorderGrad" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#2A7BFF" />
                <stop offset="50%" stopColor="#FF2DCE" />
                <stop offset="100%" stopColor="#FFD700" />
              </linearGradient>

              <linearGradient id="spotlightBeam" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#2A7BFF" stopOpacity="0.8" />
                <stop offset="60%" stopColor="#FF2DCE" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#FF2DCE" stopOpacity="0" />
              </linearGradient>

              <filter id="pardaisNeonGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="2.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <rect
              x="3"
              y="3"
              width="94"
              height="94"
              rx="26"
              fill="#0A0A0A"
              stroke="url(#pardaisBorderGrad)"
              strokeWidth="2.5"
            />

            <g opacity="0.45">
              <polygon points="50,10 15,90 35,90" fill="url(#spotlightBeam)" />
              <polygon points="50,10 65,90 85,90" fill="url(#spotlightBeam)" />
              <polygon points="50,10 40,90 60,90" fill="url(#spotlightBeam)" opacity="0.6" />
            </g>

            {animate && (
              <circle
                cx="50"
                cy="50"
                r="41"
                stroke="url(#pardaisNeonGrad)"
                strokeWidth="1.2"
                strokeDasharray="4, 10"
                className="origin-center animate-spin-slow opacity-40"
                style={{ animationDuration: "14s" }}
              />
            )}

            <g fill="#0A0A0A" opacity="0.95">
              <path d="M 12 90 Q 15 78 18 90 Q 22 75 26 90 Q 30 80 34 90 Q 38 72 42 90 Q 46 80 50 90 Q 54 75 58 90 Q 62 80 66 90 Q 70 72 74 90 Q 78 82 82 90 Q 86 78 88 90 L 90 92 L 10 92 Z" />
            </g>
            <path
              d="M 12 88 Q 15 76 18 88 Q 22 73 26 88 Q 30 78 34 88 Q 38 70 42 88 Q 46 78 50 88 Q 54 73 58 88 Q 62 78 66 88 Q 70 70 74 88 Q 78 80 82 88 Q 86 76 88 88"
              stroke="#2A7BFF"
              strokeWidth="1.5"
              fill="none"
              opacity="0.85"
            />

            <g filter="url(#pardaisNeonGlow)">
              <path
                d="M 28 22 L 28 78"
                stroke="url(#pardaisNeonGrad)"
                strokeWidth="8"
                strokeLinecap="round"
              />
              <path
                d="M 28 22 H 54 C 68 22 68 50 54 50 H 28"
                stroke="url(#pardaisNeonGrad)"
                strokeWidth="8"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />

              <g transform="translate(42, 28) scale(0.35)">
                <circle cx="20" cy="12" r="6" fill="#FFFFFF" />
                <path d="M 20 18 Q 22 30 18 42 M 16 22 L 30 14" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
                <circle cx="32" cy="13" r="3.5" fill="#FF2DCE" />
                <line x1="32" y1="16.5" x2="35" y2="24" stroke="#2A7BFF" strokeWidth="2.5" />
              </g>
            </g>

            <circle cx="75" cy="22" r="2" fill="#FFD700" className="animate-ping" />
            <circle cx="20" cy="30" r="1.5" fill="#FF2DCE" className="animate-pulse" />
            <circle cx="82" cy="55" r="2" fill="#2A7BFF" className="animate-pulse" />
          </svg>
        )}

        {/* Live Party Glow Badge */}
        <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF2DCE] opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-[#FF2DCE] border border-[#0A0A0A] shadow-[0_0_8px_#FF2DCE]"></span>
        </span>
      </div>

      {/* Dynamic Text Branding */}
      {showText && (
        <div className={textPosition === "bottom" ? "text-center" : "text-left"}>
          <h1
            className={`font-black tracking-wider text-white uppercase font-sans ${
              size === "sm"
                ? "text-sm"
                : size === "md"
                ? "text-lg"
                : size === "lg"
                ? "text-3xl"
                : "text-4xl"
            }`}
          >
            PARDAIS{" "}
            <span className="bg-gradient-to-r from-[#FF2DCE] via-[#A855F7] to-[#2A7BFF] bg-clip-text text-transparent drop-shadow-[0_0_12px_rgba(255,45,206,0.6)]">
              PARTY
            </span>
          </h1>
          <p className="text-[7.5px] text-[#2A7BFF] font-bold tracking-[0.25em] uppercase font-mono mt-0.5 whitespace-nowrap">
            Where Every Party Comes Alive ✨
          </p>
        </div>
      )}
    </div>
  );
};

// Re-export for compatibility with legacy import references
export const SehrLiveLogo = PardaisPartyLogo;
export const PardaisLiveLogo = PardaisPartyLogo;
