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

// Helper to load state from LocalStorage
export const loadGiftsFromStorage = (): Gift[] => {
  const saved = localStorage.getItem("pardais_party_gifts_v1");
  if (!saved) return [];
  try {
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed.filter((g: any) => g && g.id) : [];
  } catch (e) {
    console.error(e);
    return [];
  }
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
  const [selectedCombo, setSelectedCombo] = useState<number>(1);
  const [isCustomMode, setIsCustomMode] = useState<boolean>(false);
  const [customComboInput, setCustomComboInput] = useState<string>("");
  const [sendToAll, setSendToAll] = useState<boolean>(false);
  const [tapComboCount, setTapComboCount] = useState<number>(0);
  const [comboTimerActive, setComboTimerActive] = useState<boolean>(false);
  const comboTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!selectedGift && giftsList.length > 0) setSelectedGift(giftsList[0]);
    if (selectedGift && giftsList.length > 0 && !giftsList.some(g => g.id === selectedGift.id)) {
      setSelectedGift(giftsList[0]);
    }
  }, [giftsList]);

  useEffect(() => () => {
    if (comboTimerRef.current) clearTimeout(comboTimerRef.current);
  }, []);

  const activeOccupants = useMemo(() => {
    const list: { id: string; name: string }[] = [{ id: "host", name: activeHostName || "Host" }];
    (guestSeats || []).forEach(seat => {
      const name = seat?.name || seat?.username;
      if (name && !list.some(item => item.name.toLowerCase() === String(name).toLowerCase())) {
        list.push({ id: `seat-${seat.id}`, name: String(name) });
      }
    });
    return list;
  }, [activeHostName, guestSeats]);

  const [favoriteGifts, setFavoriteGifts] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("pardais_party_favs_v1");
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const toggleFavorite = (giftId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = favoriteGifts.includes(giftId)
      ? favoriteGifts.filter(id => id !== giftId)
      : [...favoriteGifts, giftId];
    setFavoriteGifts(next);
    localStorage.setItem("pardais_party_favs_v1", JSON.stringify(next));
  };

  const currentUserLevel = Math.min(100, Math.max(1, Number(user?.userLevel ?? user?.level ?? 1)));
  const filteredGifts = (giftsList || []).filter(g => {
    if (!g || g.status === "inactive") return false;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || `${g.name || ""} ${g.description || ""} ${g.category || ""}`.toLowerCase().includes(q);
    if (activeTab === "Favorites") return matchesSearch && favoriteGifts.includes(g.id);
    if (activeTab === "All" || !activeTab) return matchesSearch;
    return matchesSearch && (g.category || "Popular").trim().toLowerCase() === activeTab.trim().toLowerCase();
  });

  const presetComboOptions = [1, 5, 10, 20, 50, 100];
  const handleSelectPreset = (num: number) => {
    setIsCustomMode(false);
    setSelectedCombo(num);
  };
  const handleCustomInputChange = (val: string) => {
    setCustomComboInput(val);
    const parsed = parseInt(val, 10);
    setSelectedCombo(Number.isFinite(parsed) && parsed > 0 ? Math.min(99999, parsed) : 1);
  };

  const resolveTargetName = () => {
    if (sendToAll) return "All";
    if (!recipient || recipient === "Host") return activeHostName || "Host";
    const seatMatch = recipient.match(/\d+/);
    if (seatMatch) {
      const targetSeat = guestSeats.find(s => String(s.id) === seatMatch[0]);
      if (targetSeat?.name) return String(targetSeat.name);
    }
    return recipient;
  };

  const handleSendPress = (isComboSend: boolean = false) => {
    if (!selectedGift) return alert("Please select a gift first.");
    const requiredLevel = Math.min(100, Math.max(1, Number(selectedGift.minLevel || 1)));
    if (currentUserLevel < requiredLevel) {
      return alert(`🔒 This gift unlocks at Level ${requiredLevel}. Your level is ${currentUserLevel}.`);
    }

    // Normal SEND is always one gift. COMBO uses the selected quantity.
    const quantity = isComboSend ? Math.max(1, selectedCombo) : 1;
    const participantCount = sendToAll ? Math.max(1, activeOccupants.length) : 1;
    const totalCost = Number(selectedGift.cost || selectedGift.coins || 0) * quantity * participantCount;
    const balance = Number(user?.coins) || 0;
    if (balance < totalCost) {
      return alert(`❌ Insufficient Coins!\n\nRequired: ${totalCost.toLocaleString()} Coins\nAvailable: ${balance.toLocaleString()} Coins`);
    }

    const nextTapCount = comboTimerActive ? tapComboCount + quantity : quantity;
    setTapComboCount(nextTapCount);
    setComboTimerActive(true);
    if (comboTimerRef.current) clearTimeout(comboTimerRef.current);
    comboTimerRef.current = setTimeout(() => {
      setComboTimerActive(false);
      setTapComboCount(0);
    }, 3000);

    if (sendToAll && activeOccupants.length > 0) {
      activeOccupants.forEach(occ => onGiftSent(selectedGift, quantity, occ.name, isComboSend));
    } else {
      onGiftSent(selectedGift, quantity, resolveTargetName(), isComboSend);
    }

    if (!isComboSend) onClose();
  };

  const userCoins = Number(user?.coins) || 0;
  const comboMultiplier = sendToAll ? Math.max(1, activeOccupants.length) : 1;
  const comboTotal = selectedGift ? Number(selectedGift.cost || selectedGift.coins || 0) * Math.max(1, selectedCombo) * comboMultiplier : 0;
  const sendTotal = selectedGift ? Number(selectedGift.cost || selectedGift.coins || 0) * comboMultiplier : 0;
  const hasEnoughForSend = userCoins >= sendTotal;
  const hasEnoughForCombo = userCoins >= comboTotal;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 260 }}
        className="absolute left-0 right-0 bottom-0 z-[60] h-[53vh] max-h-[590px] min-h-[390px] bg-[#101018]/[0.98] border-t border-white/10 rounded-t-[28px] shadow-[0_-12px_45px_rgba(0,0,0,0.75)] backdrop-blur-xl flex flex-col overflow-hidden"
      >
        {/* Bottom-sheet handle */}
        <div className="flex justify-center pt-2 pb-1 shrink-0">
          <div className="w-12 h-1 rounded-full bg-white/20" />
        </div>

        {/* Header */}
        <div className="px-4 pb-2 flex items-center justify-between shrink-0 border-b border-white/[0.06]">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-full bg-pink-500/15 border border-pink-500/25 flex items-center justify-center">
              <GiftIcon className="w-4 h-4 text-pink-400" />
            </div>
            <div className="min-w-0">
              <h4 className="text-sm font-black text-white tracking-wide">Gifts</h4>
              <p className="text-[8px] text-gray-500 truncate">Send a gift to {sendToAll ? "everyone in the room" : resolveTargetName()}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onShowHistory}
              className="w-8 h-8 rounded-full bg-white/[0.05] border border-white/10 flex items-center justify-center text-gray-300 hover:text-white"
              title="Gift history"
            >
              <History className="w-4 h-4" />
            </button>
            <div className="px-2.5 py-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-[9px] font-black text-yellow-300">
              💎 {userCoins.toLocaleString()}
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/[0.05] border border-white/10 text-gray-300 hover:text-white text-lg">×</button>
          </div>
        </div>

        {/* Recipient row */}
        <div className="px-4 py-2 shrink-0 flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2 bg-black/30 border border-white/10 rounded-xl px-2.5 py-2 min-w-0">
            <span className="text-[9px] text-gray-500 font-bold uppercase">Send to</span>
            <select
              value={recipient}
              onChange={e => setRecipient(e.target.value)}
              disabled={sendToAll}
              className="bg-transparent text-[10px] text-white font-bold outline-none flex-1 min-w-0"
            >
              <option value="Host">👑 Host — {activeHostName}</option>
              {(guestSeats || []).filter(seat => seat?.name).map(seat => (
                <option key={seat.id} value={`Seat-${seat.id}`}>Seat #{seat.id} — {seat.name}</option>
              ))}
            </select>
          </div>
          <button
            onClick={() => setSendToAll(v => !v)}
            className={`shrink-0 px-3 py-2 rounded-xl border text-[9px] font-black transition-all ${sendToAll ? "bg-pink-500/20 border-pink-400/50 text-pink-300" : "bg-white/[0.04] border-white/10 text-gray-400"}`}
          >
            👥 ALL
          </button>
        </div>

        {/* Categories */}
        <div className="px-4 shrink-0 overflow-x-auto scrollbar-none">
          <div className="flex gap-1.5 pb-2 min-w-max">
            {["All", "Favorites", ...categoriesList].filter((v, i, a) => a.indexOf(v) === i).map(cat => (
              <button
                key={cat}
                onClick={() => setActiveTab(cat)}
                className={`px-3 py-1.5 rounded-full text-[9px] font-black whitespace-nowrap border transition-all ${activeTab === cat ? "bg-white text-black border-white" : "bg-white/[0.04] text-gray-400 border-white/10"}`}
              >
                {cat === "Favorites" ? "★ Favorites" : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="px-4 pb-2 shrink-0">
          <div className="h-9 bg-black/30 border border-white/10 rounded-xl flex items-center px-3">
            <Search className="w-4 h-4 text-gray-500 mr-2" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search gifts..."
              className="bg-transparent outline-none text-[10px] text-white flex-1 placeholder:text-gray-600"
            />
            {searchQuery && <button onClick={() => setSearchQuery("")} className="text-gray-500">×</button>}
          </div>
        </div>

        {/* Gift grid */}
        <div className="flex-1 overflow-y-auto px-4 pb-2 scrollbar-none">
          {filteredGifts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-500">
              <GiftIcon className="w-8 h-8 mb-2 opacity-30" />
              <p className="text-[10px] font-bold">No gifts found</p>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {filteredGifts.map(gift => {
                const isSelected = selectedGift?.id === gift.id;
                const isFav = favoriteGifts.includes(gift.id);
                const requiredLevel = Math.min(100, Math.max(1, Number(gift.minLevel || 1)));
                const isLocked = currentUserLevel < requiredLevel;
                const icon = gift.imageUrl || gift.icon || "🎁";
                return (
                  <button
                    key={gift.id}
                    type="button"
                    onClick={() => {
                      if (isLocked) return alert(`🔒 This gift unlocks at Level ${requiredLevel}.`);
                      setSelectedGift(gift);
                      setSelectedCombo(1);
                      setIsCustomMode(false);
                    }}
                    className={`relative min-h-[92px] rounded-2xl border p-2 flex flex-col items-center justify-center transition-all ${isLocked ? "opacity-45 grayscale" : "active:scale-95"} ${isSelected ? "bg-pink-500/15 border-pink-400 shadow-[0_0_16px_rgba(255,0,127,0.18)]" : "bg-white/[0.025] border-white/[0.08]"}`}
                  >
                    <span
                      onClick={e => toggleFavorite(gift.id, e)}
                      className={`absolute top-1 left-1.5 text-[11px] ${isFav ? "text-yellow-300" : "text-gray-600"}`}
                    >★</span>
                    {isLocked && <span className="absolute top-1 right-1 text-[6px] bg-black/70 text-yellow-300 px-1 py-0.5 rounded">LV {requiredLevel}</span>}
                    {!isLocked && gift.comboSupported !== false && <span className="absolute top-1 right-1 text-[6px] text-pink-300 bg-pink-500/10 px-1 py-0.5 rounded">COMBO</span>}
                    {typeof icon === "string" && (icon.startsWith("http") || icon.startsWith("data:image")) ? (
                      <img src={icon} alt={gift.name} className="w-10 h-10 object-contain mb-1" />
                    ) : (
                      <span className="text-3xl leading-none mb-1">{icon}</span>
                    )}
                    <span className="text-[8px] font-black text-white truncate w-full text-center">{gift.name}</span>
                    <span className="text-[7px] text-yellow-300 font-bold">{Number(gift.cost || gift.coins || 0).toLocaleString()} 🪙</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected gift + actions */}
        <div className="shrink-0 border-t border-white/10 bg-[#0b0b12]/95 px-4 pt-2.5 pb-[max(10px,env(safe-area-inset-bottom))]">
          {selectedGift && (
            <>
              <div className="flex items-center gap-2 mb-2">
                {(() => {
                  const icon = selectedGift.imageUrl || selectedGift.icon || "🎁";
                  return typeof icon === "string" && (icon.startsWith("http") || icon.startsWith("data:image"))
                    ? <img src={icon} alt={selectedGift.name} className="w-8 h-8 object-contain" />
                    : <span className="text-2xl">{icon}</span>;
                })()}
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] font-black text-white truncate">{selectedGift.name}</div>
                  <div className="text-[8px] text-yellow-300 font-bold">{Number(selectedGift.cost || selectedGift.coins || 0).toLocaleString()} Coins</div>
                </div>
                <div className="flex gap-1 overflow-x-auto scrollbar-none">
                  {presetComboOptions.map(num => (
                    <button key={num} onClick={() => handleSelectPreset(num)} className={`px-2 py-1 rounded-lg text-[7px] font-black whitespace-nowrap ${!isCustomMode && selectedCombo === num ? "bg-pink-500 text-white" : "bg-white/[0.06] text-gray-400"}`}>x{num}</button>
                  ))}
                  <button onClick={() => { setIsCustomMode(true); if (!customComboInput) handleCustomInputChange("25"); }} className={`px-2 py-1 rounded-lg text-[7px] font-black ${isCustomMode ? "bg-yellow-400 text-black" : "bg-white/[0.06] text-yellow-300"}`}>Custom</button>
                </div>
              </div>

              {isCustomMode && (
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-[8px] text-gray-500">Quantity</span>
                  <input type="number" min="1" max="99999" value={customComboInput} onChange={e => handleCustomInputChange(e.target.value)} className="w-20 bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-[9px] text-white outline-none" />
                  <span className="text-[8px] text-yellow-300">{comboTotal.toLocaleString()} Coins</span>
                </div>
              )}

              {comboTimerActive && tapComboCount > 0 && (
                <div className="mb-2 flex items-center justify-between rounded-lg bg-orange-500/10 border border-orange-400/20 px-2 py-1">
                  <span className="text-[8px] text-orange-300 font-black">🔥 COMBO ACTIVE</span>
                  <span className="text-[10px] text-yellow-300 font-black">×{tapComboCount}</span>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => handleSendPress(false)}
                  disabled={!hasEnoughForSend}
                  className="flex-1 h-10 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white text-[10px] font-black uppercase disabled:opacity-40 flex items-center justify-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" /> SEND · {sendTotal.toLocaleString()}
                </button>
                <button
                  onClick={() => handleSendPress(true)}
                  disabled={!hasEnoughForCombo || selectedGift.comboSupported === false}
                  className="flex-1 h-10 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white text-[10px] font-black uppercase disabled:opacity-40 flex items-center justify-center gap-1.5"
                >
                  <span>⚡</span> COMBO ×{selectedCombo}
                </button>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};


// ==========================================
// 2. REAL-TIME GIFT ANIMATION ENGINE & QUEUE
// ==========================================
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

    // For real video gifts, let the media's own `ended` event control completion so
    // the uploaded animation is never cut short by an inaccurate admin duration.
    // Non-video gifts still use the configured duration as a safety timer.
    const giftObj = currentGift.gift;
    const videoMediaUrl = giftObj?.videoUrl || giftObj?.animationUrl || giftObj?.animationFile;
    const mediaString = typeof videoMediaUrl === "string" ? videoMediaUrl.toLowerCase() : "";
    const isVideoMedia = mediaString.endsWith(".mp4") || mediaString.endsWith(".webm") ||
      mediaString.includes(".mp4?") || mediaString.includes(".webm?") ||
      mediaString.startsWith("data:video/") || mediaString.startsWith("blob:");

    let hideTimer: ReturnType<typeof setTimeout> | undefined;
    if (!isVideoMedia) {
      hideTimer = setTimeout(() => {
        clearInterval(countdown);
        if (!finishCalledRef.current) {
          finishCalledRef.current = true;
          finishCallbackRef.current();
        }
      }, duration * 1000);
    }

    // Video preloading if video URL is provided
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
      if (hideTimer) clearTimeout(hideTimer);
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
  const isGif = !isPlayableVideoUrl && Boolean(videoSource) && (
    format === "gif" || 
    (typeof rawVideoUrl === "string" && (rawVideoUrl.endsWith(".gif") || rawVideoUrl.startsWith("data:image/gif")))
  );

  // Gift animations use the actual uploaded media audio. Try unmuted autoplay first.
  // If the browser/WebView blocks autoplay with sound, keep the video playing and
  // fall back to the existing synthesized gift sound so the gift still has audio.
  useEffect(() => {
    if (!isPlayableVideoUrl || !videoRef.current) return;
    const video = videoRef.current;
    video.currentTime = 0;
    video.muted = false;
    video.defaultMuted = false;
    video.volume = 1;
    video.play().catch(err => {
      console.warn("[GiftSystem] Unmuted gift autoplay blocked; falling back to gift audio:", err);
      const sound = currentGift?.gift?.soundEffect || (
        currentGift?.gift?.name?.toLowerCase().includes("lion") ? "roar" :
        currentGift?.gift?.name?.toLowerCase().includes("firework") ? "fireworks" :
        currentGift?.gift?.name?.toLowerCase().includes("spice") ? "roar" :
        "ding"
      );
      playGiftAudioSynthesizer(sound);
      video.muted = true;
      video.play().catch(() => {});
    });
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
          className="absolute inset-x-0 bottom-0 h-[60%] flex items-center justify-center bg-transparent pointer-events-none z-20"
        >
          {/* Ambient particle blur effect */}
          <div className={`absolute w-80 h-80 rounded-full filter blur-3xl opacity-30 animate-pulse bg-gradient-to-tr ${gift?.color || "from-amber-500 via-pink-500 to-purple-600"}`} />

          {/* RENDER WEBM / MP4 TRANSPARENT VIDEO IN FULL QUALITY */}
          {isPlayableVideoUrl ? (
            <video
              ref={videoRef}
              src={videoSource}
              autoPlay
              playsInline
              preload="auto"
              crossOrigin="anonymous"
              onCanPlay={(e) => {
                const el = e.currentTarget;
                el.currentTime = 0;
                el.muted = false;
                el.defaultMuted = false;
                el.volume = 1;
                el.play().catch(() => {
                  el.muted = true;
                  el.play().catch(() => setVideoError(true));
                });
              }}
              onEnded={handleFinish}
              onError={(e) => {
                const src = (e.currentTarget as HTMLVideoElement)?.currentSrc || (e.currentTarget as HTMLVideoElement)?.src || "";
                console.warn("[GiftSystem] Gift Video playback notice for source:", src || "invalid media source");
                setVideoError(true);
                if (!finishCalledRef.current) {
                  finishCalledRef.current = true;
                  finishCallbackRef.current();
                }
              }}
              className="w-full h-full max-h-full max-w-[100vw] object-contain pointer-events-none relative z-20 drop-shadow-[0_0_40px_rgba(255,215,0,0.8)]"
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
              className="w-full h-full max-h-full max-w-[100vw] object-contain pointer-events-none relative z-20 drop-shadow-[0_0_40px_rgba(255,215,0,0.8)]"
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
                    <p className="text-[9px] text-green-400 font-bold font-mono">+{Math.floor(item.amount * 0.5)} Creator Coins</p>
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
                  <span className="text-[8px] text-cyan-300 font-black">CREATOR COINS</span>
                </div>
              </div>

              <p className="text-[7.5px] text-gray-500 uppercase font-black border-b border-white/5 pb-1">Ledger Notes</p>
              <div className="space-y-1 text-[7.5px] text-gray-400 leading-relaxed font-semibold">
                <p>• Coins are used to purchase gifts for hosts & guest seat members.</p>
                <p>• Creator Coins represent 50% of the full gift value received from gifting.</p>
                <p>• Creator Coins can be withdrawn or exchanged from the Creator Center.</p>
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

const SIMPLE_GIFT_CATEGORIES = ["Popular", "New", "Lucky", "VIP", "Festival", "Premium", "Luxury", "Event", "PK"];

const uploadGiftMedia = async (file: File, giftId: string, mediaType: "image" | "animation") => {
  const form = new FormData();
  form.append("file", file);
  form.append("giftId", giftId || "new");
  form.append("mediaType", mediaType);
  const response = await fetch(resolveApiUrl("/api/v1/gifts/upload-animation"), { method: "POST", body: form });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload?.url) {
    throw new Error(payload?.error || "Gift media upload failed.");
  }
  return payload as { url: string; contentType?: string };
};

export const AdminGiftTab: React.FC<AdminGiftTabProps> = ({
  giftsList,
  setGiftsList,
  categoriesList,
  setCategoriesList
}) => {
  const [editingGift, setEditingGift] = useState<Gift | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Popular");
  const [cost, setCost] = useState(10);
  const [minLevel, setMinLevel] = useState(1);
  const [globalBannerEnabled, setGlobalBannerEnabled] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [animationUrl, setAnimationUrl] = useState("");
  const [animationFormat, setAnimationFormat] = useState<Gift["animationFormat"]>("webm");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"image" | "animation" | null>(null);
  const [search, setSearch] = useState("");

  const resetForm = () => {
    setEditingGift(null);
    setName("");
    setDescription("");
    setCategory("Popular");
    setCost(10);
    setMinLevel(1);
    setGlobalBannerEnabled(false);
    setImageUrl("");
    setAnimationUrl("");
    setAnimationFormat("webm");
  };

  const editGift = (gift: Gift) => {
    setEditingGift(gift);
    setName(gift.name || "");
    setDescription(gift.description || "");
    setCategory(gift.category || "Popular");
    setCost(Number(gift.cost) || 10);
    setMinLevel(Math.min(100, Math.max(1, Number(gift.minLevel) || 1)));
    setGlobalBannerEnabled(gift.globalBannerEnabled === true);
    setImageUrl(gift.imageUrl || gift.icon || "");
    setAnimationUrl(gift.animationFile || gift.videoUrl || gift.animationUrl || "");
    setAnimationFormat(gift.animationFormat || "webm");
  };

  const handleImage = async (file?: File) => {
    if (!file) return;
    setUploading("image");
    try {
      const result = await uploadGiftMedia(file, editingGift?.id || "new", "image");
      setImageUrl(result.url);
    } catch (e: any) {
      alert(e?.message || "Image upload failed.");
    } finally {
      setUploading(null);
    }
  };

  const handleAnimation = async (file?: File) => {
    if (!file) return;
    const lower = file.name.toLowerCase();
    const format = lower.endsWith(".svga") ? "svga" :
      lower.endsWith(".webm") ? "webm" :
      lower.endsWith(".mp4") ? "mp4" : "svg";
    setAnimationFormat(format);
    setUploading("animation");
    try {
      const result = await uploadGiftMedia(file, editingGift?.id || "new", "animation");
      setAnimationUrl(result.url);
    } catch (e: any) {
      alert(e?.message || "Animation upload failed.");
    } finally {
      setUploading(null);
    }
  };

  const saveGift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return alert("Gift name is required.");
    if (!imageUrl.trim()) return alert("Please upload the gift image.");
    if (!animationUrl.trim()) return alert("Please upload the gift animation.");
    if (!Number.isFinite(cost) || cost < 1) return alert("Gift price must be at least 1 coin.");

    setSaving(true);
    const payload: Gift = {
      id: editingGift?.id || `g-${Date.now()}`,
      name: name.trim(),
      cost: Math.floor(cost),
      coins: Math.floor(cost),
      type: GiftType.TWO_D,
      icon: imageUrl,
      imageUrl,
      color: "from-pink-500 to-rose-600",
      animationClass: "",
      category: category || "Popular",
      description: description.trim(),
      animationFile: animationUrl,
      animationUrl,
      videoUrl: animationUrl,
      animationFormat: animationFormat || "webm",
      animationDuration: 8,
      animationDisplayType: "full",
      status: "active",
      minLevel: Math.min(100, Math.max(1, Math.floor(minLevel || 1))),
      globalBannerEnabled,
      comboSupported: true,
      featured: false,
      limited: false,
      vipOnly: false,
      pkOnly: false,
      eventOnly: false
    };

    try {
      const endpoint = editingGift ? `/api/v1/gifts/${editingGift.id}` : "/api/v1/gifts";
      const response = await fetch(resolveApiUrl(endpoint), {
        method: editingGift ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.error || "Gift could not be saved.");
      }
      const savedGift = await response.json();
      const next = editingGift
        ? giftsList.map(g => g.id === savedGift.id ? savedGift : g)
        : [savedGift, ...giftsList];
      setGiftsList(next);
      saveGiftsToStorage(next);
      if (!categoriesList.includes(payload.category || "Popular")) {
        const nextCategories = [...categoriesList, payload.category || "Popular"];
        setCategoriesList(nextCategories);
        saveCategoriesToStorage(nextCategories);
      }
      alert(editingGift ? "Gift updated successfully." : "Gift added successfully.");
      resetForm();
    } catch (e: any) {
      alert(e?.message || "Gift save failed.");
    } finally {
      setSaving(false);
    }
  };

  const deleteGift = async (gift: Gift) => {
    if (!confirm(`Delete "${gift.name}" from the gift catalog?`)) return;
    const response = await fetch(resolveApiUrl(`/api/v1/gifts/${gift.id}`), { method: "DELETE" });
    if (!response.ok) return alert("Gift could not be deleted.");
    const next = giftsList.filter(g => g.id !== gift.id);
    setGiftsList(next);
    saveGiftsToStorage(next);
    if (editingGift?.id === gift.id) resetForm();
  };

  const visibleGifts = giftsList.filter(g =>
    !search.trim() ||
    `${g.name} ${g.category || ""}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="bg-[#0f0f18] border border-white/10 rounded-2xl p-5 space-y-5 text-white">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <h3 className="text-base font-black uppercase tracking-wider">Gift Management</h3>
          <p className="text-[10px] text-gray-400 mt-1">Simple catalog: image + animation + price + level + category + global bar.</p>
        </div>
        <button type="button" onClick={resetForm} className="px-3 py-2 rounded-lg bg-pink-600 text-xs font-black">
          + Add Gift
        </button>
      </div>

      <form onSubmit={saveGift} className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white/[0.03] rounded-xl p-4 border border-white/5">
        <div>
          <label className="text-[9px] text-gray-400 font-bold uppercase">Gift Name</label>
          <input value={name} onChange={e => setName(e.target.value)} className="mt-1 w-full bg-black/30 border border-white/10 rounded-lg p-2 text-sm" placeholder="e.g. Golden Lion" />
        </div>
        <div>
          <label className="text-[9px] text-gray-400 font-bold uppercase">Price (Coins)</label>
          <input type="number" min="1" value={cost} onChange={e => setCost(Number(e.target.value))} className="mt-1 w-full bg-black/30 border border-white/10 rounded-lg p-2 text-sm" />
        </div>

        <div>
          <label className="text-[9px] text-gray-400 font-bold uppercase">Gift Picture — PNG / JPG / JPEG / SVG</label>
          <input type="file" accept=".png,.jpg,.jpeg,.svg,image/png,image/jpeg,image/svg+xml" onChange={e => handleImage(e.target.files?.[0])} className="mt-1 w-full text-xs" />
          {uploading === "image" && <p className="text-[9px] text-cyan-300 mt-1">Uploading image…</p>}
          {imageUrl && <img src={imageUrl} alt="Gift" className="mt-2 w-16 h-16 object-contain rounded-lg bg-black/30 border border-white/10 p-1" />}
        </div>

        <div>
          <label className="text-[9px] text-gray-400 font-bold uppercase">Gift Animation — WebM / MP4 / SVGA / SVG</label>
          <input type="file" accept=".webm,.mp4,.svga,.svg,video/webm,video/mp4,image/svg+xml" onChange={e => handleAnimation(e.target.files?.[0])} className="mt-1 w-full text-xs" />
          {uploading === "animation" && <p className="text-[9px] text-cyan-300 mt-1">Uploading animation…</p>}
          {animationUrl && <p className="text-[8px] text-green-300 mt-1 break-all">Animation ready: {animationFormat?.toUpperCase()}</p>}
        </div>

        <div>
          <label className="text-[9px] text-gray-400 font-bold uppercase">Category</label>
          <select value={category} onChange={e => setCategory(e.target.value)} className="mt-1 w-full bg-black/30 border border-white/10 rounded-lg p-2 text-sm">
            {[...new Set([...SIMPLE_GIFT_CATEGORIES, ...categoriesList])].map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div>
          <label className="text-[9px] text-gray-400 font-bold uppercase">Minimum Level (1–100)</label>
          <input type="number" min="1" max="100" value={minLevel} onChange={e => setMinLevel(Number(e.target.value))} className="mt-1 w-full bg-black/30 border border-white/10 rounded-lg p-2 text-sm" />
          <p className="text-[8px] text-gray-500 mt-1">Level 40 means levels 40–100 can use it; lower levels see it disabled.</p>
        </div>

        <div className="md:col-span-2">
          <label className="text-[9px] text-gray-400 font-bold uppercase">Description</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} className="mt-1 w-full bg-black/30 border border-white/10 rounded-lg p-2 text-sm" placeholder="Describe who/what this gift is for…" />
        </div>

        <label className="md:col-span-2 flex items-center gap-3 p-3 rounded-lg bg-black/20 border border-white/5 cursor-pointer">
          <input type="checkbox" checked={globalBannerEnabled} onChange={e => setGlobalBannerEnabled(e.target.checked)} />
          <span>
            <span className="block text-xs font-black">Show in Global Gift Bar</span>
            <span className="block text-[8px] text-gray-500">When enabled, this gift is included in the app's global gift ticker.</span>
          </span>
        </label>

        <div className="md:col-span-2 flex gap-2">
          <button disabled={saving || !!uploading} className="px-4 py-2 rounded-lg bg-green-600 text-xs font-black disabled:opacity-50">
            {saving ? "Saving…" : editingGift ? "Update Gift" : "Publish Gift"}
          </button>
          {editingGift && <button type="button" onClick={resetForm} className="px-4 py-2 rounded-lg bg-white/10 text-xs font-black">Cancel</button>}
        </div>
      </form>

      <div className="flex items-center justify-between gap-3">
        <h4 className="text-xs font-black uppercase">Gift Catalog ({giftsList.length})</h4>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search gifts…" className="bg-black/30 border border-white/10 rounded-lg p-2 text-xs" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {visibleGifts.map(gift => (
          <div key={gift.id} className="rounded-xl border border-white/10 bg-white/[0.025] p-3 flex gap-3">
            <img src={gift.imageUrl || gift.icon} alt={gift.name} className="w-14 h-14 object-contain rounded-lg bg-black/30 border border-white/5 p-1" />
            <div className="min-w-0 flex-1">
              <div className="font-black text-sm truncate">{gift.name}</div>
              <div className="text-[9px] text-yellow-300">{Number(gift.cost || 0).toLocaleString()} Coins</div>
              <div className="text-[8px] text-gray-400">{gift.category || "Popular"} · Level {gift.minLevel || 1}+ · {gift.globalBannerEnabled ? "Global Bar ON" : "Global Bar OFF"}</div>
              <div className="text-[8px] text-cyan-300 mt-1">Animation: {(gift.animationFormat || "webm").toUpperCase()}</div>
              <div className="flex gap-2 mt-2">
                <button type="button" onClick={() => editGift(gift)} className="px-2 py-1 rounded bg-white/10 text-[8px] font-bold">Edit</button>
                <button type="button" onClick={() => deleteGift(gift)} className="px-2 py-1 rounded bg-red-600/20 text-red-300 text-[8px] font-bold">Delete</button>
              </div>
            </div>
          </div>
        ))}
        {visibleGifts.length === 0 && <p className="text-xs text-gray-500">No gifts found.</p>}
      </div>
    </div>
  );
};

