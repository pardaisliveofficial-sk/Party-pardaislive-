import React from 'react';
import { Crown } from 'lucide-react';
import { VipFrameSvg } from './VipFrameSvg';

export interface VipAvatarFrameProps {
  avatarUrl: string;
  vipTier: number; // 0 to 12
  customFrameId?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showCrownBadge?: boolean;
  className?: string;
  animated?: boolean; // defaults to true for breathing animation
}

export interface VipTierConfig {
  tier: number;
  name: string;
  badgeTitle: string;
  colorName: string;
  borderGradient: string;
  glowShadow: string;
  primaryGlow: string;
  secondaryGlow: string;
  crownColor: string;
  iconBg: string;
  description: string;
  requiredLevel: number;
  requiredCoins: number;
  priceCoins: number;
}

/**
 * Official VIP Tier Configurations (VIP 1 - VIP 12 Complete Series)
 * Matching the Alpha Mate VIP Frames Collection chart
 */
export const VIP_TIER_CONFIGS: VipTierConfig[] = [
  {
    tier: 1,
    name: 'Silver Guardian',
    badgeTitle: 'VIP 1 Silver',
    colorName: 'Silver & Amethyst',
    borderGradient: 'from-[#CBD5E1] via-[#F8FAFC] to-[#94A3B8]',
    glowShadow: 'shadow-[0_0_15px_rgba(203,213,225,0.7)]',
    primaryGlow: 'rgba(203, 213, 225, 0.75)',
    secondaryGlow: 'rgba(168, 85, 247, 0.5)',
    crownColor: '#CBD5E1',
    iconBg: 'bg-slate-400/25',
    description: 'Sterling silver double ring with amethyst diamond star & violet energy flare accents.',
    requiredLevel: 8,
    requiredCoins: 380000,
    priceCoins: 5000,
  },
  {
    tier: 2,
    name: 'Bronze Elite',
    badgeTitle: 'VIP 2 Bronze',
    colorName: 'Rose Bronze',
    borderGradient: 'from-[#CD7F32] via-[#E2A76F] to-[#8C5523]',
    glowShadow: 'shadow-[0_0_16px_rgba(205,127,50,0.75)]',
    primaryGlow: 'rgba(205, 127, 50, 0.8)',
    secondaryGlow: 'rgba(245, 158, 11, 0.55)',
    crownColor: '#CD7F32',
    iconBg: 'bg-amber-700/25',
    description: 'Warm rose-bronze ring crowned with a 5-point apex star and symmetrical bronze laurel wreath.',
    requiredLevel: 16,
    requiredCoins: 1400000,
    priceCoins: 12000,
  },
  {
    tier: 3,
    name: 'Golden Member',
    badgeTitle: 'VIP 3 Gold',
    colorName: '24K Radiant Gold',
    borderGradient: 'from-[#FACC15] via-[#FFFBEB] to-[#D97706]',
    glowShadow: 'shadow-[0_0_18px_rgba(250,204,21,0.85)]',
    primaryGlow: 'rgba(255, 215, 0, 0.85)',
    secondaryGlow: 'rgba(245, 158, 11, 0.65)',
    crownColor: '#FACC15',
    iconBg: 'bg-amber-400/25',
    description: 'Radiant 24K gold ring with shining golden star and rich golden laurel wreath hugging the bottom arc.',
    requiredLevel: 24,
    requiredCoins: 6000000,
    priceCoins: 25000,
  },
  {
    tier: 4,
    name: 'Platinum Star',
    badgeTitle: 'VIP 4 Platinum',
    colorName: 'Ice Platinum Cyan',
    borderGradient: 'from-[#38BDF8] via-[#E0F2FE] to-[#0284C7]',
    glowShadow: 'shadow-[0_0_20px_rgba(56,189,248,0.85)]',
    primaryGlow: 'rgba(56, 189, 248, 0.85)',
    secondaryGlow: 'rgba(0, 245, 255, 0.65)',
    crownColor: '#38BDF8',
    iconBg: 'bg-sky-400/25',
    description: 'Electric ice-blue platinum ring with sparkling cyan rhombus diamond and crystalline ice wing shards.',
    requiredLevel: 32,
    requiredCoins: 24700000,
    priceCoins: 45000,
  },
  {
    tier: 5,
    name: 'Sapphire Lord',
    badgeTitle: 'VIP 5 Sapphire',
    colorName: 'Royal Sapphire',
    borderGradient: 'from-[#2563EB] via-[#93C5FD] to-[#1E3A8A]',
    glowShadow: 'shadow-[0_0_22px_rgba(37,99,235,0.85)]',
    primaryGlow: 'rgba(37, 99, 235, 0.9)',
    secondaryGlow: 'rgba(56, 189, 248, 0.7)',
    crownColor: '#60A5FA',
    iconBg: 'bg-blue-600/30',
    description: 'Deep royal sapphire crystal ring with neon electric blue border, apex sapphire jewel & layered crystal wings.',
    requiredLevel: 40,
    requiredCoins: 101900000,
    priceCoins: 75000,
  },
  {
    tier: 6,
    name: 'Emerald Knight',
    badgeTitle: 'VIP 6 Emerald',
    colorName: 'Luminous Emerald',
    borderGradient: 'from-[#059669] via-[#6EE7B7] to-[#047857]',
    glowShadow: 'shadow-[0_0_24px_rgba(16,185,129,0.9)]',
    primaryGlow: 'rgba(16, 185, 129, 0.9)',
    secondaryGlow: 'rgba(52, 211, 153, 0.7)',
    crownColor: '#34D399',
    iconBg: 'bg-emerald-500/30',
    description: 'Vibrant emerald green crystal ring crowned with faceted emerald diamond & lush green crystal leaves.',
    requiredLevel: 48,
    requiredCoins: 420900000,
    priceCoins: 120000,
  },
  {
    tier: 7,
    name: 'Ruby Master',
    badgeTitle: 'VIP 7 Ruby',
    colorName: 'Fiery Crimson Ruby',
    borderGradient: 'from-[#DC2626] via-[#FECACA] to-[#991B1B]',
    glowShadow: 'shadow-[0_0_26px_rgba(239,68,68,0.9)]',
    primaryGlow: 'rgba(239, 68, 68, 0.9)',
    secondaryGlow: 'rgba(249, 115, 22, 0.7)',
    crownColor: '#F87171',
    iconBg: 'bg-red-500/30',
    description: 'Fiery crimson ruby faceted ring, radiant apex ruby rhombus & crimson flame crystal wings.',
    requiredLevel: 56,
    requiredCoins: 693000000,
    priceCoins: 180000,
  },
  {
    tier: 8,
    name: 'Amethyst Royal',
    badgeTitle: 'VIP 8 Amethyst',
    colorName: 'Royal Amethyst & Gold',
    borderGradient: 'from-[#7E22CE] via-[#F3E8FF] to-[#581C87]',
    glowShadow: 'shadow-[0_0_28px_rgba(168,85,247,0.9)]',
    primaryGlow: 'rgba(168, 85, 247, 0.9)',
    secondaryGlow: 'rgba(250, 204, 21, 0.65)',
    crownColor: '#C084FC',
    iconBg: 'bg-purple-600/30',
    description: 'Mystical violet amethyst ring with gold trim, apex jewel & purple crystal wings paired with golden laurels.',
    requiredLevel: 64,
    requiredCoins: 841000000,
    priceCoins: 250000,
  },
  {
    tier: 9,
    name: 'Diamond Emperor',
    badgeTitle: 'VIP 9 Diamond',
    colorName: 'Diamond Frost',
    borderGradient: 'from-[#38BDF8] via-[#FFFFFF] to-[#0284C7]',
    glowShadow: 'shadow-[0_0_32px_rgba(186,230,253,0.95)]',
    primaryGlow: 'rgba(186, 230, 253, 0.95)',
    secondaryGlow: 'rgba(56, 189, 248, 0.75)',
    crownColor: '#BAE6FD',
    iconBg: 'bg-sky-400/30',
    description: 'Brilliant ice diamond crystal ring crowned with Imperial Diamond Crown/Tiara & projecting crystal shards.',
    requiredLevel: 72,
    requiredCoins: 1019000000,
    priceCoins: 350000,
  },
  {
    tier: 10,
    name: 'Sovereign King',
    badgeTitle: 'VIP 10 King',
    colorName: 'Royal Gold & Ruby',
    borderGradient: 'from-[#FDE047] via-[#FFFBEB] to-[#D97706]',
    glowShadow: 'shadow-[0_0_35px_rgba(255,215,0,0.95)]',
    primaryGlow: 'rgba(255, 215, 0, 0.95)',
    secondaryGlow: 'rgba(239, 68, 68, 0.75)',
    crownColor: '#FDE047',
    iconBg: 'bg-amber-500/35',
    description: 'Radiant 24K gold ring with inner ruby aura, Imperial Golden King Crown with ruby gems & layered angel wings.',
    requiredLevel: 80,
    requiredCoins: 1236000000,
    priceCoins: 500000,
  },
  {
    tier: 11,
    name: 'Celestial Overlord',
    badgeTitle: 'VIP 11 Overlord',
    colorName: 'Celestial Violet & Solar Gold',
    borderGradient: 'from-[#A855F7] via-[#FEF08A] to-[#581C87]',
    glowShadow: 'shadow-[0_0_38px_rgba(192,132,252,1)]',
    primaryGlow: 'rgba(192, 132, 252, 1)',
    secondaryGlow: 'rgba(250, 204, 21, 0.8)',
    crownColor: '#E879F9',
    iconBg: 'bg-purple-600/35',
    description: 'Cosmic purple and celestial gold halo with Regal Celestial Crown & dual-tone purple/gold wings.',
    requiredLevel: 88,
    requiredCoins: 1498000000,
    priceCoins: 750000,
  },
  {
    tier: 12,
    name: 'Alpha Emperor',
    badgeTitle: 'VIP 12 Emperor',
    colorName: 'Supreme Gold, Purple & Lion Heads',
    borderGradient: 'from-[#FDE047] via-[#D946EF] to-[#78350F]',
    glowShadow: 'shadow-[0_0_45px_rgba(255,215,0,1)]',
    primaryGlow: 'rgba(255, 215, 0, 1)',
    secondaryGlow: 'rgba(217, 70, 239, 0.85)',
    crownColor: '#FDE047',
    iconBg: 'bg-gradient-to-tr from-amber-400 via-purple-600 to-amber-200',
    description: 'Supreme imperial gold & purple halo, Supreme Crown, golden roaring Lion heads flanking sides & grand wings!',
    requiredLevel: 96,
    requiredCoins: 1816000000,
    priceCoins: 1000000,
  },
];

export const VipAvatarFrame: React.FC<VipAvatarFrameProps> = ({
  avatarUrl,
  vipTier,
  size = 'md',
  showCrownBadge = true,
  className = '',
  animated = true,
}) => {
  const tierConfig = VIP_TIER_CONFIGS.find((c) => c.tier === vipTier) || null;

  // Sizing matrix for container & avatar
  const sizeStyles = {
    xs: {
      container: 'w-8 h-8',
      avatarSize: 'w-[52%] h-[52%]',
      crownBox: 'w-3 h-3 -bottom-0.5 -right-0.5',
      crownIcon: 'w-1.5 h-1.5',
    },
    sm: {
      container: 'w-11 h-11',
      avatarSize: 'w-[52%] h-[52%]',
      crownBox: 'w-3.5 h-3.5 -bottom-0.5 -right-0.5',
      crownIcon: 'w-2 h-2',
    },
    md: {
      container: 'w-14 h-14',
      avatarSize: 'w-[52%] h-[52%]',
      crownBox: 'w-4 h-4 -bottom-0.5 -right-0.5',
      crownIcon: 'w-2.5 h-2.5',
    },
    lg: {
      container: 'w-20 h-20',
      avatarSize: 'w-[52%] h-[52%]',
      crownBox: 'w-5 h-5 -bottom-1 -right-1',
      crownIcon: 'w-3 h-3',
    },
    xl: {
      container: 'w-28 h-28 sm:w-32 sm:h-32',
      avatarSize: 'w-[52%] h-[52%]',
      crownBox: 'w-6 h-6 -bottom-1.5 -right-1.5',
      crownIcon: 'w-3.5 h-3.5',
    },
  }[size];

  // Fallback for non-VIP or Level 0
  if (!tierConfig || vipTier === 0) {
    return (
      <div className={`relative ${sizeStyles.container} shrink-0 flex items-center justify-center ${className}`}>
        <div className="w-[82%] h-[82%] rounded-full overflow-hidden bg-zinc-900 border border-white/10 shadow-sm">
          <img
            src={avatarUrl}
            alt="Avatar"
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        </div>
      </div>
    );
  }

  // Animated breathing style with CSS custom properties
  const breathingStyle: React.CSSProperties = {
    '--vip-glow-1': tierConfig.primaryGlow,
    '--vip-glow-2': tierConfig.secondaryGlow,
  } as React.CSSProperties;

  return (
    <div
      className={`relative ${sizeStyles.container} shrink-0 flex items-center justify-center ${className} ${
        animated ? 'animate-vip-breathe' : ''
      }`}
      style={breathingStyle}
      title={`VIP ${vipTier} – ${tierConfig.name}`}
    >
      {/* Background Soft Aura Blur */}
      <div
        className="absolute inset-[15%] rounded-full opacity-60 blur-[6px] pointer-events-none transition-all"
        style={{
          background: `radial-gradient(circle, ${tierConfig.primaryGlow} 0%, transparent 70%)`,
        }}
      />

      {/* Central Profile Picture (Circular cutout behind SVG frame) */}
      <div
        className={`absolute ${sizeStyles.avatarSize} rounded-full overflow-hidden bg-zinc-950 z-0 flex items-center justify-center shadow-inner`}
      >
        <img
          src={avatarUrl}
          alt="Avatar"
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80';
          }}
        />
      </div>

      {/* High-Fidelity SVG Frame Overlay */}
      <div className="absolute inset-0 w-full h-full z-10 pointer-events-none flex items-center justify-center">
        <VipFrameSvg vipTier={vipTier} idPrefix={`avatar-${size}`} />
      </div>

      {/* Optional Crown Badge Mini-Icon (if enabled) */}
      {showCrownBadge && (
        <div
          className={`absolute ${sizeStyles.crownBox} rounded-full bg-gradient-to-tr from-amber-500 to-amber-300 border border-black flex items-center justify-center text-black shadow-md z-20`}
          title={`VIP ${vipTier} - ${tierConfig.name}`}
        >
          <Crown className={`${sizeStyles.crownIcon} fill-black stroke-black`} />
        </div>
      )}
    </div>
  );
};
