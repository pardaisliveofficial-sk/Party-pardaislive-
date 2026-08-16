import React from "react";

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
  size = "md", customSizeClass = "", showText = false, textPosition = "right", className = "",
}) => {
  const iconSizeMap = { sm: "w-8 h-8", md: "w-12 h-12", lg: "w-24 h-24", xl: "w-36 h-36", custom: customSizeClass };
  const iconClass = iconSizeMap[size];
  return (
    <div className={`inline-flex items-center justify-center ${textPosition === "bottom" ? "flex-col space-y-3" : "space-x-3.5"} ${className}`}>
      <div className={`relative ${iconClass} flex items-center justify-center select-none shrink-0`}>
        <img src="/pardais-party-exact.png?v=8" alt="Pardais Party" className="w-full h-full object-contain select-none" draggable={false} />
      </div>
      {showText && (
        <div className={textPosition === "bottom" ? "text-center" : "text-left"}>
          <h1 className={`font-black tracking-wider text-white uppercase font-sans ${size === "sm" ? "text-sm" : size === "md" ? "text-lg" : size === "lg" ? "text-3xl" : "text-4xl"}`}>PARDAIS <span className="bg-gradient-to-r from-[#FF2DCE] via-[#A855F7] to-[#2A7BFF] bg-clip-text text-transparent">PARTY</span></h1>
          <p className="text-[7.5px] text-[#2A7BFF] font-bold tracking-[0.25em] uppercase font-mono mt-0.5 whitespace-nowrap">Where Every Party Comes Alive ✨</p>
        </div>
      )}
    </div>
  );
};
export const SehrLiveLogo = PardaisPartyLogo;
export const PardaisLiveLogo = PardaisPartyLogo;
