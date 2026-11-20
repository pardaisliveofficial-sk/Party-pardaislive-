import React, { useState } from 'react';

import { VIP_TIER_CONFIGS, VipAvatarFrame, VipTierConfig } from "./brand/VipAvatarFrame";
import { playStoreAudio } from "../utils/storeAudio";
import {
  ArrowLeft,
  Sparkles,
  Check,
  Lock,
  Plus,
  Crown,
  Car,
  Gift,
  Sliders,
  Tag,
  Volume2,
  X,
  ExternalLink,
  ShieldCheck,
  Flame,
  Zap,
} from 'lucide-react';

// ============================================================================
// STORE DATA TYPES & INTERFACES
// ============================================================================

export type StoreCategory =
  | 'vip_frames'
  | 'special_entries'
  | 'custom_gifts'
  | 'customized_gifts'
  | 'tags';

export interface StoreItem {
  id: string;
  name: string;
  category: StoreCategory;
  priceCoins: number;
  durationDays?: number; // 0 = Permanent
  requiredLevel?: number;
  badge?: string; // e.g. "HOT", "NEW", "ROYAL", "LV7"
  icon: string;
  description: string;
  privilege: string;
  vipTier?: number; // for VIP frames
  soundType?: 'engine' | 'fanfare' | 'chime' | 'dragon';
  customizable?: boolean;
}

// Format store prices exactly like reference: 300K, 1,000K, 3,000K, 10M
export function formatStorePrice(coins: number): string {
  if (coins >= 10000000) {
    return `${Math.round(coins / 1000000)}M`;
  }
  if (coins >= 1000) {
    return `${(coins / 1000).toLocaleString()}K`;
  }
  return coins.toLocaleString();
}

// ============================================================================
// STORE ITEMS CATALOG (MATCHING USER REFERENCE SCREENSHOTS)
// ============================================================================

// 1. VIP & DECORATIVE PORTRAIT FRAMES
const VIP_FRAME_ITEMS: StoreItem[] = [
  ...VIP_TIER_CONFIGS.map((tier) => ({
    id: `vip_frame_${tier.tier}`,
    name: tier.name,
    category: 'vip_frames' as StoreCategory,
    priceCoins: tier.priceCoins >= 100000 ? 3000000 : tier.priceCoins >= 40000 ? 1000000 : 300000,
    requiredLevel: tier.requiredLevel,
    durationDays: 30,
    icon: '👑',
    vipTier: tier.tier,
    description: tier.description,
    privilege: `VIP ${tier.tier} Prestige badge, animated breathing SVG halo & anti-kick protection.`,
    soundType: 'fanfare' as const,
  })),
  // Additional Decorative / Seasonal Portrait Frames from Reference Screenshot
  {
    id: 'frame_fairy_blossom',
    name: 'Fairy Blossom Wreath',
    category: 'vip_frames',
    priceCoins: 300000,
    durationDays: 30,
    icon: '🌸',
    description: 'Pastel blossom flowers and ribbon bow with butterflies.',
    privilege: '+5% Live Stream charisma boost & spring flower petals in chat.',
    soundType: 'chime',
  },
  {
    id: 'frame_golden_splendor',
    name: 'Royal Crown Splendor',
    category: 'vip_frames',
    priceCoins: 300000,
    durationDays: 30,
    icon: '👑',
    description: 'Imperial 24K golden crown with deep purple silk arches.',
    privilege: 'Royal gold profile highlight & entrance announcement.',
    soundType: 'fanfare',
  },
  {
    id: 'frame_cupid_carriage',
    name: 'Cupid Rose Carriage',
    category: 'vip_frames',
    priceCoins: 300000,
    durationDays: 30,
    icon: '💖',
    description: 'Enchanted princess carriage woven with pink roses.',
    privilege: 'Special pink romantic chat bubble & heartbeat fanfare.',
    soundType: 'chime',
  },
  {
    id: 'frame_golden_lion',
    name: 'Golden Lion Majesty',
    category: 'vip_frames',
    priceCoins: 1000000,
    durationDays: 30,
    icon: '🦁',
    description: 'Sculpted solar gold lion heads with blazing sun flares.',
    privilege: 'Golden lion roar on stream entry & VIP priority seat queue.',
    soundType: 'dragon',
  },
  {
    id: 'frame_halloween_specter',
    name: 'Spooky Halloween Ghost',
    category: 'vip_frames',
    priceCoins: 1000000,
    durationDays: 30,
    icon: '🎃',
    description: 'Smiling pumpkins, friendly ghosts and starry witch hat.',
    privilege: 'Spooky purple floating ghosts on comment.',
    soundType: 'chime',
  },
  {
    id: 'frame_arabian_sheik',
    name: 'Arabian Royal Keffiyeh',
    category: 'vip_frames',
    priceCoins: 1000000,
    durationDays: 30,
    icon: '👳‍♂️',
    description: 'Regal red & white patterned royal headdress with gold agal.',
    privilege: 'Elite Arabian luxury badge & gold sandstorm fanfare.',
    soundType: 'fanfare',
  },
  {
    id: 'frame_neon_pink_heart',
    name: 'Neon Pink Heart Ribbons',
    category: 'vip_frames',
    priceCoins: 1000000,
    durationDays: 30,
    icon: '💗',
    description: 'Electric neon glowing heart pulses with silk angel wings.',
    privilege: 'Pulsing pink neon avatar glow on live seat.',
    soundType: 'chime',
  },
  {
    id: 'frame_dollar_dynasty',
    name: 'Billionaire Dollar Dynasty',
    category: 'vip_frames',
    priceCoins: 1000000,
    durationDays: 30,
    icon: '💰',
    description: 'Solid gold bar lattice with glittering diamond dollar signs.',
    privilege: 'Server-wide broadcast badge & double gifting multiplier.',
    soundType: 'fanfare',
  },
];

// 2. SPECIAL ENTRIES (MATCHING REFERENCE SCREENSHOT 120522)
const SPECIAL_ENTRY_ITEMS: StoreItem[] = [
  {
    id: 'entry_flower_bike',
    name: 'Flower Ribbon Bicycle',
    category: 'special_entries',
    priceCoins: 3000000,
    durationDays: 30,
    icon: '🚲',
    description: 'Romantic vintage bicycle with pink rose basket and floating love balloons.',
    privilege: 'Pedals across live stream screen with floating heart petals.',
    soundType: 'chime',
  },
  {
    id: 'entry_ghost_motorcycle',
    name: 'Ghost Rider Blue Motorcycle',
    category: 'special_entries',
    priceCoins: 3000000,
    durationDays: 30,
    icon: '🏍️',
    description: 'Neon blue plasma flames burst as demonic ghost rider revs across the broadcast!',
    privilege: 'Roaring engine exhaust sound with electric blue tire tracks.',
    soundType: 'engine',
  },
  {
    id: 'entry_pink_crystal_car',
    name: 'Pink Bow Crystal Hypercar',
    category: 'special_entries',
    priceCoins: 10000000,
    durationDays: 30,
    icon: '🏎️',
    description: 'Dazzling rose-crystal supercar adorned with giant pink ribbon and diamond glints.',
    privilege: 'Supercar drift entrance with rose gold engine roar and pink smoke.',
    soundType: 'engine',
  },
  {
    id: 'entry_mecha_warrior',
    name: 'Celestial Mecha Armor',
    category: 'special_entries',
    priceCoins: 10000000,
    durationDays: 30,
    icon: '🤖',
    description: 'Gundam-style gold & cyan mecha warrior descends with twin particle beam swords.',
    privilege: 'Cybernetic laser grid and sonic boom entry announcement.',
    soundType: 'fanfare',
  },
  {
    id: 'entry_balloon_airship',
    name: 'Cosmic Balloon Starship',
    category: 'special_entries',
    priceCoins: 10000000,
    durationDays: 30,
    icon: '🚀',
    description: 'Pastel purple spaceship propelled by glowing heart balloons and cosmic dust.',
    privilege: 'Floats across screen dropping sparkling star dust on viewers.',
    soundType: 'chime',
  },
  {
    id: 'entry_fairy_carriage',
    name: 'Royal Pegasus Fairy Carriage',
    category: 'special_entries',
    priceCoins: 10000000,
    durationDays: 30,
    icon: '🦄',
    description: 'Crystal carriage drawn by twin winged pegasi gliding on rainbow clouds.',
    privilege: 'Royal trumpet fanfare and gold confetti fireworks.',
    soundType: 'fanfare',
  },
  {
    id: 'entry_ice_pegasus',
    name: 'Frost Winged Pegasus',
    category: 'special_entries',
    priceCoins: 10000000,
    durationDays: 30,
    icon: '🐎',
    description: 'Mythic sapphire ice pegasus galloping through cosmic blue auroras.',
    privilege: 'Freezes stream border in glowing ice crystals on entry.',
    soundType: 'chime',
  },
  {
    id: 'entry_frost_beast',
    name: 'Frost White Tiger Beast',
    category: 'special_entries',
    priceCoins: 10000000,
    durationDays: 30,
    icon: '🐅',
    description: 'Ancient glacial armored white tiger pouncing with thunderous ice claws.',
    privilege: 'Subwoofer bass roar and frosty screen shockwave.',
    soundType: 'dragon',
  },
  {
    id: 'entry_violet_hypercar',
    name: 'Radiant Violet Hypercar',
    category: 'special_entries',
    priceCoins: 10000000,
    durationDays: 30,
    icon: '🏎️',
    description: 'Futuristic hypercar sculpted from violet diamond and cosmic energy.',
    privilege: 'Twin-turbo revving sound and violet lightning speed burst.',
    soundType: 'engine',
  },
  {
    id: 'entry_emerald_hypercar',
    name: 'Emerald Racing Hypercar',
    category: 'special_entries',
    priceCoins: 10000000,
    durationDays: 30,
    icon: '🏎️',
    description: 'High-downforce aerodynamic green racecar with golden alloy rims.',
    privilege: 'F1 race engine screamer audio and green smoke trail.',
    soundType: 'engine',
  },
  {
    id: 'entry_royal_elephant',
    name: 'Royal Armored War Elephant',
    category: 'special_entries',
    priceCoins: 10000000,
    durationDays: 30,
    icon: '🐘',
    description: 'Sacred white war elephant draped in solid gold armor and royal gems.',
    privilege: 'Earth-shaking golden footsteps and regal royal trumpet.',
    soundType: 'fanfare',
  },
  {
    id: 'entry_golden_sun_lion',
    name: 'Blazing Golden Sun Lion',
    category: 'special_entries',
    priceCoins: 10000000,
    durationDays: 30,
    icon: '🦁',
    description: 'Celestial solar lion with mane of raging 24K gold flames.',
    privilege: 'Solar flare corona explosion and room-wide golden banner.',
    soundType: 'dragon',
  },
  {
    id: 'entry_phoenix_wargod',
    name: 'Phoenix War God',
    category: 'special_entries',
    priceCoins: 10000000,
    requiredLevel: 7,
    badge: 'LV7',
    durationDays: 30,
    icon: '🦅',
    description: 'Ascended sun deity clad in crimson & gold phoenix armor rising from eternal flames.',
    privilege: 'Rebirth resurrection animation and server-wide broadcast marquee.',
    soundType: 'dragon',
  },
  {
    id: 'entry_dragon_stalker',
    name: 'Dragon King Stalker',
    category: 'special_entries',
    priceCoins: 10000000,
    requiredLevel: 7,
    badge: 'LV7',
    durationDays: 30,
    icon: '🐉',
    description: 'Centaur dragon knight wielding flaming spear surrounded by imperial dragons.',
    privilege: 'Dragon roar shockwave and gold coin rain effect.',
    soundType: 'dragon',
  },
];

// 3. CUSTOM GIFTS (HIGH-FAME BROADCAST GIFTS)
const CUSTOM_GIFT_ITEMS: StoreItem[] = [
  {
    id: 'gift_diamond_ring',
    name: 'Imperial Diamond Ring',
    category: 'custom_gifts',
    priceCoins: 500000,
    durationDays: 0,
    icon: '💍',
    description: 'Flawless 10-carat solitaire diamond with glittering multi-facet sparkle trails.',
    privilege: '+2,500 Streamer XP & romantic diamond ring shower animation.',
    soundType: 'chime',
  },
  {
    id: 'gift_fairy_castle',
    name: 'Fairy Tale Love Castle',
    category: 'custom_gifts',
    priceCoins: 2000000,
    durationDays: 0,
    icon: '🏰',
    description: 'Enchanted princess castle rising from clouds with exploding fireworks.',
    privilege: 'Full-screen 3D castle takeover & 1-minute marquee banner.',
    soundType: 'fanfare',
  },
  {
    id: 'gift_alpha_yacht',
    name: 'Pardais Royal Super Yacht',
    category: 'custom_gifts',
    priceCoins: 5000000,
    durationDays: 0,
    icon: '🛥️',
    description: 'Multi-deck gold luxury yacht sailing across stream with champagne popping.',
    privilege: 'Global server banner & +25,000 Host Diamonds.',
    soundType: 'fanfare',
  },
  {
    id: 'gift_cosmic_shuttle',
    name: 'Cosmic Warp Starship',
    category: 'custom_gifts',
    priceCoins: 8000000,
    durationDays: 0,
    icon: '🚀',
    description: 'Intergalactic star cruiser entering hyperspace with neon lightspeed streaks.',
    privilege: 'Warp portal animation and server-wide notification alert.',
    soundType: 'engine',
  },
  {
    id: 'gift_emperor_crown',
    name: 'Pardais Emperor Crown',
    category: 'custom_gifts',
    priceCoins: 10000000,
    durationDays: 0,
    icon: '👑',
    description: 'The supreme imperial crown of Pardais Party adorned with 100 rubies and emeralds.',
    privilege: 'Host coronation fanfare, gold confetti & 2X gift multiplier.',
    soundType: 'fanfare',
  },
  {
    id: 'gift_golden_heli',
    name: 'Golden Attack Helicopter',
    category: 'custom_gifts',
    priceCoins: 3500000,
    durationDays: 0,
    icon: '🚁',
    description: 'Gold gunship helicopter hovering overhead dropping gift crates.',
    privilege: 'Rotor blade sound effect & lucky coin drop for viewers.',
    soundType: 'engine',
  },
  {
    id: 'gift_galaxy_heart',
    name: 'Galaxy Nebula Heart',
    category: 'custom_gifts',
    priceCoins: 6000000,
    durationDays: 0,
    icon: '🪐',
    description: 'Spinning celestial galaxy shaped into glowing heart of stars.',
    privilege: 'Cosmic purple aura & +30,000 Giver Leaderboard points.',
    soundType: 'chime',
  },
  {
    id: 'gift_flame_dragon',
    name: 'Golden Flame Dragon Roar',
    category: 'custom_gifts',
    priceCoins: 12000000,
    durationDays: 0,
    icon: '🐉',
    description: 'Gigantic oriental golden dragon spiraling upwards breathing lucky gold coins.',
    privilege: 'Maximum tier room explosion & instant Level 100 fanfare.',
    soundType: 'dragon',
  },
  {
    id: 'gift_rose_meteor',
    name: 'Romantic Rose Meteor',
    category: 'custom_gifts',
    priceCoins: 300000,
    durationDays: 0,
    icon: '🌹',
    description: 'Meteor shower of 999 crimson roses falling gracefully across stream.',
    privilege: 'Cascading rose petals & sweet acoustic harp melody.',
    soundType: 'chime',
  },
];

// 4. CUSTOMIZED GIFTS (BESPOKE WITH CUSTOM TEXT, PHOTO OR VOICE)
const CUSTOMIZED_GIFT_ITEMS: StoreItem[] = [
  {
    id: 'customized_nameplate_banner',
    name: 'Custom Nameplate Banner',
    category: 'customized_gifts',
    priceCoins: 1000000,
    durationDays: 0,
    icon: '📜',
    customizable: true,
    description: 'Golden parchment banner engraved with your custom message and recipient name.',
    privilege: 'Displays your custom text across live room for 30 seconds.',
    soundType: 'fanfare',
  },
  {
    id: 'customized_photo_frame',
    name: 'Personalized Photo Gift',
    category: 'customized_gifts',
    priceCoins: 2500000,
    durationDays: 0,
    icon: '🖼️',
    customizable: true,
    description: 'Floating 3D baroque gold frame displaying recipient photo with sparkle border.',
    privilege: 'Streamer portrait showcased center screen with congratulatory audio.',
    soundType: 'chime',
  },
  {
    id: 'customized_voice_fanfare',
    name: 'Custom Voice Audio Fanfare',
    category: 'customized_gifts',
    priceCoins: 5000000,
    durationDays: 0,
    icon: '🎙️',
    customizable: true,
    description: 'Plays your personalized voice shout-out directly in the live room!',
    privilege: 'Direct microphone broadcast override with VIP echo effect.',
    soundType: 'fanfare',
  },
  {
    id: 'customized_fireworks_text',
    name: 'Custom Fireworks Text',
    category: 'customized_gifts',
    priceCoins: 8000000,
    durationDays: 0,
    icon: '🎆',
    customizable: true,
    description: 'Massive fireworks burst into night sky spelling out your custom wording!',
    privilege: 'Server-wide announcement & night sky fireworks display.',
    soundType: 'fanfare',
  },
  {
    id: 'customized_hall_of_fame_trophy',
    name: 'Bespoke Hall of Fame Trophy',
    category: 'customized_gifts',
    priceCoins: 10000000,
    durationDays: 0,
    icon: '🏆',
    customizable: true,
    description: 'Solid gold winged trophy engraved with both sender & host usernames.',
    privilege: 'Permanent record added to the room Hall of Fame showcase.',
    soundType: 'fanfare',
  },
  {
    id: 'customized_engraved_ring',
    name: 'Engraved Diamond Ring',
    category: 'customized_gifts',
    priceCoins: 15000000,
    durationDays: 0,
    icon: '💎',
    customizable: true,
    description: 'Platinum diamond ring laser-engraved with your mutual anniversary date or initials.',
    privilege: 'Mutual VIP Couple Badge attached to both profiles.',
    soundType: 'chime',
  },
];

// 5. TAGS & PRESTIGE BADGES
const TAG_ITEMS: StoreItem[] = [
  {
    id: 'tag_alpha_king',
    name: 'Pardais King',
    category: 'tags',
    priceCoins: 3000000,
    durationDays: 30,
    icon: '👑',
    badge: 'LEGEND',
    description: 'The golden crown title tag displayed alongside your name in chat and profile.',
    privilege: 'Golden glowing nameplate & royal entrance audio fanfare.',
    soundType: 'fanfare',
  },
  {
    id: 'tag_top_giver',
    name: 'Top Giver',
    category: 'tags',
    priceCoins: 2000000,
    durationDays: 30,
    icon: '💎',
    badge: 'POPULAR',
    description: 'Sparkling diamond badge signifying top session supporter status.',
    privilege: 'Diamond glow border in live comments & priority gift drawer.',
    soundType: 'chime',
  },
  {
    id: 'tag_super_star',
    name: 'Super Star',
    category: 'tags',
    priceCoins: 1500000,
    durationDays: 30,
    icon: '🌟',
    description: 'Pulsing neon star badge for glamorous streamers and celebrities.',
    privilege: 'Neon star particles accompany every message you send.',
    soundType: 'chime',
  },
  {
    id: 'tag_guardian_angel',
    name: 'Guardian Angel',
    category: 'tags',
    priceCoins: 1000000,
    durationDays: 30,
    icon: '🛡️',
    description: 'Golden winged shield badge worn by trusted room protectors.',
    privilege: 'Shield badge next to username in chat & party seats.',
    soundType: 'fanfare',
  },
  {
    id: 'tag_trendsetter',
    name: 'Trendsetter',
    category: 'tags',
    priceCoins: 800000,
    durationDays: 30,
    icon: '🔥',
    description: 'Blazing flame badge indicating viral social status.',
    privilege: 'Animated flame icon beside your live screen avatar.',
    soundType: 'dragon',
  },
  {
    id: 'tag_heartthrob',
    name: 'Heartthrob',
    category: 'tags',
    priceCoins: 1200000,
    durationDays: 30,
    icon: '💖',
    description: 'Sweet glowing pink heart badge loved by popular room hosts.',
    privilege: 'Pink name highlight in room viewer list.',
    soundType: 'chime',
  },
  {
    id: 'tag_lightning_god',
    name: 'Lightning God',
    category: 'tags',
    priceCoins: 2500000,
    durationDays: 30,
    icon: '⚡',
    description: 'Electric blue thunderbolt badge of raw power and speed.',
    privilege: 'Electric lightning spark animation on profile header.',
    soundType: 'engine',
  },
  {
    id: 'tag_dragon_master',
    name: 'Dragon Master',
    category: 'tags',
    priceCoins: 5000000,
    durationDays: 30,
    icon: '🐉',
    description: 'Imperial dragon crest awarded to legendary commanders.',
    privilege: 'Dragon roar fanfare on stream entry.',
    soundType: 'dragon',
  },
  {
    id: 'tag_billionaire',
    name: 'Billionaire Club',
    category: 'tags',
    priceCoins: 10000000,
    durationDays: 30,
    icon: '🎩',
    badge: 'ROYAL',
    description: 'Exclusive black & gold luxury top hat title badge for elite patrons.',
    privilege: 'Golden yacht chat badge & personal account priority.',
    soundType: 'fanfare',
  },
];

// Combine all items
const ALL_STORE_ITEMS: StoreItem[] = [
  ...VIP_FRAME_ITEMS,
  ...SPECIAL_ENTRY_ITEMS,
  ...CUSTOM_GIFT_ITEMS,
  ...CUSTOMIZED_GIFT_ITEMS,
  ...TAG_ITEMS,
];

// Helper: Split array into chunks of 3 for 3-column wooden shelves
function chunkArray<T>(arr: T[], size = 3): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

// ============================================================================
// MAIN STORE SCREEN COMPONENT
// ============================================================================

export interface AlphaParityStoreItem extends StoreItem {}
export interface AlphaParityStoreScreenProps {
  currentUser: any;
  coins: number;
  inventory: string[];
  onNavigate: (screen: "home" | "wallet") => void;
  onPurchase: (item: StoreItem) => Promise<any>;
  onEquip: (item: StoreItem) => Promise<any>;
}
export const AlphaParityStoreScreen: React.FC<AlphaParityStoreScreenProps> = ({
  currentUser, coins, inventory, onNavigate, onPurchase, onEquip
}) => {

  // Active Store Category Tab
  const [activeTab, setActiveTab] = useState<StoreCategory>('vip_frames');

  // Interactive Modals
  const [selectedItemForModal, setSelectedItemForModal] = useState<StoreItem | null>(null);
  const [showBackpackModal, setShowBackpackModal] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // User Owned Inventory (Persisted in state)
  const [ownedItemIds, setOwnedItemIds] = useState<string[]>(inventory || []);

  // Currently equipped items
  const [equippedFrameId, setEquippedFrameId] = useState<string>(
    (currentUser.vipTier ?? currentUser.vipLevel ?? 0) > 0 ? `vip_frame_${(currentUser.vipTier ?? currentUser.vipLevel ?? 0)}` : 'vip_frame_1'
  );
  const [equippedEntryId, setEquippedEntryId] = useState<string>(
    currentUser.entranceAnimation || 'entry_flower_bike'
  );
  const [equippedTagId, setEquippedTagId] = useState<string>('tag_alpha_king');

  // Trigger Toast Notification
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Check if item is owned
  const isItemOwned = (item: StoreItem): boolean => {
    if (item.category === 'vip_frames' && item.vipTier !== undefined) {
      return (currentUser.vipTier ?? currentUser.vipLevel ?? 0) >= item.vipTier || ownedItemIds.includes(item.id);
    }
    return ownedItemIds.includes(item.id);
  };

  // Check if item is equipped
  const isItemEquipped = (item: StoreItem): boolean => {
    if (item.category === 'vip_frames') {
      return equippedFrameId === item.id || (item.vipTier !== undefined && (currentUser.vipTier ?? currentUser.vipLevel ?? 0) === item.vipTier);
    }
    if (item.category === 'special_entries') {
      return equippedEntryId === item.id;
    }
    if (item.category === 'tags') {
      return equippedTagId === item.id;
    }
    return false;
  };

  // Purchase and equip are server-authoritative. The UI never deducts coins locally.
  const handleBuyOrEquip = async (item: StoreItem) => {
    const owned = isItemOwned(item);
    const equipped = isItemEquipped(item);

    if (equipped) {
      triggerToast(`${item.name} is already equipped! ✨`);
      playStoreAudio("equip");
      return;
    }

    try {
      if (owned) {
        const result = await onEquip(item);
        if (Array.isArray(result?.inventory)) setOwnedItemIds(result.inventory);
        if (item.category === "vip_frames") setEquippedFrameId(item.id);
        else if (item.category === "special_entries") setEquippedEntryId(item.id);
        else if (item.category === "tags") setEquippedTagId(item.id);
        playStoreAudio(item.soundType || "equip");
        triggerToast(`Equipped ${item.name}! 🌟`);
        setSelectedItemForModal(null);
        return;
      }

      if (item.requiredLevel && Number((currentUser.level ?? currentUser.userLevel ?? 1) || 1) < item.requiredLevel) {
        triggerToast(`Requires Level ${item.requiredLevel}! Current: Lv.${(currentUser.level ?? currentUser.userLevel ?? 1) || 1}`);
        return;
      }
      if (coins < item.priceCoins) {
        triggerToast(`Not enough coins! You need ${formatStorePrice(item.priceCoins)} 💰`);
        return;
      }

      const result = await onPurchase(item);
      if (Array.isArray(result?.inventory)) setOwnedItemIds(result.inventory);
      else setOwnedItemIds((prev) => [...new Set([...prev, item.id])]);
      if (item.category === "vip_frames") setEquippedFrameId(item.id);
      else if (item.category === "special_entries") setEquippedEntryId(item.id);
      else if (item.category === "tags") setEquippedTagId(item.id);
      playStoreAudio("coin");
      window.setTimeout(() => playStoreAudio(item.soundType || "fanfare"), 200);
      triggerToast(`Congratulations! Purchased & Equipped ${item.name}! 🎉`);
      setSelectedItemForModal(null);
    } catch (error: any) {
      triggerToast(error?.message || "Store action failed. Please try again.");
    }
  };

  // Get active catalog items for selected tab
  const currentCatalogItems: StoreItem[] = {
    vip_frames: VIP_FRAME_ITEMS,
    special_entries: SPECIAL_ENTRY_ITEMS,
    custom_gifts: CUSTOM_GIFT_ITEMS,
    customized_gifts: CUSTOMIZED_GIFT_ITEMS,
    tags: TAG_ITEMS,
  }[activeTab];

  // Chunk items into rows of 3 for the wooden shelves
  const itemRows = chunkArray(currentCatalogItems, 3);

  return (
    <div className="relative w-full h-full pb-20 bg-[#160B05] text-white overflow-y-auto overscroll-contain select-none">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-full bg-[#3B1905]/95 border-2 border-amber-400 text-amber-100 text-xs font-black shadow-2xl backdrop-blur-xl flex items-center gap-2 animate-bounce">
          <Sparkles className="w-4 h-4 text-amber-300" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* =====================================================================
          1. TOP STORE HEADER (WOODEN CARVED STORE SIGN + AWNING CANOPY)
          ===================================================================== */}
      <div className="sticky top-0 z-40 w-full bg-[#201007] border-b border-black/40 shadow-xl">
        {/* Top Control Bar: Back Button, Coins Chip, Knapsack Backpack */}
        <div className="px-3 pt-2.5 pb-1.5 flex items-center justify-between">
          {/* Round Wooden Back Button */}
          <button
            onClick={() => onNavigate('home')}
            className="w-10 h-10 rounded-full bg-gradient-to-b from-[#8C5523] via-[#5C3214] to-[#3E210D] border-2 border-[#D97706]/70 shadow-lg flex items-center justify-center text-amber-100 hover:brightness-125 active:scale-90 transition-all cursor-pointer"
            title="Back to Home"
          >
            <ArrowLeft className="w-5 h-5 text-amber-200" />
          </button>

          {/* User Coin Balance Chip */}
          <button
            onClick={() => onNavigate('wallet')}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-[#3E210D] to-[#2B1507] border border-amber-400/50 text-amber-300 text-xs font-black shadow-md hover:brightness-110 cursor-pointer active:scale-95 transition-all"
            title="Recharge Coins"
          >
            <span className="text-sm">🪙</span>
            <span>{coins.toLocaleString()}</span>
            <div className="w-3.5 h-3.5 rounded-full bg-amber-400 text-black flex items-center justify-center font-black text-[10px] ml-0.5">
              +
            </div>
          </button>

          {/* Knapsack / Backpack Inventory Button (Matching Reference Screen Top-Right) */}
          <button
            onClick={() => setShowBackpackModal(true)}
            className="w-10 h-10 rounded-full bg-gradient-to-b from-[#8C5523] via-[#5C3214] to-[#3E210D] border-2 border-[#D97706]/70 shadow-lg flex items-center justify-center text-amber-200 hover:brightness-125 active:scale-90 transition-all cursor-pointer relative"
            title="My Bag / Inventory"
          >
            <span className="text-xl">🎒</span>
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-500 text-black text-[9px] font-black flex items-center justify-center border border-white">
              {ownedItemIds.length}
            </span>
          </button>
        </div>

        {/* 3D Carved Wooden "STORE" Sign Board with Green Leaves & Brass Rivets */}
        <div className="relative flex justify-center -mt-1 px-4">
          <div className="relative px-8 py-2 rounded-2xl bg-gradient-to-b from-[#7A3E15] via-[#592B0D] to-[#3B1905] border-2 border-[#D97706] shadow-[0_6px_14px_rgba(0,0,0,0.85)] flex items-center justify-center min-w-[210px] sm:min-w-[260px]">
            {/* Green Leaf Flourishes (Left & Right) */}
            <span className="absolute -left-3 text-lg select-none">🌿</span>
            <span className="absolute -right-3 text-lg select-none scale-x-[-1]">🌿</span>

            {/* Brass Screws / Rivets */}
            <div className="absolute top-1.5 left-2 w-2 h-2 rounded-full bg-amber-300 border border-[#78350F] shadow-inner" />
            <div className="absolute top-1.5 right-2 w-2 h-2 rounded-full bg-amber-300 border border-[#78350F] shadow-inner" />
            <div className="absolute bottom-1.5 left-2 w-2 h-2 rounded-full bg-amber-300 border border-[#78350F] shadow-inner" />
            <div className="absolute bottom-1.5 right-2 w-2 h-2 rounded-full bg-amber-300 border border-[#78350F] shadow-inner" />

            {/* 3D Embossed Golden "STORE" Text */}
            <h1
              className="text-2xl sm:text-3xl font-black tracking-widest text-[#FFFBEB] uppercase"
              style={{
                textShadow:
                  '0 2px 0 #D97706, 0 3px 0 #92400E, 0 4px 1px #451A03, 0 0 10px rgba(251,191,36,0.5)',
              }}
            >
              STORE
            </h1>
          </div>
        </div>

        {/* Scalloped Red-Orange & Cream Striped Awning (Canopy) with 3D Drop Shadow */}
        <div className="relative w-full -mt-2">
          {/* Alternating Scallop Flaps */}
          <div className="flex w-full overflow-hidden">
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map((idx) => {
              const isOrange = idx % 2 === 0;
              return (
                <div
                  key={idx}
                  className={`flex-1 h-5 sm:h-6 rounded-b-xl shadow-md ${
                    isOrange
                      ? 'bg-gradient-to-b from-[#EA580C] via-[#C2410C] to-[#9A3412]'
                      : 'bg-gradient-to-b from-[#FFFBEB] via-[#FEF3C7] to-[#FDE68A]'
                  }`}
                  style={{
                    filter: 'drop-shadow(0 3px 3px rgba(0,0,0,0.6))',
                  }}
                />
              );
            })}
          </div>

          {/* Cast Shadow below Awning onto the Shelves */}
          <div className="w-full h-3 bg-gradient-to-b from-black/85 via-black/40 to-transparent pointer-events-none -mt-0.5" />
        </div>

        {/* =====================================================================
            2. CATEGORY TABS (UNDER AWNING)
            - VIP Frames
            - Special Entries
            - Custom Gifts
            - Customized Gifts
            - Tags & Badges
            ===================================================================== */}
        <div className="px-2 py-1.5 bg-[#251208]/95 border-b border-[#D97706]/30">
          <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto scrollbar-none pb-0.5 justify-start sm:justify-center">
            {[
              { id: 'vip_frames', label: 'VIP Frames', enLabel: 'Portrait Frame', icon: Crown },
              { id: 'special_entries', label: 'Special Entries', enLabel: 'Entrance Effect', icon: Car },
              { id: 'custom_gifts', label: 'Custom Gifts', enLabel: 'Custom Gifts', icon: Gift },
              { id: 'customized_gifts', label: 'Customized Gifts', enLabel: 'Customized', icon: Sliders },
              { id: 'tags', label: 'Tags & Badges', enLabel: 'Tags & Badges', icon: Tag },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as StoreCategory);
                    playStoreAudio('equip');
                  }}
                  className={`flex flex-col items-center px-3 py-1.5 rounded-xl font-black text-xs whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                    isActive
                      ? 'text-[#FDE047] scale-105 border-b-2 border-[#FDE047] shadow-[0_4px_12px_rgba(250,204,21,0.25)]'
                      : 'text-amber-200/60 hover:text-amber-100 hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#FDE047]' : 'text-amber-300/60'}`} />
                    <span className="text-[12px] sm:text-xs font-black">{tab.label}</span>
                  </div>
                  <span className="text-[9px] font-semibold opacity-75">{tab.enLabel}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* =====================================================================
          3. 3D WOODEN SHELVES BODY & 3-COLUMN ITEM GRID
          ===================================================================== */}
      <div
        className="relative px-2 sm:px-4 py-3 min-h-[70vh]"
        style={{
          backgroundColor: '#1E0E06',
          backgroundImage:
            'repeating-linear-gradient(90deg, rgba(0,0,0,0.15) 0px, rgba(0,0,0,0.15) 1px, transparent 1px, transparent 60px)',
        }}
      >
        {/* Render Items grouped in rows of 3, each sitting on a 3D Wooden Shelf */}
        <div className="space-y-4">
          {itemRows.map((row, rowIdx) => (
            <div key={rowIdx} className="relative">
              {/* Row of 3 Items */}
              <div className="grid grid-cols-3 gap-2 sm:gap-3.5 z-10 relative">
                {row.map((item) => {
                  const isOwned = isItemOwned(item);
                  const isEquipped = isItemEquipped(item);

                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedItemForModal(item)}
                      className="group relative flex flex-col items-center justify-between rounded-2xl bg-black/45 backdrop-blur-xs p-2 sm:p-2.5 border border-[#D97706]/20 hover:border-amber-400/70 shadow-inner min-h-[155px] sm:min-h-[175px] transition-all active:scale-95 cursor-pointer"
                    >
                      {/* Top Right Level / Hot Badge (e.g. LV7 from reference) */}
                      {item.badge && (
                        <div className="absolute top-1 right-1 px-1.5 py-0.2 rounded-md bg-gradient-to-r from-amber-600 to-orange-500 text-white font-black text-[9px] shadow-sm z-20">
                          {item.badge}
                        </div>
                      )}
                      {!item.badge && item.requiredLevel && (
                        <div className="absolute top-1 right-1 px-1.5 py-0.2 rounded-md bg-[#2A1408] border border-amber-500/40 text-amber-300 font-bold text-[8.5px] z-20 flex items-center gap-0.5">
                          <Lock className="w-2 h-2" /> Lv.{item.requiredLevel}
                        </div>
                      )}

                      {/* Center Item Graphic Preview */}
                      <div className="w-full flex-1 flex items-center justify-center py-1">
                        {item.category === 'vip_frames' && item.vipTier !== undefined ? (
                          <div className="transform scale-90 sm:scale-100">
                            <VipAvatarFrame
                              avatarUrl={currentUser.avatar}
                              vipTier={item.vipTier}
                              size="md"
                              showCrownBadge={false}
                            />
                          </div>
                        ) : item.category === 'vip_frames' ? (
                          <div className="w-13 h-13 sm:w-15 sm:h-15 rounded-full p-1 bg-gradient-to-tr from-amber-500/30 via-pink-500/30 to-purple-500/30 border border-amber-400/50 flex items-center justify-center text-2xl animate-vip-breathe">
                            <span>{item.icon}</span>
                          </div>
                        ) : item.category === 'special_entries' ? (
                          <div className="relative flex flex-col items-center justify-center group-hover:scale-110 transition-transform">
                            <span className="text-3xl sm:text-4xl filter drop-shadow-[0_4px_8px_rgba(251,191,36,0.4)]">
                              {item.icon}
                            </span>
                            <span className="w-10 h-1.5 bg-black/40 rounded-full blur-xs mt-1" />
                          </div>
                        ) : item.category === 'custom_gifts' ? (
                          <div className="flex flex-col items-center justify-center group-hover:scale-110 transition-transform">
                            <span className="text-3xl sm:text-4xl drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]">
                              {item.icon}
                            </span>
                          </div>
                        ) : item.category === 'customized_gifts' ? (
                          <div className="flex flex-col items-center justify-center group-hover:scale-110 transition-transform">
                            <span className="text-3xl sm:text-4xl drop-shadow-[0_0_12px_rgba(236,72,153,0.6)]">
                              {item.icon}
                            </span>
                          </div>
                        ) : (
                          // Tags
                          <div className="flex flex-col items-center justify-center">
                            <span className="text-2xl mb-1">{item.icon}</span>
                            <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-300 text-black font-black text-[9px] shadow-sm">
                              {item.name}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Item Title */}
                      <p className="text-[10px] sm:text-[11px] font-black text-amber-100 text-center truncate max-w-full my-1">
                        {item.name}
                      </p>

                      {/* =======================================================
                          BOTTOM PRICE PILL BADGE (RESTING ON WOODEN SHELF)
                          Matching reference: 🟡 300K, 🟡 1,000K, 🟡 3,000K, 🟡 10M
                          ======================================================= */}
                      <div className="w-full flex justify-center -mb-3 z-30">
                        {isEquipped ? (
                          <div className="px-2.5 py-0.8 rounded-full bg-emerald-500 border border-emerald-300 text-black font-black text-[9.5px] sm:text-[10.5px] shadow-md flex items-center gap-1">
                            <Check className="w-3 h-3 stroke-[3]" />
                            <span>EQUIPPED</span>
                          </div>
                        ) : isOwned ? (
                          <div className="px-3 py-0.8 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-black text-[9.5px] sm:text-[10.5px] shadow-md hover:brightness-110">
                            EQUIP
                          </div>
                        ) : (
                          <div className="px-2.5 py-0.8 rounded-full bg-gradient-to-r from-teal-500 via-teal-400 to-emerald-400 text-black font-black text-[9.5px] sm:text-[10.5px] shadow-md flex items-center gap-1 hover:brightness-110">
                            <span className="text-xs">🪙</span>
                            <span>{formatStorePrice(item.priceCoins)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ===============================================================
                  3D WOODEN SHELF BEAM UNDER THE 3 ITEMS (SOLID CEDAR WOOD)
                  =============================================================== */}
              <div className="relative w-full mt-1.5 mb-5 pointer-events-none">
                {/* Top Highlight Edge */}
                <div className="w-full h-1 bg-gradient-to-r from-[#D97706]/20 via-[#F59E0B]/75 to-[#D97706]/20" />
                {/* Front Wooden Beam Face */}
                <div className="w-full h-3 sm:h-3.5 bg-gradient-to-b from-[#6B3714] via-[#4A240A] to-[#2D1505] border-t border-[#D97706]/60 border-b border-black/90 shadow-[0_8px_16px_rgba(0,0,0,0.95)]" />
                {/* Cast Shadow on the wall below */}
                <div className="w-full h-3 bg-gradient-to-b from-black/80 to-transparent" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* =====================================================================
          4. INTERACTIVE ITEM PREVIEW & PURCHASE MODAL
          ===================================================================== */}
      {selectedItemForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-sm rounded-3xl bg-gradient-to-b from-[#2D1507] via-[#1E0D04] to-[#140802] border-2 border-[#D97706] shadow-2xl overflow-hidden p-5 text-white">
            {/* Close Button */}
            <button
              onClick={() => setSelectedItemForModal(null)}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Modal Title */}
            <div className="text-center mb-3">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {selectedItemForModal.category.replace('_', ' ')}
              </span>
              <h3 className="text-lg font-black text-white mt-1">{selectedItemForModal.name}</h3>
            </div>

            {/* Showcase Visual with Animation */}
            <div className="relative my-3 p-4 rounded-2xl bg-black/50 border border-amber-500/20 flex flex-col items-center justify-center min-h-[130px]">
              {selectedItemForModal.category === 'vip_frames' && selectedItemForModal.vipTier !== undefined ? (
                <VipAvatarFrame
                  avatarUrl={currentUser.avatar}
                  vipTier={selectedItemForModal.vipTier}
                  size="xl"
                  showCrownBadge={true}
                />
              ) : (
                <div className="flex flex-col items-center animate-bounce">
                  <span className="text-5xl drop-shadow-[0_0_15px_rgba(250,204,21,0.6)]">
                    {selectedItemForModal.icon}
                  </span>
                </div>
              )}

              {/* Sound Test Fanfare Button */}
              {selectedItemForModal.soundType && (
                <button
                  type="button"
                  onClick={() => playStoreAudio(selectedItemForModal.soundType || 'fanfare')}
                  className="mt-3 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-[10px] font-bold flex items-center gap-1 hover:bg-amber-500/30 cursor-pointer active:scale-95 transition-all"
                >
                  <Volume2 className="w-3 h-3 text-amber-400" />
                  <span>Test Sound Effect</span>
                </button>
              )}
            </div>

            {/* Description & Perks */}
            <div className="space-y-2 text-xs text-zinc-300 mb-4 bg-white/5 p-3 rounded-xl border border-white/5">
              <p className="leading-snug text-amber-100/90">{selectedItemForModal.description}</p>
              <div className="pt-1 border-t border-white/10 flex items-start gap-1.5 text-[11px] text-amber-300">
                <Sparkles className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{selectedItemForModal.privilege}</span>
              </div>
              <div className="flex items-center justify-between text-[10px] text-zinc-400 pt-1">
                <span>Validity: {selectedItemForModal.durationDays ? `${selectedItemForModal.durationDays} Days` : 'Permanent'}</span>
                {selectedItemForModal.requiredLevel && (
                  <span className="text-amber-400 font-bold">Unlocks at Level {selectedItemForModal.requiredLevel}</span>
                )}
              </div>
            </div>

            {/* Price & Buy/Equip Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-white/10">
              <div className="flex flex-col">
                <span className="text-[10px] text-zinc-400">Price</span>
                <span className="text-base font-black text-amber-300 flex items-center gap-1">
                  <span>🪙</span>
                  <span>{formatStorePrice(selectedItemForModal.priceCoins)}</span>
                </span>
              </div>

              {isItemEquipped(selectedItemForModal) ? (
                <button
                  disabled
                  className="px-5 py-2 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 font-black text-xs flex items-center gap-1 cursor-default"
                >
                  <Check className="w-4 h-4" />
                  <span>EQUIPPED</span>
                </button>
              ) : isItemOwned(selectedItemForModal) ? (
                <button
                  onClick={() => handleBuyOrEquip(selectedItemForModal)}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-black text-xs shadow-lg hover:brightness-110 active:scale-95 transition-all cursor-pointer"
                >
                  EQUIP FREE
                </button>
              ) : coins < selectedItemForModal.priceCoins ? (
                <button
                  onClick={() => {
                    setSelectedItemForModal(null);
                    onNavigate('wallet');
                  }}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-500 text-white font-black text-xs shadow-lg hover:brightness-110 active:scale-95 transition-all cursor-pointer flex items-center gap-1"
                >
                  <span>Recharge Coins</span>
                  <Plus className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  onClick={() => handleBuyOrEquip(selectedItemForModal)}
                  className="px-6 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-300 text-black font-black text-xs shadow-lg shadow-amber-500/30 hover:brightness-110 active:scale-95 transition-all cursor-pointer"
                >
                  BUY NOW
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          5. BACKPACK (INVENTORY / MY BAG) MODAL (MATCHING REFERENCE KNAPSACK)
          ===================================================================== */}
      {showBackpackModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-md rounded-3xl bg-gradient-to-b from-[#2D1507] via-[#1E0D04] to-[#120702] border-2 border-[#D97706] shadow-2xl overflow-hidden p-4 sm:p-5 text-white flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-amber-500/20">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🎒</span>
                <div>
                  <h3 className="text-base font-black text-white">My Backpack</h3>
                  <p className="text-[10px] text-zinc-400">Owned VIP Frames, Entries, Gifts & Tags</p>
                </div>
              </div>

              <button
                onClick={() => setShowBackpackModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Owned Items List */}
            <div className="flex-1 overflow-y-auto py-3 space-y-2">
              {ownedItemIds.length === 0 ? (
                <div className="text-center py-8 text-zinc-400">
                  <p className="text-xs">Your bag is empty!</p>
                  <p className="text-[10px] mt-1">Explore the Store shelves above to purchase exclusive items.</p>
                </div>
              ) : (
                ALL_STORE_ITEMS.filter((item) => isItemOwned(item)).map((item) => {
                  const isEquipped = isItemEquipped(item);
                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-2.5 rounded-2xl bg-black/40 border border-amber-500/20 hover:border-amber-400/40 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-xl shrink-0">
                          {item.icon}
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-white">{item.name}</h4>
                          <span className="text-[9px] text-amber-300 capitalize">{item.category.replace('_', ' ')}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleBuyOrEquip(item)}
                        className={`px-3 py-1 rounded-xl text-[10px] font-black cursor-pointer transition-all ${
                          isEquipped
                            ? 'bg-emerald-500/25 border border-emerald-400 text-emerald-300'
                            : 'bg-gradient-to-r from-amber-500 to-amber-300 text-black hover:brightness-110'
                        }`}
                      >
                        {isEquipped ? 'EQUIPPED' : 'EQUIP'}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
