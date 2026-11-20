import React from 'react';

interface VipFrameSvgProps {
  vipTier: number; // 1 to 12
  className?: string;
  idPrefix?: string;
}

/**
 * High-Fidelity SVG Renderer for Alpha Mate VIP Frames (VIP 1 - VIP 12)
 * Meticulously matching the official collection artwork:
 * VIP 1: Silver Guardian
 * VIP 2: Bronze Elite
 * VIP 3: Golden Member
 * VIP 4: Platinum Star
 * VIP 5: Sapphire Lord
 * VIP 6: Emerald Knight
 * VIP 7: Ruby Master
 * VIP 8: Amethyst Royal
 * VIP 9: Diamond Emperor
 * VIP 10: Sovereign King
 * VIP 11: Celestial Overlord
 * VIP 12: Alpha Emperor (featuring sculpted roaring Lion heads & grand wings)
 */
export const VipFrameSvg: React.FC<VipFrameSvgProps> = ({
  vipTier,
  className = '',
  idPrefix = 'vip',
}) => {
  const uid = `${idPrefix}-${vipTier}`;

  // Shared Plaque Renderer
  const renderPlaque = (
    label: string,
    fillGradId: string,
    strokeGradId: string,
    textColor: string,
    borderStroke = '1.5'
  ) => (
    <g filter={`url(#${uid}-plaque-shadow)`}>
      {/* Outer Hex/Beveled Plaque */}
      <polygon
        points="70,154 130,154 138,164 130,174 70,174 62,164"
        fill={`url(#${fillGradId})`}
        stroke={`url(#${strokeGradId})`}
        strokeWidth={borderStroke}
        strokeLinejoin="round"
      />
      {/* Inner Accent Line */}
      <polygon
        points="72,156 128,156 134,164 128,172 72,172 66,164"
        fill="none"
        stroke={textColor}
        strokeOpacity="0.3"
        strokeWidth="0.8"
      />
      {/* Plaque Text */}
      <text
        x="100"
        y="167.5"
        textAnchor="middle"
        fontSize="9.5"
        fontWeight="900"
        fontFamily="'Plus Jakarta Sans', system-ui, sans-serif"
        letterSpacing="0.6px"
        fill={textColor}
        style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8))' }}
      >
        {label}
      </text>
    </g>
  );

  return (
    <svg
      viewBox="0 0 200 200"
      className={`w-full h-full pointer-events-none overflow-visible select-none ${className}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Universal drop shadow filter for plaques */}
        <filter id={`${uid}-plaque-shadow`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#000000" floodOpacity="0.75" />
        </filter>

        {/* Universal jewel sparkle glow */}
        <filter id={`${uid}-glow`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* ===================================================================
            VIP 1: SILVER GUARDIAN GRADIENTS
            =================================================================== */}
        {vipTier === 1 && (
          <>
            <linearGradient id={`${uid}-silver-ring`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#CBD5E1" />
              <stop offset="25%" stopColor="#F8FAFC" />
              <stop offset="50%" stopColor="#94A3B8" />
              <stop offset="75%" stopColor="#FFFFFF" />
              <stop offset="100%" stopColor="#64748B" />
            </linearGradient>
            <linearGradient id={`${uid}-amethyst`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#E9D5FF" />
              <stop offset="50%" stopColor="#A855F7" />
              <stop offset="100%" stopColor="#6B21A8" />
            </linearGradient>
            <linearGradient id={`${uid}-plaque-bg`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1E293B" />
              <stop offset="100%" stopColor="#090D16" />
            </linearGradient>
            <linearGradient id={`${uid}-silver-stroke`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#94A3B8" />
              <stop offset="50%" stopColor="#F8FAFC" />
              <stop offset="100%" stopColor="#94A3B8" />
            </linearGradient>
          </>
        )}

        {/* ===================================================================
            VIP 2: BRONZE ELITE GRADIENTS
            =================================================================== */}
        {vipTier === 2 && (
          <>
            <linearGradient id={`${uid}-bronze-ring`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#E2A76F" />
              <stop offset="30%" stopColor="#FDE68A" />
              <stop offset="55%" stopColor="#CD7F32" />
              <stop offset="85%" stopColor="#8C5523" />
              <stop offset="100%" stopColor="#E2A76F" />
            </linearGradient>
            <linearGradient id={`${uid}-gold-star`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FEF08A" />
              <stop offset="50%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#B45309" />
            </linearGradient>
            <linearGradient id={`${uid}-plaque-bg`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#2E1609" />
              <stop offset="100%" stopColor="#140803" />
            </linearGradient>
          </>
        )}

        {/* ===================================================================
            VIP 3: GOLDEN MEMBER GRADIENTS
            =================================================================== */}
        {vipTier === 3 && (
          <>
            <linearGradient id={`${uid}-gold-ring`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FDE047" />
              <stop offset="25%" stopColor="#FFFFFF" />
              <stop offset="50%" stopColor="#EAB308" />
              <stop offset="75%" stopColor="#CA8A04" />
              <stop offset="100%" stopColor="#FEF08A" />
            </linearGradient>
            <linearGradient id={`${uid}-gold-leaves`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FEF08A" />
              <stop offset="45%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#B45309" />
            </linearGradient>
            <linearGradient id={`${uid}-plaque-bg`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#3A2003" />
              <stop offset="100%" stopColor="#180C01" />
            </linearGradient>
          </>
        )}

        {/* ===================================================================
            VIP 4: PLATINUM STAR GRADIENTS
            =================================================================== */}
        {vipTier === 4 && (
          <>
            <linearGradient id={`${uid}-ice-ring`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38BDF8" />
              <stop offset="30%" stopColor="#E0F2FE" />
              <stop offset="55%" stopColor="#0284C7" />
              <stop offset="80%" stopColor="#BAE6FD" />
              <stop offset="100%" stopColor="#0369A1" />
            </linearGradient>
            <linearGradient id={`${uid}-crystal-grad`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="40%" stopColor="#38BDF8" />
              <stop offset="100%" stopColor="#0284C7" />
            </linearGradient>
            <linearGradient id={`${uid}-plaque-bg`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#082F49" />
              <stop offset="100%" stopColor="#031522" />
            </linearGradient>
          </>
        )}

        {/* ===================================================================
            VIP 5: SAPPHIRE LORD GRADIENTS
            =================================================================== */}
        {vipTier === 5 && (
          <>
            <linearGradient id={`${uid}-sapphire-ring`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#60A5FA" />
              <stop offset="30%" stopColor="#93C5FD" />
              <stop offset="60%" stopColor="#1D4ED8" />
              <stop offset="85%" stopColor="#38BDF8" />
              <stop offset="100%" stopColor="#1E3A8A" />
            </linearGradient>
            <linearGradient id={`${uid}-sapphire-gem`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#E0F2FE" />
              <stop offset="50%" stopColor="#2563EB" />
              <stop offset="100%" stopColor="#1E3A8A" />
            </linearGradient>
            <linearGradient id={`${uid}-plaque-bg`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#172554" />
              <stop offset="100%" stopColor="#080E23" />
            </linearGradient>
          </>
        )}

        {/* ===================================================================
            VIP 6: EMERALD KNIGHT GRADIENTS
            =================================================================== */}
        {vipTier === 6 && (
          <>
            <linearGradient id={`${uid}-emerald-ring`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#34D399" />
              <stop offset="25%" stopColor="#A7F3D0" />
              <stop offset="50%" stopColor="#059669" />
              <stop offset="75%" stopColor="#6EE7B7" />
              <stop offset="100%" stopColor="#047857" />
            </linearGradient>
            <linearGradient id={`${uid}-emerald-gem`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#D1FAE5" />
              <stop offset="50%" stopColor="#10B981" />
              <stop offset="100%" stopColor="#064E3B" />
            </linearGradient>
            <linearGradient id={`${uid}-plaque-bg`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#064E3B" />
              <stop offset="100%" stopColor="#022118" />
            </linearGradient>
          </>
        )}

        {/* ===================================================================
            VIP 7: RUBY MASTER GRADIENTS
            =================================================================== */}
        {vipTier === 7 && (
          <>
            <linearGradient id={`${uid}-ruby-ring`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F87171" />
              <stop offset="30%" stopColor="#FECACA" />
              <stop offset="55%" stopColor="#DC2626" />
              <stop offset="85%" stopColor="#991B1B" />
              <stop offset="100%" stopColor="#EF4444" />
            </linearGradient>
            <linearGradient id={`${uid}-ruby-gem`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FEE2E2" />
              <stop offset="50%" stopColor="#EF4444" />
              <stop offset="100%" stopColor="#7F1D1D" />
            </linearGradient>
            <linearGradient id={`${uid}-plaque-bg`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#450A0A" />
              <stop offset="100%" stopColor="#1B0404" />
            </linearGradient>
          </>
        )}

        {/* ===================================================================
            VIP 8: AMETHYST ROYAL GRADIENTS
            =================================================================== */}
        {vipTier === 8 && (
          <>
            <linearGradient id={`${uid}-amethyst-ring`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#C084FC" />
              <stop offset="30%" stopColor="#F3E8FF" />
              <stop offset="55%" stopColor="#9333EA" />
              <stop offset="85%" stopColor="#6B21A8" />
              <stop offset="100%" stopColor="#A855F7" />
            </linearGradient>
            <linearGradient id={`${uid}-royal-gold`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FEF08A" />
              <stop offset="50%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#B45309" />
            </linearGradient>
            <linearGradient id={`${uid}-plaque-bg`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#3B0764" />
              <stop offset="100%" stopColor="#150226" />
            </linearGradient>
          </>
        )}

        {/* ===================================================================
            VIP 9: DIAMOND EMPEROR GRADIENTS
            =================================================================== */}
        {vipTier === 9 && (
          <>
            <linearGradient id={`${uid}-diamond-ring`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#BAE6FD" />
              <stop offset="25%" stopColor="#FFFFFF" />
              <stop offset="50%" stopColor="#38BDF8" />
              <stop offset="75%" stopColor="#0284C7" />
              <stop offset="100%" stopColor="#E0F2FE" />
            </linearGradient>
            <linearGradient id={`${uid}-tiara-grad`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="45%" stopColor="#7DD3FC" />
              <stop offset="100%" stopColor="#0284C7" />
            </linearGradient>
            <linearGradient id={`${uid}-plaque-bg`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#0C4A6E" />
              <stop offset="100%" stopColor="#031F30" />
            </linearGradient>
          </>
        )}

        {/* ===================================================================
            VIP 10: SOVEREIGN KING GRADIENTS
            =================================================================== */}
        {vipTier === 10 && (
          <>
            <linearGradient id={`${uid}-king-gold`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FDE047" />
              <stop offset="25%" stopColor="#FFFBEB" />
              <stop offset="50%" stopColor="#EAB308" />
              <stop offset="75%" stopColor="#CA8A04" />
              <stop offset="100%" stopColor="#F59E0B" />
            </linearGradient>
            <linearGradient id={`${uid}-king-wings`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFFBEB" />
              <stop offset="35%" stopColor="#FDE047" />
              <stop offset="70%" stopColor="#D97706" />
              <stop offset="100%" stopColor="#92400E" />
            </linearGradient>
            <linearGradient id={`${uid}-king-ruby`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FECACA" />
              <stop offset="50%" stopColor="#EF4444" />
              <stop offset="100%" stopColor="#991B1B" />
            </linearGradient>
            <linearGradient id={`${uid}-plaque-bg`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#451A03" />
              <stop offset="100%" stopColor="#1B0901" />
            </linearGradient>
          </>
        )}

        {/* ===================================================================
            VIP 11: CELESTIAL OVERLORD GRADIENTS
            =================================================================== */}
        {vipTier === 11 && (
          <>
            <linearGradient id={`${uid}-celestial-purple`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#E879F9" />
              <stop offset="40%" stopColor="#A855F7" />
              <stop offset="100%" stopColor="#581C87" />
            </linearGradient>
            <linearGradient id={`${uid}-celestial-gold`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FEF08A" />
              <stop offset="50%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#B45309" />
            </linearGradient>
            <linearGradient id={`${uid}-plaque-bg`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#3B0764" />
              <stop offset="100%" stopColor="#170326" />
            </linearGradient>
          </>
        )}

        {/* ===================================================================
            VIP 12: ALPHA EMPEROR GRADIENTS (GRAND MASTERPIECE)
            =================================================================== */}
        {vipTier === 12 && (
          <>
            <linearGradient id={`${uid}-emperor-gold`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFFBEB" />
              <stop offset="25%" stopColor="#FDE047" />
              <stop offset="50%" stopColor="#EAB308" />
              <stop offset="75%" stopColor="#CA8A04" />
              <stop offset="100%" stopColor="#B45309" />
            </linearGradient>
            <linearGradient id={`${uid}-emperor-purple`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F0ABFC" />
              <stop offset="40%" stopColor="#C084FC" />
              <stop offset="75%" stopColor="#7E22CE" />
              <stop offset="100%" stopColor="#3B0764" />
            </linearGradient>
            <linearGradient id={`${uid}-lion-shading`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FEF08A" />
              <stop offset="40%" stopColor="#F59E0B" />
              <stop offset="75%" stopColor="#B45309" />
              <stop offset="100%" stopColor="#78350F" />
            </linearGradient>
            <linearGradient id={`${uid}-plaque-bg`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#451A03" />
              <stop offset="50%" stopColor="#3B0764" />
              <stop offset="100%" stopColor="#150226" />
            </linearGradient>
          </>
        )}
      </defs>

      {/* =====================================================================
          VIP 1 – SILVER GUARDIAN
          Double silver metallic rings, amethyst diamond star at apex,
          purple side glints, silver beveled plaque "VIP 1"
          ===================================================================== */}
      {vipTier === 1 && (
        <g>
          {/* Subtle Outer Violet Aura */}
          <circle cx="100" cy="100" r="58" stroke="#A855F7" strokeWidth="1.5" strokeOpacity="0.4" />

          {/* Primary Double Silver Ring */}
          <circle cx="100" cy="100" r="54" stroke={`url(#${uid}-silver-ring)`} strokeWidth="4" />
          <circle cx="100" cy="100" r="48" stroke="#E2E8F0" strokeWidth="1.2" strokeOpacity="0.7" />

          {/* Side Purple Flare Accents at 3 & 9 o'clock */}
          <circle cx="46" cy="100" r="3" fill="#A855F7" style={{ filter: 'drop-shadow(0 0 4px #C084FC)' }} />
          <path d="M46 94 L46 106 M40 100 L52 100" stroke="#E9D5FF" strokeWidth="1" strokeLinecap="round" />

          <circle cx="154" cy="100" r="3" fill="#A855F7" style={{ filter: 'drop-shadow(0 0 4px #C084FC)' }} />
          <path d="M154 94 L154 106 M148 100 L160 100" stroke="#E9D5FF" strokeWidth="1" strokeLinecap="round" />

          {/* Top Apex: Amethyst Rhombus Jewel */}
          <g transform="translate(100, 44)">
            <polygon
              points="0,-8 7,0 0,8 -7,0"
              fill={`url(#${uid}-amethyst)`}
              stroke="#F8FAFC"
              strokeWidth="1.2"
              style={{ filter: 'drop-shadow(0 0 6px #A855F7)' }}
            />
            {/* Center diamond facet highlight */}
            <polygon points="0,-4 3,0 0,4 -3,0" fill="#FFFFFF" fillOpacity="0.75" />
          </g>

          {/* Bottom Plaque: VIP 1 */}
          {renderPlaque('VIP 1', `${uid}-plaque-bg`, `${uid}-silver-stroke`, '#F8FAFC', '1.8')}
        </g>
      )}

      {/* =====================================================================
          VIP 2 – BRONZE ELITE
          Warm rose-bronze ring, golden 5-point star on top,
          symmetrical bronze laurel leaves curving up bottom sides, plaque "VIP 2"
          ===================================================================== */}
      {vipTier === 2 && (
        <g>
          {/* Outer Warm Corona */}
          <circle cx="100" cy="100" r="57" stroke="#CD7F32" strokeWidth="1" strokeOpacity="0.35" />

          {/* Primary Bronze Metallic Ring */}
          <circle cx="100" cy="100" r="53" stroke={`url(#${uid}-bronze-ring)`} strokeWidth="4.5" />
          <circle cx="100" cy="100" r="47.5" stroke="#FDE68A" strokeWidth="1" strokeOpacity="0.5" />

          {/* Bottom Laurel Leaves Left */}
          <g fill={`url(#${uid}-bronze-ring)`} stroke="#8C5523" strokeWidth="0.8">
            <path d="M 68 155 Q 54 148 50 136 Q 58 139 65 147 Z" />
            <path d="M 58 144 Q 48 136 46 124 Q 54 128 60 137 Z" />
            <path d="M 52 130 Q 44 120 44 108 Q 50 114 54 124 Z" />
          </g>

          {/* Bottom Laurel Leaves Right */}
          <g fill={`url(#${uid}-bronze-ring)`} stroke="#8C5523" strokeWidth="0.8">
            <path d="M 132 155 Q 146 148 150 136 Q 142 139 135 147 Z" />
            <path d="M 142 144 Q 152 136 154 124 Q 146 128 140 137 Z" />
            <path d="M 148 130 Q 156 120 156 108 Q 150 114 146 124 Z" />
          </g>

          {/* Top Apex: Golden 5-Point Star */}
          <g transform="translate(100, 43)">
            <polygon
              points="0,-10 3,-3 10,-3 4,2 6,9 0,5 -6,9 -4,2 -10,-3 -3,-3"
              fill={`url(#${uid}-gold-star)`}
              stroke="#FFFBEB"
              strokeWidth="0.8"
              style={{ filter: 'drop-shadow(0 0 5px #F59E0B)' }}
            />
            <circle cx="0" cy="1" r="1.5" fill="#FFFFFF" />
          </g>

          {/* Bottom Plaque: VIP 2 */}
          {renderPlaque('VIP 2', `${uid}-plaque-bg`, `${uid}-bronze-ring`, '#FDE68A', '1.8')}
        </g>
      )}

      {/* =====================================================================
          VIP 3 – GOLDEN MEMBER
          Radiant 24K gold ring, glowing top 5-point star with solar halo,
          lush golden laurel wreath wrapping bottom third, plaque "VIP 3"
          ===================================================================== */}
      {vipTier === 3 && (
        <g>
          {/* Outer Solar Aura */}
          <circle cx="100" cy="100" r="58" stroke="#FDE047" strokeWidth="1.2" strokeOpacity="0.45" />

          {/* Primary 24K Gold Contoured Ring */}
          <circle cx="100" cy="100" r="53" stroke={`url(#${uid}-gold-ring)`} strokeWidth="5" />
          <circle cx="100" cy="100" r="47" stroke="#FFFBEB" strokeWidth="1.2" strokeOpacity="0.75" />

          {/* Left Golden Laurel Leaves (Rich Curved Wreath) */}
          <g fill={`url(#${uid}-gold-leaves)`} stroke="#B45309" strokeWidth="0.9">
            <path d="M 70 158 Q 50 152 46 138 Q 56 141 66 150 Z" />
            <path d="M 58 146 Q 42 138 38 122 Q 48 126 56 138 Z" />
            <path d="M 48 132 Q 36 120 34 104 Q 44 109 48 122 Z" />
            <path d="M 42 116 Q 34 102 36 88 Q 42 96 44 108 Z" />
          </g>

          {/* Right Golden Laurel Leaves */}
          <g fill={`url(#${uid}-gold-leaves)`} stroke="#B45309" strokeWidth="0.9">
            <path d="M 130 158 Q 150 152 154 138 Q 144 141 134 150 Z" />
            <path d="M 142 146 Q 158 138 162 122 Q 152 126 144 138 Z" />
            <path d="M 152 132 Q 164 120 166 104 Q 156 109 152 122 Z" />
            <path d="M 158 116 Q 166 102 164 88 Q 158 96 156 108 Z" />
          </g>

          {/* Top Apex: Radiant Golden Star & Solar Corona */}
          <g transform="translate(100, 42)">
            {/* 4-point solar flare behind star */}
            <path d="M0 -14 L2 0 L0 14 L-2 0 Z M-14 0 L0 2 L14 0 L0 -2 Z" fill="#FFFBEB" fillOpacity="0.6" />
            <polygon
              points="0,-11 3.5,-3 11,-3 5,2 7,10 0,6 -7,10 -5,2 -11,-3 -3.5,-3"
              fill={`url(#${uid}-gold-ring)`}
              stroke="#FFFFFF"
              strokeWidth="1"
              style={{ filter: 'drop-shadow(0 0 7px #FACC15)' }}
            />
            <circle cx="0" cy="1" r="2" fill="#FFFFFF" />
          </g>

          {/* Bottom Plaque: VIP 3 */}
          {renderPlaque('VIP 3', `${uid}-plaque-bg`, `${uid}-gold-ring`, '#FEF08A', '2')}
        </g>
      )}

      {/* =====================================================================
          VIP 4 – PLATINUM STAR
          Ice-blue/platinum ring, apex cyan diamond,
          crystalline ice wing shards on lower sides, plaque "VIP 4"
          ===================================================================== */}
      {vipTier === 4 && (
        <g>
          {/* Radiant Ice Halo */}
          <circle cx="100" cy="100" r="58" stroke="#38BDF8" strokeWidth="1.2" strokeOpacity="0.4" />

          {/* Platinum / Ice Ring */}
          <circle cx="100" cy="100" r="53" stroke={`url(#${uid}-ice-ring)`} strokeWidth="4.5" />
          <circle cx="100" cy="100" r="47.5" stroke="#BAE6FD" strokeWidth="1.2" strokeOpacity="0.7" />

          {/* Left Ice Crystal Wing Shards */}
          <g fill={`url(#${uid}-crystal-grad)`} stroke="#0284C7" strokeWidth="0.8">
            {/* Shard 1 (Lowest) */}
            <polygon points="68,154 48,152 42,142 58,146" />
            {/* Shard 2 (Middle) */}
            <polygon points="56,144 32,136 26,124 46,134" />
            {/* Shard 3 (Highest) */}
            <polygon points="48,130 24,118 20,104 38,118" />
          </g>

          {/* Right Ice Crystal Wing Shards */}
          <g fill={`url(#${uid}-crystal-grad)`} stroke="#0284C7" strokeWidth="0.8">
            {/* Shard 1 (Lowest) */}
            <polygon points="132,154 152,152 158,142 142,146" />
            {/* Shard 2 (Middle) */}
            <polygon points="144,144 168,136 174,124 154,134" />
            {/* Shard 3 (Highest) */}
            <polygon points="152,130 176,118 180,104 162,118" />
          </g>

          {/* Top Apex: Cyan Faceted Rhombus Diamond */}
          <g transform="translate(100, 42)">
            <polygon
              points="0,-10 9,0 0,10 -9,0"
              fill={`url(#${uid}-crystal-grad)`}
              stroke="#FFFFFF"
              strokeWidth="1.2"
              style={{ filter: 'drop-shadow(0 0 7px #00F5FF)' }}
            />
            <polygon points="0,-6 5,0 0,6 -5,0" fill="#E0F2FE" fillOpacity="0.8" />
            <circle cx="0" cy="0" r="1.5" fill="#FFFFFF" />
          </g>

          {/* Bottom Plaque: VIP 4 */}
          {renderPlaque('VIP 4', `${uid}-plaque-bg`, `${uid}-ice-ring`, '#E0F2FE', '2')}
        </g>
      )}

      {/* =====================================================================
          VIP 5 – SAPPHIRE LORD
          Deep royal sapphire crystal ring, apex sapphire diamond,
          layered sapphire crystal wings fanning outward, plaque "VIP 5"
          ===================================================================== */}
      {vipTier === 5 && (
        <g>
          {/* Intense Sapphire Blue Outer Aura */}
          <circle cx="100" cy="100" r="59" stroke="#60A5FA" strokeWidth="1.5" strokeOpacity="0.5" />

          {/* Primary Sapphire Crystal Ring */}
          <circle cx="100" cy="100" r="53" stroke={`url(#${uid}-sapphire-ring)`} strokeWidth="5" />
          <circle cx="100" cy="100" r="47" stroke="#93C5FD" strokeWidth="1.2" strokeOpacity="0.8" />

          {/* Left Sapphire Crystal Wings (Layered Wide Crystals) */}
          <g fill={`url(#${uid}-sapphire-ring)`} stroke="#1E3A8A" strokeWidth="0.9">
            <polygon points="66,155 42,156 34,144 54,146" />
            <polygon points="54,144 26,140 18,126 42,132" />
            <polygon points="46,130 16,120 10,104 34,116" />
            <polygon points="42,114 14,98 12,82 34,98" />
          </g>

          {/* Right Sapphire Crystal Wings */}
          <g fill={`url(#${uid}-sapphire-ring)`} stroke="#1E3A8A" strokeWidth="0.9">
            <polygon points="134,155 158,156 166,144 146,146" />
            <polygon points="146,144 174,140 182,126 158,132" />
            <polygon points="154,130 184,120 190,104 166,116" />
            <polygon points="158,114 186,98 188,82 166,98" />
          </g>

          {/* Top Apex: Royal Sapphire Faceted Rhombus */}
          <g transform="translate(100, 41)">
            <polygon
              points="0,-11 10,0 0,11 -10,0"
              fill={`url(#${uid}-sapphire-gem)`}
              stroke="#BAE6FD"
              strokeWidth="1.4"
              style={{ filter: 'drop-shadow(0 0 8px #2563EB)' }}
            />
            {/* Facet lines */}
            <line x1="0" y1="-11" x2="0" y2="11" stroke="#FFFFFF" strokeWidth="0.8" strokeOpacity="0.8" />
            <line x1="-10" y1="0" x2="10" y2="0" stroke="#FFFFFF" strokeWidth="0.8" strokeOpacity="0.8" />
          </g>

          {/* Bottom Plaque: VIP 5 */}
          {renderPlaque('VIP 5', `${uid}-plaque-bg`, `${uid}-sapphire-ring`, '#BAE6FD', '2')}
        </g>
      )}

      {/* =====================================================================
          VIP 6 – EMERALD KNIGHT
          Emerald green crystal ring, apex emerald diamond,
          lush emerald crystal laurel leaves/wings, plaque "VIP 6"
          ===================================================================== */}
      {vipTier === 6 && (
        <g>
          {/* Emerald Green Corona */}
          <circle cx="100" cy="100" r="59" stroke="#34D399" strokeWidth="1.5" strokeOpacity="0.5" />

          {/* Primary Emerald Ring */}
          <circle cx="100" cy="100" r="53" stroke={`url(#${uid}-emerald-ring)`} strokeWidth="5" />
          <circle cx="100" cy="100" r="47" stroke="#A7F3D0" strokeWidth="1.2" strokeOpacity="0.8" />

          {/* Left Emerald Crystal Laurel Leaves */}
          <g fill={`url(#${uid}-emerald-ring)`} stroke="#064E3B" strokeWidth="0.9">
            <path d="M 68 156 Q 46 150 40 136 Q 52 139 64 148 Z" />
            <path d="M 56 144 Q 34 134 28 118 Q 42 122 52 136 Z" />
            <path d="M 46 130 Q 24 116 20 98 Q 34 104 42 120 Z" />
            <path d="M 40 114 Q 22 96 22 78 Q 32 86 38 102 Z" />
          </g>

          {/* Right Emerald Crystal Laurel Leaves */}
          <g fill={`url(#${uid}-emerald-ring)`} stroke="#064E3B" strokeWidth="0.9">
            <path d="M 132 156 Q 154 150 160 136 Q 148 139 136 148 Z" />
            <path d="M 144 144 Q 166 134 172 118 Q 158 122 148 136 Z" />
            <path d="M 154 130 Q 176 116 180 98 Q 166 104 158 120 Z" />
            <path d="M 160 114 Q 178 96 178 78 Q 168 86 162 102 Z" />
          </g>

          {/* Top Apex: Emerald Diamond Gem */}
          <g transform="translate(100, 41)">
            <polygon
              points="0,-11 10,0 0,11 -10,0"
              fill={`url(#${uid}-emerald-gem)`}
              stroke="#D1FAE5"
              strokeWidth="1.4"
              style={{ filter: 'drop-shadow(0 0 8px #10B981)' }}
            />
            <polygon points="0,-6 6,0 0,6 -6,0" fill="#FFFFFF" fillOpacity="0.6" />
          </g>

          {/* Bottom Plaque: VIP 6 */}
          {renderPlaque('VIP 6', `${uid}-plaque-bg`, `${uid}-emerald-ring`, '#A7F3D0', '2')}
        </g>
      )}

      {/* =====================================================================
          VIP 7 – RUBY MASTER
          Fiery crimson ruby faceted ring, radiant apex ruby rhombus,
          crimson flame crystal wings, plaque "VIP 7"
          ===================================================================== */}
      {vipTier === 7 && (
        <g>
          {/* Radiant Ruby Corona */}
          <circle cx="100" cy="100" r="59" stroke="#EF4444" strokeWidth="1.5" strokeOpacity="0.5" />

          {/* Primary Ruby Crystal Ring */}
          <circle cx="100" cy="100" r="53" stroke={`url(#${uid}-ruby-ring)`} strokeWidth="5" />
          <circle cx="100" cy="100" r="47" stroke="#FECACA" strokeWidth="1.2" strokeOpacity="0.8" />

          {/* Left Ruby Flame Crystal Wings */}
          <g fill={`url(#${uid}-ruby-ring)`} stroke="#7F1D1D" strokeWidth="0.9">
            <polygon points="66,155 38,154 28,140 52,144" />
            <polygon points="52,142 22,136 12,120 40,128" />
            <polygon points="44,126 12,114 4,96 32,112" />
            <polygon points="40,110 10,92 6,74 32,94" />
          </g>

          {/* Right Ruby Flame Crystal Wings */}
          <g fill={`url(#${uid}-ruby-ring)`} stroke="#7F1D1D" strokeWidth="0.9">
            <polygon points="134,155 162,154 172,140 148,144" />
            <polygon points="148,142 178,136 188,120 160,128" />
            <polygon points="156,126 188,114 196,96 168,112" />
            <polygon points="160,110 190,92 194,74 168,94" />
          </g>

          {/* Top Apex: Large Sparkling Ruby Jewel */}
          <g transform="translate(100, 40)">
            <polygon
              points="0,-12 11,0 0,12 -11,0"
              fill={`url(#${uid}-ruby-gem)`}
              stroke="#FEE2E2"
              strokeWidth="1.5"
              style={{ filter: 'drop-shadow(0 0 9px #EF4444)' }}
            />
            {/* Jewel Facet Highlights */}
            <polygon points="0,-7 6,0 0,7 -6,0" fill="#FFFFFF" fillOpacity="0.65" />
            <line x1="0" y1="-12" x2="0" y2="12" stroke="#FFFFFF" strokeWidth="0.8" strokeOpacity="0.9" />
          </g>

          {/* Bottom Plaque: VIP 7 */}
          {renderPlaque('VIP 7', `${uid}-plaque-bg`, `${uid}-ruby-ring`, '#FECACA', '2')}
        </g>
      )}

      {/* =====================================================================
          VIP 8 – AMETHYST ROYAL
          Mystical violet amethyst crystal ring, gold inner border,
          apex amethyst jewel, purple & gold crystal wings, plaque "VIP 8"
          ===================================================================== */}
      {vipTier === 8 && (
        <g>
          {/* Violet & Gold Radiant Aura */}
          <circle cx="100" cy="100" r="59" stroke="#C084FC" strokeWidth="1.5" strokeOpacity="0.5" />

          {/* Primary Amethyst Crystal Ring */}
          <circle cx="100" cy="100" r="53" stroke={`url(#${uid}-amethyst-ring)`} strokeWidth="5.5" />
          <circle cx="100" cy="100" r="46.5" stroke="#FDE047" strokeWidth="1.3" strokeOpacity="0.85" />

          {/* Golden Laurels (Bottom Layer) */}
          <g fill={`url(#${uid}-royal-gold)`} stroke="#B45309" strokeWidth="0.8">
            <path d="M 70 158 Q 50 154 44 142 Q 56 144 66 152 Z" />
            <path d="M 130 158 Q 150 154 156 142 Q 144 144 134 152 Z" />
          </g>

          {/* Left Purple Amethyst Crystal Wings */}
          <g fill={`url(#${uid}-amethyst-ring)`} stroke="#4C1D95" strokeWidth="0.9">
            <polygon points="56,144 26,138 16,122 42,130" />
            <polygon points="46,128 14,116 6,98 34,114" />
            <polygon points="40,112 10,94 6,76 32,96" />
          </g>

          {/* Right Purple Amethyst Crystal Wings */}
          <g fill={`url(#${uid}-amethyst-ring)`} stroke="#4C1D95" strokeWidth="0.9">
            <polygon points="144,144 174,138 184,122 158,130" />
            <polygon points="154,128 186,116 194,98 166,114" />
            <polygon points="160,112 190,94 194,76 168,96" />
          </g>

          {/* Top Apex: Royal Amethyst Jewel with Gold Setting */}
          <g transform="translate(100, 39)">
            {/* Gold Bezel Setting */}
            <circle cx="0" cy="0" r="13" fill={`url(#${uid}-royal-gold)`} />
            <polygon
              points="0,-11 10,0 0,11 -10,0"
              fill={`url(#${uid}-amethyst-ring)`}
              stroke="#FFFFFF"
              strokeWidth="1.2"
              style={{ filter: 'drop-shadow(0 0 9px #C084FC)' }}
            />
            <polygon points="0,-6 6,0 0,6 -6,0" fill="#F3E8FF" fillOpacity="0.75" />
          </g>

          {/* Bottom Plaque: VIP 8 */}
          {renderPlaque('VIP 8', `${uid}-plaque-bg`, `${uid}-royal-gold`, '#FEF08A', '2')}
        </g>
      )}

      {/* =====================================================================
          VIP 9 – DIAMOND EMPEROR
          Ice diamond crystal ring, Diamond Imperial Tiara/Crown on top,
          large diamond crystal shards jutting out, plaque "VIP 9"
          ===================================================================== */}
      {vipTier === 9 && (
        <g>
          {/* Intense Diamond Frost Aura */}
          <circle cx="100" cy="100" r="60" stroke="#7DD3FC" strokeWidth="1.8" strokeOpacity="0.55" />

          {/* Primary Diamond Ring */}
          <circle cx="100" cy="100" r="53" stroke={`url(#${uid}-diamond-ring)`} strokeWidth="5.5" />
          <circle cx="100" cy="100" r="46.5" stroke="#FFFFFF" strokeWidth="1.4" strokeOpacity="0.9" />

          {/* Left Diamond Crystal Shards (Bold, Multi-Pointed) */}
          <g fill={`url(#${uid}-tiara-grad)`} stroke="#0284C7" strokeWidth="0.9">
            <polygon points="66,155 34,152 24,138 52,144" />
            <polygon points="50,142 16,134 6,116 38,126" />
            <polygon points="42,124 8,110 0,90 32,108" />
            <polygon points="38,106 6,86 4,66 32,88" />
          </g>

          {/* Right Diamond Crystal Shards */}
          <g fill={`url(#${uid}-tiara-grad)`} stroke="#0284C7" strokeWidth="0.9">
            <polygon points="134,155 166,152 176,138 148,144" />
            <polygon points="150,142 184,134 194,116 162,126" />
            <polygon points="158,124 192,110 200,90 168,108" />
            <polygon points="162,106 194,86 196,66 168,88" />
          </g>

          {/* Top Apex: Diamond Imperial Tiara / Crown */}
          <g transform="translate(100, 38)">
            {/* Crown Base Arc */}
            <path d="M -30 8 Q 0 4 30 8 L 26 13 Q 0 9 -26 13 Z" fill={`url(#${uid}-tiara-grad)`} />
            {/* 5 Crown Peaks with Cyan Diamond Jewels */}
            <polygon points="0,-18 5,-2 0,0 -5,-2" fill="#FFFFFF" stroke="#0284C7" strokeWidth="0.8" />
            <polygon points="-14,-13 -9,-1 -14,2 -19,-1" fill={`url(#${uid}-tiara-grad)`} stroke="#0284C7" strokeWidth="0.8" />
            <polygon points="14,-13 19,-1 14,2 9,-1" fill={`url(#${uid}-tiara-grad)`} stroke="#0284C7" strokeWidth="0.8" />
            <polygon points="-26,-7 -22,1 -26,3 -30,1" fill={`url(#${uid}-tiara-grad)`} stroke="#0284C7" strokeWidth="0.8" />
            <polygon points="26,-7 30,1 26,3 22,1" fill={`url(#${uid}-tiara-grad)`} stroke="#0284C7" strokeWidth="0.8" />
            {/* Center Crown Apex Jewel */}
            <polygon
              points="0,-18 4,-12 0,-6 -4,-12"
              fill="#38BDF8"
              stroke="#FFFFFF"
              strokeWidth="0.8"
              style={{ filter: 'drop-shadow(0 0 6px #00F5FF)' }}
            />
          </g>

          {/* Bottom Plaque: VIP 9 */}
          {renderPlaque('VIP 9', `${uid}-plaque-bg`, `${uid}-diamond-ring`, '#E0F2FE', '2.2')}
        </g>
      )}

      {/* =====================================================================
          VIP 10 – SOVEREIGN KING
          Radiant 24K gold ring with inner ruby aura, Golden King's Crown on top,
          layered golden angel wings spreading wide, plaque "VIP 10"
          ===================================================================== */}
      {vipTier === 10 && (
        <g>
          {/* Imperial Solar Corona */}
          <circle cx="100" cy="100" r="60" stroke="#FDE047" strokeWidth="1.8" strokeOpacity="0.6" />

          {/* Primary 24K Gold Ring */}
          <circle cx="100" cy="100" r="53" stroke={`url(#${uid}-king-gold)`} strokeWidth="6" />
          <circle cx="100" cy="100" r="46.5" stroke="#FFFBEB" strokeWidth="1.5" strokeOpacity="0.9" />

          {/* Left Layered Golden Angel Wings (Magnificent Spreading Feathers) */}
          <g fill={`url(#${uid}-king-wings)`} stroke="#78350F" strokeWidth="0.9">
            <path d="M 66 156 Q 30 156 18 138 Q 38 140 54 146 Z" />
            <path d="M 50 144 Q 14 138 2 116 Q 24 122 42 130 Z" />
            <path d="M 42 128 Q 6 114 -4 88 Q 18 98 34 112 Z" />
            <path d="M 38 110 Q 4 90 2 64 Q 18 78 32 94 Z" />
            <path d="M 36 92 Q 10 70 14 46 Q 24 62 34 78 Z" />
          </g>

          {/* Right Layered Golden Angel Wings */}
          <g fill={`url(#${uid}-king-wings)`} stroke="#78350F" strokeWidth="0.9">
            <path d="M 134 156 Q 170 156 182 138 Q 162 140 146 146 Z" />
            <path d="M 150 144 Q 186 138 198 116 Q 176 122 158 130 Z" />
            <path d="M 158 128 Q 194 114 204 88 Q 182 98 166 112 Z" />
            <path d="M 162 110 Q 196 90 198 64 Q 182 78 168 94 Z" />
            <path d="M 164 92 Q 190 70 186 46 Q 176 62 166 78 Z" />
          </g>

          {/* Top Apex: Majestic Golden King's Crown with Ruby Gems */}
          <g transform="translate(100, 36)">
            {/* Crown Base Gold Arch */}
            <path d="M -32 10 Q 0 5 32 10 L 28 15 Q 0 10 -28 15 Z" fill={`url(#${uid}-king-gold)`} />
            {/* Center Crown Peak */}
            <polygon points="0,-18 7,-2 0,2 -7,-2" fill={`url(#${uid}-king-gold)`} stroke="#FFFBEB" strokeWidth="0.8" />
            {/* Center Peak Ruby */}
            <circle cx="0" cy="-14" r="2.5" fill={`url(#${uid}-king-ruby)`} stroke="#FFF" strokeWidth="0.6" style={{ filter: 'drop-shadow(0 0 5px #EF4444)' }} />

            {/* Left Crown Peaks */}
            <polygon points="-16,-12 -9,0 -15,3 -22,0" fill={`url(#${uid}-king-gold)`} stroke="#FFFBEB" strokeWidth="0.8" />
            <circle cx="-16" cy="-9" r="2" fill={`url(#${uid}-king-ruby)`} stroke="#FFF" strokeWidth="0.5" />
            <polygon points="-30,-6 -24,3 -28,5 -34,3" fill={`url(#${uid}-king-gold)`} stroke="#FFFBEB" strokeWidth="0.8" />

            {/* Right Crown Peaks */}
            <polygon points="16,-12 22,0 15,3 9,0" fill={`url(#${uid}-king-gold)`} stroke="#FFFBEB" strokeWidth="0.8" />
            <circle cx="16" cy="-9" r="2" fill={`url(#${uid}-king-ruby)`} stroke="#FFF" strokeWidth="0.5" />
            <polygon points="30,-6 34,3 28,5 24,3" fill={`url(#${uid}-king-gold)`} stroke="#FFFBEB" strokeWidth="0.8" />
          </g>

          {/* Bottom Plaque: VIP 10 */}
          {renderPlaque('VIP 10', `${uid}-plaque-bg`, `${uid}-king-gold`, '#FEF08A', '2.2')}
        </g>
      )}

      {/* =====================================================================
          VIP 11 – CELESTIAL OVERLORD
          Royal purple and celestial gold dual halo, Regal Celestial Crown atop,
          dual-tone wings (amethyst purple + gold solar feathers), plaque "VIP 11"
          ===================================================================== */}
      {vipTier === 11 && (
        <g>
          {/* Dual Cosmic Purple & Gold Aura */}
          <circle cx="100" cy="100" r="61" stroke="#E879F9" strokeWidth="1.5" strokeOpacity="0.5" />
          <circle cx="100" cy="100" r="59" stroke="#FDE047" strokeWidth="1" strokeOpacity="0.6" />

          {/* Primary Dual Cosmic Ring */}
          <circle cx="100" cy="100" r="53" stroke={`url(#${uid}-celestial-purple)`} strokeWidth="6" />
          <circle cx="100" cy="100" r="46.5" stroke={`url(#${uid}-celestial-gold)`} strokeWidth="1.8" />

          {/* Outer Royal Purple Feathers Left */}
          <g fill={`url(#${uid}-celestial-purple)`} stroke="#3B0764" strokeWidth="0.9">
            <path d="M 64 156 Q 26 156 12 136 Q 32 140 50 146 Z" />
            <path d="M 46 142 Q 8 136 -4 114 Q 18 120 38 128 Z" />
            <path d="M 38 126 Q -2 110 -10 84 Q 12 96 30 110 Z" />
            <path d="M 34 108 Q -4 86 -6 60 Q 12 74 28 92 Z" />
            <path d="M 32 88 Q 4 64 6 40 Q 18 56 28 74 Z" />
          </g>

          {/* Inner Radiant Gold Feathers Left */}
          <g fill={`url(#${uid}-celestial-gold)`} stroke="#78350F" strokeWidth="0.8">
            <path d="M 60 150 Q 36 146 28 130 Q 42 134 52 142 Z" />
            <path d="M 48 134 Q 24 126 16 108 Q 30 114 42 124 Z" />
            <path d="M 40 118 Q 18 102 14 84 Q 26 92 36 106 Z" />
          </g>

          {/* Outer Royal Purple Feathers Right */}
          <g fill={`url(#${uid}-celestial-purple)`} stroke="#3B0764" strokeWidth="0.9">
            <path d="M 136 156 Q 174 156 188 136 Q 168 140 150 146 Z" />
            <path d="M 154 142 Q 192 136 204 114 Q 182 120 162 128 Z" />
            <path d="M 162 126 Q 202 110 210 84 Q 188 96 170 110 Z" />
            <path d="M 166 108 Q 204 86 206 60 Q 188 74 172 92 Z" />
            <path d="M 168 88 Q 196 64 194 40 Q 182 56 172 74 Z" />
          </g>

          {/* Inner Radiant Gold Feathers Right */}
          <g fill={`url(#${uid}-celestial-gold)`} stroke="#78350F" strokeWidth="0.8">
            <path d="M 140 150 Q 164 146 172 130 Q 158 134 148 142 Z" />
            <path d="M 152 134 Q 176 126 184 108 Q 170 114 158 124 Z" />
            <path d="M 160 118 Q 182 102 186 84 Q 174 92 164 106 Z" />
          </g>

          {/* Top Apex: Regal Celestial Crown */}
          <g transform="translate(100, 35)">
            {/* Celestial Arch */}
            <path d="M -34 10 Q 0 4 34 10 L 30 15 Q 0 9 -30 15 Z" fill={`url(#${uid}-celestial-gold)`} />
            {/* Spire Peak with Amethyst Gem */}
            <polygon points="0,-19 7,-2 0,2 -7,-2" fill={`url(#${uid}-celestial-gold)`} stroke="#FFFFFF" strokeWidth="0.8" />
            <polygon
              points="0,-18 4,-12 0,-6 -4,-12"
              fill={`url(#${uid}-celestial-purple)`}
              stroke="#FFF"
              strokeWidth="0.6"
              style={{ filter: 'drop-shadow(0 0 6px #C084FC)' }}
            />

            {/* Flanking Gold & Purple Spires */}
            <polygon points="-18,-13 -11,0 -17,3 -24,0" fill={`url(#${uid}-celestial-gold)`} stroke="#FFF" strokeWidth="0.8" />
            <circle cx="-18" cy="-10" r="2.2" fill="#C084FC" stroke="#FFF" strokeWidth="0.5" />
            <polygon points="-32,-7 -26,2 -30,5 -36,2" fill={`url(#${uid}-celestial-gold)`} stroke="#FFF" strokeWidth="0.8" />

            <polygon points="18,-13 24,0 17,3 11,0" fill={`url(#${uid}-celestial-gold)`} stroke="#FFF" strokeWidth="0.8" />
            <circle cx="18" cy="-10" r="2.2" fill="#C084FC" stroke="#FFF" strokeWidth="0.5" />
            <polygon points="32,-7 36,2 30,5 26,2" fill={`url(#${uid}-celestial-gold)`} stroke="#FFF" strokeWidth="0.8" />
          </g>

          {/* Bottom Plaque: VIP 11 */}
          {renderPlaque('VIP 11', `${uid}-plaque-bg`, `${uid}-celestial-gold`, '#FEF08A', '2.4')}
        </g>
      )}

      {/* =====================================================================
          VIP 12 – ALPHA EMPEROR (THE SUPREME MASTERPIECE)
          Grand imperial gold and violet halo, Supreme Imperial Crown on top,
          sculpted roaring Lion heads flanking left and right,
          majestic golden wings spreading wide behind lions, plaque "VIP 12"
          ===================================================================== */}
      {vipTier === 12 && (
        <g>
          {/* Supreme Imperial Aura Corona */}
          <circle cx="100" cy="100" r="62" stroke="#FDE047" strokeWidth="2" strokeOpacity="0.75" />
          <circle cx="100" cy="100" r="59" stroke="#C084FC" strokeWidth="1.2" strokeOpacity="0.65" />

          {/* Primary Grand Emperor Gold & Violet Ring */}
          <circle cx="100" cy="100" r="53" stroke={`url(#${uid}-emperor-gold)`} strokeWidth="6.5" />
          <circle cx="100" cy="100" r="46" stroke={`url(#${uid}-emperor-purple)`} strokeWidth="2" />

          {/* Grand Golden Wings Behind Lions (Left Side) */}
          <g fill={`url(#${uid}-emperor-gold)`} stroke="#78350F" strokeWidth="0.9">
            <path d="M 64 150 Q 20 148 4 126 Q 26 132 46 140 Z" />
            <path d="M 44 136 Q 0 126 -12 100 Q 14 108 34 120 Z" />
            <path d="M 34 118 Q -10 98 -16 68 Q 10 82 28 100 Z" />
            <path d="M 28 98 Q -12 74 -12 44 Q 8 60 24 80 Z" />
            <path d="M 26 76 Q -4 52 4 24 Q 16 42 24 60 Z" />
          </g>

          {/* Grand Golden Wings Behind Lions (Right Side) */}
          <g fill={`url(#${uid}-emperor-gold)`} stroke="#78350F" strokeWidth="0.9">
            <path d="M 136 150 Q 180 148 196 126 Q 174 132 154 140 Z" />
            <path d="M 156 136 Q 200 126 212 100 Q 186 108 166 120 Z" />
            <path d="M 166 118 Q 210 98 216 68 Q 190 82 172 100 Z" />
            <path d="M 172 98 Q 212 74 212 44 Q 192 60 176 80 Z" />
            <path d="M 174 76 Q 204 52 196 24 Q 184 42 176 60 Z" />
          </g>

          {/* Top Apex: Supreme Alpha Emperor Crown with Multi-Tone Royal Jewels */}
          <g transform="translate(100, 33)">
            {/* Crown Base Filigree Band */}
            <path d="M -36 11 Q 0 5 36 11 L 32 16 Q 0 10 -32 16 Z" fill={`url(#${uid}-emperor-gold)`} />
            {/* Center Apex Spire with Amethyst / Ruby Imperial Gem */}
            <polygon points="0,-20 8,-2 0,2 -8,-2" fill={`url(#${uid}-emperor-gold)`} stroke="#FFF" strokeWidth="0.9" />
            <polygon
              points="0,-19 4.5,-13 0,-7 -4.5,-13"
              fill={`url(#${uid}-emperor-purple)`}
              stroke="#FFF"
              strokeWidth="0.7"
              style={{ filter: 'drop-shadow(0 0 7px #D946EF)' }}
            />
            <circle cx="0" cy="-21" r="2.2" fill="#FDE047" stroke="#FFF" strokeWidth="0.6" />

            {/* Left Crown Spires */}
            <polygon points="-18,-14 -11,0 -18,4 -25,0" fill={`url(#${uid}-emperor-gold)`} stroke="#FFF" strokeWidth="0.8" />
            <circle cx="-18" cy="-11" r="2.5" fill="#EF4444" stroke="#FFF" strokeWidth="0.6" style={{ filter: 'drop-shadow(0 0 4px #EF4444)' }} />
            <polygon points="-33,-8 -27,2 -31,5 -37,2" fill={`url(#${uid}-emperor-gold)`} stroke="#FFF" strokeWidth="0.8" />
            <circle cx="-33" cy="-6" r="1.8" fill="#A855F7" stroke="#FFF" strokeWidth="0.5" />

            {/* Right Crown Spires */}
            <polygon points="18,-14 25,0 18,4 11,0" fill={`url(#${uid}-emperor-gold)`} stroke="#FFF" strokeWidth="0.8" />
            <circle cx="18" cy="-11" r="2.5" fill="#EF4444" stroke="#FFF" strokeWidth="0.6" style={{ filter: 'drop-shadow(0 0 4px #EF4444)' }} />
            <polygon points="33,-8 37,2 31,5 27,2" fill={`url(#${uid}-emperor-gold)`} stroke="#FFF" strokeWidth="0.8" />
            <circle cx="33" cy="-6" r="1.8" fill="#A855F7" stroke="#FFF" strokeWidth="0.5" />
          </g>

          {/* =================================================================
              SCULPTED ROARING GOLDEN LION HEADS FLANKING LEFT & RIGHT
              ================================================================= */}
          {/* Left Sculpted Lion Head (Positioned at lower-left x: 44, y: 154) */}
          <g transform="translate(44, 154)" style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.85))' }}>
            {/* Voluminous Lion Mane Behind */}
            <path
              d="M -16,-12 Q -22,-6 -20,6 Q -18,16 -8,22 Q 4,24 14,18 Q 18,12 16,0 Q 14,-10 6,-16 Q -6,-18 -16,-12 Z"
              fill={`url(#${uid}-lion-shading)`}
              stroke="#78350F"
              strokeWidth="0.9"
            />
            {/* Mane Tuft Curls */}
            <path d="M -14,-6 Q -18,4 -10,12" stroke="#FEF08A" strokeWidth="0.9" fill="none" />
            <path d="M -18,2 Q -16,14 -4,18" stroke="#FEF08A" strokeWidth="0.9" fill="none" />
            <path d="M -10,-12 Q -4,-18 4,-12" stroke="#FEF08A" strokeWidth="0.9" fill="none" />

            {/* Lion Face / Cranium */}
            <circle cx="0" cy="0" r="11" fill={`url(#${uid}-emperor-gold)`} stroke="#78350F" strokeWidth="0.8" />
            {/* Lion Muzzle & Nose */}
            <ellipse cx="2" cy="4" rx="6.5" ry="5" fill="#FEF08A" stroke="#78350F" strokeWidth="0.6" />
            <polygon points="1,2 4,2 2.5,4.5" fill="#451A03" />
            {/* Roaring Open Mouth */}
            <path d="M -1 6 Q 2 9 6 6 Z" fill="#2E1003" />
            {/* Sculpted Fangs */}
            <polygon points="0,6 1,8 2,6" fill="#FFFFFF" />
            <polygon points="4,6 5,8 6,6" fill="#FFFFFF" />
            {/* Fierce Lion Eyes */}
            <ellipse cx="-2" cy="-2" rx="2" ry="1.2" fill="#451A03" transform="rotate(-15 -2 -2)" />
            <circle cx="-1.8" cy="-2.2" r="0.6" fill="#FEF08A" />
            <ellipse cx="4" cy="-2" rx="2" ry="1.2" fill="#451A03" transform="rotate(10 4 -2)" />
            <circle cx="4.2" cy="-2.2" r="0.6" fill="#FEF08A" />
            {/* Lion Ears */}
            <path d="M -8,-8 Q -10,-14 -5,-11 Z" fill={`url(#${uid}-emperor-gold)`} stroke="#78350F" strokeWidth="0.7" />
            <path d="M 6,-10 Q 10,-15 11,-8 Z" fill={`url(#${uid}-emperor-gold)`} stroke="#78350F" strokeWidth="0.7" />
          </g>

          {/* Right Sculpted Lion Head (Positioned at lower-right x: 156, y: 154) */}
          <g transform="translate(156, 154) scale(-1, 1)" style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.85))' }}>
            {/* Voluminous Lion Mane Behind */}
            <path
              d="M -16,-12 Q -22,-6 -20,6 Q -18,16 -8,22 Q 4,24 14,18 Q 18,12 16,0 Q 14,-10 6,-16 Q -6,-18 -16,-12 Z"
              fill={`url(#${uid}-lion-shading)`}
              stroke="#78350F"
              strokeWidth="0.9"
            />
            {/* Mane Tuft Curls */}
            <path d="M -14,-6 Q -18,4 -10,12" stroke="#FEF08A" strokeWidth="0.9" fill="none" />
            <path d="M -18,2 Q -16,14 -4,18" stroke="#FEF08A" strokeWidth="0.9" fill="none" />
            <path d="M -10,-12 Q -4,-18 4,-12" stroke="#FEF08A" strokeWidth="0.9" fill="none" />

            {/* Lion Face / Cranium */}
            <circle cx="0" cy="0" r="11" fill={`url(#${uid}-emperor-gold)`} stroke="#78350F" strokeWidth="0.8" />
            {/* Lion Muzzle & Nose */}
            <ellipse cx="2" cy="4" rx="6.5" ry="5" fill="#FEF08A" stroke="#78350F" strokeWidth="0.6" />
            <polygon points="1,2 4,2 2.5,4.5" fill="#451A03" />
            {/* Roaring Open Mouth */}
            <path d="M -1 6 Q 2 9 6 6 Z" fill="#2E1003" />
            {/* Sculpted Fangs */}
            <polygon points="0,6 1,8 2,6" fill="#FFFFFF" />
            <polygon points="4,6 5,8 6,6" fill="#FFFFFF" />
            {/* Fierce Lion Eyes */}
            <ellipse cx="-2" cy="-2" rx="2" ry="1.2" fill="#451A03" transform="rotate(-15 -2 -2)" />
            <circle cx="-1.8" cy="-2.2" r="0.6" fill="#FEF08A" />
            <ellipse cx="4" cy="-2" rx="2" ry="1.2" fill="#451A03" transform="rotate(10 4 -2)" />
            <circle cx="4.2" cy="-2.2" r="0.6" fill="#FEF08A" />
            {/* Lion Ears */}
            <path d="M -8,-8 Q -10,-14 -5,-11 Z" fill={`url(#${uid}-emperor-gold)`} stroke="#78350F" strokeWidth="0.7" />
            <path d="M 6,-10 Q 10,-15 11,-8 Z" fill={`url(#${uid}-emperor-gold)`} stroke="#78350F" strokeWidth="0.7" />
          </g>

          {/* Bottom Plaque: Supreme VIP 12 Nestled Between Lions */}
          {renderPlaque('VIP 12', `${uid}-plaque-bg`, `${uid}-emperor-gold`, '#FFFBEB', '2.6')}
        </g>
      )}
    </svg>
  );
};
