import React, { useState, useEffect, useRef } from "react";
import { Sparkles, Trophy, RotateCw, Volume2, VolumeX, ShieldCheck, Flame, Zap, ArrowLeft, Play, Coins, User } from "lucide-react";
import { UserProfile } from "../../types";
import { getProgressionFromCoins } from "../../levelUtils";

interface DragonTigerProps {
  user: UserProfile;
  setUser: React.Dispatch<React.SetStateAction<UserProfile>>;
  onBack: () => void;
  soundEnabled: boolean;
  onGameWin?: (coins: number, gameName: string) => void;
}

type BetTarget = "dragon" | "tiger" | "tie" | "suited_tie";

interface BetPlaced {
  target: BetTarget;
  amount: number;
}

interface Card {
  suit: "♠" | "♥" | "♣" | "♦";
  color: "red" | "black";
  rank: string;
  value: number;
}

const SUITS: ("♠" | "♥" | "♣" | "♦")[] = ["♠", "♥", "♣", "♦"];
const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

const generateRandomCard = (): Card => {
  const suit = SUITS[Math.floor(Math.random() * SUITS.length)];
  const rankIdx = Math.floor(Math.random() * RANKS.length);
  const rank = RANKS[rankIdx];
  const color = suit === "♥" || suit === "♦" ? "red" : "black";
  const value = rankIdx + 1; // Ace=1, King=13
  return { suit, color, rank, value };
};

const CHIP_VALUES = [50, 100, 500, 1000, 5000, 20000, 50000, 100000];

export const DragonTigerGame: React.FC<DragonTigerProps> = ({
  user,
  setUser,
  onBack,
  soundEnabled,
  onGameWin
}) => {
  const [selectedChip, setSelectedChip] = useState<number>(100);
  const [bets, setBets] = useState<{ [key in BetTarget]: number }>({
    dragon: 0,
    tiger: 0,
    tie: 0,
    suited_tie: 0
  });

  const [gameState, setGameState] = useState<"betting" | "dealing" | "revealing" | "result">("betting");
  const [countdown, setCountdown] = useState<number>(10);
  const [dragonCard, setDragonCard] = useState<Card | null>(null);
  const [tigerCard, setTigerCard] = useState<Card | null>(null);
  const [showDragonCard, setShowDragonCard] = useState<boolean>(false);
  const [showTigerCard, setShowTigerCard] = useState<boolean>(false);
  const [roundWinner, setRoundWinner] = useState<"dragon" | "tiger" | "tie" | "suited_tie" | null>(null);
  const [lastWinAmount, setLastWinAmount] = useState<number>(0);
  const [history, setHistory] = useState<("D" | "T" | "Tie")[]>(["D", "T", "T", "D", "Tie", "D", "T", "D"]);

  const totalBet = Object.values(bets).reduce((a, b) => a + b, 0);

  // Sound effect trigger
  const playSound = (freq: number, type: OscillatorType = "sine", duration: number = 0.1) => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {}
  };

  // Betting countdown timer
  useEffect(() => {
    let timer: any;
    if (gameState === "betting") {
      if (countdown > 0) {
        timer = setTimeout(() => setCountdown(prev => prev - 1), 1000);
      } else {
        startRound();
      }
    }
    return () => clearTimeout(timer);
  }, [gameState, countdown]);

  const handlePlaceBet = (target: BetTarget) => {
    if (gameState !== "betting") return;
    if (user.coins < selectedChip) {
      alert("❌ Insufficient Gifting Coins to place this chip bet!");
      return;
    }

    // Deduct coins & add XP
    setUser(prev => {
      const newXp = (prev.xp || 0) + selectedChip;
      const prog = getProgressionFromCoins(newXp);
      return {
        ...prev,
        coins: Math.max(0, (prev.coins || 0) - selectedChip),
        xp: newXp,
        userLevel: prog.level,
        level: prog.level,
        vipLevel: prog.vipLevel
      };
    });

    setBets(prev => ({
      ...prev,
      [target]: prev[target] + selectedChip
    }));

    playSound(520, "sine", 0.08);
  };

  const handleClearBets = () => {
    if (gameState !== "betting" || totalBet === 0) return;
    // Refund active bet to user coins
    setUser(prev => ({
      ...prev,
      coins: (prev.coins || 0) + totalBet
    }));
    setBets({ dragon: 0, tiger: 0, tie: 0, suited_tie: 0 });
    playSound(300, "triangle", 0.08);
  };

  const startRound = () => {
    setGameState("dealing");
    setShowDragonCard(false);
    setShowTigerCard(false);
    setRoundWinner(null);
    setLastWinAmount(0);

    // Generate Cards
    const dCard = generateRandomCard();
    let tCard = generateRandomCard();

    // Prevent identical card if not intended
    if (dCard.rank === tCard.rank && dCard.suit === tCard.suit) {
      tCard = generateRandomCard();
    }

    setDragonCard(dCard);
    setTigerCard(tCard);

    playSound(400, "triangle", 0.15);

    // Reveal Dragon Card first after 1.2s
    setTimeout(() => {
      setShowDragonCard(true);
      playSound(600, "sine", 0.1);

      // Reveal Tiger Card after 2.4s
      setTimeout(() => {
        setShowTigerCard(true);
        playSound(700, "sine", 0.15);

        // Calculate Winner
        setTimeout(() => {
          let winner: "dragon" | "tiger" | "tie" | "suited_tie" = "dragon";
          if (dCard.value > tCard.value) {
            winner = "dragon";
          } else if (tCard.value > dCard.value) {
            winner = "tiger";
          } else {
            if (dCard.suit === tCard.suit) {
              winner = "suited_tie";
            } else {
              winner = "tie";
            }
          }

          setRoundWinner(winner);
          setHistory(prev => [winner === "dragon" ? "D" : winner === "tiger" ? "T" : "Tie", ...prev.slice(0, 15)]);

          // Calculate user payout
          let payout = 0;
          if (winner === "dragon" && bets.dragon > 0) {
            payout += bets.dragon * 2; // 1:1 payout + original bet returned
          }
          if (winner === "tiger" && bets.tiger > 0) {
            payout += bets.tiger * 2;
          }
          if ((winner === "tie" || winner === "suited_tie") && bets.tie > 0) {
            payout += bets.tie * 9; // 8:1 payout
          }
          if (winner === "suited_tie" && bets.suited_tie > 0) {
            payout += bets.suited_tie * 51; // 50:1 payout
          }

          // If Tie occurs, half of Dragon/Tiger bet is refunded
          if (winner === "tie" || winner === "suited_tie") {
            payout += Math.floor((bets.dragon + bets.tiger) * 0.5);
          }

          if (payout > 0) {
            setUser(prev => ({
              ...prev,
              diamonds: (prev.diamonds || 0) + payout
            }));
            setLastWinAmount(payout);
            playSound(900, "sine", 0.4);
            if (onGameWin) onGameWin(payout, "Dragon vs Tiger");
          } else {
            playSound(220, "sawtooth", 0.25);
          }

          setGameState("result");

          // Reset to next round after 4.5s
          setTimeout(() => {
            setBets({ dragon: 0, tiger: 0, tie: 0, suited_tie: 0 });
            setDragonCard(null);
            setTigerCard(null);
            setShowDragonCard(false);
            setShowTigerCard(false);
            setCountdown(10);
            setGameState("betting");
          }, 4500);

        }, 1000);
      }, 1400);
    }, 1200);
  };

  return (
    <div className="w-full h-full flex flex-col justify-between text-white select-none">
      {/* Header bar */}
      <div className="flex items-center justify-between pb-2 border-b border-white/10 shrink-0">
        <button
          onClick={onBack}
          className="flex items-center space-x-1 px-2.5 py-1 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold text-gray-200 transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Lobby</span>
        </button>

        <div className="text-center">
          <h3 className="text-sm font-black text-amber-400 uppercase tracking-wider font-mono flex items-center justify-center space-x-1.5">
            <span>🐉</span>
            <span>DRAGON vs TIGER</span>
            <span>🐅</span>
          </h3>
        </div>

        <div className="flex items-center space-x-1.5 text-right">
          <span className="text-[10px] text-amber-300 font-mono font-bold bg-black/40 px-2 py-1 rounded-lg border border-amber-500/30">
            🪙 {(user.coins || 0).toLocaleString()}
          </span>
        </div>
      </div>

      {/* Center Gaming Arena Table */}
      <div className="flex-1 flex flex-col justify-between my-2 relative">
        {/* Live Status & Countdown Banner */}
        <div className="flex items-center justify-between px-2">
          {/* History Beads */}
          <div className="flex items-center space-x-1 overflow-x-auto py-1 max-w-[200px] scrollbar-none">
            {history.map((res, i) => (
              <span
                key={i}
                className={`w-4.5 h-4.5 rounded-full flex items-center justify-center text-[8px] font-black font-mono shrink-0 shadow-md ${
                  res === "D"
                    ? "bg-red-600 text-white border border-red-400"
                    : res === "T"
                    ? "bg-amber-500 text-black border border-amber-300"
                    : "bg-emerald-600 text-white border border-emerald-400"
                }`}
              >
                {res}
              </span>
            ))}
          </div>

          {/* Status badge */}
          <div className="text-right">
            {gameState === "betting" ? (
              <span className="bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold animate-pulse">
                ⏳ Betting: {countdown}s
              </span>
            ) : gameState === "dealing" || gameState === "revealing" ? (
              <span className="bg-purple-950/80 border border-purple-500/50 text-purple-300 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold animate-pulse">
                🎴 Dealing Cards...
              </span>
            ) : (
              <span className="bg-amber-950/80 border border-amber-500/50 text-amber-300 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-black uppercase">
                🏆 {roundWinner === "dragon" ? "DRAGON WINS!" : roundWinner === "tiger" ? "TIGER WINS!" : "TIE!"}
              </span>
            )}
          </div>
        </div>

        {/* Card Battle Stage */}
        <div className="grid grid-cols-2 gap-4 my-2 px-3">
          {/* DRAGON SIDE */}
          <div className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all relative overflow-hidden ${
            roundWinner === "dragon"
              ? "bg-red-950/80 border-red-400 shadow-[0_0_25px_rgba(239,68,68,0.6)] scale-102"
              : "bg-gradient-to-b from-[#2a0d14] to-[#14060a] border-red-500/40"
          }`}>
            <div className="flex items-center space-x-1 text-red-400 mb-1">
              <span className="text-lg">🐉</span>
              <span className="font-black text-xs uppercase tracking-wider font-mono">DRAGON</span>
            </div>

            {/* Dragon Card Box */}
            <div className="w-18 h-26 rounded-xl border-2 border-white/20 bg-black/60 flex items-center justify-center relative shadow-inner overflow-hidden">
              {showDragonCard && dragonCard ? (
                <div className={`w-full h-full bg-white rounded-lg flex flex-col justify-between p-1.5 animate-pop-gift ${
                  dragonCard.color === "red" ? "text-red-600" : "text-gray-900"
                }`}>
                  <div className="text-left font-black text-xs leading-none">
                    {dragonCard.rank}
                    <div className="text-[10px]">{dragonCard.suit}</div>
                  </div>
                  <div className="text-center text-xl font-bold">{dragonCard.suit}</div>
                  <div className="text-right font-black text-xs leading-none rotate-180">
                    {dragonCard.rank}
                    <div className="text-[10px]">{dragonCard.suit}</div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-red-500/40">
                  <span className="text-2xl">🂠</span>
                  <span className="text-[8px] font-mono">DRAGON</span>
                </div>
              )}
            </div>

            {roundWinner === "dragon" && (
              <span className="text-[10px] font-black text-yellow-300 font-mono uppercase mt-1 animate-bounce">
                👑 WINNER
              </span>
            )}
          </div>

          {/* TIGER SIDE */}
          <div className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all relative overflow-hidden ${
            roundWinner === "tiger"
              ? "bg-amber-950/80 border-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.6)] scale-102"
              : "bg-gradient-to-b from-[#2a1d08] to-[#140e04] border-amber-500/40"
          }`}>
            <div className="flex items-center space-x-1 text-amber-400 mb-1">
              <span className="text-lg">🐅</span>
              <span className="font-black text-xs uppercase tracking-wider font-mono">TIGER</span>
            </div>

            {/* Tiger Card Box */}
            <div className="w-18 h-26 rounded-xl border-2 border-white/20 bg-black/60 flex items-center justify-center relative shadow-inner overflow-hidden">
              {showTigerCard && tigerCard ? (
                <div className={`w-full h-full bg-white rounded-lg flex flex-col justify-between p-1.5 animate-pop-gift ${
                  tigerCard.color === "red" ? "text-red-600" : "text-gray-900"
                }`}>
                  <div className="text-left font-black text-xs leading-none">
                    {tigerCard.rank}
                    <div className="text-[10px]">{tigerCard.suit}</div>
                  </div>
                  <div className="text-center text-xl font-bold">{tigerCard.suit}</div>
                  <div className="text-right font-black text-xs leading-none rotate-180">
                    {tigerCard.rank}
                    <div className="text-[10px]">{tigerCard.suit}</div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-amber-500/40">
                  <span className="text-2xl">🂠</span>
                  <span className="text-[8px] font-mono">TIGER</span>
                </div>
              )}
            </div>

            {roundWinner === "tiger" && (
              <span className="text-[10px] font-black text-yellow-300 font-mono uppercase mt-1 animate-bounce">
                👑 WINNER
              </span>
            )}
          </div>
        </div>

        {/* Win Banner Announcement */}
        {lastWinAmount > 0 && (
          <div className="mx-4 p-2 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 rounded-xl text-black font-black text-center text-xs shadow-[0_0_20px_rgba(255,215,0,0.8)] animate-bounce font-mono">
            🎉 YOU WON +{lastWinAmount.toLocaleString()} DIAMONDS TO EARNING WALLET!
          </div>
        )}

        {/* Betting Board Target Grid */}
        <div className="grid grid-cols-3 gap-2 px-2 my-2">
          {/* DRAGON (1:1) */}
          <button
            onClick={() => handlePlaceBet("dragon")}
            disabled={gameState !== "betting"}
            className={`p-2.5 rounded-xl border-2 flex flex-col items-center justify-center transition-all cursor-pointer relative ${
              bets.dragon > 0
                ? "bg-red-900/60 border-red-400 shadow-[0_0_15px_rgba(239,68,68,0.4)]"
                : "bg-red-950/40 hover:bg-red-900/40 border-red-500/30"
            }`}
          >
            <span className="text-[11px] font-black text-red-300 uppercase font-mono">DRAGON</span>
            <span className="text-[8.5px] text-gray-400 font-mono">1 : 1</span>
            {bets.dragon > 0 && (
              <span className="mt-1 px-2 py-0.5 bg-red-600 text-white rounded-full text-[9px] font-black font-mono shadow">
                🪙 {bets.dragon.toLocaleString()}
              </span>
            )}
          </button>

          {/* TIE (1:8) */}
          <button
            onClick={() => handlePlaceBet("tie")}
            disabled={gameState !== "betting"}
            className={`p-2.5 rounded-xl border-2 flex flex-col items-center justify-center transition-all cursor-pointer relative ${
              bets.tie > 0
                ? "bg-emerald-900/60 border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.4)]"
                : "bg-emerald-950/40 hover:bg-emerald-900/40 border-emerald-500/30"
            }`}
          >
            <span className="text-[11px] font-black text-emerald-300 uppercase font-mono">TIE</span>
            <span className="text-[8.5px] text-gray-400 font-mono">1 : 8</span>
            {bets.tie > 0 && (
              <span className="mt-1 px-2 py-0.5 bg-emerald-600 text-white rounded-full text-[9px] font-black font-mono shadow">
                🪙 {bets.tie.toLocaleString()}
              </span>
            )}
          </button>

          {/* TIGER (1:1) */}
          <button
            onClick={() => handlePlaceBet("tiger")}
            disabled={gameState !== "betting"}
            className={`p-2.5 rounded-xl border-2 flex flex-col items-center justify-center transition-all cursor-pointer relative ${
              bets.tiger > 0
                ? "bg-amber-900/60 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.4)]"
                : "bg-amber-950/40 hover:bg-amber-900/40 border-amber-500/30"
            }`}
          >
            <span className="text-[11px] font-black text-amber-300 uppercase font-mono">TIGER</span>
            <span className="text-[8.5px] text-gray-400 font-mono">1 : 1</span>
            {bets.tiger > 0 && (
              <span className="mt-1 px-2 py-0.5 bg-amber-600 text-white rounded-full text-[9px] font-black font-mono shadow">
                🪙 {bets.tiger.toLocaleString()}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Chip Selector & Action Bar */}
      <div className="space-y-2 pt-2 border-t border-white/10 shrink-0">
        <div className="flex items-center justify-between text-[10px] text-gray-400 font-bold px-1">
          <span>Select Chip Value</span>
          <span className="text-amber-400 font-mono">Total Bet: {totalBet.toLocaleString()} Coins</span>
        </div>

        {/* Chips row */}
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-1">
          {CHIP_VALUES.map(chip => (
            <button
              key={chip}
              onClick={() => setSelectedChip(chip)}
              className={`py-1 rounded-xl text-[9.5px] font-mono font-black transition-all cursor-pointer flex items-center justify-center ${
                selectedChip === chip
                  ? "bg-gradient-to-r from-amber-400 to-yellow-500 text-black border border-amber-200 scale-105 shadow-md"
                  : "bg-white/10 hover:bg-white/20 text-gray-300 border border-white/5"
              }`}
            >
              {chip >= 1000000 ? `${chip / 1000000}M` : chip >= 1000 ? `${chip / 1000}k` : chip}
            </button>
          ))}
        </div>

        {/* Clear Bet Button */}
        {totalBet > 0 && gameState === "betting" && (
          <button
            onClick={handleClearBets}
            className="w-full py-1.5 bg-white/10 hover:bg-white/20 text-gray-300 font-bold text-[10px] rounded-xl border border-white/10 cursor-pointer"
          >
            Clear Active Bets ({totalBet.toLocaleString()} Coins)
          </button>
        )}
      </div>
    </div>
  );
};
