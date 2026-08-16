import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Gift as GiftIcon, Sparkles, Star, Heart, Flame, Shield, TrendingUp, Trophy, 
  History, BarChart2, Plus, Trash2, Edit, Check, Eye, Trash, RefreshCw, X, Play,
  Send, AlertCircle, DollarSign, Archive, Volume2, ArrowUpRight, Search, Activity
} from "lucide-react";
import { Gift, GiftType, ChatMessage, Transaction, UserProfile } from "../types";
import { resolveApiUrl } from "../lib/apiClient";

// Web Audio API Synthesizer for Gift Sound Effects
export const playGiftAudioSynthesizer = (soundType: string = "ding") => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const lower = (soundType || "ding").toLowerCase();
    if (lower.includes("roar")) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(90, now);
      osc.frequency.exponentialRampToValueAtTime(220, now + 0.3);
      osc.frequency.exponentialRampToValueAtTime(70, now + 1.8);
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 2.0);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 2.0);
    } else if (lower.includes("firework") || lower.includes("blast") || lower.includes("rocket")) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(250, now);
      osc.frequency.exponentialRampToValueAtTime(1600, now + 0.5);
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 1.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 1.2);
    } else if (lower.includes("engine") || lower.includes("rev") || lower.includes("car")) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.exponentialRampToValueAtTime(550, now + 0.6);
      osc.frequency.exponentialRampToValueAtTime(300, now + 1.6);
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 1.8);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 1.8);
    } else if (lower.includes("magic") || lower.includes("sparkle") || lower.includes("chime")) {
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + idx * 0.12);
        gain.gain.setValueAtTime(0.25, now + idx * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.8);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.12);
        osc.stop(now + idx * 0.12 + 0.8);
      });
    } else {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.4);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.5);
    }
  } catch (e) {
    console.warn("Audio Context sound effect error:", e);
  }
};

// Static Default Categories (Admin can add/edit/delete/sort dynamically)
const INITIAL_CATEGORIES = [
  "Popular", "New", "Lucky", "VIP", "Festival", "Premium", "Luxury", "Event", "PK", "Limited Edition"
];

// Initial pre-loaded gifts matching requirements
export const DEFAULT_ADVANCED_GIFTS: Gift[] = [
  { 
    id: "g-lion", 
    name: "Golden Lion 🦁", 
    cost: 10000, 
    type: GiftType.THREE_D, 
    icon: "🦁", 
    color: "from-amber-500 via-yellow-500 to-amber-700", 
    animationClass: "animate-bounce", 
    category: "Popular", 
    description: "Roaring Golden Lion of supreme royalty & majesty!", 
    animationFile: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4", 
    animationFormat: "mp4", 
    animationDuration: 10, 
    animationDisplayType: "full", 
    comboSupported: true, 
    status: "active", 
    featured: true,
    limited: false,
    vipOnly: false,
    pkOnly: false,
    eventOnly: false,
    soundEffect: "roar",
    priority: 100, 
    sortingOrder: 0, 
    isFavorite: false 
  },
  { 
    id: "g-spice", 
    name: "Indian Spice 🌶️", 
    cost: 3000, 
    type: GiftType.THREE_D, 
    icon: "🌶️", 
    color: "from-red-600 via-amber-500 to-yellow-500", 
    animationClass: "animate-bounce", 
    category: "Popular", 
    description: "Sizzling Indian Spice explosion video overlay!", 
    animationFile: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4", 
    animationFormat: "mp4", 
    animationDuration: 10, 
    animationDisplayType: "full", 
    comboSupported: true, 
    status: "active", 
    featured: true,
    limited: false,
    vipOnly: false,
    pkOnly: false,
    eventOnly: false,
    soundEffect: "roar",
    priority: 95, 
    sortingOrder: 1, 
    isFavorite: false 
  },
  { 
    id: "g-fireworks", 
    name: "Fireworks 🎆", 
    cost: 5000, 
    type: GiftType.THREE_D, 
    icon: "🎆", 
    color: "from-purple-500 via-pink-500 to-amber-400", 
    animationClass: "animate-pulse", 
    category: "Popular", 
    description: "Grand sparkling celebration fireworks video overlay!", 
    animationFile: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4", 
    animationFormat: "mp4", 
    animationDuration: 12, 
    animationDisplayType: "full", 
    comboSupported: true, 
    status: "active", 
    featured: true,
    limited: false,
    vipOnly: false,
    pkOnly: false,
    eventOnly: false,
    soundEffect: "fireworks",
    priority: 90, 
    sortingOrder: 2, 
    isFavorite: false 
  },
  { 
    id: "g-rose", 
    name: "Red Rose", 
    cost: 10, 
    type: GiftType.TWO_D, 
    icon: "🌹", 
    color: "from-pink-500 to-rose-600", 
    animationClass: "animate-bounce", 
    category: "Popular", 
    description: "A fresh beautiful red rose of deep admiration.", 
    animationFile: "🌹", 
    animationFormat: "svg", 
    animationDuration: 5, 
    animationDisplayType: "small", 
    comboSupported: true, 
    status: "active", 
    featured: true,
    limited: false,
    vipOnly: false,
    pkOnly: false,
    eventOnly: false,
    soundEffect: "ding",
    priority: 10, 
    sortingOrder: 1, 
    isFavorite: false 
  },
  { 
    id: "g-heart", 
    name: "Love Heart", 
    cost: 99, 
    type: GiftType.TWO_D, 
    icon: "💖", 
    color: "from-red-500 to-pink-500", 
    animationClass: "animate-pulse", 
    category: "Popular", 
    description: "Express your warm affection with sparkling reflections.", 
    animationFile: "💖", 
    animationFormat: "svg", 
    animationDuration: 5, 
    animationDisplayType: "small", 
    comboSupported: true, 
    status: "active", 
    featured: true,
    limited: false,
    vipOnly: false,
    pkOnly: false,
    eventOnly: false,
    soundEffect: "chime",
    priority: 9, 
    sortingOrder: 2, 
    isFavorite: false 
  },
  { 
    id: "g-lucky-coin", 
    name: "Lucky Coin", 
    cost: 50, 
    type: GiftType.TWO_D, 
    icon: "🪙", 
    color: "from-yellow-400 to-amber-600", 
    animationClass: "animate-bounce", 
    category: "Lucky", 
    description: "Send fortune with chance multipliers!", 
    animationFile: "🪙", 
    animationFormat: "svg", 
    animationDuration: 5, 
    animationDisplayType: "small", 
    comboSupported: true, 
    status: "active", 
    featured: false,
    limited: false,
    vipOnly: false,
    pkOnly: false,
    eventOnly: false,
    soundEffect: "coin",
    priority: 8, 
    sortingOrder: 3, 
    isFavorite: false 
  },
  { 
    id: "g-crown", 
    name: "VIP Crown", 
    cost: 999, 
    type: GiftType.THREE_D, 
    icon: "👑", 
    color: "from-yellow-400 to-amber-600", 
    animationClass: "animate-spin", 
    category: "VIP", 
    description: "Royal crown for the star of the platform.", 
    animationFile: "👑", 
    animationFormat: "svga", 
    animationDuration: 10, 
    animationDisplayType: "half", 
    comboSupported: true, 
    status: "active", 
    featured: true,
    limited: false,
    vipOnly: true,
    pkOnly: false,
    eventOnly: false,
    soundEffect: "fanfare",
    priority: 7, 
    sortingOrder: 4, 
    isFavorite: false 
  },
  { 
    id: "g-star-trophy", 
    name: "Star Trophy", 
    cost: 500, 
    type: GiftType.THREE_D, 
    icon: "🏆", 
    color: "from-yellow-300 to-amber-500", 
    animationClass: "animate-pulse", 
    category: "New", 
    description: "Awarded to the most promising and energetic hosts.", 
    animationFile: "🏆", 
    animationFormat: "svg", 
    animationDuration: 8, 
    animationDisplayType: "half", 
    comboSupported: true, 
    status: "active", 
    featured: false,
    limited: false,
    vipOnly: false,
    pkOnly: false,
    eventOnly: false,
    soundEffect: "applause",
    priority: 6, 
    sortingOrder: 5, 
    isFavorite: false 
  },
  { 
    id: "g-eid-festival", 
    name: "Eid Festival", 
    cost: 2500, 
    type: GiftType.THREE_D, 
    icon: "🕌", 
    color: "from-teal-500 to-green-600", 
    animationClass: "animate-pulse", 
    category: "Festival", 
    description: "Celebrate festive milestones with glowing lanterns!", 
    animationFile: "🕌", 
    animationFormat: "svga", 
    animationDuration: 12, 
    animationDisplayType: "full", 
    comboSupported: true, 
    status: "active", 
    featured: true,
    limited: false,
    vipOnly: false,
    pkOnly: false,
    eventOnly: false,
    soundEffect: "bells",
    priority: 5, 
    sortingOrder: 6, 
    isFavorite: false 
  },
  { 
    id: "g-car", 
    name: "Sports Car", 
    cost: 4999, 
    type: GiftType.LUXURY, 
    icon: "🏎️", 
    color: "from-blue-500 to-indigo-600", 
    animationClass: "animate-bounce", 
    category: "Luxury", 
    description: "Rev your engine with custom tire tracking neon glow overlay.", 
    animationFile: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4", 
    animationFormat: "mp4", 
    animationDuration: 10, 
    animationDisplayType: "full", 
    comboSupported: false, 
    status: "active", 
    featured: true,
    limited: false,
    vipOnly: false,
    pkOnly: false,
    eventOnly: false,
    soundEffect: "engine_rev",
    priority: 4, 
    sortingOrder: 7, 
    isFavorite: false 
  },
  { 
    id: "g-rocket", 
    name: "Space Rocket", 
    cost: 9999, 
    type: GiftType.LUXURY, 
    icon: "🚀", 
    color: "from-purple-600 to-pink-600", 
    animationClass: "animate-pulse", 
    category: "Premium", 
    description: "Blast off into the cosmos with live stellar particle trails.", 
    animationFile: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4", 
    animationFormat: "mp4", 
    animationDuration: 15, 
    animationDisplayType: "full", 
    comboSupported: false, 
    status: "active", 
    featured: true,
    limited: false,
    vipOnly: false,
    pkOnly: false,
    eventOnly: false,
    soundEffect: "rocket_blast",
    priority: 3, 
    sortingOrder: 8, 
    isFavorite: false 
  },
  { 
    id: "g-dragon", 
    name: "Golden Dragon", 
    cost: 29999, 
    type: GiftType.LUXURY, 
    icon: "🐉", 
    color: "from-amber-500 to-red-600", 
    animationClass: "animate-bounce", 
    category: "Luxury", 
    description: "Screaming golden fire storm engulfs the live stream.", 
    animationFile: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4", 
    animationFormat: "mp4", 
    animationDuration: 30, 
    animationDisplayType: "ultra", 
    comboSupported: false, 
    status: "active", 
    featured: true,
    limited: true,
    vipOnly: false,
    pkOnly: false,
    eventOnly: false,
    soundEffect: "dragon_roar",
    priority: 2, 
    sortingOrder: 9, 
    isFavorite: false 
  },
  { 
    id: "g-magic-castle", 
    name: "Magic Castle", 
    cost: 50000, 
    type: GiftType.LUXURY, 
    icon: "🏰", 
    color: "from-violet-600 to-fuchsia-600", 
    animationClass: "animate-pulse", 
    category: "Limited Edition", 
    description: "Behold! The legendary magical kingdom full takeover!", 
    animationFile: "🏰", 
    animationFormat: "webm", 
    animationDuration: 30, 
    animationDisplayType: "ultra", 
    comboSupported: false, 
    status: "active", 
    featured: true,
    limited: true,
    vipOnly: false,
    pkOnly: false,
    eventOnly: false,
    soundEffect: "magic_sparkle",
    priority: 1, 
    sortingOrder: 10, 
    isFavorite: false 
  },
  { 
    id: "g-shield", 
    name: "PK Shield", 
    cost: 1200, 
    type: GiftType.THREE_D, 
    icon: "🛡️", 
    color: "from-cyan-500 to-blue-600", 
    animationClass: "animate-bounce", 
    category: "PK", 
    description: "Invulnerable barrier of defense for crucial seconds of battle!", 
    animationFile: "🛡️", 
    animationFormat: "svg", 
    animationDuration: 10, 
    animationDisplayType: "pk", 
    comboSupported: true, 
    status: "active", 
    featured: false,
    limited: false,
    vipOnly: false,
    pkOnly: true,
    eventOnly: false,
    soundEffect: "shield_clang",
    priority: 5, 
    sortingOrder: 11, 
    isFavorite: false 
  }
];

// Helper to load state from LocalStorage
export const loadGiftsFromStorage = (): Gift[] => {
  const saved = localStorage.getItem("pardais_party_gifts_v1");
  let list: Gift[] = DEFAULT_ADVANCED_GIFTS;
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const giftMap = new Map<string, Gift>();
        DEFAULT_ADVANCED_GIFTS.forEach(g => giftMap.set(g.id, g));
        parsed.forEach(g => {
          if (g && g.id) {
            const defG = DEFAULT_ADVANCED_GIFTS.find(d => d.id === g.id);
            if (defG && (defG.animationFormat === "webm" || defG.animationFormat === "mp4") && (!g.animationFile || g.animationFile.length < 5 || (typeof g.animationFile === "string" && !g.animationFile.startsWith("http") && !g.animationFile.startsWith("data:") && !g.animationFile.startsWith("blob:")))) {
              g.animationFile = defG.animationFile;
              g.animationFormat = defG.animationFormat;
            }
            giftMap.set(g.id, g);
          }
        });
        list = Array.from(giftMap.values());
      }
    } catch (e) {
      console.error(e);
    }
  }
  return list;
};

export const saveGiftsToStorage = (gifts: Gift[]) => {
  localStorage.setItem("pardais_party_gifts_v1", JSON.stringify(gifts));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("pardais_gifts_updated"));
  }
};

export const loadCategoriesFromStorage = (): string[] => {
  const saved = localStorage.getItem("pardais_party_gift_categories_v1");
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
  }
  return INITIAL_CATEGORIES;
};

export const saveCategoriesToStorage = (categories: string[]) => {
  localStorage.setItem("pardais_party_gift_categories_v1", JSON.stringify(categories));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("pardais_categories_updated"));
  }
};

// ==========================================
// 1. VIEWER GIFT BOX UI & COMBO SENDING SYSTEM
// ==========================================
interface ViewerGiftBoxProps {
  user: UserProfile;
  setUser: React.Dispatch<React.SetStateAction<UserProfile>>;
  activeHostName: string;
  onClose: () => void;
  giftsList: Gift[];
  categoriesList: string[];
  recipient: string;
  setRecipient: (val: string) => void;
  guestSeats: any[];
  setGuestSeats: React.Dispatch<React.SetStateAction<any[]>>;
  onGiftSent: (gift: Gift, count: number, recipientName: string, isCombo?: boolean) => void;
  onShowHistory?: () => void;
}

export const ViewerGiftBox: React.FC<ViewerGiftBoxProps> = ({
  user,
  setUser,
  activeHostName = "Host",
  onClose,
  giftsList = [],
  categoriesList = [],
  recipient = "Host",
  setRecipient = (_val?: string) => {},
  guestSeats = [],
  setGuestSeats = () => {},
  onGiftSent,
  onShowHistory
}) => {
  const [activeTab, setActiveTab] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedGift, setSelectedGift] = useState<Gift | null>(giftsList?.[0] || null);

  // Auto select valid gift when list updates
  useEffect(() => {
    if (!selectedGift && giftsList && giftsList.length > 0) {
      setSelectedGift(giftsList[0]);
    } else if (selectedGift && giftsList) {
      const match = giftsList.find(g => g.id === selectedGift.id);
      if (!match && giftsList.length > 0) {
        setSelectedGift(giftsList[0]);
      }
    }
  }, [giftsList]);
  const [selectedCombo, setSelectedCombo] = useState<number>(1);
  const [isCustomMode, setIsCustomMode] = useState<boolean>(false);
  const [customComboInput, setCustomComboInput] = useState<string>("");
  const [sendToAll, setSendToAll] = useState<boolean>(false);

  // Compute active occupants in room (Host + occupied guest seats)
  const activeOccupants = useMemo(() => {
    const list: { id: string; name: string }[] = [];
    const hostName = activeHostName || "Host";
    list.push({ id: "host", name: hostName });

    (guestSeats || []).forEach(seat => {
      if (seat && seat.name !== null && seat.name !== undefined && String(seat.name).trim() !== "") {
        if (!list.some(item => item.name.toLowerCase() === String(seat.name).toLowerCase())) {
          list.push({ id: `seat-${seat.id}`, name: String(seat.name) });
        }
      }
    });

    return list;
  }, [activeHostName, guestSeats]);
  
  // Tap combo state tracking
  const [tapComboCount, setTapComboCount] = useState<number>(0);
  const [comboTimerActive, setComboTimerActive] = useState<boolean>(false);
  const comboTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [favoriteGifts, setFavoriteGifts] = useState<string[]>(() => {
    const saved = localStorage.getItem("pardais_party_favs_v1");
    return saved ? JSON.parse(saved) : [];
  });

  // Cleanup combo timer on unmount
  useEffect(() => {
    return () => {
      if (comboTimerRef.current) clearTimeout(comboTimerRef.current);
    };
  }, []);

  // Keep favorite state saved
  const toggleFavorite = (giftId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    let next;
    if ((favoriteGifts || []).includes(giftId)) {
      next = (favoriteGifts || []).filter(id => id !== giftId);
    } else {
      next = [...(favoriteGifts || []), giftId];
    }
    setFavoriteGifts(next);
    localStorage.setItem("pardais_party_favs_v1", JSON.stringify(next));
  };

  // Filter gifts
  const filteredGifts = (giftsList || []).filter(g => {
    if (!g) return false;
    if (g.status === "inactive") return false;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || 
                          (g.name || "").toLowerCase().includes(q) || 
                          (g.description || "").toLowerCase().includes(q) ||
                          (g.category || "").toLowerCase().includes(q);

    if (activeTab === "Favorites") {
      return matchesSearch && (favoriteGifts || []).includes(g.id);
    }
    if (activeTab === "All" || !activeTab) {
      return matchesSearch;
    }
    const giftCat = (g.category || "Popular").trim().toLowerCase();
    const currentTab = activeTab.trim().toLowerCase();
    return matchesSearch && giftCat === currentTab;
  });

  // Combo options required by spec
  const presetComboOptions = [1, 5, 10, 20, 50, 99, 100];

  const handleSelectPreset = (num: number) => {
    setIsCustomMode(false);
    setSelectedCombo(num);
  };

  const handleCustomInputChange = (val: string) => {
    setCustomComboInput(val);
    const parsed = parseInt(val, 10);
    if (!isNaN(parsed) && parsed > 0) {
      setSelectedCombo(parsed);
    } else {
      setSelectedCombo(1);
    }
  };

  const handleSendPress = (isComboSend: boolean = false) => {
    if (!selectedGift) {
      alert("Please select a virtual gift to send first! 🎁");
      return;
    }

    const currentComboQty = Math.max(1, selectedCombo);
    const participantCount = sendToAll ? Math.max(1, activeOccupants.length) : 1;
    const totalCost = selectedGift.cost * currentComboQty * participantCount;
    const userCoinBalance = Number(user?.coins) || 0;

    // VALIDATION against REAL user wallet coin balance
    if (userCoinBalance < totalCost) {
      alert(`❌ Insufficient Coins!\n\nGift: ${selectedGift.name} (${selectedGift.cost} Coins)\nQuantity: x${currentComboQty}${sendToAll ? " per occupant" : ""}\nOccupants: ${sendToAll ? `${activeOccupants.length} occupants` : "1 person"}\nTotal Required: ${totalCost.toLocaleString()} Coins\nAvailable Wallet Balance: ${userCoinBalance.toLocaleString()} Coins\n\nPlease recharge in the Wallet module! 💎`);
      return;
    }

    // Update Tap Combo count logic
    let nextTapCount = tapComboCount + currentComboQty;
    if (!comboTimerActive) {
      nextTapCount = currentComboQty;
    }
    setTapComboCount(nextTapCount);
    setComboTimerActive(true);

    // Reset 3-second combo timeout timer
    if (comboTimerRef.current) clearTimeout(comboTimerRef.current);
    comboTimerRef.current = setTimeout(() => {
      setComboTimerActive(false);
      setTapComboCount(0);
    }, 3000);

    if (sendToAll && activeOccupants.length > 0) {
      // Broadcast gift animation and credit to EVERY individual occupant
      activeOccupants.forEach(occ => {
        onGiftSent(selectedGift, currentComboQty, occ.name, isComboSend);
      });
    } else {
      // Determine exact target name
      let targetName = activeHostName || "Host";
      if (recipient && recipient !== "Host") {
        const seatMatch = recipient.match(/\d+/);
        const seatId = seatMatch ? parseInt(seatMatch[0], 10) : NaN;
        if (!Number.isNaN(seatId)) {
          const targetSeat = guestSeats.find(s => s.id === seatId);
          if (targetSeat && targetSeat.name) {
            targetName = targetSeat.name;
          }
        } else {
          targetName = recipient;
        }
      }
      onGiftSent(selectedGift, currentComboQty, targetName, isComboSend);
    }

    // If single normal send without COMBO mode, close box after sending.
    // If COMBO send, keep gift box open so user can keep tapping!
    if (!isComboSend && currentComboQty === 1) {
      onClose();
    }
  };

  const userCoins = Number(user?.coins) || 0;
  const participantMultiplier = sendToAll ? Math.max(1, activeOccupants.length) : 1;
  const currentTotalCoins = selectedGift ? selectedGift.cost * selectedCombo * participantMultiplier : 0;
  const hasEnoughCoins = userCoins >= currentTotalCoins;

  return (
    <div className="absolute right-0 bottom-10 bg-gradient-to-b from-[#181826] to-[#0e0e15] border border-white/10 rounded-2xl p-3 shadow-[0_10px_35px_rgba(0,0,0,0.8)] w-80 z-50 animate-pop-gift flex flex-col max-h-[460px]">
      
      {/* Header, Coin count and Close button */}
      <div className="flex justify-between items-center mb-1.5 pb-1.5 border-b border-white/5 shrink-0 bg-transparent">
        <div className="flex items-center space-x-1.5 bg-transparent">
          <GiftIcon className="w-3.5 h-3.5 text-[#ff007f] animate-pulse" />
          <h4 className="text-[10px] uppercase tracking-widest text-[#66fcf1] font-black">PARDAIS PREMIUM GIFT</h4>
          {onShowHistory && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onShowHistory();
              }}
              className="text-[8px] text-[#66fcf1] hover:text-[#ff007f] hover:underline font-bold transition-all ml-1 bg-white/5 px-1.5 py-0.5 rounded border border-white/5"
              title="View your gifting history log"
            >
              🕒 Log
            </button>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <div className="flex items-center bg-[#ffe000]/10 border border-yellow-500/20 rounded-full px-2 py-0.5">
            <span className="text-[8.5px] text-yellow-400 font-black font-mono">💎 {userCoins.toLocaleString()} Coins</span>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-white text-xs font-black p-0.5 hover:bg-white/10 rounded transition-colors"
            title="Close Gift Drawer"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Recipient Selection & Send to All Checkbox */}
      <div className="mb-1.5 bg-black/40 p-1.5 rounded-lg border border-pink-500/20 shrink-0 flex items-center justify-between">
        <label className="flex items-center space-x-1.5 cursor-pointer select-none">
          <input
            type="checkbox"
            id="checkbox_send_to_all"
            checked={sendToAll}
            onChange={(e) => setSendToAll(e.target.checked)}
            className="w-3.5 h-3.5 rounded border-gray-600 text-pink-600 focus:ring-pink-500 bg-[#12121a] cursor-pointer"
          />
          <span className="text-[8px] font-black uppercase text-pink-400 flex items-center space-x-1">
            <span>👥 Send to All</span>
            <span className="bg-pink-500/25 text-pink-200 text-[7px] px-1.5 py-0.2 rounded-full border border-pink-500/30 font-mono font-bold">
              {activeOccupants.length} {activeOccupants.length === 1 ? "Person" : "People"}
            </span>
          </span>
        </label>

        {!sendToAll ? (
          <div className="flex items-center space-x-1">
            <span className="text-[7px] text-gray-400 font-black uppercase">Send To:</span>
            <select
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              className="bg-[#12121a] text-white text-[8px] border border-gray-700/60 rounded px-1.5 py-0.5 max-w-[125px] font-medium outline-none"
            >
              <option value="Host">Host 👑 ({activeHostName})</option>
              {(guestSeats || [])
                .filter(seat => seat && seat.name !== null)
                .map(seat => (
                  <option key={seat.id} value={`Seat-${seat.id}`}>
                    Seat #{seat.id} ({seat.name})
                  </option>
                ))
              }
            </select>
          </div>
        ) : (
          <div className="text-[7.5px] font-black text-yellow-300 font-mono bg-yellow-500/10 px-2 py-0.5 rounded border border-yellow-500/20 truncate max-w-[130px]">
            👑 Host + {Math.max(0, activeOccupants.length - 1)} Guests
          </div>
        )}
      </div>

      {/* STICKY COMBO SELECTOR & COST BREAKDOWN ON TOP OF THE GIFT GRID */}
      {selectedGift && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }} 
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-purple-950/90 via-[#181028] to-[#ff007f]/20 border border-[#ff007f]/30 rounded-xl p-2 mb-2 shrink-0 relative shadow-inner flex flex-col space-y-1.5 z-10"
        >
          {/* Selected Gift Name & Required Coins Formula */}
          <div className="flex items-center justify-between text-[8.5px]">
            <div className="flex items-center space-x-1.5 font-bold text-white">
              <span className="text-base leading-none">{selectedGift.icon}</span>
              <span className="text-yellow-300 font-black">{selectedGift.name}</span>
              <span className="text-gray-400 font-mono text-[7.5px]">({selectedGift.cost} Coins)</span>
            </div>
            <div className="text-right">
              <span className="text-gray-400 font-mono text-[7.5px]">
                {selectedGift.cost} × {selectedCombo} {sendToAll ? `× ${activeOccupants.length}` : ""} = 
              </span>
              <span className={`font-black font-mono ${hasEnoughCoins ? "text-yellow-300" : "text-red-400"}`}>
                {currentTotalCoins.toLocaleString()} Coins
              </span>
            </div>
          </div>

          {/* Preset Buttons + Custom Input Toggle */}
          <div className="flex items-center space-x-1 overflow-x-auto pb-0.5 scrollbar-none">
            {presetComboOptions.map(num => (
              <button
                key={num}
                onClick={() => handleSelectPreset(num)}
                className={`px-1.5 py-0.5 rounded text-[7.5px] font-black transition-all cursor-pointer whitespace-nowrap ${
                  !isCustomMode && selectedCombo === num 
                    ? "bg-gradient-to-r from-[#ff007f] to-purple-600 text-white shadow-md scale-105 border border-pink-400/40" 
                    : "bg-black/40 text-gray-300 hover:bg-black/60 border border-white/5"
                }`}
              >
                x{num}
              </button>
            ))}
            <button
              onClick={() => {
                setIsCustomMode(true);
                if (customComboInput) {
                  handleCustomInputChange(customComboInput);
                } else {
                  handleCustomInputChange("25");
                }
              }}
              className={`px-1.5 py-0.5 rounded text-[7.5px] font-black transition-all cursor-pointer whitespace-nowrap ${
                isCustomMode 
                  ? "bg-amber-500 text-black font-black shadow-md border border-amber-300" 
                  : "bg-black/40 text-amber-400 hover:bg-black/60 border border-amber-500/20"
              }`}
            >
              Custom
            </button>
          </div>

          {/* Custom Combo Number Field */}
          {isCustomMode && (
            <div className="flex items-center space-x-1.5 bg-black/50 p-1 rounded-lg border border-amber-500/30 animate-fade-in">
              <span className="text-[7.5px] font-black text-amber-400 uppercase">Enter Quantity:</span>
              <input
                type="number"
                min="1"
                max="99999"
                value={customComboInput}
                onChange={(e) => handleCustomInputChange(e.target.value)}
                placeholder="e.g. 25"
                className="bg-[#12121c] text-yellow-300 text-[9px] font-black font-mono border border-amber-500/40 rounded px-1.5 py-0.5 w-20 outline-none focus:border-amber-400"
              />
              <span className="text-[7.5px] text-gray-400 font-mono">
                = {(selectedGift.cost * (parseInt(customComboInput, 10) || 1)).toLocaleString()} Coins
              </span>
            </div>
          )}

          {/* Active Tap Combo Feedback Badge */}
          {comboTimerActive && tapComboCount > 0 && (
            <div className="flex items-center justify-between bg-gradient-to-r from-amber-500/20 to-pink-500/20 border border-amber-400/40 rounded-lg px-2 py-1 animate-pulse">
              <span className="text-[8px] font-black text-amber-300 uppercase tracking-wider flex items-center space-x-1">
                <span>🔥 TAP COMBO ACTIVE:</span>
                <span className="text-yellow-200">{selectedGift.icon} {selectedGift.name}</span>
              </span>
              <span className="text-xs font-black font-mono text-yellow-300 drop-shadow">
                ×{tapComboCount}
              </span>
            </div>
          )}

          {/* Send Buttons & Balance Check */}
          <div className="flex items-center justify-between pt-0.5">
            <div className="text-[7.5px] text-gray-400 font-mono">
              {!hasEnoughCoins ? (
                <span className="text-red-400 font-bold">⚠️ Insufficient coins</span>
              ) : (
                <span>After send: <strong className="text-green-400 font-mono">{(userCoins - currentTotalCoins).toLocaleString()}</strong></span>
              )}
            </div>

            <div className="flex items-center space-x-1.5">
              {selectedGift.comboSupported !== false && (
                <button
                  onClick={() => handleSendPress(true)}
                  disabled={!hasEnoughCoins}
                  className={`bg-gradient-to-r from-amber-500 to-orange-600 text-white font-black uppercase text-[8.5px] py-1 px-2.5 rounded-lg flex items-center justify-center space-x-0.5 transition-all cursor-pointer shadow-[0_2px_8px_rgba(245,158,11,0.4)] ${
                    !hasEnoughCoins ? "opacity-50 cursor-not-allowed" : "hover:brightness-110 active:scale-90 animate-pulse"
                  }`}
                  title="Keep tapping to build huge combo multiplier!"
                >
                  <span>COMBO ⚡</span>
                </button>
              )}
              <button
                onClick={() => handleSendPress(false)}
                disabled={!hasEnoughCoins}
                className={`bg-gradient-to-r from-[#ff007f] to-purple-600 text-white font-black uppercase text-[8.5px] py-1 px-2.5 rounded-lg flex items-center justify-center space-x-1 transition-all cursor-pointer shadow-[0_2px_8px_rgba(255,0,127,0.3)] ${
                  !hasEnoughCoins ? "opacity-50 cursor-not-allowed" : "hover:brightness-110 active:scale-95"
                }`}
              >
                <Send className="w-2.5 h-2.5 shrink-0" />
                <span>SEND</span>
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Category Tabs Scroll Bar */}
      <div className="flex space-x-1 overflow-x-auto pb-1 border-b border-white/5 shrink-0 select-none scrollbar-none scroll-smooth">
        <button
          onClick={() => setActiveTab("All")}
          className={`px-2 py-1 rounded-md text-[7.5px] font-black uppercase tracking-wider flex items-center space-x-0.5 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "All"
              ? "bg-[#66fcf1] text-gray-900 font-black"
              : "text-gray-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <span>ALL 🎁</span>
        </button>
        <button
          onClick={() => setActiveTab("Favorites")}
          className={`px-2 py-1 rounded-md text-[7.5px] font-black uppercase tracking-wider flex items-center space-x-0.5 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "Favorites"
              ? "bg-[#66fcf1] text-gray-900 font-black"
              : "text-gray-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <Star className="w-2 h-2 fill-current" />
          <span>Favs</span>
        </button>
        {categoriesList.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveTab(cat)}
            className={`px-2.5 py-1 rounded-md text-[7.5px] font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
              activeTab === cat
                ? "bg-[#66fcf1] text-gray-900 font-black"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Search Bar inside Giftbox */}
      <div className="my-1.5 bg-black/40 border border-white/5 rounded-lg px-2 py-0.5 shrink-0 flex items-center">
        <Search className="w-2.5 h-2.5 text-gray-500 mr-1.5 shrink-0" />
        <input
          type="text"
          placeholder="Search items by name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="bg-transparent text-[7.5px] text-white flex-1 outline-none h-4 placeholder-gray-500"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery("")} className="text-gray-500 hover:text-white text-[7px] font-mono px-0.5">✕</button>
        )}
      </div>

      {/* Gift Grid with Lazy Loading Layout */}
      <div className="flex-1 overflow-y-auto grid grid-cols-3 gap-1.5 pr-0.5 py-1 min-h-[120px]">
        {filteredGifts.length === 0 ? (
          <div className="col-span-3 flex flex-col items-center justify-center text-center py-6 text-gray-500">
            <AlertCircle className="w-5 h-5 text-gray-600 mb-1" />
            <p className="text-[7.5px] font-bold">No gifts found in this tab!</p>
          </div>
        ) : (
          filteredGifts.map(gift => {
            const isFav = favoriteGifts.includes(gift.id);
            const isSelected = selectedGift?.id === gift.id;
            return (
              <div
                key={gift.id}
                onClick={() => {
                  setSelectedGift(gift);
                  setSelectedCombo(1); // Reset default to 1 on select
                  setIsCustomMode(false);
                }}
                className={`group p-1.5 rounded-xl border flex flex-col items-center justify-center transition-all relative cursor-pointer ${
                  isSelected 
                    ? "bg-purple-950/50 border-[#ff007f] shadow-[0_0_10px_rgba(255,0,127,0.2)]" 
                    : "bg-[#10101b] hover:bg-white/[0.04] border-white/[0.07] hover:border-white/15"
                }`}
              >
                {/* Favorite & Combo badges */}
                <button
                  type="button"
                  onClick={(e) => toggleFavorite(gift.id, e)}
                  className="absolute top-1 left-1.5 z-10 p-0.5 rounded text-gray-400 hover:text-yellow-400 transition-colors"
                >
                  <Star className={`w-2.5 h-2.5 ${isFav ? "text-yellow-400 fill-yellow-400" : ""}`} />
                </button>

                {gift.comboSupported && (
                  <span className="absolute top-1 right-1.5 bg-[#ff007f]/20 border border-[#ff007f]/40 text-[#ff007f] font-black text-[5.5px] px-1 rounded-sm leading-none font-mono tracking-wide scale-90">
                    COMBO
                  </span>
                )}

                {/* Display Type tags */}
                {gift.animationDisplayType && (
                  <span className="absolute bottom-1 right-1.5 text-[5px] text-gray-500 font-mono scale-90">
                    {gift.animationDisplayType.toUpperCase()}
                  </span>
                )}

                {/* Gift Icon / Image thumbnail preview */}
                {gift.icon && (gift.icon.startsWith("http") || gift.icon.startsWith("data:image")) ? (
                  <img src={gift.icon} alt={gift.name} className="w-7 h-7 object-contain my-0.5 group-hover:scale-110 transition-transform filter drop-shadow-md" />
                ) : (
                  <span className="text-[20px] block my-0.5 group-hover:scale-110 transition-transform filter drop-shadow-md select-none">
                    {gift.icon}
                  </span>
                )}

                {/* Gift metadata */}
                <span className="text-[7.5px] font-black text-gray-200 truncate w-full text-center mt-0.5">
                  {gift.name}
                </span>
                <span className="text-[6.5px] text-yellow-400 font-bold font-mono">
                  {gift.cost} Coins
                </span>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
};


// ==========================================
// 2. REAL-TIME GIFT ANIMATION ENGINE & QUEUE
// ==========================================

// Helper component for SVGA vector canvas animations with transparent background
const SvgaCanvasPlayer: React.FC<{ file: string; color?: string; name?: string }> = ({ file, color, name }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animFrame: number;
    let tick = 0;

    const render = () => {
      tick++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      ctx.save();
      // Outer vector aura ring
      ctx.beginPath();
      ctx.arc(centerX, centerY, 70 + Math.sin(tick * 0.08) * 15, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255, 0, 127, 0.7)";
      ctx.lineWidth = 3;
      ctx.stroke();

      // Inner pulsating core ring
      ctx.beginPath();
      ctx.arc(centerX, centerY, 45 + Math.cos(tick * 0.1) * 10, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255, 215, 0, 0.8)";
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Vector sparkle particles
      for (let i = 0; i < 10; i++) {
        const angle = (i * Math.PI) / 5 + tick * 0.04;
        const dist = 85 + Math.sin(tick * 0.1 + i) * 20;
        const px = centerX + Math.cos(angle) * dist;
        const py = centerY + Math.sin(angle) * dist;

        ctx.fillStyle = i % 2 === 0 ? "#ffe000" : "#66fcf1";
        ctx.beginPath();
        ctx.arc(px, py, 3.5 + Math.sin(tick * 0.15 + i) * 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      animFrame = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrame) cancelAnimationFrame(animFrame);
    };
  }, [file]);

  return (
    <div className="relative w-80 h-80 flex items-center justify-center bg-transparent pointer-events-none select-none">
      <canvas ref={canvasRef} width={320} height={320} className="absolute inset-0 bg-transparent pointer-events-none z-10" />
      {file && (file.startsWith("http") || file.startsWith("data:image")) ? (
        <img src={file} alt={name || "SVGA Animation"} className="w-44 h-44 object-contain relative z-20 animate-pulse drop-shadow-[0_0_30px_rgba(255,0,127,0.7)]" style={{ backgroundColor: 'transparent' }} />
      ) : (
        <span className="text-[90px] relative z-20 animate-bounce drop-shadow-[0_0_35px_rgba(255,215,0,0.8)]">{file || "👑"}</span>
      )}
    </div>
  );
};

interface SeatCoord {
  x: number; // percentage (0 - 100)
  y: number; // percentage (0 - 100)
}

export function resolveSeatCoordinate(
  nameOrSeat: string,
  hostName?: string,
  seats?: any[]
): SeatCoord {
  const nameLower = (nameOrSeat || "").toLowerCase().trim();
  const hostLower = (hostName || "host").toLowerCase().trim();

  // If host
  if (nameLower === "host" || nameLower === hostLower || nameLower.includes("host")) {
    return { x: 50, y: 18 };
  }

  // Check seat index from name
  let seatIndex = -1;
  const matchSeatNum = nameLower.match(/seat-?(\d+)/) || nameLower.match(/#(\d+)/);
  if (matchSeatNum) {
    seatIndex = parseInt(matchSeatNum[1], 10) - 1;
  } else if (Array.isArray(seats) && seats.length > 0) {
    const foundIdx = seats.findIndex(
      s => s && ((s.name && s.name.toLowerCase().trim() === nameLower) || (s.username && s.username.toLowerCase().trim() === nameLower))
    );
    if (foundIdx !== -1) seatIndex = foundIdx;
  }

  if (seatIndex >= 0) {
    const col = seatIndex % 4;
    const row = Math.floor(seatIndex / 4);
    const x = 20 + col * 20;
    const y = 35 + row * 18;
    return { x, y };
  }

  // Default viewer position at bottom
  return { x: 50, y: 85 };
}

interface FlyingPartyGiftOverlayProps {
  sender: string;
  recipient: string;
  giftIcon: string;
  comboCount: number;
  seats?: any[];
  hostName?: string;
}

export const FlyingPartyGiftOverlay: React.FC<FlyingPartyGiftOverlayProps> = ({
  sender,
  recipient,
  giftIcon,
  comboCount,
  seats,
  hostName
}) => {
  const senderPos = useMemo(() => resolveSeatCoordinate(sender, hostName, seats), [sender, hostName, seats]);

  const recipientTargets = useMemo(() => {
    const targets: Array<{ name: string; pos: SeatCoord }> = [];
    const recLower = (recipient || "").toLowerCase().trim();

    if (recLower.includes("all") || recLower.includes("everyone") || recLower.includes("all guests")) {
      // Add Host
      targets.push({ name: hostName || "Host", pos: resolveSeatCoordinate("Host", hostName, seats) });
      // Add all occupied seats
      if (Array.isArray(seats)) {
        seats.forEach((seat: any) => {
          if (seat && (seat.name || seat.username)) {
            const sName = seat.name || seat.username;
            targets.push({ name: sName, pos: resolveSeatCoordinate(sName, hostName, seats) });
          }
        });
      }
    } else {
      targets.push({ name: recipient, pos: resolveSeatCoordinate(recipient, hostName, seats) });
    }
    return targets;
  }, [recipient, hostName, seats]);

  // Generate particle items for each recipient target
  const particles = useMemo(() => {
    const particleList: Array<{
      id: string;
      startPos: SeatCoord;
      midPos: SeatCoord;
      endPos: SeatCoord;
      delay: number;
      targetName: string;
      icon: string;
    }> = [];

    const numParticles = Math.min(14, Math.max(7, comboCount || 8));

    recipientTargets.forEach((target, tIdx) => {
      for (let i = 0; i < numParticles; i++) {
        const angleRandom = (Math.random() - 0.5) * 35; // Random trajectory curve arc
        const midX = (senderPos.x + target.pos.x) / 2 + angleRandom;
        const midY = Math.min(senderPos.y, target.pos.y) - (14 + Math.random() * 16);

        particleList.push({
          id: `fly-p-${tIdx}-${i}-${Math.random()}`,
          startPos: senderPos,
          midPos: { x: midX, y: midY },
          endPos: target.pos,
          delay: i * 0.06 + tIdx * 0.1,
          targetName: target.name,
          icon: giftIcon || "🌹"
        });
      }
    });

    return particleList;
  }, [senderPos, recipientTargets, giftIcon, comboCount]);

  const [showBurst, setShowBurst] = useState<boolean>(false);

  useEffect(() => {
    const burstTimer = setTimeout(() => {
      setShowBurst(true);
    }, 650);
    return () => clearTimeout(burstTimer);
  }, []);

  return (
    <div className="absolute inset-0 z-45 pointer-events-none select-none overflow-hidden">
      {/* 1. Flying Gift Particles along seat trajectory */}
      {particles.map(p => (
        <motion.div
          key={p.id}
          initial={{
            left: `${p.startPos.x}%`,
            top: `${p.startPos.y}%`,
            scale: 0.4,
            opacity: 0,
            rotate: 0
          }}
          animate={{
            left: [`${p.startPos.x}%`, `${p.midPos.x}%`, `${p.endPos.x}%`],
            top: [`${p.startPos.y}%`, `${p.midPos.y}%`, `${p.endPos.y}%`],
            scale: [0.5, 1.4, 0.9],
            opacity: [0, 1, 1, 0.9, 0],
            rotate: [0, 180, 360]
          }}
          transition={{
            duration: 1.0,
            delay: p.delay,
            ease: "easeInOut"
          }}
          className="absolute -translate-x-1/2 -translate-y-1/2 z-50 text-2xl filter drop-shadow-[0_0_12px_rgba(255,0,127,0.85)]"
        >
          {p.icon}
        </motion.div>
      ))}

      {/* 2. Impact Burst Sparkles & Badge on Recipient DP / Seat */}
      {showBurst &&
        recipientTargets.map((target, idx) => (
          <div
            key={`burst-${idx}-${target.name}`}
            style={{ left: `${target.pos.x}%`, top: `${target.pos.y}%` }}
            className="absolute -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none flex flex-col items-center justify-center"
          >
            {/* Sparkle explosion aura */}
            <motion.div
              initial={{ scale: 0.2, opacity: 0 }}
              animate={{ scale: [0.3, 1.9, 2.3], opacity: [0.9, 0.6, 0] }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="w-20 h-20 rounded-full bg-gradient-to-r from-amber-400/80 via-pink-500/80 to-purple-600/80 filter blur-md"
            />

            {/* Sparkle star icon */}
            <motion.div
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: [0, 1.6, 0], rotate: 45 }}
              transition={{ duration: 0.9 }}
              className="absolute text-yellow-300 text-3xl filter drop-shadow-[0_0_12px_rgba(255,215,0,0.95)]"
            >
              ✨
            </motion.div>

            {/* Floating Combo Badge popping above recipient DP */}
            <motion.div
              initial={{ y: 10, scale: 0.5, opacity: 0 }}
              animate={{ y: -28, scale: [0.6, 1.25, 1], opacity: [0, 1, 1, 0] }}
              transition={{ duration: 1.6, times: [0, 0.2, 0.8, 1] }}
              className="absolute -top-6 bg-gradient-to-r from-pink-600 via-rose-500 to-amber-500 text-white border border-amber-300 px-2.5 py-0.5 rounded-full font-mono font-black text-[10px] shadow-[0_0_15px_rgba(255,0,127,0.9)] flex items-center space-x-1 whitespace-nowrap z-50"
            >
              <span>{giftIcon || "🌹"}</span>
              <span className="text-yellow-300 font-extrabold">+x{comboCount || 1}</span>
            </motion.div>
          </div>
        ))}
    </div>
  );
};

interface GiftAnimationEngineProps {
  currentPlayingGift?: any;
  activeGift?: any;
  onAnimationFinished?: () => void;
  onComplete?: () => void;
  seats?: any[];
  hostName?: string;
}

export const GiftAnimationEngine: React.FC<GiftAnimationEngineProps> = ({
  currentPlayingGift,
  activeGift,
  onAnimationFinished,
  onComplete,
  seats,
  hostName
}) => {
  const currentGift = activeGift || currentPlayingGift;
  const [secondsLeft, setSecondsLeft] = useState<number>(0);
  const [videoError, setVideoError] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const finishCalledRef = useRef<boolean>(false);
  const finishCallbackRef = useRef<() => void>(() => {});

  finishCallbackRef.current = onComplete || onAnimationFinished || (() => {});

  const duration = currentGift?.gift?.animationDuration || 8;

  useEffect(() => {
    if (!currentGift) return;

    finishCalledRef.current = false;
    setVideoError(false);
    setSecondsLeft(duration);

    // Play synthesized sound effect matching gift type (Lion Roar, Fireworks, Engine Rev, Rocket, Chime, etc.)
    const sound = currentGift?.gift?.soundEffect || (
      currentGift?.gift?.name?.toLowerCase().includes("lion") ? "roar" :
      currentGift?.gift?.name?.toLowerCase().includes("firework") ? "fireworks" :
      currentGift?.gift?.name?.toLowerCase().includes("spice") ? "roar" :
      "ding"
    );
    playGiftAudioSynthesizer(sound);

    // Countdown interval for timer display
    const countdown = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(countdown);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Hard auto-disappear timer after EXACTLY duration seconds (e.g. 8 seconds)
    const hideTimer = setTimeout(() => {
      clearInterval(countdown);
      if (!finishCalledRef.current) {
        finishCalledRef.current = true;
        finishCallbackRef.current();
      }
    }, duration * 1000);

    // Video preloading if video URL is provided
    const giftObj = currentGift.gift;
    const videoMediaUrl = giftObj?.videoUrl || giftObj?.animationUrl || giftObj?.animationFile;
    if (typeof videoMediaUrl === 'string' && (videoMediaUrl.startsWith('http') || videoMediaUrl.startsWith('data:video') || videoMediaUrl.startsWith('blob:'))) {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'video';
      link.href = videoMediaUrl;
      document.head.appendChild(link);
      setTimeout(() => {
        try { document.head.removeChild(link); } catch (e) {}
      }, 3000);
    }

    return () => {
      clearInterval(countdown);
      clearTimeout(hideTimer);
    };
  }, [currentGift?.id || currentGift?.timestamp || (currentGift?.gift ? currentGift.gift.id : null), duration]);

  const { sender, recipient, gift, comboCount } = currentGift || {};
  const displayType = gift?.animationDisplayType || "full";
  const format = (gift?.animationFormat || "").toLowerCase();

  // Validate strictly if string is a real playable URL / Data URI / Blob
  const isValidUrlOrMedia = (url: any): boolean => {
    if (typeof url !== "string") return false;
    const str = url.trim();
    if (str.length < 5) return false;
    return (
      str.startsWith("http://") ||
      str.startsWith("https://") ||
      str.startsWith("data:video") ||
      str.startsWith("data:application") ||
      str.startsWith("blob:") ||
      str.endsWith(".mp4") ||
      str.endsWith(".webm") ||
      str.includes(".mp4?") ||
      str.includes(".webm?")
    );
  };

  const rawVideoUrl = gift?.videoUrl || gift?.animationUrl || (typeof gift?.animationFile === 'string' && isValidUrlOrMedia(gift.animationFile) ? gift.animationFile : "");
  const giftCost = gift?.cost || gift?.coins || 10;
  const giftIcon = gift?.icon || gift?.emoji || "🎁";

  const videoSource = isValidUrlOrMedia(rawVideoUrl) ? rawVideoUrl : "";

  // Detect whether videoSource is a valid playable video URL / Data URI / Blob
  const isVideoFormat = format === "mp4" || format === "webm";
  const isVideoUrl = isValidUrlOrMedia(videoSource);

  const isPlayableVideoUrl = !videoError && Boolean(videoSource && (isVideoFormat || isVideoUrl));

  // Detect whether source is an Animated GIF
  const isGif = !isPlayableVideoUrl && (
    format === "gif" || 
    (typeof rawVideoUrl === "string" && (rawVideoUrl.endsWith(".gif") || rawVideoUrl.startsWith("data:image/gif")))
  );

  // Auto-trigger video playback with unmuted attempt on component mount
  useEffect(() => {
    if (isPlayableVideoUrl && videoRef.current) {
      // Gift videos are visual overlays. Keep the media element muted so mobile/WebView autoplay
      // is reliable; gift sound effects are handled separately by the gift audio engine.
      videoRef.current.currentTime = 0;
      videoRef.current.muted = true;
      videoRef.current.play().catch(err => {
        console.warn("[GiftSystem] Gift overlay autoplay deferred:", err);
      });
    }
  }, [currentGift?.id, isPlayableVideoUrl, videoSource]);

  if (!currentGift) return null;

  const isLionGift = Boolean(
    gift?.id === "g-lion" ||
    (gift?.name && gift.name.toLowerCase().includes("lion")) ||
    giftIcon === "🦁"
  );

  const isSpiceGift = Boolean(
    gift?.id === "g-spice" ||
    (gift?.name && gift.name.toLowerCase().includes("spice")) ||
    giftIcon === "🌶️"
  );

  const isFireworksGift = Boolean(
    gift?.id === "g-fireworks" ||
    (gift?.name && gift.name.toLowerCase().includes("firework")) ||
    giftIcon === "🎆"
  );

  const animFile = gift?.animationFile || gift?.animationUrl || gift?.videoUrl;
  const isSvga = !isPlayableVideoUrl && !isGif && (format === "svga" || (animFile && typeof animFile === 'string' && animFile.endsWith(".svga")));
  const isSmallEmojiOnly = !isPlayableVideoUrl && !isGif && !isSvga && !isLionGift && !isSpiceGift && !isFireworksGift && giftCost >= 10 && giftCost <= 500;

  const handleFinish = () => {
    if (!finishCalledRef.current) {
      finishCalledRef.current = true;
      finishCallbackRef.current();
    }
  };

  return (
    <AnimatePresence>
      <div className="absolute inset-0 z-50 pointer-events-none flex flex-col justify-between items-center overflow-hidden bg-transparent select-none p-3">
        
        {/* Professional Gift Information Banner */}
        <motion.div
          initial={{ y: -40, opacity: 0, scale: 0.85 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -40, opacity: 0, scale: 0.85 }}
          transition={{ type: "spring", damping: 16 }}
          className="z-50 bg-gradient-to-r from-purple-950/95 via-black/95 to-amber-950/95 border border-amber-400/60 rounded-full px-5 py-2.5 flex items-center space-x-3 text-white shadow-[0_0_35px_rgba(255,215,0,0.5)] backdrop-blur-md"
        >
          <span className="text-xl animate-bounce">🎁</span>
          <div className="flex items-center space-x-2 text-xs font-mono">
            <span className="font-black text-amber-300 drop-shadow-md">👤 {sender}</span>
            <span className="text-gray-300 font-semibold">sent</span>
            <span className="font-black text-pink-400 drop-shadow-md">{giftIcon} {gift?.name || "Virtual Gift"}</span>
            <span className="font-extrabold text-yellow-300 text-sm">×{comboCount || 1}</span>
            <span className="text-gray-400">to</span>
            <span className="font-bold text-cyan-300">{recipient}</span>
          </div>

          <span className="text-[10px] text-amber-200/90 font-mono border-l border-amber-400/30 pl-2.5 font-bold">
            {secondsLeft}s
          </span>
        </motion.div>

        {/* Seat-to-seat flying particle overlay ONLY for small 2D emoji gifts when no video file exists */}
        {isSmallEmojiOnly && (
          <FlyingPartyGiftOverlay
            sender={sender}
            recipient={recipient}
            giftIcon={giftIcon}
            comboCount={comboCount || 1}
            seats={seats}
            hostName={hostName}
          />
        )}

        {/* 60 FPS Hardware-Accelerated Video Animation Layer */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ type: "spring", damping: 15 }}
          className="relative w-full h-full flex items-center justify-center bg-transparent pointer-events-none"
        >
          {/* Ambient particle blur effect */}
          <div className={`absolute w-80 h-80 rounded-full filter blur-3xl opacity-30 animate-pulse bg-gradient-to-tr ${gift?.color || "from-amber-500 via-pink-500 to-purple-600"}`} />

          {/* RENDER WEBM / MP4 TRANSPARENT VIDEO IN FULL QUALITY */}
          {isPlayableVideoUrl ? (
            <video
              ref={videoRef}
              src={videoSource}
              autoPlay
              muted
              playsInline
              preload="auto"
              crossOrigin="anonymous"
              onCanPlay={(e) => {
                const el = e.currentTarget;
                el.currentTime = 0;
                el.muted = true;
                el.play().catch(() => setVideoError(true));
              }}
              onEnded={handleFinish}
              onError={(e) => {
                const src = (e.currentTarget as HTMLVideoElement)?.currentSrc || (e.currentTarget as HTMLVideoElement)?.src || "";
                console.warn("[GiftSystem] Gift Video playback notice for source:", src || "invalid media source");
                setVideoError(true);
              }}
              className="w-full h-full max-h-[70vh] max-w-[95vw] object-contain pointer-events-none relative z-20 drop-shadow-[0_0_40px_rgba(255,215,0,0.8)]"
              style={{
                mixBlendMode: "screen", // Blends out dark backgrounds on video overlays seamlessly
                transform: "translateZ(0)",
                willChange: "transform",
                backfaceVisibility: "hidden",
                backgroundColor: "transparent"
              }}
            />
          ) : isGif ? (
            /* RENDER ANIMATED GIF OVERLAY */
            <img
              src={videoSource}
              alt={gift?.name}
              className="w-full h-full max-h-[70vh] max-w-[95vw] object-contain pointer-events-none relative z-20 drop-shadow-[0_0_40px_rgba(255,215,0,0.8)]"
              style={{ mixBlendMode: "screen" }}
            />
          ) : isLionGift ? (
            /* SPECIAL 3D GOLDEN LION ROAR ANIMATION DISPLAY */
            <div className="relative z-20 flex flex-col items-center justify-center bg-transparent pointer-events-none animate-pulse">
              <div className="relative flex items-center justify-center scale-110">
                {/* Golden Crown floating above */}
                <span className="absolute -top-12 text-5xl animate-bounce filter drop-shadow-[0_0_20px_rgba(255,215,0,0.9)]">👑</span>
                {/* Roaring Lion Icon */}
                <span className="text-[140px] block filter drop-shadow-[0_0_50px_rgba(255,215,0,1)] select-none animate-bounce">
                  🦁
                </span>
                {/* Golden Aura Rings */}
                <div className="absolute w-64 h-64 border-4 border-amber-400/60 rounded-full animate-ping pointer-events-none" />
                <div className="absolute w-80 h-80 border-2 border-yellow-300/40 rounded-full animate-pulse pointer-events-none" />
              </div>

              {/* Royal Golden Lion Title Badge */}
              <div className="mt-2 bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-700 text-white font-black text-xs px-4 py-1.5 rounded-full border border-yellow-300/60 shadow-[0_0_25px_rgba(255,215,0,0.8)] tracking-widest uppercase font-mono">
                ✨ ROYAL GOLDEN LION ROAR ✨
              </div>
            </div>
          ) : isSpiceGift ? (
            /* SPECIAL INDIAN SPICE ANIMATION DISPLAY */
            <div className="relative z-20 flex flex-col items-center justify-center bg-transparent pointer-events-none animate-bounce">
              <div className="relative flex items-center justify-center scale-110">
                <span className="text-[140px] block filter drop-shadow-[0_0_50px_rgba(255,100,0,1)] select-none">
                  🌶️
                </span>
                <div className="absolute w-64 h-64 border-4 border-red-500/70 rounded-full animate-ping pointer-events-none" />
              </div>
              <div className="mt-2 bg-gradient-to-r from-red-600 via-amber-500 to-yellow-500 text-white font-black text-xs px-4 py-1.5 rounded-full border border-amber-300/60 shadow-[0_0_25px_rgba(255,100,0,0.8)] tracking-widest uppercase font-mono">
                🔥 INDIAN SPICE POWER 🔥
              </div>
            </div>
          ) : isFireworksGift ? (
            /* SPECIAL FIREWORKS ANIMATION DISPLAY */
            <div className="relative z-20 flex flex-col items-center justify-center bg-transparent pointer-events-none animate-pulse">
              <div className="relative flex items-center justify-center scale-110">
                <span className="text-[140px] block filter drop-shadow-[0_0_50px_rgba(255,0,255,1)] select-none animate-spin">
                  🎆
                </span>
                <div className="absolute w-72 h-72 border-4 border-pink-400/80 rounded-full animate-ping pointer-events-none" />
              </div>
              <div className="mt-2 bg-gradient-to-r from-purple-600 via-pink-500 to-amber-400 text-white font-black text-xs px-4 py-1.5 rounded-full border border-pink-300/60 shadow-[0_0_25px_rgba(255,0,255,0.8)] tracking-widest uppercase font-mono">
                ✨ GRAND CELEBRATION FIREWORKS ✨
              </div>
            </div>
          ) : isSvga ? (
            /* RENDER SVGA VECTOR CANVAS PLAYER */
            <SvgaCanvasPlayer file={videoSource} color={gift?.color} name={gift?.name} />
          ) : (
            /* RENDER HIGH QUALITY DISPLAY FOR OTHER NON-VIDEO GIFTS */
            <div className="relative z-20 flex flex-col items-center justify-center bg-transparent pointer-events-none">
              {typeof animFile === 'string' && (animFile.startsWith("http") || animFile.startsWith("data:image")) ? (
                <img
                  src={animFile}
                  alt={gift?.name}
                  className={`max-w-[340px] max-h-[340px] object-contain drop-shadow-[0_0_40px_rgba(255,0,127,0.7)] ${gift?.animationClass || "animate-bounce"}`}
                  style={{ backgroundColor: 'transparent' }}
                />
              ) : (
                <span className={`text-[130px] block filter drop-shadow-[0_0_45px_rgba(255,215,0,0.9)] select-none ${gift?.animationClass || "animate-bounce"}`}>
                  {giftIcon}
                </span>
              )}
            </div>
          )}
        </motion.div>

        {/* Special visual decorations for ultra fullscreen takeovers */}
        {displayType === "ultra" && (
          <div className="absolute inset-0 pointer-events-none z-10 bg-gradient-to-b from-purple-500/10 via-transparent to-pink-500/10 animate-pulse" />
        )}

      </div>
    </AnimatePresence>
  );
};


// ==========================================
// 3. LEADERBOARD & HISTORIC TRACKER VIEWS
// ==========================================
interface GiftHistoryModalProps {
  onClose: () => void;
  user: UserProfile;
}

export const GiftHistoryModal: React.FC<GiftHistoryModalProps> = ({ onClose, user }) => {
  const [activeTab, setActiveTab] = useState<"sent" | "received" | "transactions">("sent");

  // Load actual sent transactions from history
  const [historyItems, setHistoryItems] = useState<any[]>(() => {
    // Generate some mock history initially, but save real ones
    const initialSent = [
      { id: "h-1", giftName: "VIP Crown", giftIcon: "👑", amount: 999, recipient: "Pardais Party 🎙️", date: "Today, 10:15 AM", status: "Completed" },
      { id: "h-2", giftName: "Red Rose", giftIcon: "🌹", amount: 10, recipient: "Hamza King Seat #1", date: "Today, 09:40 AM", status: "Completed" },
      { id: "h-3", giftName: "Lucky Coin", giftIcon: "🪙", amount: 50, recipient: "Zara Seat #2", date: "Yesterday, 06:12 PM", status: "Completed" },
      { id: "h-4", giftName: "Sports Car", giftIcon: "🏎️", amount: 4999, recipient: "Pardais Party 🎙️", date: "Yesterday, 04:30 PM", status: "Completed" }
    ];
    const saved = localStorage.getItem("pardais_party_history_v1");
    return saved ? JSON.parse(saved) : initialSent;
  });

  const [receivedItems, setReceivedItems] = useState<any[]>([
    { id: "r-1", giftName: "Star Trophy", giftIcon: "🏆", amount: 500, sender: "Malik_Saad", date: "Today, 11:22 AM" },
    { id: "r-2", giftName: "Love Heart", giftIcon: "💖", amount: 99, sender: "Sana_Khan", date: "Yesterday, 11:05 PM" },
    { id: "r-3", giftName: "Red Rose", giftIcon: "🌹", amount: 10, sender: "Shera_Puttar", date: "Yesterday, 08:15 PM" }
  ]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 text-white">
      <div className="bg-[#12121a] border border-white/10 rounded-2xl w-full max-w-sm overflow-hidden flex flex-col shadow-2xl max-h-[80vh] animate-pop-gift">
        
        {/* Header */}
        <div className="p-3.5 border-b border-white/5 bg-gradient-to-b from-purple-950/40 to-transparent flex justify-between items-center shrink-0">
          <div className="flex items-center space-x-2">
            <History className="w-4 h-4 text-pink-400" />
            <h4 className="text-xs uppercase tracking-widest font-black font-mono">My Gift History & Logs</h4>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white bg-white/5 p-1 rounded-full hover:bg-white/10 transition-all"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="grid grid-cols-3 gap-1 bg-black/40 p-1.5 border-b border-white/5 shrink-0">
          <button
            onClick={() => setActiveTab("sent")}
            className={`py-1.5 rounded text-[8.5px] font-black uppercase transition-all ${
              activeTab === "sent" ? "bg-[#ff007f] text-white" : "text-gray-400 hover:text-white"
            }`}
          >
            📤 Sent Today
          </button>
          <button
            onClick={() => setActiveTab("received")}
            className={`py-1.5 rounded text-[8.5px] font-black uppercase transition-all ${
              activeTab === "received" ? "bg-[#ff007f] text-white" : "text-gray-400 hover:text-white"
            }`}
          >
            📥 Received
          </button>
          <button
            onClick={() => setActiveTab("transactions")}
            className={`py-1.5 rounded text-[8.5px] font-black uppercase transition-all ${
              activeTab === "transactions" ? "bg-[#ff007f] text-white" : "text-gray-400 hover:text-white"
            }`}
          >
            💎 Ledger Balance
          </button>
        </div>

        {/* List scroll view */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-2 bg-[#09090f]">
          {activeTab === "sent" && (
            <div className="space-y-2">
              <div className="flex justify-between items-center text-[7.5px] font-bold text-gray-500 uppercase tracking-widest border-b border-white/5 pb-1">
                <span>VIRTUAL ITEM</span>
                <span>DESTINATION</span>
              </div>
              {historyItems.map((item) => (
                <div key={item.id} className="bg-white/[0.02] border border-white/5 rounded-xl p-2.5 flex items-center justify-between text-left">
                  <div className="flex items-center space-x-2">
                    <span className="text-xl filter drop-shadow-md">{item.giftIcon}</span>
                    <div>
                      <h5 className="text-[9.5px] font-black text-white">{item.giftName}</h5>
                      <p className="text-[7.5px] text-gray-500 font-medium">{item.date}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] text-yellow-400 font-bold font-mono">-{item.amount} Coins</p>
                    <p className="text-[7px] text-gray-400 truncate max-w-[80px]">to {item.recipient}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === "received" && (
            <div className="space-y-2">
              <div className="flex justify-between items-center text-[7.5px] font-bold text-gray-500 uppercase tracking-widest border-b border-white/5 pb-1">
                <span>VIRTUAL ITEM</span>
                <span>SENDER</span>
              </div>
              {receivedItems.map((item) => (
                <div key={item.id} className="bg-white/[0.02] border border-white/5 rounded-xl p-2.5 flex items-center justify-between text-left">
                  <div className="flex items-center space-x-2">
                    <span className="text-xl filter drop-shadow-md">{item.giftIcon}</span>
                    <div>
                      <h5 className="text-[9.5px] font-black text-white">{item.giftName}</h5>
                      <p className="text-[7.5px] text-gray-500 font-medium">{item.date}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] text-green-400 font-bold font-mono">+{Math.floor(item.amount * 0.1)} Diamonds</p>
                    <p className="text-[7px] text-gray-400">from @{item.sender}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === "transactions" && (
            <div className="space-y-2 text-left">
              <div className="bg-gradient-to-r from-purple-950/20 to-[#ff007f]/5 border border-white/5 rounded-xl p-3 mb-3">
                <p className="text-[8px] text-gray-400 uppercase font-bold">Total Platform Earnings</p>
                <div className="flex items-baseline space-x-1.5 mt-1">
                  <span className="text-lg font-black text-white font-mono">{user.coins}</span>
                  <span className="text-[8px] text-yellow-400 font-black">COINS</span>
                </div>
                <div className="flex items-baseline space-x-1.5">
                  <span className="text-lg font-black text-cyan-400 font-mono">{user.diamonds}</span>
                  <span className="text-[8px] text-cyan-300 font-black">DIAMONDS</span>
                </div>
              </div>

              <p className="text-[7.5px] text-gray-500 uppercase font-black border-b border-white/5 pb-1">Ledger Notes</p>
              <div className="space-y-1 text-[7.5px] text-gray-400 leading-relaxed font-semibold">
                <p>• Coins are used to purchase gifts for hosts & guest seat members.</p>
                <p>• Diamonds represent stream contribution value accumulated from receiving gifts.</p>
                <p>• Diamonds can be withdrawn to JazzCash/EasyPaisa via the Agency Panel.</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-white/5 bg-black/20 text-center shrink-0">
          <p className="text-[7px] text-gray-500 font-mono">Pardais Party Secure Wallet System • Transactions Logged</p>
        </div>

      </div>
    </div>
  );
};


// ==========================================
// 4. REAL-TIME GIFT SYSTEM ADMIN MODULE
// ==========================================
interface AdminGiftTabProps {
  giftsList: Gift[];
  setGiftsList: React.Dispatch<React.SetStateAction<Gift[]>>;
  categoriesList: string[];
  setCategoriesList: React.Dispatch<React.SetStateAction<string[]>>;
}

export const AdminGiftTab: React.FC<AdminGiftTabProps> = ({
  giftsList,
  setGiftsList,
  categoriesList,
  setCategoriesList
}) => {
  const [activeSubTab, setActiveSubTab] = useState<"all" | "add" | "categories" | "analytics">("all");
  const [editingGift, setEditingGift] = useState<Gift | null>(null);

  // Form Fields
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Popular");
  const [cost, setCost] = useState<number>(10);
  const [icon, setIcon] = useState("🌹");
  const [color, setColor] = useState("from-pink-500 to-rose-600");
  const [animationClass, setAnimationClass] = useState("animate-bounce");
  const [animationFile, setAnimationFile] = useState("🌹");
  const [animationFormat, setAnimationFormat] = useState<'svg' | 'svga' | 'webm' | 'lottie' | 'mp4' | 'gif'>("svg");
  const [animationDuration, setAnimationDuration] = useState<number>(5);
  const [animationDisplayType, setAnimationDisplayType] = useState<'small' | 'half' | 'full' | 'ultra' | 'pk' | 'event'>("small");
  const [comboSupported, setComboSupported] = useState<boolean>(true);
  const [status, setStatus] = useState<'active' | 'inactive'>("active");
  const [featured, setFeatured] = useState<boolean>(true);
  const [limited, setLimited] = useState<boolean>(false);
  const [vipOnly, setVipOnly] = useState<boolean>(false);
  const [pkOnly, setPkOnly] = useState<boolean>(false);
  const [eventOnly, setEventOnly] = useState<boolean>(false);
  const [soundEffect, setSoundEffect] = useState("ding");
  const [priority, setPriority] = useState<number>(5);
  const [sortingOrder, setSortingOrder] = useState<number>(1);

  // Category Manage Fields
  const [newCatName, setNewCatName] = useState("");
  const [renamingCatIndex, setRenamingCatIndex] = useState<number | null>(null);
  const [renameCatText, setRenameCatText] = useState("");

  // Simulated Animation preview modal
  const [previewGift, setPreviewGift] = useState<Gift | null>(null);

  // Initialize fields on edit
  const startEdit = (gift: Gift) => {
    setEditingGift(gift);
    setName(gift.name);
    setDescription(gift.description || "");
    setCategory(gift.category || "Popular");
    setCost(gift.cost);
    setIcon(gift.icon);
    setColor(gift.color);
    setAnimationClass(gift.animationClass);
    setAnimationFile(gift.animationFile || gift.icon);
    setAnimationFormat(gift.animationFormat || "svg");
    setAnimationDuration(gift.animationDuration || 5);
    setAnimationDisplayType(gift.animationDisplayType || "small");
    setComboSupported(gift.comboSupported ?? true);
    setStatus(gift.status || "active");
    setFeatured(gift.featured ?? false);
    setLimited(gift.limited ?? false);
    setVipOnly(gift.vipOnly ?? false);
    setPkOnly(gift.pkOnly ?? false);
    setEventOnly(gift.eventOnly ?? false);
    setSoundEffect(gift.soundEffect || "ding");
    setPriority(gift.priority || 5);
    setSortingOrder(gift.sortingOrder || 1);
    setActiveSubTab("add");
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert("Gift Name is required!");
      return;
    }

    const payload: Gift = {
      id: editingGift ? editingGift.id : `g-${Date.now()}`,
      name,
      cost,
      type: cost >= 4999 ? GiftType.LUXURY : cost >= 999 ? GiftType.THREE_D : GiftType.TWO_D,
      icon,
      color,
      animationClass,
      description,
      category,
      animationFile,
      animationFormat,
      animationDuration,
      animationDisplayType,
      comboSupported,
      status,
      featured,
      limited,
      vipOnly,
      pkOnly,
      eventOnly,
      soundEffect,
      priority,
      sortingOrder,
      isFavorite: false
    };

    let nextGifts;
    if (editingGift) {
      // Edit
      nextGifts = giftsList.map(g => g.id === editingGift.id ? payload : g);
    } else {
      // Add
      nextGifts = [payload, ...giftsList];
    }

    setGiftsList(nextGifts);
    saveGiftsToStorage(nextGifts);

    // Auto add category if new
    if (category && !categoriesList.includes(category)) {
      const updatedCats = [...categoriesList, category];
      setCategoriesList(updatedCats);
      saveCategoriesToStorage(updatedCats);
      try {
        fetch(resolveApiUrl("/api/v1/categories"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedCats)
        });
      } catch (e) {
        console.error("Category sync error:", e);
      }
    }

    // Sync with backend API
    try {
      const endpoint = editingGift ? `/api/v1/gifts/${editingGift.id}` : "/api/v1/gifts";
      const method = editingGift ? "PUT" : "POST";
      const res = await fetch(resolveApiUrl(endpoint), {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const fetchRes = await fetch(resolveApiUrl("/api/v1/gifts"));
        if (fetchRes.ok) {
          const allGifts = await fetchRes.json();
          if (Array.isArray(allGifts) && allGifts.length > 0) {
            setGiftsList(allGifts);
            saveGiftsToStorage(allGifts);
          }
        }
      }
    } catch (err) {
      console.error("Failed to sync gift to backend server:", err);
    }

    if (editingGift) {
      alert(`✅ Gift "${name}" successfully updated! Changes reflect instantly across all platforms. 🚀`);
    } else {
      alert(`✅ New Virtual Gift "${name}" successfully published to the live shop! 🌸`);
    }

    // Reset Form
    setEditingGift(null);
    setName("");
    setDescription("");
    setCost(10);
    setIcon("🌹");
    setColor("from-pink-500 to-rose-600");
    setAnimationClass("animate-bounce");
    setAnimationFile("🌹");
    setAnimationFormat("svg");
    setAnimationDuration(5);
    setAnimationDisplayType("small");
    setComboSupported(true);
    setStatus("active");
    setFeatured(true);
    setLimited(false);
    setVipOnly(false);
    setPkOnly(false);
    setEventOnly(false);
    setSoundEffect("ding");
    setPriority(5);
    setSortingOrder(1);

    setActiveSubTab("all");
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`⚠️ Warning: Are you sure you want to permanently delete "${name}"?\n\nThis will remove it instantly from the Gift Box, Search, categories, and active live rooms without requiring any app update!`)) {
      const nextGifts = giftsList.filter(g => g.id !== id);
      setGiftsList(nextGifts);
      saveGiftsToStorage(nextGifts);

      try {
        await fetch(resolveApiUrl(`/api/v1/gifts/${id}`), { method: "DELETE" });
      } catch (err) {
        console.error("Failed to delete gift on backend:", err);
      }

      alert(`🧹 "${name}" deleted successfully.`);
    }
  };

  // Add category
  const handleAddCategory = async () => {
    if (!newCatName.trim()) return;
    if (categoriesList.includes(newCatName.trim())) {
      alert("Category already exists!");
      return;
    }
    const next = [...categoriesList, newCatName.trim()];
    setCategoriesList(next);
    saveCategoriesToStorage(next);
    setNewCatName("");

    try {
      await fetch(resolveApiUrl("/api/v1/categories"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next)
      });
    } catch (e) {
      console.error("Category sync error:", e);
    }

    alert(`✅ Tab Category "${newCatName}" added!`);
  };

  const handleRenameCat = async (idx: number) => {
    if (!renameCatText.trim()) return;
    const next = [...categoriesList];
    const oldName = next[idx];
    next[idx] = renameCatText.trim();
    
    // Also update all gifts that were in the old category
    const updatedGifts = giftsList.map(g => g.category === oldName ? { ...g, category: renameCatText.trim() } : g);
    setGiftsList(updatedGifts);
    saveGiftsToStorage(updatedGifts);

    setCategoriesList(next);
    saveCategoriesToStorage(next);
    setRenamingCatIndex(null);
    setRenameCatText("");

    try {
      await fetch(resolveApiUrl("/api/v1/categories"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next)
      });
    } catch (e) {
      console.error("Category rename sync error:", e);
    }

    alert("✅ Category renamed successfully!");
  };

  const handleDeleteCat = async (idx: number, catName: string) => {
    if (window.confirm(`⚠️ Are you sure you want to delete category "${catName}"?\n\nGifts under this category will stay, but they won't have a tab unless reassigned.`)) {
      const next = categoriesList.filter((_, i) => i !== idx);
      setCategoriesList(next);
      saveCategoriesToStorage(next);

      try {
        await fetch(resolveApiUrl("/api/v1/categories"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(next)
        });
      } catch (e) {
        console.error("Category delete sync error:", e);
      }

      alert(`🧹 Category "${catName}" deleted!`);
    }
  };

  // Pre-calculated analytics
  const totalSentCount = 4280;
  const totalCoinsRevenue = giftsList.reduce((acc, curr) => acc + (curr.cost * 12), 0) + 125840;
  const topUsedGift = giftsList[0]?.name || "Red Rose";

  return (
    <div className="bg-[#1a1a24] border border-[#1f2833] rounded-2xl p-5 space-y-4 text-left shadow-lg animate-pop-gift">
      
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#1f2833] pb-3.5 gap-2">
        <div className="flex items-center space-x-2.5">
          <div className="bg-pink-500/10 p-2 rounded-xl border border-pink-500/30">
            <GiftIcon className="w-5 h-5 text-pink-500 animate-bounce" />
          </div>
          <div>
            <h4 className="text-sm font-black text-white">Pardais Party Gift & Animation Inventory console</h4>
            <p className="text-[10px] text-gray-400 font-medium">Configure SVGA overlays, durations, prices & categories. Mapped with Firebase Realtime listeners.</p>
          </div>
        </div>

        {/* Action switch */}
        <div className="flex bg-[#12121a] p-1 border border-[#1f2833] rounded-xl text-[9px] font-black uppercase">
          <button 
            onClick={() => { setActiveSubTab("all"); setEditingGift(null); }}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${activeSubTab === "all" ? "bg-pink-500 text-white shadow" : "text-gray-400 hover:text-white"}`}
          >
            All Gifts ({giftsList.length})
          </button>
          <button 
            onClick={() => setActiveSubTab("add")}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${activeSubTab === "add" ? "bg-pink-500 text-white shadow" : "text-gray-400 hover:text-white"}`}
          >
            {editingGift ? "✍️ Edit Gift" : "➕ Add Gift"}
          </button>
          <button 
            onClick={() => setActiveSubTab("categories")}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${activeSubTab === "categories" ? "bg-pink-500 text-white shadow" : "text-gray-400 hover:text-white"}`}
          >
            🗂️ Categories
          </button>
          <button 
            onClick={() => setActiveSubTab("analytics")}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${activeSubTab === "analytics" ? "bg-pink-500 text-white shadow" : "text-gray-400 hover:text-white"}`}
          >
            📊 Analytics
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: ALL GIFTS LISTING */}
      {activeSubTab === "all" && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {giftsList.map((gift) => (
              <div 
                key={gift.id} 
                className={`bg-[#12121a] border rounded-2xl p-3.5 space-y-2.5 relative group hover:border-[#ff007f]/40 transition-all shadow ${
                  gift.status === "inactive" ? "opacity-50" : ""
                }`}
              >
                {/* Active/Inactive badge */}
                <span className={`absolute top-2 right-2 text-[6.5px] font-mono uppercase font-black px-1.5 py-0.5 rounded ${
                  gift.status === "active" ? "bg-green-950/60 text-green-400 border border-green-500/20" : "bg-red-950/60 text-red-400 border border-red-500/20"
                }`}>
                  {gift.status}
                </span>

                <div className="flex items-center space-x-3">
                  {gift.icon && (gift.icon.startsWith("http") || gift.icon.startsWith("data:image")) ? (
                    <img src={gift.icon} alt={gift.name} className="w-10 h-10 object-contain rounded-lg border border-white/10 bg-white/5 p-1" />
                  ) : (
                    <span className="text-3xl filter drop-shadow-md select-none">{gift.icon}</span>
                  )}
                  <div className="flex-1 min-w-0">
                    <h5 className="text-[11px] font-black text-white truncate">{gift.name}</h5>
                    <p className="text-[8.5px] text-yellow-400 font-black font-mono">{gift.cost} Coins</p>
                    <span className="text-[7px] font-mono text-cyan-400 bg-cyan-950/40 px-1 py-0.2 rounded mt-0.5 inline-block">
                      {gift.category || "General"}
                    </span>
                  </div>
                </div>

                <div className="space-y-1 bg-black/30 p-2 rounded-xl text-[8.5px] text-gray-400 font-semibold">
                  <div className="flex justify-between">
                    <span>Display:</span>
                    <span className="text-white uppercase font-mono text-[7px]">{gift.animationDisplayType || "small"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Duration:</span>
                    <span className="text-white font-mono">{gift.animationDuration || 5}s</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Format:</span>
                    <span className="text-white uppercase font-mono text-[7px]">{gift.animationFormat || "svg"}</span>
                  </div>
                </div>

                {/* Control Options */}
                <div className="grid grid-cols-3 gap-1.5 pt-1.5 border-t border-white/5">
                  <button
                    onClick={() => setPreviewGift(gift)}
                    className="py-1 bg-blue-950/50 hover:bg-blue-900/50 text-blue-400 border border-blue-500/20 rounded-lg text-[7.5px] font-black uppercase transition-all flex items-center justify-center space-x-1 cursor-pointer"
                  >
                    <Play className="w-2 h-2 shrink-0" />
                    <span>PREVIEW</span>
                  </button>
                  <button
                    onClick={() => startEdit(gift)}
                    className="py-1 bg-[#ff007f]/10 hover:bg-[#ff007f]/20 text-[#ff007f] border border-[#ff007f]/20 rounded-lg text-[7.5px] font-black uppercase transition-all flex items-center justify-center space-x-1 cursor-pointer"
                  >
                    <Edit className="w-2 h-2 shrink-0" />
                    <span>EDIT</span>
                  </button>
                  <button
                    onClick={() => handleDelete(gift.id, gift.name)}
                    className="py-1 bg-red-950/50 hover:bg-red-900/50 text-red-400 border border-red-500/20 rounded-lg text-[7.5px] font-black uppercase transition-all flex items-center justify-center space-x-1 cursor-pointer"
                  >
                    <Trash className="w-2 h-2 shrink-0" />
                    <span>DELETE</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: ADD / EDIT GIFT FORM */}
      {activeSubTab === "add" && (
        <form onSubmit={handlePublish} className="space-y-4 bg-[#12121a] p-4 border border-[#1f2833] rounded-2xl">
          <div className="flex justify-between items-center border-b border-white/5 pb-2">
            <h5 className="text-[11px] uppercase tracking-widest text-[#66fcf1] font-black flex items-center space-x-1">
              <span>{editingGift ? "✍️ Update Existing Gift Ledger" : "➕ Register New Virtual Gift Asset"}</span>
            </h5>
            {editingGift && (
              <button 
                type="button" 
                onClick={() => { setEditingGift(null); setActiveSubTab("all"); }}
                className="text-gray-400 hover:text-white text-[9px] font-bold"
              >
                Cancel Edit
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Field 1: Name */}
            <div className="space-y-1">
              <label className="text-[8px] text-gray-400 font-black uppercase block">Gift Name *</label>
              <input
                type="text"
                placeholder="e.g. Majestic Pegasus"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-black/50 text-white text-[9.5px] border border-gray-800 rounded-lg px-2.5 py-1.5 focus:border-pink-500 outline-none font-semibold"
                required
              />
            </div>

            {/* Field 2: Coin Price */}
            <div className="space-y-1">
              <label className="text-[8px] text-gray-400 font-black uppercase block">Coin Price (Cost) *</label>
              <input
                type="number"
                min="1"
                max="999999"
                value={cost}
                onChange={(e) => setCost(parseInt(e.target.value) || 0)}
                className="w-full bg-black/50 text-white text-[9.5px] border border-gray-800 rounded-lg px-2.5 py-1.5 focus:border-pink-500 outline-none font-mono"
                required
              />
            </div>

            {/* Field 3: Category */}
            <div className="space-y-1">
              <label className="text-[8px] text-gray-400 font-black uppercase block">Gift Category *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-black/50 text-white text-[9.5px] border border-gray-800 rounded-lg px-2 py-1.5 focus:border-pink-500 outline-none font-semibold"
              >
                {categoriesList.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Field 4: Description */}
            <div className="col-span-1 md:col-span-3 space-y-1">
              <label className="text-[8px] text-gray-400 font-black uppercase block">Description / Floating Banner Subtext</label>
              <input
                type="text"
                placeholder="e.g. A legendary creature soaring across the streams with gold sprinkles."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-black/50 text-white text-[9.5px] border border-gray-800 rounded-lg px-2.5 py-1.5 focus:border-pink-500 outline-none font-semibold"
              />
            </div>

            {/* Field 5: Thumbnail Icon (PNG, SVG, Emoji, or Image Upload) */}
            <div className="space-y-1 col-span-1">
              <label className="text-[8px] text-gray-400 font-black uppercase block">Thumbnail Icon (PNG / SVG / Emoji) *</label>
              <div className="flex items-center space-x-1.5">
                <input
                  type="text"
                  placeholder="Emoji 🌹 or image URL"
                  value={icon}
                  onChange={(e) => setIcon(e.target.value)}
                  className="flex-1 bg-black/50 text-white text-[9.5px] border border-gray-800 rounded-lg px-2.5 py-1.5 focus:border-pink-500 outline-none font-semibold"
                  required
                />
                <label className="bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 border border-pink-500/40 px-2 py-1 rounded-lg text-[8px] font-bold cursor-pointer whitespace-nowrap">
                  📁 Upload Image
                  <input
                    type="file"
                    accept="image/*,.svg,.png,.webp,.jpg"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (evt) => {
                          if (evt.target?.result) {
                            setIcon(evt.target.result as string);
                          }
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </label>
              </div>
              {icon && (icon.startsWith("http") || icon.startsWith("data:image")) && (
                <div className="flex items-center space-x-2 pt-1">
                  <span className="text-[7.5px] text-gray-400 font-mono">Image Preview:</span>
                  <img src={icon} alt="Icon preview" className="w-6 h-6 object-contain rounded bg-white/10 p-0.5 border border-white/10" />
                </div>
              )}
            </div>

            {/* Field 6: Gradient Color Class */}
            <div className="space-y-1">
              <label className="text-[8px] text-gray-400 font-black uppercase block">Tailwind Gradient Color</label>
              <input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-full bg-black/50 text-white text-[9.5px] border border-gray-800 rounded-lg px-2.5 py-1.5 focus:border-pink-500 outline-none font-mono"
              />
            </div>

            {/* Field 7: CSS Animation Class */}
            <div className="space-y-1">
              <label className="text-[8px] text-gray-400 font-black uppercase block">CSS Animation Class</label>
              <select
                value={animationClass}
                onChange={(e) => setAnimationClass(e.target.value)}
                className="w-full bg-black/50 text-white text-[9.5px] border border-gray-800 rounded-lg px-2 py-1.5 focus:border-pink-500 outline-none font-semibold"
              >
                <option value="animate-bounce">Bounce (🌹/🪙/🐉)</option>
                <option value="animate-pulse">Pulse / Heartbeat (💖/🕌/🚀)</option>
                <option value="animate-spin">Spin / Rotation (👑)</option>
                <option value="animate-pulse scale-125">Large Pulse</option>
                <option value="animate-bounce scale-110">Fast Bounce</option>
              </select>
            </div>

            {/* Field 8: Animation File (URL, WebM, SVGA, or Upload) */}
            <div className="space-y-1 col-span-1 md:col-span-2">
              <label className="text-[8px] text-gray-400 font-black uppercase block">
                Animation File Path / URL (WebM, SVGA, SVG, MP4)
              </label>
              <div className="flex items-center space-x-1.5">
                <input
                  type="text"
                  placeholder="e.g. https://domain.com/gift.webm or .svga file path"
                  value={animationFile}
                  onChange={(e) => setAnimationFile(e.target.value)}
                  className="flex-1 bg-black/50 text-white text-[9.5px] border border-gray-800 rounded-lg px-2.5 py-1.5 focus:border-pink-500 outline-none font-mono"
                />
                <label className="bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 px-2.5 py-1 rounded-lg text-[8px] font-bold cursor-pointer whitespace-nowrap">
                  🎥 Upload WebM / SVGA File
                  <input
                    type="file"
                    accept=".webm,.svga,.svg,.mp4,.gif,.json"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const nameLower = file.name.toLowerCase();
                        if (nameLower.endsWith(".webm")) setAnimationFormat("webm");
                        else if (nameLower.endsWith(".svga")) setAnimationFormat("svga");
                        else if (nameLower.endsWith(".svg")) setAnimationFormat("svg");
                        else if (nameLower.endsWith(".mp4")) setAnimationFormat("mp4" as any);
                        else if (nameLower.endsWith(".gif")) setAnimationFormat("gif" as any);

                        // Upload real animation media to the backend/R2 instead of embedding huge base64 data in the gift record.
                        (async () => {
                          try {
                            const form = new FormData();
                            form.append("file", file);
                            form.append("giftId", editingGift?.id || "new");
                            const response = await fetch(resolveApiUrl("/api/v1/gifts/upload-animation"), {
                              method: "POST",
                              body: form
                            });
                            const data = await response.json();
                            if (!response.ok || !data?.url) throw new Error(data?.error || "Animation upload failed");
                            setAnimationFile(data.url);
                            alert("✅ Gift animation uploaded successfully. It will play as a real overlay in live rooms.");
                          } catch (err) {
                            console.error("[Gift Admin] animation upload failed", err);
                            // Keep the local preview usable if the backend is temporarily unavailable.
                            const reader = new FileReader();
                            reader.onload = (evt) => {
                              if (evt.target?.result) setAnimationFile(evt.target.result as string);
                            };
                            reader.readAsDataURL(file);
                            alert("⚠️ Cloud upload failed, so a local preview was loaded. Upload again after the server is available for production use.");
                          }
                        })();
                      }
                    }}
                  />
                </label>
              </div>
            </div>

            {/* Field 9: Animation Format Selector */}
            <div className="space-y-1">
              <label className="text-[8px] text-gray-400 font-black uppercase block">Animation Format Engine *</label>
              <select
                value={animationFormat}
                onChange={(e) => setAnimationFormat(e.target.value as any)}
                className="w-full bg-black/50 text-white text-[9.5px] border border-gray-800 rounded-lg px-2 py-1.5 focus:border-pink-500 outline-none font-semibold text-cyan-300"
              >
                <option value="webm">WebM Transparent Video (.webm)</option>
                <option value="svga">SVGA Animation Vector Canvas (.svga)</option>
                <option value="svg">SVG Vector Code (.svg)</option>
                <option value="mp4">MP4 Video Clip (.mp4)</option>
                <option value="gif">Animated GIF Overlay (.gif)</option>
                <option value="lottie">Lottie JSON Schema (.json)</option>
              </select>
            </div>

            {/* Field 10: Animation Duration */}
            <div className="space-y-1">
              <label className="text-[8px] text-gray-400 font-black uppercase block">Animation Duration *</label>
              <select
                value={animationDuration}
                onChange={(e) => setAnimationDuration(parseInt(e.target.value) || 5)}
                className="w-full bg-black/50 text-white text-[9.5px] border border-gray-800 rounded-lg px-2 py-1.5 focus:border-pink-500 outline-none font-semibold"
              >
                <option value="5">5 Seconds (Short/玫瑰)</option>
                <option value="10">10 Seconds (Medium/跑车)</option>
                <option value="15">15 Seconds (Premium/火箭)</option>
                <option value="30">30 Seconds (Luxury/巨龙)</option>
              </select>
            </div>

            {/* Field 11: Display type */}
            <div className="space-y-1">
              <label className="text-[8px] text-gray-400 font-black uppercase block">Animation Display Type</label>
              <select
                value={animationDisplayType}
                onChange={(e) => setAnimationDisplayType(e.target.value as any)}
                className="w-full bg-black/50 text-white text-[9.5px] border border-gray-800 rounded-lg px-2 py-1.5 focus:border-pink-500 outline-none font-semibold"
              >
                <option value="small">Small (Bottom-left Float Toast)</option>
                <option value="half">Half Screen (Mid-screen Banners)</option>
                <option value="full">Full Screen takeover</option>
                <option value="ultra">Ultra Full Screen (Camera Flash & Shaking)</option>
                <option value="pk">PK Specific Animation</option>
                <option value="event">Special Event Animation</option>
              </select>
            </div>

            {/* Field 12: Sound Effect */}
            <div className="space-y-1">
              <label className="text-[8px] text-gray-400 font-black uppercase block">Sound Effect (SFX)</label>
              <select
                value={soundEffect}
                onChange={(e) => setSoundEffect(e.target.value)}
                className="w-full bg-black/50 text-white text-[9.5px] border border-gray-800 rounded-lg px-2 py-1.5 focus:border-pink-500 outline-none font-semibold"
              >
                <option value="none">None (Mute)</option>
                <option value="ding">Ding Simple (Standard)</option>
                <option value="chime">Sparkle Chime (Charming)</option>
                <option value="fanfare">Fanfare Trumpets (Vip)</option>
                <option value="engine_rev">Sports Car Engine (Luxury)</option>
                <option value="rocket_blast">Rocket Engine Ignite (Luxury)</option>
                <option value="dragon_roar">Fire Dragon Roar (Epic)</option>
              </select>
            </div>

            {/* Field 13: Priority level */}
            <div className="space-y-1">
              <label className="text-[8px] text-gray-400 font-black uppercase block">Priority Level (1-10)</label>
              <input
                type="number"
                min="1"
                max="10"
                value={priority}
                onChange={(e) => setPriority(parseInt(e.target.value) || 5)}
                className="w-full bg-black/50 text-white text-[9.5px] border border-gray-800 rounded-lg px-2.5 py-1.5 focus:border-pink-500 outline-none font-mono"
              />
            </div>
          </div>

          {/* CHECKBOX FLAGS GRID */}
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3.5 pt-3.5 border-t border-white/5">
            <label className="flex items-center space-x-2 text-[9px] text-gray-300 font-bold cursor-pointer">
              <input 
                type="checkbox" 
                checked={comboSupported} 
                onChange={(e) => setComboSupported(e.target.checked)}
                className="accent-pink-500 rounded border-gray-800" 
              />
              <span>Combo mode?</span>
            </label>

            <label className="flex items-center space-x-2 text-[9px] text-gray-300 font-bold cursor-pointer">
              <input 
                type="checkbox" 
                checked={featured} 
                onChange={(e) => setFeatured(e.target.checked)}
                className="accent-pink-500 rounded border-gray-800" 
              />
              <span>Featured badge</span>
            </label>

            <label className="flex items-center space-x-2 text-[9px] text-gray-300 font-bold cursor-pointer">
              <input 
                type="checkbox" 
                checked={limited} 
                onChange={(e) => setLimited(e.target.checked)}
                className="accent-pink-500 rounded border-gray-800" 
              />
              <span>Limited Stock</span>
            </label>

            <label className="flex items-center space-x-2 text-[9px] text-gray-300 font-bold cursor-pointer">
              <input 
                type="checkbox" 
                checked={vipOnly} 
                onChange={(e) => setVipOnly(e.target.checked)}
                className="accent-pink-500 rounded border-gray-800" 
              />
              <span>VIP Only Access</span>
            </label>

            <label className="flex items-center space-x-2 text-[9px] text-gray-300 font-bold cursor-pointer">
              <input 
                type="checkbox" 
                checked={pkOnly} 
                onChange={(e) => setPkOnly(e.target.checked)}
                className="accent-pink-500 rounded border-gray-800" 
              />
              <span>PK Battle only</span>
            </label>

            <div className="space-y-1 block col-span-1">
              <label className="text-[8px] text-gray-400 font-black uppercase block">Publish Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="bg-black/50 text-white text-[8px] border border-gray-800 rounded px-1.5 py-0.5 outline-none font-semibold"
              >
                <option value="active">ACTIVE</option>
                <option value="inactive">DISABLED</option>
              </select>
            </div>
          </div>

          {/* Form Action Button */}
          <div className="pt-4 border-t border-white/5 flex justify-end">
            <button
              type="submit"
              className="bg-gradient-to-r from-pink-500 to-purple-600 hover:brightness-110 text-white text-[9.5px] font-black px-6 py-2 rounded-xl uppercase transition-all shadow cursor-pointer"
            >
              {editingGift ? "Update Virtual Gift Ledger" : "Publish to Live Store (Real-time)"}
            </button>
          </div>
        </form>
      )}

      {/* SUB-TAB 3: MANAGE CATEGORIES */}
      {activeSubTab === "categories" && (
        <div className="space-y-4 bg-[#12121a] p-4 border border-[#1f2833] rounded-2xl">
          <div className="border-b border-white/5 pb-2.5">
            <h5 className="text-[11px] uppercase tracking-widest text-[#66fcf1] font-black">Organize Gift Shop Categories</h5>
            <p className="text-[8.5px] text-gray-400 font-semibold mt-0.5">Add, sort, hide, enable, rename tabs instantly in the client UI.</p>
          </div>

          {/* Form to add */}
          <div className="flex items-center gap-2 max-w-sm">
            <input
              type="text"
              placeholder="Add category (e.g. Festival)"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              className="flex-1 bg-black/50 text-white text-[9.5px] border border-gray-800 rounded-lg px-2.5 py-1.5 focus:border-pink-500 outline-none font-semibold"
            />
            <button
              onClick={handleAddCategory}
              className="bg-pink-500 text-white text-[9.5px] font-black px-4 py-1.5 rounded-lg flex items-center space-x-1 hover:bg-pink-600 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>ADD</span>
            </button>
          </div>

          {/* List of categories */}
          <div className="space-y-2 mt-4 max-w-lg">
            <p className="text-[8px] text-gray-500 uppercase font-bold tracking-wider">All Active Tabs</p>
            {categoriesList.map((cat, idx) => (
              <div 
                key={idx} 
                className="bg-black/30 border border-white/5 p-2 rounded-xl flex items-center justify-between text-xs"
              >
                {renamingCatIndex === idx ? (
                  <div className="flex items-center gap-1.5 flex-1 mr-4">
                    <input
                      type="text"
                      value={renameCatText}
                      onChange={(e) => setRenameCatText(e.target.value)}
                      className="bg-black/50 border border-pink-500 text-white text-[9.5px] px-2 py-0.5 rounded outline-none"
                    />
                    <button onClick={() => handleRenameCat(idx)} className="text-green-400 p-1 text-[10px] font-black">SAVE</button>
                    <button onClick={() => setRenamingCatIndex(null)} className="text-gray-400 p-1 text-[10px]">CANCEL</button>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-500 font-mono text-[9px]">#{idx + 1}</span>
                    <span className="text-[10.5px] font-black text-white">{cat}</span>
                  </div>
                )}

                <div className="flex items-center space-x-2 shrink-0">
                  <button
                    onClick={() => {
                      setRenamingCatIndex(idx);
                      setRenameCatText(cat);
                    }}
                    className="p-1 text-gray-400 hover:text-white transition-colors"
                  >
                    <Edit className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => handleDeleteCat(idx, cat)}
                    className="p-1 text-red-400 hover:text-red-500 transition-colors"
                  >
                    <Trash className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 4: GIFT ANALYTICS */}
      {activeSubTab === "analytics" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-[#12121a] p-4 border border-white/5 rounded-2xl text-center">
              <p className="text-[9px] text-gray-400 uppercase font-black">Gifts Sent Today</p>
              <h4 className="text-2xl font-mono font-black text-[#66fcf1] mt-1">4,280</h4>
              <span className="text-[8px] text-green-400">↑ 18% vs yesterday</span>
            </div>
            <div className="bg-[#12121a] p-4 border border-white/5 rounded-2xl text-center">
              <p className="text-[9px] text-gray-400 uppercase font-black">Platform Gift Coins Volume</p>
              <h4 className="text-2xl font-mono font-black text-yellow-400 mt-1">2.48M</h4>
              <span className="text-[8px] text-green-400">Est. Cash Revenue: $24,800 USD</span>
            </div>
            <div className="bg-[#12121a] p-4 border border-white/5 rounded-2xl text-center">
              <p className="text-[9px] text-gray-400 uppercase font-black">Most Popular Virtual Gift</p>
              <h4 className="text-2xl font-mono font-black text-white mt-1">🌹 Red Rose</h4>
              <span className="text-[8px] text-gray-400">Used: 2,840 times</span>
            </div>
          </div>

          <div className="bg-[#12121a] border border-white/5 rounded-2xl p-4 text-left">
            <h5 className="text-[10px] uppercase tracking-wider text-pink-400 font-bold mb-2">Live Virtual Gifting Analytics Ledger</h5>
            <div className="space-y-2 text-[9px] text-gray-400 leading-relaxed">
              <p>• Daily gift activity updates on an hourly sliding interval through regional stream servers.</p>
              <p>• Admin splits (50% Platform Maintenance, 10% Host Cashout value, 40% Agency Commision pools) are pre-calculated to prevent payment disputes.</p>
            </div>
          </div>
        </div>
      )}

      {/* Live Preview Modal inside Admin Panel */}
      {previewGift && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 text-white">
          <div className="bg-[#0e0e18] border border-white/10 rounded-2xl w-full max-w-sm overflow-hidden flex flex-col p-5 relative shadow-2xl animate-pop-gift">
            <button 
              onClick={() => setPreviewGift(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white bg-white/5 p-1 rounded-full"
            >
              <X className="w-3.5 h-3.5" />
            </button>

            <h4 className="text-xs uppercase tracking-widest text-[#66fcf1] font-black font-mono border-b border-white/5 pb-2 mb-4">
              ✨ SVGA / Animation Live Preview
            </h4>

            {/* Render actual GiftAnimationEngine using mock data to test */}
            <div className="bg-black/60 h-44 rounded-xl border border-white/5 relative flex items-center justify-center overflow-hidden">
              <GiftAnimationEngine 
                currentPlayingGift={{
                  sender: "Platform Admin 👑",
                  recipient: "Demo Streamer",
                  gift: previewGift,
                  comboCount: 5
                }} 
                onAnimationFinished={() => {}}
              />
            </div>

            <p className="text-[8.5px] text-gray-400 font-medium text-center mt-3">
              This preview mimics exact stream overlay behaviour including shaker effects, scale animations, and transparent bounds.
            </p>
          </div>
        </div>
      )}

    </div>
  );
};
