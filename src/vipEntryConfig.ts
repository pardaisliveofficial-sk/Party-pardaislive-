// VIP Entry Effects Configuration for Pardais Party (VIP 1 to VIP 12)
export interface VipEntryEffect {
  vipLevel: number;
  name: string;
  vehicleName: string;
  icon: string;
  category: "Bike" | "Car" | "Horse" | "Tiger" | "Dragon" | "Lion" | "Phoenix" | "Unicorn" | "UFO" | "Carriage" | "Titan" | "Starship";
  soundText: string;
  badgeBg: string;
  badgeText: string;
  borderColor: string;
  bannerBg: string;
  bannerGlow: string;
  mountBgGradient: string;
  description: string;
  animationStyle: "drive" | "gallop" | "fly" | "leap" | "warp" | "float";
}

export const VIP_ENTRY_EFFECTS: VipEntryEffect[] = [
  {
    vipLevel: 1,
    name: "VIP 1 Cyber Superbike",
    vehicleName: "Cyber Superbike",
    icon: "🏍️",
    category: "Bike",
    soundText: "VRRRRR! VIP 1 Cyber Superbike zooming into room!",
    badgeBg: "bg-cyan-500/20 text-cyan-300 border-cyan-400/40",
    badgeText: "text-cyan-400",
    borderColor: "border-cyan-400",
    bannerBg: "from-cyan-950/90 via-[#0d1527]/95 to-purple-950/90",
    bannerGlow: "shadow-[0_0_30px_rgba(6,182,212,0.6)]",
    mountBgGradient: "from-cyan-500 to-blue-600",
    description: "High-speed Cyberpunk Superbike with neon tail light trails & turbo boost engine roar.",
    animationStyle: "drive"
  },
  {
    vipLevel: 2,
    name: "VIP 2 Luxury Supercar",
    vehicleName: "Luxury Bugatti Supercar",
    icon: "🏎️",
    category: "Car",
    soundText: "VROOOM! VIP 2 Luxury Supercar arrives in style!",
    badgeBg: "bg-red-500/20 text-red-300 border-red-400/40",
    badgeText: "text-red-400",
    borderColor: "border-red-500",
    bannerBg: "from-red-950/90 via-[#1e0a12]/95 to-amber-950/90",
    bannerGlow: "shadow-[0_0_35px_rgba(239,68,68,0.7)]",
    mountBgGradient: "from-red-500 to-amber-600",
    description: "Golden-rimmed luxury supercar drifting into room with gold smoke & tire streak flares.",
    animationStyle: "drive"
  },
  {
    vipLevel: 3,
    name: "VIP 3 Royal Mustang Warhorse",
    vehicleName: "Royal Mustang Warhorse",
    icon: "🐎",
    category: "Horse",
    soundText: "NEIGHHH! VIP 3 Royal Mustang galloping in with fiery hooves!",
    badgeBg: "bg-amber-500/20 text-amber-300 border-amber-400/40",
    badgeText: "text-amber-400",
    borderColor: "border-amber-400",
    bannerBg: "from-amber-950/90 via-[#1f1505]/95 to-yellow-950/90",
    bannerGlow: "shadow-[0_0_35px_rgba(245,158,11,0.7)]",
    mountBgGradient: "from-amber-500 to-yellow-600",
    description: "Legendary royal mustang galloping across screen with golden hooves and flaming mane.",
    animationStyle: "gallop"
  },
  {
    vipLevel: 4,
    name: "VIP 4 Golden Royal Tiger",
    vehicleName: "Imperial Golden Tiger",
    icon: "🐅",
    category: "Tiger",
    soundText: "ROAARRR! VIP 4 Imperial Tiger leaps with claw aura!",
    badgeBg: "bg-orange-500/20 text-orange-300 border-orange-400/40",
    badgeText: "text-orange-400",
    borderColor: "border-orange-500",
    bannerBg: "from-orange-950/90 via-[#221005]/95 to-amber-950/90",
    bannerGlow: "shadow-[0_0_35px_rgba(249,115,22,0.7)]",
    mountBgGradient: "from-orange-500 to-amber-500",
    description: "Fierce Golden Tiger leaping across the room with electric claw slashes & solar aura.",
    animationStyle: "leap"
  },
  {
    vipLevel: 5,
    name: "VIP 5 Imperial Fire Dragon",
    vehicleName: "Imperial Fire Dragon",
    icon: "🐉",
    category: "Dragon",
    soundText: "SKREEEE! VIP 5 Imperial Dragon descends breathing fire!",
    badgeBg: "bg-rose-500/20 text-rose-300 border-rose-400/40",
    badgeText: "text-rose-400",
    borderColor: "border-rose-500",
    bannerBg: "from-rose-950/90 via-[#26050e]/95 to-purple-950/90",
    bannerGlow: "shadow-[0_0_40px_rgba(244,63,94,0.8)]",
    mountBgGradient: "from-rose-600 to-purple-700",
    description: "Supreme Fire Dragon flying down with massive fiery wings, smoke particles & fire breath.",
    animationStyle: "fly"
  },
  {
    vipLevel: 6,
    name: "VIP 6 Majestic King Lion",
    vehicleName: "Majestic King Lion",
    icon: "🦁",
    category: "Lion",
    soundText: "ROAARRR! VIP 6 King Lion enters with royal fanfare!",
    badgeBg: "bg-yellow-500/20 text-yellow-300 border-yellow-400/40",
    badgeText: "text-yellow-400",
    borderColor: "border-yellow-400",
    bannerBg: "from-yellow-950/90 via-[#221c05]/95 to-amber-950/90",
    bannerGlow: "shadow-[0_0_40px_rgba(234,179,8,0.8)]",
    mountBgGradient: "from-yellow-500 to-amber-600",
    description: "Crown-wearing Golden King Lion walking with golden paw prints & thunderous roar text.",
    animationStyle: "leap"
  },
  {
    vipLevel: 7,
    name: "VIP 7 Sunfire Phoenix Mount",
    vehicleName: "Sunfire Phoenix",
    icon: "🦅",
    category: "Phoenix",
    soundText: "SWOOOSH! VIP 7 Sunfire Phoenix takes flight with golden feathers!",
    badgeBg: "bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-400/40",
    badgeText: "text-fuchsia-400",
    borderColor: "border-fuchsia-500",
    bannerBg: "from-fuchsia-950/90 via-[#250523]/95 to-pink-950/90",
    bannerGlow: "shadow-[0_0_45px_rgba(217,70,239,0.85)]",
    mountBgGradient: "from-fuchsia-600 to-pink-600",
    description: "Eternal Phoenix soaring through the sky showering sparkling golden feathers and solar flares.",
    animationStyle: "fly"
  },
  {
    vipLevel: 8,
    name: "VIP 8 Mythic Starlight Unicorn",
    vehicleName: "Celestial Starlight Pegasus",
    icon: "🦄",
    category: "Unicorn",
    soundText: "SHINE! VIP 8 Celestial Pegasus arrives in rainbow starlight!",
    badgeBg: "bg-purple-500/20 text-purple-300 border-purple-400/40",
    badgeText: "text-purple-300",
    borderColor: "border-purple-400",
    bannerBg: "from-purple-950/90 via-[#180a2b]/95 to-indigo-950/90",
    bannerGlow: "shadow-[0_0_45px_rgba(168,85,247,0.85)]",
    mountBgGradient: "from-purple-500 to-indigo-600",
    description: "Magical Rainbow Starlight Unicorn flying across with prism light trail & starburst crystals.",
    animationStyle: "fly"
  },
  {
    vipLevel: 9,
    name: "VIP 9 Galactic Quantum UFO",
    vehicleName: "Galactic Quantum Ship",
    icon: "🛸",
    category: "UFO",
    soundText: "ZAP! VIP 9 Galactic UFO warps into the room with neon tractor beams!",
    badgeBg: "bg-emerald-500/20 text-emerald-300 border-emerald-400/40",
    badgeText: "text-emerald-400",
    borderColor: "border-emerald-400",
    bannerBg: "from-emerald-950/90 via-[#052219]/95 to-teal-950/90",
    bannerGlow: "shadow-[0_0_45px_rgba(16,185,129,0.85)]",
    mountBgGradient: "from-emerald-500 to-teal-600",
    description: "Sci-Fi Quantum UFO spaceship warping into the room with alien green laser spotlight & cosmic warp sound.",
    animationStyle: "warp"
  },
  {
    vipLevel: 10,
    name: "VIP 10 Imperial Golden Carriage",
    vehicleName: "Imperial Diamond Chariot",
    icon: "👑",
    category: "Carriage",
    soundText: "TRUMPETS! VIP 10 Imperial Chariot arrives with Royal Guards!",
    badgeBg: "bg-amber-400/25 text-amber-200 border-amber-300",
    badgeText: "text-amber-300",
    borderColor: "border-amber-300",
    bannerBg: "from-amber-950/95 via-[#2b1e05]/95 to-yellow-950/95",
    bannerGlow: "shadow-[0_0_50px_rgba(251,191,36,0.9)]",
    mountBgGradient: "from-amber-400 to-yellow-500",
    description: "Royal 4-Horse Golden Carriage with diamond crown decorations, golden sparkle path & royal guards.",
    animationStyle: "gallop"
  },
  {
    vipLevel: 11,
    name: "VIP 11 Cybernetic Titan Dragon",
    vehicleName: "Cybernetic Titan Dragon",
    icon: "🐲",
    category: "Titan",
    soundText: "BOOOM! VIP 11 Cyber Titan Dragon dominates the stage with plasma beams!",
    badgeBg: "bg-pink-500/25 text-pink-200 border-pink-400",
    badgeText: "text-pink-300",
    borderColor: "border-pink-500",
    bannerBg: "from-pink-950/95 via-[#2a041f]/95 to-violet-950/95",
    bannerGlow: "shadow-[0_0_50px_rgba(236,72,153,0.95)]",
    mountBgGradient: "from-pink-500 to-purple-600",
    description: "Massive Mecha Cyber Titan Dragon flying through screen discharging high-voltage cyan plasma beams.",
    animationStyle: "fly"
  },
  {
    vipLevel: 12,
    name: "VIP 12 Universe Sovereign Starfleet",
    vehicleName: "Cosmic Sovereign Starfleet",
    icon: "🌌",
    category: "Starship",
    soundText: "SUPERNOVA! VIP 12 Cosmic Sovereign commands the entire room!",
    badgeBg: "bg-indigo-400/30 text-indigo-100 border-indigo-300",
    badgeText: "text-indigo-200",
    borderColor: "border-indigo-300",
    bannerBg: "from-indigo-950/95 via-[#0e072b]/95 to-fuchsia-950/95",
    bannerGlow: "shadow-[0_0_60px_rgba(129,140,248,1)]",
    mountBgGradient: "from-indigo-500 via-purple-600 to-pink-500",
    description: "Supreme Overlord Celestial Fleet summoning cosmic galaxy stars, supernova burst & room-wide aura.",
    animationStyle: "warp"
  }
];

export function getVipEntryEffect(vipLevel: number): VipEntryEffect {
  const found = VIP_ENTRY_EFFECTS.find(e => e.vipLevel === vipLevel);
  if (found) return found;
  if (vipLevel > 12) return VIP_ENTRY_EFFECTS[VIP_ENTRY_EFFECTS.length - 1];
  return VIP_ENTRY_EFFECTS[0];
}
