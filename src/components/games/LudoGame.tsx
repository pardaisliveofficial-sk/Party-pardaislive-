import React, { useState, useEffect, useRef } from "react";
import { getInitialAvatarData } from "../../lib/avatarFallback";
import { ArrowLeft, Sparkles, Trophy, RotateCw, Volume2, Users, Bot, ShieldCheck } from "lucide-react";
import { UserProfile } from "../../types";
import { InGameVoiceChat } from "./InGameVoiceChat";
import { getProgressionFromCoins } from "../../levelUtils";

interface LudoGameProps {
  user: UserProfile;
  setUser: React.Dispatch<React.SetStateAction<UserProfile>>;
  onBack: () => void;
  soundEnabled: boolean;
  stakeCoins: number;
  opponentName?: string;
  opponentAvatar?: string;
  onGameWin?: (coins: number, gameName: string) => void;
}

interface Player {
  id: "red" | "green" | "yellow" | "blue";
  name: string;
  avatar: string;
  color: string;
  bgGrad: string;
  tokens: number[]; // position of each token: -1 = in yard, 0-51 = path, 100+ = home stretch, 999 = finished
  isBot?: boolean;
}

export const LudoGame: React.FC<LudoGameProps> = ({
  user,
  setUser,
  onBack,
  soundEnabled,
  stakeCoins,
  opponentName = "Challenger_Pro",
  opponentAvatar = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&h=100&q=80",
  onGameWin
}) => {
  const [players, setPlayers] = useState<Player[]>([
    {
      id: "red",
      name: user.username || "You",
      avatar: user.avatar || getInitialAvatarData(user.fullName || user.username),
      color: "#ef4444",
      bgGrad: "from-red-600 to-rose-700",
      tokens: [-1, -1, 0, 4] // Start with 2 tokens on track for fast & fun action!
    },
    {
      id: "green",
      name: opponentName,
      avatar: opponentAvatar,
      color: "#10b981",
      bgGrad: "from-emerald-600 to-green-700",
      tokens: [-1, -1, 13, 17],
      isBot: true
    }
  ]);

  const [currentTurnIdx, setCurrentTurnIdx] = useState<number>(0);
  const [diceValue, setDiceValue] = useState<number>(6);
  const [isRolling, setIsRolling] = useState<boolean>(false);
  const [turnMessage, setTurnMessage] = useState<string>("Roll the dice to start your move!");
  const [winner, setWinner] = useState<Player | null>(null);

  const activePlayer = players[currentTurnIdx];
  const isMyTurn = currentTurnIdx === 0;

  // Sound generator
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

  // Bot auto-play logic
  useEffect(() => {
    if (!isMyTurn && !winner && !isRolling) {
      const botTimer = setTimeout(() => {
        handleRollDice(true);
      }, 1200);
      return () => clearTimeout(botTimer);
    }
  }, [currentTurnIdx, winner, isRolling]);

  const handleRollDice = (isBotAction = false) => {
    if (isRolling || winner) return;
    if (!isBotAction && !isMyTurn) return;

    setIsRolling(true);
    playSound(400, "triangle", 0.15);

    let rollCount = 0;
    const interval = setInterval(() => {
      rollCount++;
      setDiceValue(Math.floor(Math.random() * 6) + 1);
      if (rollCount > 8) {
        clearInterval(interval);
        const finalDice = Math.floor(Math.random() * 6) + 1;
        setDiceValue(finalDice);
        setIsRolling(false);
        playSound(650, "sine", 0.1);

        // Process Move
        processTurnMove(finalDice);
      }
    }, 60);
  };

  const processTurnMove = (rolledNum: number) => {
    const p = players[currentTurnIdx];
    let tokenMoved = false;

    // Find best token to move
    const newTokens = [...p.tokens];

    // Priority 1: If rolled 6 and token in yard, move it out to path
    if (rolledNum === 6) {
      const yardIdx = newTokens.findIndex(pos => pos === -1);
      if (yardIdx !== -1) {
        newTokens[yardIdx] = p.id === "red" ? 0 : 13;
        tokenMoved = true;
        setTurnMessage(`${p.name} unlocked a token from yard with a 6! 🎲 (Extra Roll!)`);
      }
    }

    // Priority 2: Move active token on path forward
    if (!tokenMoved) {
      for (let i = 0; i < newTokens.length; i++) {
        if (newTokens[i] >= 0 && newTokens[i] < 52) {
          const nextPos = newTokens[i] + rolledNum;
          newTokens[i] = nextPos >= 52 ? 999 : nextPos;
          tokenMoved = true;

          // Check Token Cutting (landing on opponent)
          const opponentIdx = currentTurnIdx === 0 ? 1 : 0;
          const oppTokens = [...players[opponentIdx].tokens];
          const hitIdx = oppTokens.findIndex(pos => pos === nextPos && pos !== 0 && pos !== 13 && pos !== 26 && pos !== 39); // safe spots

          if (hitIdx !== -1) {
            oppTokens[hitIdx] = -1; // Cut! Send back to yard
            setTurnMessage(`⚔️ ${p.name} CAPTURED opponent's token and earned an extra roll!`);
            playSound(900, "triangle", 0.3);
            setPlayers(prev => prev.map((pl, idx) => idx === opponentIdx ? { ...pl, tokens: oppTokens } : pl));
          } else {
            setTurnMessage(`${p.name} moved token ${rolledNum} steps!`);
          }
          break;
        }
      }
    }

    // Check Win condition (all tokens reached home)
    setPlayers(prev => prev.map((pl, idx) => idx === currentTurnIdx ? { ...pl, tokens: newTokens } : pl));
    if (newTokens.every(pos => pos === 999)) {
      setTimeout(() => handleEndGameWin(p), 250);
      return;
    }

    // Next turn logic (Rolled 6 gives extra turn)
    if (rolledNum !== 6) {
      setTimeout(() => {
        setCurrentTurnIdx(prev => (prev + 1) % players.length);
      }, 1000);
    }
  };

  const handleEndGameWin = (winningPlayer: Player) => {
    setWinner(winningPlayer);
    const prize = stakeCoins * 2;
    if (winningPlayer.id === "red") {
      setUser(prev => ({
        ...prev,
        diamonds: (prev.diamonds || 0) + prize
      }));
      playSound(880, "sine", 0.5);
      if (onGameWin) onGameWin(prize, "Ludo King");
    }
  };

  return (
    <div className="w-full h-full flex flex-col justify-between text-white select-none">
      {/* Top Bar */}
      <div className="flex items-center justify-between pb-2 border-b border-white/10 shrink-0">
        <button
          onClick={onBack}
          className="flex items-center space-x-1 px-2.5 py-1 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold text-gray-200 transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Exit Game</span>
        </button>

        <div className="text-center">
          <h3 className="text-sm font-black text-amber-400 uppercase tracking-wider font-mono flex items-center justify-center space-x-1.5">
            <span>🎲</span>
            <span>PARTY LUDO KING</span>
            <span>👑</span>
          </h3>
        </div>

        <div className="flex items-center space-x-1.5 text-right">
          <span className="text-[10px] text-amber-300 font-mono font-bold bg-black/40 px-2 py-1 rounded-lg border border-amber-500/30">
            Prize: {(stakeCoins * 2).toLocaleString()} 💎
          </span>
        </div>
      </div>

      {/* Players Header Bar */}
      <div className="grid grid-cols-2 gap-3 my-1.5 px-2">
        {players.map((p, idx) => (
          <div
            key={p.id}
            className={`p-2 rounded-2xl border-2 flex items-center space-x-2.5 transition-all ${
              currentTurnIdx === idx
                ? "bg-white/15 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.5)] scale-102"
                : "bg-black/40 border-white/5 opacity-70"
            }`}
          >
            <div className="relative">
              <img
                src={p.avatar}
                alt={p.name}
                className="w-9 h-9 rounded-full object-cover border-2"
                style={{ borderColor: p.color }}
              />
              {currentTurnIdx === idx && (
                <span className="absolute -top-1.5 -right-1.5 text-xs animate-bounce">🎲</span>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-black text-white truncate">{p.name}</p>
              <p className="text-[8.5px] font-mono font-bold" style={{ color: p.color }}>
                {currentTurnIdx === idx ? "⚡ CURRENT TURN" : "Waiting..."}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Center Ludo 4-Color Board Stage */}
      <div className="flex-1 flex flex-col items-center justify-center relative my-1">
        <div className="w-68 h-68 sm:w-76 sm:h-76 bg-[#fffbf0] rounded-2xl border-4 border-[#2b1810] shadow-[0_0_30px_rgba(0,0,0,0.8)] relative p-1.5 flex flex-col justify-between overflow-hidden">
          {/* Top Row Quadrants: Red Home Yard (Top Left) & Green Home Yard (Top Right) */}
          <div className="flex justify-between w-full h-[38%]">
            {/* RED YARD */}
            <div className="w-[38%] h-full bg-[#ef4444] rounded-xl p-1.5 border-2 border-[#b91c1c] flex flex-col justify-between shadow-inner">
              <span className="text-[8px] font-black text-white font-mono uppercase text-center">YOU (RED)</span>
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-white/30 rounded-lg">
                {players[0].tokens.map((pos, i) => (
                  <div
                    key={i}
                    className={`w-4.5 h-4.5 rounded-full border-2 border-white flex items-center justify-center text-[7px] font-bold shadow ${
                      pos === -1 ? "bg-red-600 animate-pulse" : "bg-white/40 text-red-950"
                    }`}
                  >
                    {pos === -1 ? "🔴" : "✓"}
                  </div>
                ))}
              </div>
            </div>

            {/* Top Center Track Corridor */}
            <div className="w-[20%] h-full grid grid-rows-6 grid-cols-3 gap-0.5 border border-gray-300 p-0.5 bg-gray-100">
              {Array.from({ length: 18 }).map((_, i) => (
                <div key={i} className={`rounded-[2px] border border-gray-300 ${i % 3 === 1 ? "bg-emerald-400" : "bg-white"}`} />
              ))}
            </div>

            {/* GREEN YARD */}
            <div className="w-[38%] h-full bg-[#10b981] rounded-xl p-1.5 border-2 border-[#047857] flex flex-col justify-between shadow-inner">
              <span className="text-[8px] font-black text-white font-mono uppercase text-center">{players[1].name} (GREEN)</span>
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-white/30 rounded-lg">
                {players[1].tokens.map((pos, i) => (
                  <div
                    key={i}
                    className={`w-4.5 h-4.5 rounded-full border-2 border-white flex items-center justify-center text-[7px] font-bold shadow ${
                      pos === -1 ? "bg-emerald-600 animate-pulse" : "bg-white/40 text-emerald-950"
                    }`}
                  >
                    {pos === -1 ? "🟢" : "✓"}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Middle Row: Left Path, Center Triangle Finish, Right Path */}
          <div className="flex justify-between items-center w-full h-[24%]">
            {/* Left Corridor */}
            <div className="w-[38%] h-full grid grid-cols-6 grid-rows-3 gap-0.5 border border-gray-300 p-0.5 bg-gray-100">
              {Array.from({ length: 18 }).map((_, i) => (
                <div key={i} className={`rounded-[2px] border border-gray-300 ${Math.floor(i / 6) === 1 ? "bg-red-400" : "bg-white"}`} />
              ))}
            </div>

            {/* Center Golden Finish Triangle */}
            <div className="w-[20%] h-full bg-gradient-to-tr from-amber-400 via-yellow-300 to-amber-500 rounded-lg border-2 border-amber-600 flex items-center justify-center shadow-lg">
              <span className="text-xl animate-bounce">👑</span>
            </div>

            {/* Right Corridor */}
            <div className="w-[38%] h-full grid grid-cols-6 grid-rows-3 gap-0.5 border border-gray-300 p-0.5 bg-gray-100">
              {Array.from({ length: 18 }).map((_, i) => (
                <div key={i} className={`rounded-[2px] border border-gray-300 ${Math.floor(i / 6) === 1 ? "bg-emerald-400" : "bg-white"}`} />
              ))}
            </div>
          </div>

          {/* Bottom Row Quadrants: Blue & Yellow Yards */}
          <div className="flex justify-between w-full h-[38%]">
            {/* BLUE YARD */}
            <div className="w-[38%] h-full bg-[#3b82f6] rounded-xl p-1.5 border-2 border-[#1d4ed8] flex flex-col justify-between shadow-inner">
              <span className="text-[8px] font-black text-white font-mono uppercase text-center">BLUE ZONE</span>
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-white/30 rounded-lg">
                <div className="w-4.5 h-4.5 rounded-full bg-blue-600 border border-white flex items-center justify-center text-[7px]">🔵</div>
                <div className="w-4.5 h-4.5 rounded-full bg-blue-600 border border-white flex items-center justify-center text-[7px]">🔵</div>
                <div className="w-4.5 h-4.5 rounded-full bg-blue-600 border border-white flex items-center justify-center text-[7px]">🔵</div>
                <div className="w-4.5 h-4.5 rounded-full bg-blue-600 border border-white flex items-center justify-center text-[7px]">🔵</div>
              </div>
            </div>

            {/* Bottom Center Track Corridor */}
            <div className="w-[20%] h-full grid grid-rows-6 grid-cols-3 gap-0.5 border border-gray-300 p-0.5 bg-gray-100">
              {Array.from({ length: 18 }).map((_, i) => (
                <div key={i} className={`rounded-[2px] border border-gray-300 ${i % 3 === 1 ? "bg-yellow-400" : "bg-white"}`} />
              ))}
            </div>

            {/* YELLOW YARD */}
            <div className="w-[38%] h-full bg-[#eab308] rounded-xl p-1.5 border-2 border-[#a16207] flex flex-col justify-between shadow-inner">
              <span className="text-[8px] font-black text-black font-mono uppercase text-center">YELLOW ZONE</span>
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-white/30 rounded-lg">
                <div className="w-4.5 h-4.5 rounded-full bg-yellow-500 border border-black flex items-center justify-center text-[7px]">🟡</div>
                <div className="w-4.5 h-4.5 rounded-full bg-yellow-500 border border-black flex items-center justify-center text-[7px]">🟡</div>
                <div className="w-4.5 h-4.5 rounded-full bg-yellow-500 border border-black flex items-center justify-center text-[7px]">🟡</div>
                <div className="w-4.5 h-4.5 rounded-full bg-yellow-500 border border-black flex items-center justify-center text-[7px]">🟡</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Turn Action & 3D Rolling Dice Console */}
      <div className="space-y-2 pt-1 border-t border-white/10 shrink-0">
        <p className="text-[10px] text-center text-amber-300 font-mono font-bold animate-pulse">
          {turnMessage}
        </p>

        <div className="flex items-center justify-between gap-3 px-2">
          {/* Interactive Dice */}
          <button
            onClick={() => handleRollDice(false)}
            disabled={!isMyTurn || isRolling}
            className={`flex-1 py-3 rounded-2xl border-2 flex items-center justify-center space-x-3 transition-all cursor-pointer ${
              isMyTurn
                ? "bg-gradient-to-r from-red-600 via-rose-600 to-red-700 border-red-300 shadow-[0_0_20px_rgba(239,68,68,0.6)] active:scale-95 animate-pulse"
                : "bg-gray-800 border-gray-700 opacity-60 cursor-not-allowed"
            }`}
          >
            <div className={`w-9 h-9 rounded-xl bg-white text-black font-black text-xl flex items-center justify-center shadow-lg border-2 border-amber-300 ${
              isRolling ? "animate-spin" : "animate-bounce"
            }`}>
              {diceValue === 1 ? "⚀" : diceValue === 2 ? "⚁" : diceValue === 3 ? "⚂" : diceValue === 4 ? "⚃" : diceValue === 5 ? "⚄" : "⚅"}
            </div>
            <span className="font-black text-xs uppercase font-mono tracking-wider text-white">
              {isRolling ? "ROLLING DICE..." : isMyTurn ? `ROLL DICE (${diceValue})` : `${players[1].name}'s Turn...`}
            </span>
          </button>

        </div>

        {/* Private In-Game Room Voice & Chat Bar */}
        <InGameVoiceChat
          currentUser={user}
          players={[
            { username: user.username, avatar: user.avatar, isTalking: isMyTurn },
            { username: opponentName, avatar: opponentAvatar, isTalking: !isMyTurn }
          ]}
          gameName="Party Ludo"
        />
      </div>
    </div>
  );
};
