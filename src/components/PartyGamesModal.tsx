import React, { useState, useRef, useEffect } from "react";
import { UserProfile, Transaction } from "../types";
import { X, Sparkles, Trophy, HelpCircle, History, RotateCw, Volume2, VolumeX, Flame, Zap, ShieldCheck, Gift, Gem } from "lucide-react";
import { getProgressionFromCoins } from "../levelUtils";

interface PartyGamesModalProps {
  user: UserProfile;
  setUser: React.Dispatch<React.SetStateAction<UserProfile>>;
  onClose: () => void;
  onSendRoomMessage?: (msg: string) => void;
  setTransactions?: React.Dispatch<React.SetStateAction<Transaction[]>>;
}

// 🎡 Lucky Wheel Slices Config
interface WheelSlice {
  id: number;
  label: string;
  multiplier: number; // 0, 0.5, 2, 3, 4, 5, 10
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

const BET_OPTIONS = [100, 1000, 10000, 50000, 100000, 500000, 800000, 1000000];

// Web Audio API helper for sound effects
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
  } catch (e) {
    // ignore audio context failures
  }
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
}) => {
  const [activeTab, setActiveTab] = useState<"wheel" | "chest" | "slots">("wheel");
  const [betAmount, setBetAmount] = useState<number>(50);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [showCriteriaModal, setShowCriteriaModal] = useState<boolean>(false);
  const [gameHistory, setGameHistory] = useState<
    { id: string; game: string; bet: number; result: string; winAmount: number; time: string }[]
  >([]);

  // Player Stats for Win/Lose Algorithms (First-Time Guaranteed Win, Under 1 Lakh Boost, 3rd Turn Anti-Frustration Safeguard)
  const statsKey = `pardais_game_stats_${user.username || user.uniqueId || "guest"}`;
  const [playerStats, setPlayerStats] = useState<PlayerGameStats>(() => {
    try {
      const stored = localStorage.getItem(statsKey);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      // fallback
    }
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

  /**
   * 🎲 DYNAMIC INTELLIGENT WIN/LOSE ALGORITHM
   * Meets all user criteria:
   * 1. First-time player (`playCount === 0`) -> GUARANTEED WIN!
   * 2. Total coins played < 100,000 (1 Lakh) -> High Win Chance (~75% Win rate) so players get hooked and continue playing.
   * 3. 100k to 500k coins -> 40% User Win / 60% App Advantage.
   * 4. 500k to 800k coins -> 35% User Win / 65% App Advantage.
   * 5. 800k to 1M+ (10 Lakh) coins -> 30% User Win / 70% App Advantage (App benefits more on higher plays).
   * 6. Anti-Frustration Retention Rule: If player loses 2 turns in a row (`consecutiveLosses >= 2`), 3rd turn MUST BE A WIN!
   */
  const determineWinOrLoss = (bet: number): { isWin: boolean; isFirstTime: boolean; isSafeguard: boolean } => {
    // 1. First time player guaranteed win
    if (playerStats.playCount === 0) {
      return { isWin: true, isFirstTime: true, isSafeguard: false };
    }

    // 2. Retention safeguard: If player lost 2 times in a row, guarantee win on 3rd attempt so they don't feel stranded!
    if (playerStats.consecutiveLosses >= 2) {
      return { isWin: true, isFirstTime: false, isSafeguard: true };
    }

    // 3. Under 1 Lakh (100,000 coins) cumulative played boost -> 75% Win Rate
    if (playerStats.totalBetCoins < 100000 && bet < 100000) {
      const rand = Math.random();
      return { isWin: rand < 0.75, isFirstTime: false, isSafeguard: false };
    }

    // 4. High bets / Cumulative played volume tiers:
    const rand = Math.random();
    const effectiveCoins = Math.max(playerStats.totalBetCoins, bet);

    if (effectiveCoins >= 800000) {
      // 800k - 1M+ tier: 30% User Win / 70% App Advantage
      return { isWin: rand < 0.30, isFirstTime: false, isSafeguard: false };
    } else if (effectiveCoins >= 500000) {
      // 500k - 800k tier: 35% User Win / 65% App Advantage
      return { isWin: rand < 0.35, isFirstTime: false, isSafeguard: false };
    } else {
      // 100k - 500k tier: 40% User Win / 60% App Advantage
      return { isWin: rand < 0.40, isFirstTime: false, isSafeguard: false };
    }
  };

  // 🎡 Wheel States
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [wheelRotation, setWheelRotation] = useState<number>(0);
  const [lastWheelResult, setLastWheelResult] = useState<{
    slice: WheelSlice;
    payout: number;
    profit: number;
    isFirstWin?: boolean;
    isSafeguardWin?: boolean;
  } | null>(null);

  // 🎁 Chest States
  const [chestOpening, setChestOpening] = useState<boolean>(false);
  const [selectedChest, setSelectedChest] = useState<number | null>(null);
  const [chestResults, setChestResults] = useState<{ mult: number; text: string; coins: number }[] | null>(null);

  // 🎰 Slot States
  const [isSpinningSlots, setIsSpinningSlots] = useState<boolean>(false);
  const [slotReels, setSlotReels] = useState<string[]>(["🍒", "💎", "7️⃣"]);
  const [lastSlotWin, setLastSlotWin] = useState<number | null>(null);

  // Wheel Canvas Drawing
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    drawWheel();
  }, [wheelRotation]);

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

    // Draw Slices
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

    // Center Gold Cap
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

  // Helper to get slice index based on Win/Loss decision
  const getSliceForOutcome = (outcome: { isWin: boolean; isFirstTime: boolean; isSafeguard: boolean }): number => {
    if (outcome.isWin) {
      if (outcome.isFirstTime) return 2; // Guaranteed 2x Double Win on first time spin!
      if (outcome.isSafeguard) return 2; // 2x Double Win to turn around loss streak

      const r = Math.random();
      if (r < 0.45) return 2; // 2x Double (small gift win)
      if (r < 0.75) return 4; // 3x Triple (medium win)
      if (r < 0.90) return 6; // 4x Super win
      if (r < 0.97) return 8; // 5x Ultra win
      return 10; // 10x Jackpot
    } else {
      const lossIndices = [0, 1, 3, 5, 7, 9, 11]; // includes 0x Lose, 0.5x Half, 0x Try Again
      return lossIndices[Math.floor(Math.random() * lossIndices.length)];
    }
  };

  // 🎡 SPIN THE LUCKY WHEEL
  const handleSpinWheel = () => {
    if (isSpinning) return;
    if (user.coins < betAmount) {
      alert(`❌ Insufficient Gifting Coins!\nYou need at least ${betAmount.toLocaleString()} Gifting Coins to place this bet.`);
      return;
    }

    if (soundEnabled) playSoundEffect("click");

    // DEDUCTION: Bet coins are deducted from Gifting Wallet & XP increased to level up
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

    // Calculate dynamic outcome
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

    // Verify visual stopped slice index mathematically
    const finalRotMod = ((targetRotation % 360) + 360) % 360;
    const angleFromTop = ((360 - finalRotMod) % 360);
    const stoppedSliceIndex = Math.floor(angleFromTop / degreesPerSlice) % numSlices;
    const winningSlice = WHEEL_SLICES[stoppedSliceIndex] || WHEEL_SLICES[winningSliceIndex];

    let tickCount = 0;
    const tickInterval = setInterval(() => {
      tickCount++;
      if (soundEnabled && tickCount % 3 === 0) playSoundEffect("spin");
      if (tickCount > 25) clearInterval(tickInterval);
    }, 100);

    const startTime = performance.now();
    const duration = 3200;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      if (elapsed < duration) {
        const progress = elapsed / duration;
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const currentRot = startRotation + (targetRotation - startRotation) * easeOut;
        setWheelRotation(currentRot);
        requestAnimationFrame(animate);
      } else {
        clearInterval(tickInterval);
        setWheelRotation(targetRotation);
        setIsSpinning(false);

        const payout = Math.floor(betAmount * winningSlice.multiplier);
        const profit = payout - betAmount;

        // EARNING WALLET: Winnings are added to Earning Wallet (user.diamonds)!
        if (payout > 0) {
          setUser(prev => ({ ...prev, diamonds: (prev.diamonds || 0) + payout }));
        }

        updateStats(payout > 0, betAmount);

        setLastWheelResult({
          slice: winningSlice,
          payout,
          profit,
          isFirstWin: outcome.isFirstTime,
          isSafeguardWin: outcome.isSafeguard
        });

        if (soundEnabled) {
          if (winningSlice.type === "jackpot") playSoundEffect("jackpot");
          else if (winningSlice.isWin) playSoundEffect("win");
          else playSoundEffect("loss");
        }

        // Save Transactions
        if (setTransactions) {
          // Bet Deduction Tx
          const betTx: Transaction = {
            id: `BET-${Date.now().toString().slice(-5)}`,
            type: "withdraw",
            amount: betAmount,
            currency: "coins",
            timestamp: new Date().toISOString().replace("T", " ").slice(0, 16),
            status: "Completed",
            details: `Game Bet: Lucky Wheel (${betAmount} coins deducted from Gifting Wallet)`
          };
          const txs: Transaction[] = [betTx];

          if (payout > 0) {
            const winTx: Transaction = {
              id: `WIN-${Date.now().toString().slice(-5)}`,
              type: "recharge",
              amount: payout,
              currency: "diamonds",
              timestamp: new Date().toISOString().replace("T", " ").slice(0, 16),
              status: "Completed",
              details: `Game Win: Lucky Wheel (+${payout} credited to Earning Wallet)`
            };
            txs.unshift(winTx);
          }
          setTransactions(prev => [...txs, ...prev]);
        }

        setGameHistory(prev => [
          {
            id: Date.now().toString(),
            game: "Lucky Wheel 🎡",
            bet: betAmount,
            result: winningSlice.label,
            winAmount: payout,
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          },
          ...prev.slice(0, 9)
        ]);

        if (onSendRoomMessage) {
          if (winningSlice.type === "jackpot") {
            onSendRoomMessage(`🏆 👑 JACKPOT WINNER! @${user.username} spun Lucky Wheel (${betAmount.toLocaleString()} coins) & WON ${payout.toLocaleString()} DIAMONDS in Earning Wallet! (10x 🎉)`);
          } else if (winningSlice.isWin) {
            onSendRoomMessage(`🎡 🎉 @${user.username} played Lucky Wheel (${betAmount.toLocaleString()} coins) & won ${payout.toLocaleString()} Earning Diamonds! (${winningSlice.multiplier}x)`);
          } else {
            onSendRoomMessage(`🎡 💥 @${user.username} played Lucky Wheel (${betAmount.toLocaleString()} coins) - Better luck next time!`);
          }
        }
      }
    };

    requestAnimationFrame(animate);
  };

  // 🎁 PLAY LUCKY TREASURE CHEST
  const handleOpenChest = (chestIdx: number) => {
    if (chestOpening || selectedChest !== null) return;
    if (user.coins < betAmount) {
      alert(`❌ Insufficient Gifting Coins!\nYou need at least ${betAmount.toLocaleString()} Gifting Coins to open a Treasure Box.`);
      return;
    }

    if (soundEnabled) playSoundEffect("click");

    // Deduct bet from Gifting Wallet & XP increased to level up
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
    setSelectedChest(chestIdx);
    setChestOpening(true);

    setTimeout(() => {
      const outcome = determineWinOrLoss(betAmount);
      let outcomeMult = 0;
      let outcomeText = "Empty Box 💥";

      if (outcome.isWin) {
        if (outcome.isFirstTime) {
          outcomeMult = 2.0;
          outcomeText = "First Luck 2x Diamonds! ✨";
        } else {
          const winR = Math.random();
          if (winR < 0.6) {
            outcomeMult = 2.0;
            outcomeText = "2x Earning Diamonds! ✨";
          } else if (winR < 0.9) {
            outcomeMult = 3.0;
            outcomeText = "3x Super Chest! 💎";
          } else {
            outcomeMult = 5.0;
            outcomeText = "5x MEGA TREASURE! 👑";
          }
        }
      }

      const payout = Math.floor(betAmount * outcomeMult);

      // Add payout to Earning Wallet (user.diamonds)
      if (payout > 0) {
        setUser(prev => ({ ...prev, diamonds: (prev.diamonds || 0) + payout }));
        if (soundEnabled) playSoundEffect(outcomeMult >= 5 ? "jackpot" : "win");
      } else {
        if (soundEnabled) playSoundEffect("loss");
      }

      updateStats(payout > 0, betAmount);

      const results = [0, 1, 2].map(idx => {
        if (idx === chestIdx) {
          return { mult: outcomeMult, text: outcomeText, coins: payout };
        } else {
          const otherMult = Math.random() > 0.6 ? (Math.random() > 0.5 ? 2 : 3) : 0;
          return {
            mult: otherMult,
            text: otherMult > 0 ? `${otherMult}x Diamonds` : "Empty 💥",
            coins: Math.floor(betAmount * otherMult)
          };
        }
      });

      setChestResults(results);
      setChestOpening(false);

      if (onSendRoomMessage) {
        if (payout > 0) {
          onSendRoomMessage(`🎁 ✨ @${user.username} opened a Lucky Treasure Box (${betAmount.toLocaleString()} coins) and WON ${payout.toLocaleString()} Earning Diamonds! (${outcomeMult}x)`);
        } else {
          onSendRoomMessage(`🎁 💥 @${user.username} opened a Lucky Treasure Box (${betAmount.toLocaleString()} coins) - Box was empty!`);
        }
      }
    }, 1200);
  };

  const resetChestGame = () => {
    setSelectedChest(null);
    setChestResults(null);
  };

  // 🎰 PLAY LUCKY FRUIT SLOTS
  const handleSpinSlots = () => {
    if (isSpinningSlots) return;
    if (user.coins < betAmount) {
      alert(`❌ Insufficient Gifting Coins!\nYou need at least ${betAmount.toLocaleString()} Gifting Coins to spin the slots.`);
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
    setIsSpinningSlots(true);
    setLastSlotWin(null);

    const symbols = ["🍒", "🍋", "7️⃣", "💎", "🔔", "🌟"];
    let count = 0;
    const slotTimer = setInterval(() => {
      count++;
      setSlotReels([
        symbols[Math.floor(Math.random() * symbols.length)],
        symbols[Math.floor(Math.random() * symbols.length)],
        symbols[Math.floor(Math.random() * symbols.length)]
      ]);
      if (soundEnabled && count % 2 === 0) playSoundEffect("spin");
      if (count > 15) {
        clearInterval(slotTimer);

        const outcome = determineWinOrLoss(betAmount);
        let finalReels: string[];
        let multiplier = 0;

        if (outcome.isWin) {
          if (outcome.isFirstTime) {
            finalReels = ["🍒", "🍒", "🍋"];
            multiplier = 2.0;
          } else {
            const winR = Math.random();
            if (winR < 0.70) {
              const sym = symbols[Math.floor(Math.random() * symbols.length)];
              const other = symbols.filter(s => s !== sym)[0];
              finalReels = [sym, sym, other];
              multiplier = 2.0;
            } else if (winR < 0.95) {
              const sym = Math.random() > 0.5 ? "🍒" : "🍋";
              finalReels = [sym, sym, sym];
              multiplier = 5.0;
            } else {
              finalReels = ["💎", "💎", "💎"];
              multiplier = 15.0;
            }
          }
        } else {
          finalReels = ["🍒", "🍋", "7️⃣"];
        }

        setSlotReels(finalReels);
        setIsSpinningSlots(false);

        const payout = Math.floor(betAmount * multiplier);

        // Add payout to Earning Wallet (user.diamonds)
        if (payout > 0) {
          setUser(prev => ({ ...prev, diamonds: (prev.diamonds || 0) + payout }));
          setLastSlotWin(payout);
          if (soundEnabled) playSoundEffect(multiplier >= 15 ? "jackpot" : "win");
        } else {
          if (soundEnabled) playSoundEffect("loss");
        }

        updateStats(payout > 0, betAmount);

        if (onSendRoomMessage) {
          if (payout > 0) {
            onSendRoomMessage(`🎰 🎉 @${user.username} played Lucky Slots (${betAmount.toLocaleString()} coins) & WON ${payout.toLocaleString()} Earning Diamonds! [${finalReels.join(" ")}]`);
          } else {
            onSendRoomMessage(`🎰 💥 @${user.username} played Lucky Slots (${betAmount.toLocaleString()} coins) - [${finalReels.join(" ")}]`);
          }
        }
      }
    }, 100);
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[100] flex items-center justify-center p-3 animate-fade-in select-none">
      <div className="bg-gradient-to-b from-[#1b1035] via-[#120a26] to-[#0a0518] border-2 border-pink-500/60 rounded-3xl w-full max-w-sm shadow-[0_0_50px_rgba(255,0,127,0.4)] relative flex flex-col overflow-hidden max-h-[92vh]">

        {/* TOP BAR / HEADER */}
        <div className="bg-[#170e30] border-b border-pink-500/30 px-4 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2">
            <span className="text-xl animate-bounce">🎡</span>
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider font-mono flex items-center space-x-1">
                <span>PARDAIS LUCKY GAMES</span>
                <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] px-1.5 py-0.2 rounded-full font-sans font-normal flex items-center space-x-0.5">
                  <ShieldCheck className="w-2.5 h-2.5" />
                  <span>SMART ODDS</span>
                </span>
              </h3>
              <p className="text-[9.5px] text-gray-400">Coins deducted from Gifting • Wins added to Earning!</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-1.5 bg-white/5 hover:bg-white/10 rounded-full text-gray-300 hover:text-white transition-all cursor-pointer"
              title={soundEnabled ? "Mute Sound" : "Enable Sound"}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-gray-500" />}
            </button>
            <button
              onClick={() => setShowCriteriaModal(true)}
              className="p-1.5 bg-white/5 hover:bg-white/10 rounded-full text-amber-400 hover:text-amber-300 transition-all cursor-pointer"
              title="Game Fair Odds Info"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 bg-red-500/20 hover:bg-red-500/40 text-red-400 hover:text-white rounded-full transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* TWO-WALLET BALANCE DISPLAY (GIFTING COINS & EARNING DIAMONDS) */}
        <div className="bg-[#0f0921] px-3 py-2 border-b border-purple-500/20 flex items-center justify-between shrink-0 space-x-2">
          {/* Gifting Wallet (Coins - Used to Bet) */}
          <div className="flex items-center space-x-1.5 bg-black/50 border border-yellow-500/40 px-2.5 py-1 rounded-xl" title="Gifting Wallet (Used for Bets)">
            <Gift className="w-3.5 h-3.5 text-amber-400" />
            <div className="flex flex-col text-left">
              <span className="text-[7.5px] text-gray-400 font-bold uppercase tracking-wider">Gifting Wallet</span>
              <span className="text-xs font-black font-mono text-yellow-300 leading-none">
                {user.coins ? user.coins.toLocaleString() : "0"}
              </span>
            </div>
          </div>

          {/* Earning Wallet (Diamonds - Receives All Game Wins) */}
          <div className="flex items-center space-x-1.5 bg-emerald-950/60 border border-emerald-500/40 px-2.5 py-1 rounded-xl" title="Earning Wallet (Receives Game Wins)">
            <Gem className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <div className="flex flex-col text-left">
              <span className="text-[7.5px] text-emerald-300 font-bold uppercase tracking-wider">Earning Wallet</span>
              <span className="text-xs font-black font-mono text-emerald-300 leading-none">
                {(user.diamonds || 0).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* GAME SELECTION TABS */}
        <div className="bg-[#140b2b] px-3 py-1.5 border-b border-purple-500/10 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-1">
            {playerStats.playCount === 0 ? (
              <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-bold animate-pulse">
                🌟 1st Play Guaranteed Win!
              </span>
            ) : playerStats.totalBetCoins < 100000 && betAmount < 100000 ? (
              <span className="text-[9px] bg-purple-500/20 text-purple-300 border border-purple-500/40 px-2 py-0.5 rounded-full font-bold">
                ⚡ Starter Boost (&lt;1 Lakh)
              </span>
            ) : Math.max(playerStats.totalBetCoins, betAmount) >= 800000 ? (
              <span className="text-[9px] bg-rose-500/20 text-rose-300 border border-rose-500/40 px-2 py-0.5 rounded-full font-bold">
                🔥 1M High Stakes (30-70 App Advantage)
              </span>
            ) : Math.max(playerStats.totalBetCoins, betAmount) >= 500000 ? (
              <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-bold">
                ⚡ 500k Tier (35-65 App Advantage)
              </span>
            ) : (
              <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-bold">
                ⚖️ 100k Tier (40-60 App Advantage)
              </span>
            )}
          </div>

          <div className="flex bg-black/40 border border-white/10 p-0.5 rounded-xl text-[10px] font-bold">
            <button
              onClick={() => setActiveTab("wheel")}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                activeTab === "wheel"
                  ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md font-extrabold"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              🎡 Wheel
            </button>
            <button
              onClick={() => setActiveTab("chest")}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                activeTab === "chest"
                  ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md font-extrabold"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              🎁 Box
            </button>
            <button
              onClick={() => setActiveTab("slots")}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                activeTab === "slots"
                  ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md font-extrabold"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              🎰 Slots
            </button>
          </div>
        </div>

        {/* BODY CONTENT AREA */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center justify-between space-y-4">

          {/* ========================================================= */}
          {/* TAB 1: 🎡 LUCKY WHEEL */}
          {/* ========================================================= */}
          {activeTab === "wheel" && (
            <div className="w-full flex flex-col items-center justify-center space-y-4">
              {/* Wheel Container with Top Pointer Arrow */}
              <div className="relative flex items-center justify-center p-2">
                {/* Pointer Arrow at 12 o'clock */}
                <div className="absolute top-0 z-20 transform -translate-y-2">
                  <div className="w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[18px] border-t-amber-400 drop-shadow-[0_2px_8px_rgba(255,215,0,0.8)]" />
                </div>

                {/* Glowing Wheel Rim */}
                <div className="rounded-full p-2 bg-gradient-to-tr from-pink-600 via-purple-600 to-cyan-400 shadow-[0_0_35px_rgba(255,0,127,0.5)] border-2 border-amber-400/60">
                  <canvas
                    ref={canvasRef}
                    width={240}
                    height={240}
                    className="rounded-full block shadow-inner bg-slate-950"
                  />
                </div>
              </div>

              {/* Wheel Spin Result Display */}
              {lastWheelResult && (
                <div
                  className={`w-full py-2 px-3 rounded-2xl border text-center animate-pop-gift ${
                    lastWheelResult.payout > 0
                      ? "bg-emerald-950/80 border-emerald-500/60 text-emerald-300"
                      : "bg-rose-950/80 border-rose-500/60 text-rose-300"
                  }`}
                >
                  <p className="text-xs font-black uppercase tracking-wider">
                    {lastWheelResult.payout > 0 ? (
                      <span>🎉 WIN: +{lastWheelResult.payout.toLocaleString()} DIAMONDS TO EARNING WALLET! ({lastWheelResult.slice.multiplier}x)</span>
                    ) : (
                      <span>💥 {lastWheelResult.slice.label} - Better Luck Next Time!</span>
                    )}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 2: 🎁 LUCKY TREASURE BOX */}
          {/* ========================================================= */}
          {activeTab === "chest" && (
            <div className="w-full flex flex-col items-center justify-center space-y-5 my-auto">
              <div className="text-center space-y-1">
                <h4 className="text-xs font-black text-amber-300 uppercase tracking-wider font-mono">Pick A Mysterious Box</h4>
                <p className="text-[10px] text-gray-400">Wins are added directly to your Earning Wallet!</p>
              </div>

              <div className="grid grid-cols-3 gap-3 w-full px-2">
                {[0, 1, 2].map(idx => {
                  const isOpened = chestResults !== null;
                  const res = chestResults ? chestResults[idx] : null;
                  const isChosen = selectedChest === idx;

                  return (
                    <button
                      key={idx}
                      onClick={() => handleOpenChest(idx)}
                      disabled={chestOpening || isOpened}
                      className={`h-28 rounded-2xl border-2 flex flex-col items-center justify-center p-2 transition-all cursor-pointer relative ${
                        isOpened
                          ? res && res.mult > 0
                            ? "bg-amber-950/80 border-amber-400 text-amber-200 scale-105 shadow-[0_0_20px_rgba(255,215,0,0.5)]"
                            : "bg-gray-900/60 border-gray-700 text-gray-500"
                          : isChosen && chestOpening
                          ? "bg-pink-900/50 border-pink-400 animate-pulse scale-95"
                          : "bg-gradient-to-b from-purple-900/40 to-indigo-950/60 hover:border-pink-500 border-white/15 hover:scale-105 shadow-lg active:scale-95"
                      }`}
                    >
                      {isOpened && res ? (
                        <div className="text-center space-y-1 animate-pop-gift">
                          <span className="text-3xl block">{res.mult > 0 ? "👑" : "💥"}</span>
                          <span className="text-[10px] font-black block font-mono text-amber-300">{res.text}</span>
                          {res.coins > 0 && <span className="text-[9px] text-emerald-400 font-bold block">+{res.coins} 💎</span>}
                        </div>
                      ) : isChosen && chestOpening ? (
                        <div className="text-center space-y-1">
                          <span className="text-3xl block animate-bounce">🎁</span>
                          <span className="text-[9px] font-mono text-pink-300 animate-pulse">Opening...</span>
                        </div>
                      ) : (
                        <div className="text-center space-y-1">
                          <span className="text-3xl block filter drop-shadow">🎁</span>
                          <span className="text-[10px] font-bold text-gray-300 block">Box #{idx + 1}</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {chestResults && (
                <button
                  onClick={resetChestGame}
                  className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs py-1.5 px-4 rounded-xl flex items-center space-x-1 transition-all cursor-pointer shadow-md"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>Play Again</span>
                </button>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 3: 🎰 LUCKY FRUIT SLOTS */}
          {/* ========================================================= */}
          {activeTab === "slots" && (
            <div className="w-full flex flex-col items-center justify-center space-y-4 my-auto">
              <div className="bg-[#120826] border-2 border-amber-400/50 rounded-2xl p-4 w-full shadow-[0_0_30px_rgba(255,191,0,0.2)]">
                {/* 3 Reel Slots Window */}
                <div className="grid grid-cols-3 gap-2 bg-black/80 border border-white/10 rounded-xl p-3 shadow-inner">
                  {slotReels.map((symbol, idx) => (
                    <div
                      key={idx}
                      className="bg-gradient-to-b from-[#241340] to-[#120726] border border-amber-400/30 rounded-lg h-20 flex items-center justify-center shadow-md overflow-hidden"
                    >
                      <span className={`text-4xl ${isSpinningSlots ? "animate-spin" : "animate-pop-gift"}`}>
                        {symbol}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Slot Result */}
              {lastSlotWin !== null && (
                <div className="w-full text-center">
                  {lastSlotWin > 0 ? (
                    <p className="text-xs font-black text-emerald-400 uppercase tracking-wider font-mono animate-pulse">
                      🎉 SLOTS WIN: +{lastSlotWin.toLocaleString()} DIAMONDS TO EARNING WALLET!
                    </p>
                  ) : (
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider font-mono">
                      💥 No Match - Try Spinning Again!
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* COMMON FOOTER: BET SELECTOR & ACTION BUTTON */}
          {/* ========================================================= */}
          <div className="w-full space-y-3 pt-2 border-t border-white/10 shrink-0">
            {/* Bet Amount Selector */}
            <div className="space-y-1">
              <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center justify-between">
                <span>Select Bet Amount</span>
                <span className="text-pink-400 font-mono font-bold">{betAmount.toLocaleString()} Coins</span>
              </label>
              <div className="grid grid-cols-4 gap-1">
                {BET_OPTIONS.map(amt => (
                  <button
                    key={amt}
                    onClick={() => {
                      if (soundEnabled) playSoundEffect("click");
                      setBetAmount(amt);
                    }}
                    disabled={isSpinning || chestOpening || isSpinningSlots}
                    className={`py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
                      betAmount === amt
                        ? "bg-gradient-to-r from-amber-400 to-yellow-500 text-black shadow-md border border-amber-300 font-black scale-105"
                        : "bg-white/5 hover:bg-white/10 text-gray-300 border border-white/5"
                    }`}
                  >
                    {amt >= 1000000 ? `${amt / 1000000}M` : amt >= 1000 ? `${amt / 1000}k` : amt}
                  </button>
                ))}
              </div>
            </div>

            {/* MAIN PLAY BUTTON */}
            {activeTab === "wheel" && (
              <button
                onClick={handleSpinWheel}
                disabled={isSpinning}
                className="w-full py-3 bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 hover:brightness-110 active:scale-95 text-white font-black uppercase text-xs tracking-wider rounded-2xl shadow-[0_0_20px_rgba(255,0,127,0.5)] border border-pink-400 cursor-pointer flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4 animate-spin" />
                <span>{isSpinning ? "SPINNING WHEEL..." : `SPIN NOW (${betAmount.toLocaleString()} COINS)`}</span>
              </button>
            )}

            {activeTab === "slots" && (
              <button
                onClick={handleSpinSlots}
                disabled={isSpinningSlots}
                className="w-full py-3 bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600 hover:brightness-110 active:scale-95 text-black font-black uppercase text-xs tracking-wider rounded-2xl shadow-[0_0_20px_rgba(255,191,0,0.5)] border border-amber-300 cursor-pointer flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
              >
                <Zap className="w-4 h-4" />
                <span>{isSpinningSlots ? "SPINNING REELS..." : `SPIN SLOTS (${betAmount.toLocaleString()} COINS)`}</span>
              </button>
            )}
          </div>
        </div>

        {/* ℹ️ GAME ODDS CRITERIA POPUP MODAL */}
        {showCriteriaModal && (
          <div className="absolute inset-0 bg-black/95 backdrop-blur-md z-[110] p-5 flex flex-col justify-between text-left animate-fade-in">
            <div className="space-y-4 overflow-y-auto">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center space-x-2">
                  <Trophy className="w-5 h-5 text-amber-400" />
                  <h4 className="text-sm font-black text-white uppercase tracking-wider font-mono">Game System Rules & Fair Mechanics</h4>
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
                  <h5 className="font-bold text-amber-300 uppercase text-[11px] flex items-center space-x-1">
                    <Flame className="w-3.5 h-3.5 text-pink-400" />
                    <span>Dynamic Player Retention Engine</span>
                  </h5>
                  <ul className="text-[11px] text-gray-300 list-disc pl-4 space-y-1">
                    <li><strong>1st Time Player Guaranteed Win:</strong> Your very first game spin is guaranteed to land a winning payout!</li>
                    <li><strong>Under 1 Lakh (100k) Starter Boost:</strong> Plays under 100,000 coins enjoy elevated ~75% win rates to keep players hooked & playing!</li>
                    <li><strong>Tiered App Advantage Ratios:</strong>
                      <ul className="pl-3 text-[10px] text-gray-400 list-square space-y-0.5 mt-0.5">
                        <li>• 100k - 500k Tier: 40% User Win / 60% App Advantage</li>
                        <li>• 500k - 800k Tier: 35% User Win / 65% App Advantage</li>
                        <li>• 800k - 1M+ High Stakes: 30% User Win / 70% App Advantage</li>
                      </ul>
                    </li>
                    <li><strong>Anti-Frustration Safeguard:</strong> If you lose 2 games in a row, the 3rd game automatically guarantees a winning turn so players never feel stranded!</li>
                    <li><strong>Multi-Tier Wheel Prizes:</strong> Win small gifts (0.5x, 2x, 3x) and big gifts (4x, 5x, 10x Jackpot) with Try Again & Lose elements.</li>
                  </ul>
                </div>

                <div className="bg-black/40 border border-white/10 p-3 rounded-xl text-[10.5px] text-gray-300 space-y-1">
                  <span className="font-bold text-amber-400 block">💳 Two-Wallet System</span>
                  <p>• <strong>Gifting Wallet (Coins):</strong> Used to place all game bets & lost coins are deducted here.</p>
                  <p>• <strong>Earning Wallet (Diamonds):</strong> All game winning payouts & jackpots are credited directly here!</p>
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
