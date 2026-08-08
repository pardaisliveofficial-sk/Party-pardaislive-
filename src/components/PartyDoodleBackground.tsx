import React from "react";

interface PartyDoodleBackgroundProps {
  variant?: "vibrant-fiesta" | "neon-party" | "golden-royale" | "cyber-sunset" | "whatsapp-classic";
  children?: React.ReactNode;
  className?: string;
  showDoodles?: boolean;
}

export const PartyDoodleBackground: React.FC<PartyDoodleBackgroundProps> = ({
  variant = "vibrant-fiesta",
  children,
  className = "",
  showDoodles = true,
}) => {
  // Variant gradient themes
  const getGradientClass = () => {
    switch (variant) {
      case "neon-party":
        return "from-[#1a0933] via-[#0d153a] to-[#26052e]";
      case "golden-royale":
        return "from-[#241705] via-[#1a1208] to-[#2e1c03]";
      case "cyber-sunset":
        return "from-[#2b0826] via-[#170a2c] to-[#07192e]";
      case "whatsapp-classic":
        return "from-[#0f1d21] via-[#152a26] to-[#0c1822]";
      case "vibrant-fiesta":
      default:
        return "from-[#1c0d38] via-[#120e2e] to-[#2b0c36]";
    }
  };

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* 1. VIBRANT COLORFUL BASE GRADIENT */}
      <div className={`absolute inset-0 bg-gradient-to-br ${getGradientClass()} -z-30`} />

      {/* 2. AMBIENT NEON GLOW ORBS */}
      <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[40%] rounded-full bg-gradient-to-r from-[#ff007f]/30 to-[#9c6bff]/20 blur-3xl pointer-events-none -z-20 animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[40%] rounded-full bg-gradient-to-r from-[#00e5ff]/25 to-[#7c4dff]/25 blur-3xl pointer-events-none -z-20 animate-pulse" style={{ animationDuration: '4s' }} />
      <div className="absolute top-[40%] right-[-5%] w-[45%] h-[35%] rounded-full bg-gradient-to-r from-[#ffd54f]/20 to-[#ff4f87]/20 blur-3xl pointer-events-none -z-20" />

      {/* 3. WHATSAPP-STYLE PARTY & FUNNY DOODLE PATTERN OVERLAY */}
      {showDoodles && (
        <div className="absolute inset-0 pointer-events-none opacity-25 -z-10 mix-blend-overlay">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern
                id="whatsappPartyDoodle"
                width="140"
                height="140"
                patternUnits="userSpaceOnUse"
                patternTransform="rotate(15)"
              >
                <g fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                  {/* Party Popper / Hat */}
                  <path d="M 20 25 L 10 40 L 30 35 Z M 20 25 L 25 10 M 15 15 L 22 18 M 28 20 L 25 25" />
                  
                  {/* Microphone */}
                  <rect x="70" y="15" width="10" height="18" rx="5" />
                  <path d="M 66 26 C 66 34 84 34 84 26 M 75 34 L 75 42 M 70 42 L 80 42" />

                  {/* Musical Note */}
                  <path d="M 115 15 L 115 30 A 4 4 0 1 1 110 26 L 115 26" />

                  {/* Crown */}
                  <path d="M 15 75 L 20 90 L 35 90 L 40 75 L 33 82 L 27.5 73 L 22 82 Z" />

                  {/* Diamond */}
                  <path d="M 75 70 L 85 70 L 90 77 L 80 92 L 70 77 Z M 70 77 L 90 77 M 80 70 L 80 92" />

                  {/* Flame */}
                  <path d="M 120 70 C 115 80 120 92 127 92 C 133 92 136 84 130 76 C 130 84 125 86 125 80 Z" />

                  {/* Heart */}
                  <path d="M 25 120 C 20 110 10 115 15 125 L 25 135 L 35 125 C 40 115 30 110 25 120 Z" />

                  {/* Star / Sparkle */}
                  <path d="M 75 120 L 78 126 L 85 127 L 80 132 L 81 139 L 75 135 L 69 139 L 70 132 L 65 127 L 72 126 Z" />

                  {/* Headphones */}
                  <path d="M 110 125 C 110 115 130 115 130 125 M 108 125 A 3 5 0 0 1 112 133 M 128 125 A 3 5 0 0 1 132 133" />

                  {/* Confetti dots */}
                  <circle cx="45" cy="20" r="1.5" fill="currentColor" stroke="none" />
                  <circle cx="100" cy="50" r="1.5" fill="currentColor" stroke="none" />
                  <circle cx="50" cy="105" r="1.5" fill="currentColor" stroke="none" />
                  <circle cx="105" cy="100" r="1.5" fill="currentColor" stroke="none" />
                  <circle cx="135" cy="40" r="1.5" fill="currentColor" stroke="none" />
                  <circle cx="10" cy="60" r="1.5" fill="currentColor" stroke="none" />
                </g>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#whatsappPartyDoodle)" />
          </svg>
        </div>
      )}

      {/* CONTENT CHILDREN */}
      <div className="relative z-10">{children}</div>
    </div>
  );
};
