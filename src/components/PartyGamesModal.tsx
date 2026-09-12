import React, { useState, useRef, useEffect } from "react";
import { UserProfile, Transaction } from "../types";
import { X, Sparkles, Trophy, HelpCircle, History, RotateCw, Volume2, VolumeX, Flame, Zap, ShieldCheck, Gift, Gem, Users, Bot, Gamepad2, ArrowLeft } from "lucide-react";
import { getProgressionFromCoins } from "../levelUtils";
import { DragonTigerGame } from "./games/DragonTigerGame";
import { AviatorGame } from "./games/AviatorGame";
import { LudoGame } from "./games/LudoGame";
import { CarromGame } from "./games/CarromGame";
import { BilliardsGame } from "./games/BilliardsGame";
import { GameInviteModal } from "./games/GameInviteModal";

interface PartyGamesModalProps {
  user: UserProfile;
  setUser: React.Dispatch<React.SetStateAction<UserProfile>>;
  onClose: () => void;
  onSendRoomMessage?: (msg: string) => void;
  setTransactions?: React.Dispatch<React.SetStateAction<Transaction[]>>;
  partyGuests?: { username: string; avatar?: string; userLevel?: number; vipLevel?: number; isHost?: boolean }[];
  onGameStatusChange?: (inGame: boolean, gameName?: string) => void;
  onSendGameInvite?: (targetUsername: string, gameName: string, stakeCoins: number) => void;
}

// 🎡 Lucky Wheel Slices Config
interface WheelSlice {
  id: number;
  label: string;
  multiplier: number;
  color: string;
  textColor: string;
  isWin: boolean;
  type: "loss" | "small" | "medium" | "jackpot";
}

const WHEEL_SLICES: WheelSlice[] = [
  { id: 0, label: "0x Lose", multiplier: 0, color: "#1e1b4b", textColor: "#f43f5e", isWin: false, type: "loss" },
  { id: 1, label: "0.5x Half", multiplier: 0.5, color: "#312e81", textColor: "#fbbf24", isWin: false, type: "loss" },
  { id: 2, label: "2x Double", multiplier: 2.0, color: "#831843", textColor: "#f472b6", isWin: true, type: "medium" },
  { id: 3, label: "0x Try Again", multiplier: 0, color: "#111827", textColor: "#9ca3af", isWin: false, type: "loss" },
  { id: 4, label: "3x Triple", multiplier: 3.0, color: "#581c87", textColor: "#c084fc", isWin: true, type: "medium" },
  { id: 5, label: "0x Lose", multiplier: 0, color: "#1e1b4b", textColor: "#f43f5e", isWin: false, type: "loss" },
  { id: 6, label: "4x Super", multiplier: 4.0, color: "#065f46", textColor: "#34d399", isWin: true, type: "jackpot" },
  { id: 7, label: "0.5x Half", multiplier: 0.5, color: "#312e81", textColor: "#fbbf24", isWin: false, type: "loss" },
  { id: 8, label: "5x Ultra", multiplier: 5.0, color: "#78350f", textColor: "#fde047", isWin: true, type: "jackpot" },
  { id: 9, label: "0x Try Again", multiplier: 0, color: "#111827", textColor: "#9ca3af", isWin: false, type: "loss" },
  { id: 10, label: "10x JACKPOT", multiplier: 10.0, color: "#be123c", textColor: "#fde047", isWin: true, type: "jackpot" },
  { id: 11, label: "0x Lose", multiplier: 0, color: "#1e1b4b", textColor: "#f43f5e", isWin: false, type: "loss" },
];

const BET_OPTIONS = [50, 100, 500, 1000, 5000, 10000, 50000, 100000, 500000, 1000000];

// Sound generator
const playSoundEffect = (type: "spin" | "win" | "jackpot" | "loss" | "click") => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    if (type === "click") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.05);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } else if (type === "spin") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(400, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } else if (type === "win") {
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);
        gain.gain.setValueAtTime(0.15, ctx.currentTime + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + idx * 0.08 + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.08);
        osc.stop(ctx.currentTime + idx * 0.08 + 0.2);
      });
    } else if (type === "jackpot") {
      [523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.07);
        gain.gain.setValueAtTime(0.2, ctx.currentTime + idx * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + idx * 0.07 + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.07);
        osc.stop(ctx.currentTime + idx * 0.07 + 0.3);
      });
    } else if (type === "loss") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(110, ctx.currentTime + 0.25);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    }
  } catch (e) {}
};

interface PlayerGameStats {
  playCount: number;
  totalBetCoins: number;
  consecutiveLosses: number;
  consecutiveWins: number;
}

export const PartyGamesModal: React.FC<PartyGamesModalProps> = ({
  user,
  setUser,
  onClose,
  onSendRoomMessage,
  setTransactions,
  partyGuests = [],
  onGameStatusChange,
  onSendGameInvite
}) => {
  // Main Category Tab: "lucky" (Lucky Game) vs "team" (Team Game)
  const [mainCategory, setMainCategory] = useState<"lucky" | "team">("lucky");

  // Selected Active Game
  const [activeGame, setActiveGame] = useState<"lobby" | "dragon_tiger" | "aviator" | "wheel" | "chest" | "slots" | "ludo" | "carrom" | "billiards">("lobby");

  // Team Game Setup State
  const [inviteModalGame, setInviteModalGame] = useState<string | null>(null);
  const [activeGameStake, setActiveGameStake] = useState<number>(500);
  const [opponentName, setOpponentName] = useState<string>("Challenger");

  const [betAmount, setBetAmount] = useState<number>(100);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [showCriteriaModal, setShowCriteriaModal] = useState<boolean>(false);

  // Notify parent component about game presence for party room seat 🎮 badge and auto-mute
  useEffect(() => {
    const isPlaying = activeGame !== "lobby";
    if (onGameStatusChange) {
      onGameStatusChange(isPlaying, isPlaying ? activeGame : undefined);
    }
  }, [activeGame]);

  // Clean exit handler
  const handleExitModal = () => {
    if (onGameStatusChange) {
      onGameStatusChange(false);
    }
    onClose();
  };

  // Player Stats for Dynamic Win/Lose Algorithm
  const statsKey = `pardais_game_stats_${user.username || user.uniqueId || "guest"}`;
  const [playerStats, setPlayerStats] = useState<PlayerGameStats>(() => {
    try {
      const stored = localStorage.getItem(statsKey);
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return { playCount: 0, totalBetCoins: 0, consecutiveLosses: 0, consecutiveWins: 0 };
  });

  const updateStats = (isWin: boolean, bet: number) => {
    setPlayerStats(prev => {
      const next: PlayerGameStats = {
        playCount: prev.playCount + 1,
        totalBetCoins: prev.totalBetCoins + bet,
        consecutiveLosses: isWin ? 0 : prev.consecutiveLosses + 1,
        consecutiveWins: isWin ? prev.consecutiveWins + 1 : 0
      };
      try {
        localStorage.setItem(statsKey, JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  };

  const determineWinOrLoss = (bet: number): { isWin: boolean; isFirstTime: boolean; isSafeguard: boolean } => {
    if (playerStats.playCount === 0) {
      return { isWin: true, isFirstTime: true, isSafeguard: false };
    }
    if (playerStats.consecutiveLosses >= 2) {
      return { isWin: true, isFirstTime: false, isSafeguard: true };
    }
    if (playerStats.totalBetCoins < 100000 && bet < 100000) {
      return { isWin: Math.random() < 0.75, isFirstTime: false, isSafeguard: false };
    }
    const rand = Math.random();
    const effectiveCoins = Math.max(playerStats.totalBetCoins, bet);
    if (effectiveCoins >= 800000) return { isWin: rand < 0.30, isFirstTime: false, isSafeguard: false };
    if (effectiveCoins >= 500000) return { isWin: rand < 0.35, isFirstTime: false, isSafeguard: false };
    return { isWin: rand < 0.40, isFirstTime: false, isSafeguard: false };
  };

  // Wheel States
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [wheelRotation, setWheelRotation] = useState<number>(0);
  const [lastWheelResult, setLastWheelResult] = useState<{
    slice: WheelSlice;
    payout: number;
    profit: number;
  } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Chest States
  const [chestOpening, setChestOpening] = useState<boolean>(false);
  const [selectedChest, setSelectedChest] = useState<number | null>(null);
  const [chestResults, setChestResults] = useState<{ mult: number; text: string; coins: number }[] | null>(null);

  // Slots States
  const [isSpinningSlots, setIsSpinningSlots] = useState<boolean>(false);
  const [slotReels, setSlotReels] = useState<string[]>(["🍒", "💎", "7️⃣"]);
  const [lastSlotWin, setLastSlotWin] = useState<number | null>(null);

  // Draw Wheel
  useEffect(() => {
    if (activeGame === "wheel") drawWheel();
  }, [wheelRotation, activeGame]);

  const drawWheel = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(centerX, centerY) - 8;
    const numSlices = WHEEL_SLICES.length;
    const sliceAngle = (2 * Math.PI) / numSlices;

    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate((wheelRotation * Math.PI) / 180);

    WHEEL_SLICES.forEach((slice, i) => {
      const startAngle = i * sliceAngle - Math.PI / 2;
      const endAngle = startAngle + sliceAngle;

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius, startAngle, endAngle);
      ctx.closePath();

      ctx.fillStyle = slice.color;
      ctx.fill();

      ctx.lineWidth = 2;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
      ctx.stroke();

      ctx.save();
      ctx.rotate(startAngle + sliceAngle / 2);
      ctx.textAlign = "right";
      ctx.fillStyle = slice.textColor;
      ctx.font = slice.type === "jackpot" ? "bold 13px sans-serif" : "bold 11px sans-serif";
      ctx.shadowColor = "rgba(0,0,0,0.8)";
      ctx.shadowBlur = 4;
      ctx.fillText(slice.label, radius - 14, 4);
      ctx.restore();
    });

    // Center Golden Cap
    ctx.beginPath();
    ctx.arc(0, 0, 24, 0, 2 * Math.PI);
    const grad = ctx.createRadialGradient(0, 0, 2, 0, 0, 24);
    grad.addColorStop(0, "#ffe066");
    grad.addColorStop(0.7, "#d4af37");
    grad.addColorStop(1, "#8a6d1b");
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#ffffff";
    ctx.stroke();
    ctx.restore();
  };

  const getSliceForOutcome = (outcome: { isWin: boolean; isFirstTime: boolean; isSafeguard: boolean }): number => {
    if (outcome.isWin) {
      if (outcome.isFirstTime || outcome.isSafeguard) return 2;
      const r = Math.random();
      if (r < 0.45) return 2;
      if (r < 0.75) return 4;
      if (r < 0.90) return 6;
      if (r < 0.97) return 8;
      return 10;
    }
    const lossIndices = [0, 1, 3, 5, 7, 9, 11];
    return lossIndices[Math.floor(Math.random() * lossIndices.length)];
  };

  const handleSpinWheel = () => {
    if (isSpinning) return;
    if (user.coins < betAmount) {
      alert(`❌ Insufficient Coins! You need at least ${betAmount.toLocaleString()} Coins to spin.`);
      return;
    }

    if (soundEnabled) playSoundEffect("click");

    setUser(prev => {
      const newXp = (prev.xp || 0) + betAmount;
      const prog = getProgressionFromCoins(newXp);
      return {
        ...prev,
        coins: Math.max(0, (prev.coins || 0) - betAmount),
        xp: newXp,
        userLevel: prog.level,
        level: prog.level,
        vipLevel: prog.vipLevel
      };
    });

    setIsSpinning(true);
    setLastWheelResult(null);

    const outcome = determineWinOrLoss(betAmount);
    const winningSliceIndex = getSliceForOutcome(outcome);
    const numSlices = WHEEL_SLICES.length;
    const degreesPerSlice = 360 / numSlices;
    const sliceCenterAngle = winningSliceIndex * degreesPerSlice + degreesPerSlice / 2;

    const startRotation = wheelRotation;
    const currentMod = ((startRotation % 360) + 360) % 360;
    const desiredMod = ((360 - (sliceCenterAngle % 360)) % 360);
    const deltaToDesired = ((desiredMod - currentMod + 360) % 360);
    const extraRotations = (5 + Math.floor(Math.random() * 3)) * 360;
    const targetRotation = startRotation + extraRotations + deltaToDesired;

    const finalRotMod = ((targetRotation % 360) + 360) % 360;
    const angleFromTop = ((360 - finalRotMod) % 360);
    const stoppedSliceIndex = Math.floor(angleFromTop / degreesPerSlice) % numSlices;
    const winningSlice = WHEEL_SLICES[stoppedSliceIndex] || WHEEL_SLICES[winningSliceIndex];

    const startTime = performance.now();
    const duration = 3000;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      if (elapsed < duration) {
        const progress = elapsed / duration;
        const easeOut = 1 - Math.pow(1 - progress, 3);
        setWheelRotation(startRotation + (targetRotation - startRotation) * easeOut);
        requestAnimationFrame(animate);
      } else {
        setWheelRotation(targetRotation);
        setIsSpinning(false);

        const payout = Math.floor(betAmount * winningSlice.multiplier);
        const profit = payout - betAmount;

        if (payout > 0) {
          setUser(prev => ({ ...prev, diamonds: (prev.diamonds || 0) + payout }));
          playSoundEffect(winningSlice.multiplier >= 4 ? "jackpot" : "win");
        } else {
          playSoundEffect("loss");
        }

        updateStats(payout > 0, betAmount);
        setLastWheelResult({ slice: winningSlice, payout, profit });
      }
    };
    requestAnimationFrame(animate);
  };

  const handleOpenChest = (index: number) => {
    if (chestOpening || selectedChest !== null) return;
    if (user.coins < betAmount) {
      alert(`❌ Insufficient Coins! You need ${betAmount.toLocaleString()} Coins to open a chest.`);
      return;
    }

    setSelectedChest(index);
    setChestOpening(true);

    setUser(prev => {
      const newXp = (prev.xp || 0) + betAmount;
      const prog = getProgressionFromCoins(newXp);
      return {
        ...prev,
        coins: Math.max(0, (prev.coins || 0) - betAmount),
        xp: newXp,
        userLevel: prog.level,
        level: prog.level,
        vipLevel: prog.vipLevel
      };
    });

    setTimeout(() => {
      const outcome = determineWinOrLoss(betAmount);
      const chosenMult = outcome.isWin ? (outcome.isFirstTime ? 2 : [2, 3, 5, 10][Math.floor(Math.random() * 4)]) : (Math.random() < 0.5 ? 0 : 0.5);
      const payout = Math.floor(betAmount * chosenMult);

      const allBoxes = Array.from({ length: 6 }).map((_, idx) => {
        if (idx === index) {
          return { mult: chosenMult, text: `${chosenMult}x Payout`, coins: payout };
        }
        const otherMult = [0, 0.5, 2, 3, 5][idx % 5];
        return { mult: otherMult, text: `${otherMult}x`, coins: Math.floor(betAmount * otherMult) };
      });

      setChestResults(allBoxes);
      setChestOpening(false);

      if (payout > 0) {
        setUser(prev => ({ ...prev, diamonds: (prev.diamonds || 0) + payout }));
        playSoundEffect("win");
      } else {
        playSoundEffect("loss");
      }
      updateStats(payout > 0, betAmount);
    }, 1200);
  };

  const handleSpinSlots = () => {
    if (isSpinningSlots) return;
    if (user.coins < betAmount) {
      alert(`❌ Insufficient Coins to spin slots!`);
      return;
    }

    setUser(prev => {
      const newXp = (prev.xp || 0) + betAmount;
      const prog = getProgressionFromCoins(newXp);
      return {
        ...prev,
        coins: Math.max(0, (prev.coins || 0) - betAmount),
        xp: newXp,
        userLevel: prog.level,
        level: prog.level,
        vipLevel: prog.vipLevel
      };
    });

    setIsSpinningSlots(true);
    setLastSlotWin(null);

    const symbols = ["🍒", "🍋", "🍇", "💎", "7️⃣", "👑"];

    let count = 0;
    const interval = setInterval(() => {
      count++;
      setSlotReels([
        symbols[Math.floor(Math.random() * symbols.length)],
        symbols[Math.floor(Math.random() * symbols.length)],
        symbols[Math.floor(Math.random() * symbols.length)]
      ]);

      if (count > 15) {
        clearInterval(interval);
        const outcome = determineWinOrLoss(betAmount);
        let finalReels: string[];
        let winMult = 0;

        if (outcome.isWin) {
          const sym = outcome.isFirstTime ? "💎" : symbols[Math.floor(Math.random() * symbols.length)];
          finalReels = [sym, sym, sym];
          winMult = sym === "7️⃣" ? 10 : sym === "👑" ? 8 : sym === "💎" ? 5 : 3;
        } else {
          finalReels = ["🍒", "🍇", "7️⃣"];
        }

        setSlotReels(finalReels);
        setIsSpinningSlots(false);

        const win = Math.floor(betAmount * winMult);
        setLastSlotWin(win);

        if (win > 0) {
          setUser(prev => ({ ...prev, diamonds: (prev.diamonds || 0) + win }));
          playSoundEffect(winMult >= 5 ? "jackpot" : "win");
        } else {
          playSoundEffect("loss");
        }
        updateStats(win > 0, betAmount);
      }
    }, 80);
  };

  // Launch Team Game
  const handleLaunchTeamGame = (game: "ludo" | "carrom" | "billiards", stake: number, oppName: string) => {
    if (user.coins < stake) {
      alert(`❌ Insufficient Coins! You need ${stake.toLocaleString()} Coins to enter this table.`);
      return;
    }

    // Deduct stake
    setUser(prev => ({
      ...prev,
      coins: Math.max(0, (prev.coins || 0) - stake)
    }));

    setActiveGameStake(stake);
    setOpponentName(oppName);
    setInviteModalGame(null);
    setActiveGame(game);
  };

  const handleGameWin = (coins: number, gameName: string) => {
    const message = `🏆 ${user.username || "Player"} won ${coins.toLocaleString()} 💎 in ${gameName}`;
    onSendRoomMessage?.(message);
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[999] flex items-center justify-center p-2 sm:p-4 animate-fade-in select-none">
      <div className="bg-[#130b24] border-2 border-purple-500/50 rounded-3xl p-3 sm:p-5 w-full max-w-lg h-[92vh] max-h-[720px] shadow-[0_0_50px_rgba(168,85,247,0.3)] relative flex flex-col justify-between overflow-hidden text-white">

        {/* 1. If currently inside a specific game, render that active game component directly */}
        {activeGame === "dragon_tiger" ? (
          <DragonTigerGame
            user={user}
            setUser={setUser}
            onBack={() => setActiveGame("lobby")}
            soundEnabled={soundEnabled}
            onGameWin={handleGameWin}
          />
        ) : activeGame === "aviator" ? (
          <AviatorGame
            user={user}
            setUser={setUser}
            onBack={() => setActiveGame("lobby")}
            soundEnabled={soundEnabled}
            onGameWin={handleGameWin}
          />
        ) : activeGame === "ludo" ? (
          <LudoGame
            user={user}
            setUser={setUser}
            onBack={() => setActiveGame("lobby")}
            soundEnabled={soundEnabled}
            stakeCoins={activeGameStake}
            opponentName={opponentName}
            onGameWin={handleGameWin}
          />
        ) : activeGame === "carrom" ? (
          <CarromGame
            user={user}
            setUser={setUser}
            onBack={() => setActiveGame("lobby")}
            soundEnabled={soundEnabled}
            stakeCoins={activeGameStake}
            opponentName={opponentName}
            onGameWin={handleGameWin}
          />
        ) : activeGame === "billiards" ? (
          <BilliardsGame
            user={user}
            setUser={setUser}
            onBack={() => setActiveGame("lobby")}
            soundEnabled={soundEnabled}
            stakeCoins={activeGameStake}
            opponentName={opponentName}
            onGameWin={handleGameWin}
          />
        ) : (
          /* 2. Main Games Lobby with Two Top Tabs: "🍀 Lucky Game" and "⚔️ Team Game" */
          <div className="w-full h-full flex flex-col justify-between">
            {/* Header: Title, Balance & Close */}
            <div className="flex items-center justify-between pb-2 border-b border-white/10 shrink-0">
              <div className="flex items-center space-x-2">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-amber-400 via-pink-500 to-purple-600 flex items-center justify-center text-lg shadow-lg">
                  🎮
                </div>
                <div className="text-left">
                  <h3 className="text-sm font-black text-white uppercase tracking-wider font-mono flex items-center space-x-1.5">
                    <span>PARTY GAME ZONE</span>
                    <span className="text-[7px] bg-pink-600 text-white font-mono px-1.5 py-0.2 rounded-full">REAL LIVE</span>
                  </h3>
                  <p className="text-[9px] text-gray-400 font-sans">
                    Two Wallets: Coins for Bets • Diamonds for Winnings
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <div className="flex flex-col items-end text-[9px] font-mono">
                  <span className="text-amber-300 font-bold">🪙 {(user.coins || 0).toLocaleString()} Coins</span>
                  <span className="text-cyan-300 font-bold">💎 {(user.diamonds || 0).toLocaleString()} Diamonds</span>
                </div>
                <button
                  onClick={handleExitModal}
                  className="p-1.5 bg-white/10 hover:bg-white/20 rounded-full text-gray-300 hover:text-white cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* TWO MAIN CATEGORIES TABS: "🍀 Lucky Game" vs "⚔️ Team Game" */}
            <div className="grid grid-cols-2 gap-2 my-2.5 shrink-0">
              <button
                onClick={() => setMainCategory("lucky")}
                className={`py-2.5 px-3 rounded-2xl font-black text-xs font-mono uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center space-x-2 border-2 ${
                  mainCategory === "lucky"
                    ? "bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 text-black border-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.5)] scale-102"
                    : "bg-white/5 hover:bg-white/10 text-gray-400 border-white/10"
                }`}
              >
                <span className="text-base">🍀</span>
                <span>LUCKY GAME</span>
                <span className="text-[8px] bg-black/30 text-amber-300 px-1.5 py-0.2 rounded-full">SOLO</span>
              </button>

              <button
                onClick={() => setMainCategory("team")}
                className={`py-2.5 px-3 rounded-2xl font-black text-xs font-mono uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center space-x-2 border-2 ${
                  mainCategory === "team"
                    ? "bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 text-white border-purple-300 shadow-[0_0_20px_rgba(168,85,247,0.5)] scale-102"
                    : "bg-white/5 hover:bg-white/10 text-gray-400 border-white/10"
                }`}
              >
                <span className="text-base">⚔️</span>
                <span>TEAM GAME</span>
                <span className="text-[8px] bg-emerald-500 text-black px-1.5 py-0.2 rounded-full font-black">2+ PLAYERS</span>
              </button>
            </div>

            {/* MAIN CONTENT AREA */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">

              {/* ========================================================================= */}
              {/* CATEGORY 1: 🍀 LUCKY GAME (Dragon Tiger, Aviator, Lucky Wheel, Slots, Chest) */}
              {/* ========================================================================= */}
              {mainCategory === "lucky" && (
                <div className="space-y-3">
                  {/* Sub-Games Grid */}
                  <div className="grid grid-cols-2 gap-2.5">
                    {/* 1. Dragon vs Tiger */}
                    <button
                      onClick={() => setActiveGame("dragon_tiger")}
                      className="p-3 bg-gradient-to-b from-[#2a0c16] to-[#14060b] border-2 border-red-500/50 hover:border-red-400 rounded-2xl flex flex-col justify-between h-28 text-left transition-all active:scale-95 shadow-md cursor-pointer group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-2xl group-hover:scale-110 transition-transform">🐉</span>
                        <span className="text-[8px] bg-red-600/90 text-white px-2 py-0.5 rounded-full font-mono font-black">2x - 50x</span>
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-white uppercase font-mono tracking-wide">Dragon vs Tiger</h4>
                        <p className="text-[8px] text-gray-400 font-sans">Live casino card duel</p>
                      </div>
                    </button>

                    {/* 2. Aviator (Crash Game) */}
                    <button
                      onClick={() => setActiveGame("aviator")}
                      className="p-3 bg-gradient-to-b from-[#2a0e28] to-[#120614] border-2 border-rose-500/50 hover:border-rose-400 rounded-2xl flex flex-col justify-between h-28 text-left transition-all active:scale-95 shadow-md cursor-pointer group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-2xl group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform">🚀</span>
                        <span className="text-[8px] bg-rose-600/90 text-white px-2 py-0.5 rounded-full font-mono font-black">1x - 100x+</span>
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-white uppercase font-mono tracking-wide">Aviator Crash</h4>
                        <p className="text-[8px] text-gray-400 font-sans">Cash out before it crashes</p>
                      </div>
                    </button>

                    {/* 3. Lucky Wheel */}
                    <button
                      onClick={() => setActiveGame("wheel")}
                      className="p-3 bg-gradient-to-b from-[#2a1d08] to-[#140e04] border-2 border-amber-500/50 hover:border-amber-400 rounded-2xl flex flex-col justify-between h-28 text-left transition-all active:scale-95 shadow-md cursor-pointer group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-2xl group-hover:rotate-45 transition-transform">🎡</span>
                        <span className="text-[8px] bg-amber-500 text-black px-2 py-0.5 rounded-full font-mono font-black">10x JACKPOT</span>
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-amber-300 uppercase font-mono tracking-wide">Lucky Wheel</h4>
                        <p className="text-[8px] text-gray-400 font-sans">Guaranteed retention rewards</p>
                      </div>
                    </button>

                    {/* 4. 777 Slots & Fruit Spinner */}
                    <button
                      onClick={() => setActiveGame("slots")}
                      className="p-3 bg-gradient-to-b from-[#180e2b] to-[#0c0717] border-2 border-purple-500/50 hover:border-purple-400 rounded-2xl flex flex-col justify-between h-28 text-left transition-all active:scale-95 shadow-md cursor-pointer group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-2xl group-hover:scale-110 transition-transform">🎰</span>
                        <span className="text-[8px] bg-purple-600 text-white px-2 py-0.5 rounded-full font-mono font-black">MEGA 777</span>
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-purple-300 uppercase font-mono tracking-wide">777 Lucky Slots</h4>
                        <p className="text-[8px] text-gray-400 font-sans">Match 3 reels to hit jackpot</p>
                      </div>
                    </button>
                  </div>

                  {/* Banner / Info */}
                  <div className="p-2.5 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Flame className="w-4 h-4 text-amber-400 animate-pulse" />
                      <span className="text-[9.5px] font-bold text-gray-300">
                        1st Time Guaranteed Win & Anti-Loss Protection Active!
                      </span>
                    </div>
                    <button
                      onClick={() => setShowCriteriaModal(true)}
                      className="text-[9px] font-mono text-pink-400 font-bold underline cursor-pointer"
                    >
                      Rules
                    </button>
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* CATEGORY 2: ⚔️ TEAM GAME (Ludo King, Carrom Board, 8-Ball Billiards) */}
              {/* ========================================================================= */}
              {mainCategory === "team" && (
                <div className="space-y-3">
                  <div className="p-2 bg-gradient-to-r from-purple-900/60 to-pink-900/60 border border-purple-400/40 rounded-2xl flex items-center space-x-2 text-[10px] text-purple-200">
                    <Users className="w-4 h-4 text-pink-300 shrink-0" />
                    <span>
                      Play live with 2 to 4 guests from your party room with private in-game voice!
                    </span>
                  </div>

                  {/* 1. Ludo King (Party Ludo) */}
                  <div className="p-3.5 bg-gradient-to-b from-[#241340] to-[#120726] border-2 border-red-500/50 rounded-2xl flex items-center justify-between shadow-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-red-600 via-amber-500 to-emerald-600 flex items-center justify-center text-2xl shadow-md">
                        🎲
                      </div>
                      <div className="text-left">
                        <div className="flex items-center space-x-1.5">
                          <h4 className="text-sm font-black text-white uppercase font-mono tracking-wide">Ludo King</h4>
                          <span className="text-[7.5px] bg-red-600 text-white font-mono px-1.5 py-0.2 rounded font-black">2-4 P</span>
                        </div>
                        <p className="text-[9px] text-gray-400 font-sans mt-0.5">Classic dice race with token cutting & stars</p>
                      </div>
                    </div>

                    <button
                      onClick={() => setInviteModalGame("Ludo King")}
                      className="px-3.5 py-2 bg-gradient-to-r from-pink-500 via-rose-500 to-red-600 hover:brightness-110 text-white text-[11px] font-black uppercase font-mono rounded-xl shadow-md cursor-pointer active:scale-95"
                    >
                      Play Table 🎮
                    </button>
                  </div>

                  {/* 2. Carrom Board Master */}
                  <div className="p-3.5 bg-gradient-to-b from-[#2b180d] to-[#140b05] border-2 border-amber-500/50 rounded-2xl flex items-center justify-between shadow-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-600 to-yellow-500 flex items-center justify-center text-2xl shadow-md">
                        ⚪
                      </div>
                      <div className="text-left">
                        <div className="flex items-center space-x-1.5">
                          <h4 className="text-sm font-black text-amber-300 uppercase font-mono tracking-wide">Carrom Master</h4>
                          <span className="text-[7.5px] bg-amber-500 text-black font-mono px-1.5 py-0.2 rounded font-black">2-4 P</span>
                        </div>
                        <p className="text-[9px] text-gray-400 font-sans mt-0.5">Striker aiming & Red Queen pocketing battle</p>
                      </div>
                    </div>

                    <button
                      onClick={() => setInviteModalGame("Carrom Master")}
                      className="px-3.5 py-2 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:brightness-110 text-black text-[11px] font-black uppercase font-mono rounded-xl shadow-md cursor-pointer active:scale-95"
                    >
                      Play Table 🎮
                    </button>
                  </div>

                  {/* 3. 8-Ball Billiards Pool */}
                  <div className="p-3.5 bg-gradient-to-b from-[#0a2318] to-[#04120c] border-2 border-emerald-500/50 rounded-2xl flex items-center justify-between shadow-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-green-500 flex items-center justify-center text-2xl shadow-md">
                        🎱
                      </div>
                      <div className="text-left">
                        <div className="flex items-center space-x-1.5">
                          <h4 className="text-sm font-black text-emerald-300 uppercase font-mono tracking-wide">8-Ball Billiards</h4>
                          <span className="text-[7.5px] bg-emerald-500 text-black font-mono px-1.5 py-0.2 rounded font-black">2 P</span>
                        </div>
                        <p className="text-[9px] text-gray-400 font-sans mt-0.5">Green felt pool table & cue stick physics</p>
                      </div>
                    </div>

                    <button
                      onClick={() => setInviteModalGame("8-Ball Billiards")}
                      className="px-3.5 py-2 bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-600 hover:brightness-110 text-black text-[11px] font-black uppercase font-mono rounded-xl shadow-md cursor-pointer active:scale-95"
                    >
                      Play Table 🎮
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Wheel & Slot Inline Play Views if selected */}
            {activeGame === "wheel" && (
              <div className="w-full flex flex-col items-center justify-center space-y-2 my-auto">
                <div className="relative w-56 h-56 flex items-center justify-center">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 text-xl text-yellow-300 filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                    ▼
                  </div>
                  <canvas ref={canvasRef} width={240} height={240} className="w-full h-full" />
                </div>
                <div className="w-full space-y-2">
                  <div className="grid grid-cols-4 gap-1">
                    {BET_OPTIONS.slice(0, 4).map(amt => (
                      <button
                        key={amt}
                        onClick={() => setBetAmount(amt)}
                        className={`py-1 rounded-xl text-[9px] font-mono font-bold ${betAmount === amt ? "bg-amber-400 text-black" : "bg-white/10 text-gray-300"}`}
                      >
                        {amt} 🪙
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={handleSpinWheel}
                    disabled={isSpinning}
                    className="w-full py-2.5 bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-black uppercase text-xs rounded-xl shadow-lg cursor-pointer"
                  >
                    {isSpinning ? "SPINNING..." : `SPIN WHEEL (${betAmount} COINS)`}
                  </button>
                  <button
                    onClick={() => setActiveGame("lobby")}
                    className="w-full py-1 text-center text-xs text-gray-400 hover:text-white cursor-pointer"
                  >
                    ← Back to Game Lobby
                  </button>
                </div>
              </div>
            )}

            {activeGame === "slots" && (
              <div className="w-full flex flex-col items-center justify-center space-y-3 my-auto">
                <div className="grid grid-cols-3 gap-2 bg-black/80 border border-white/10 rounded-2xl p-4 w-full">
                  {slotReels.map((s, idx) => (
                    <div key={idx} className="bg-purple-950/60 rounded-xl h-20 flex items-center justify-center text-4xl shadow-inner border border-purple-400/30">
                      {s}
                    </div>
                  ))}
                </div>
                <div className="w-full space-y-2">
                  <button
                    onClick={handleSpinSlots}
                    disabled={isSpinningSlots}
                    className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-black uppercase text-xs rounded-xl shadow-lg cursor-pointer"
                  >
                    {isSpinningSlots ? "SPINNING REELS..." : `SPIN SLOTS (${betAmount} COINS)`}
                  </button>
                  <button
                    onClick={() => setActiveGame("lobby")}
                    className="w-full py-1 text-center text-xs text-gray-400 hover:text-white cursor-pointer"
                  >
                    ← Back to Game Lobby
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TEAM GAME INVITE MODAL POPUP */}
        {inviteModalGame && (
          <GameInviteModal
            gameName={inviteModalGame}
            currentUser={user}
            partyGuests={partyGuests}
            onSendInvite={(guestName, stake) => {
              if (onSendGameInvite) {
                onSendGameInvite(guestName, inviteModalGame, stake);
              }
              const gameKey = inviteModalGame.toLowerCase().includes("ludo") ? "ludo" : inviteModalGame.toLowerCase().includes("carrom") ? "carrom" : "billiards";
              handleLaunchTeamGame(gameKey as any, stake, guestName);
            }}
            onPlayWithAi={(stake) => {
              const gameKey = inviteModalGame.toLowerCase().includes("ludo") ? "ludo" : inviteModalGame.toLowerCase().includes("carrom") ? "carrom" : "billiards";
              handleLaunchTeamGame(gameKey as any, stake, "Smart_AI_Pro");
            }}
            onClose={() => setInviteModalGame(null)}
          />
        )}

        {/* ℹ️ GAME ODDS RULES MODAL */}
        {showCriteriaModal && (
          <div className="absolute inset-0 bg-black/95 backdrop-blur-md z-[110] p-5 flex flex-col justify-between text-left animate-fade-in">
            <div className="space-y-4 overflow-y-auto">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center space-x-2">
                  <Trophy className="w-5 h-5 text-amber-400" />
                  <h4 className="text-sm font-black text-white uppercase tracking-wider font-mono">Game System Rules</h4>
                </div>
                <button
                  onClick={() => setShowCriteriaModal(false)}
                  className="p-1 bg-white/10 hover:bg-white/20 rounded-full text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs text-gray-300 leading-relaxed">
                <div className="bg-purple-950/60 border border-purple-500/40 p-3 rounded-xl space-y-1">
                  <h5 className="font-bold text-amber-300 uppercase text-[11px]">Lucky Game Rules:</h5>
                  <ul className="text-[11px] text-gray-300 list-disc pl-4 space-y-1">
                    <li><strong>Dragon vs Tiger:</strong> Bet on Dragon (2x), Tiger (2x), Tie (9x), or Suited Tie (51x).</li>
                    <li><strong>Aviator:</strong> Plane climbs from 1.00x upwards. Cashout anytime before it crashes to claim diamonds!</li>
                    <li><strong>1st Time Guaranteed Win:</strong> First game turn is guaranteed to be a winning payout.</li>
                    <li><strong>Anti-Frustration Safeguard:</strong> Lose 2 times in a row -&gt; 3rd game guarantees a win.</li>
                  </ul>
                </div>

                <div className="bg-emerald-950/60 border border-emerald-500/40 p-3 rounded-xl space-y-1">
                  <h5 className="font-bold text-emerald-300 uppercase text-[11px]">Team Game Rules:</h5>
                  <ul className="text-[11px] text-gray-300 list-disc pl-4 space-y-1">
                    <li><strong>Party Ludo:</strong> 2 to 4 player dice board. Roll 6 to unlock tokens and roll again. Cut opponent tokens to send them to yard.</li>
                    <li><strong>Carrom Master:</strong> Slide striker, aim guide line and shoot to pocket White (10 pts), Black (5 pts) and Red Queen (25 pts).</li>
                    <li><strong>8-Ball Billiards:</strong> Cue stick ball physics, pocket balls to score and win pool prize.</li>
                    <li><strong>In-Game Audio Isolation:</strong> When in game room, players are muted from main party and talk privately inside the game table!</li>
                  </ul>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowCriteriaModal(false)}
              className="w-full mt-4 py-2.5 bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer"
            >
              Got It
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
