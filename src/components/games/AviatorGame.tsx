import React, { useState, useEffect, useRef } from "react";
import { ArrowLeft, Sparkles, Zap, Flame, Trophy, Play, CheckCircle2, RotateCw } from "lucide-react";
import { UserProfile } from "../../types";
import { getProgressionFromCoins } from "../../levelUtils";

interface AviatorGameProps {
  user: UserProfile;
  setUser: React.Dispatch<React.SetStateAction<UserProfile>>;
  onBack: () => void;
  soundEnabled: boolean;
  onGameWin?: (coins: number, gameName: string) => void;
}

const BET_PRESETS = [50, 100, 500, 1000, 5000, 10000, 50000, 100000];

export const AviatorGame: React.FC<AviatorGameProps> = ({
  user,
  setUser,
  onBack,
  soundEnabled,
  onGameWin
}) => {
  const [betAmount, setBetAmount] = useState<number>(100);
  const [autoCashoutMult, setAutoCashoutMult] = useState<number | null>(null);
  const [gameState, setGameState] = useState<"waiting" | "flying" | "crashed">("waiting");
  const [currentMultiplier, setCurrentMultiplier] = useState<number>(1.0);
  const [hasBet, setHasBet] = useState<boolean>(false);
  const [hasCashedOut, setHasCashedOut] = useState<boolean>(false);
  const [cashoutProfit, setCashoutProfit] = useState<number>(0);
  const [cashoutMult, setCashoutMult] = useState<number>(0);
  const [waitingCountdown, setWaitingCountdown] = useState<number>(5);
  const [history, setHistory] = useState<number[]>([1.45, 2.80, 1.15, 6.40, 1.88, 12.5, 2.10, 1.05]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const crashPointRef = useRef<number>(2.0);
  const startTimeRef = useRef<number>(0);

  // Web Audio synth sound generator
  const playTone = (freq: number, type: OscillatorType = "sine", duration: number = 0.1) => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {}
  };

  // Generate weighted crash multiplier
  const generateCrashPoint = (): number => {
    const rand = Math.random();
    if (rand < 0.10) return 1.00 + Number((Math.random() * 0.20).toFixed(2)); // Instant 1.00x - 1.20x crash
    if (rand < 0.60) return 1.20 + Number((Math.random() * 1.80).toFixed(2)); // 1.20x - 3.00x
    if (rand < 0.85) return 3.00 + Number((Math.random() * 5.00).toFixed(2)); // 3.00x - 8.00x
    if (rand < 0.95) return 8.00 + Number((Math.random() * 15.00).toFixed(2)); // 8.00x - 23.00x
    return 25.00 + Number((Math.random() * 75.00).toFixed(2)); // Mega 25x - 100x
  };

  // Main game loop controller
  useEffect(() => {
    let countdownInterval: any;
    if (gameState === "waiting") {
      setWaitingCountdown(5);
      countdownInterval = setInterval(() => {
        setWaitingCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            launchPlane();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(countdownInterval);
  }, [gameState]);

  const launchPlane = () => {
    const crashAt = generateCrashPoint();
    crashPointRef.current = crashAt;
    setGameState("flying");
    setCurrentMultiplier(1.0);
    setHasCashedOut(false);
    setCashoutProfit(0);
    startTimeRef.current = performance.now();
    playTone(300, "triangle", 0.3);
  };

  // Canvas & Flight physics loop
  useEffect(() => {
    if (gameState !== "flying") return;

    let isRunning = true;

    const renderLoop = (time: number) => {
      if (!isRunning) return;

      const elapsedSec = (time - startTimeRef.current) / 1000;
      // Exponential curve: multiplier = e^(0.18 * t)
      const calculatedMult = Number(Math.max(1.0, Math.pow(Math.E, 0.18 * elapsedSec)).toFixed(2));

      // Check if crash happened
      if (calculatedMult >= crashPointRef.current) {
        setCurrentMultiplier(crashPointRef.current);
        setGameState("crashed");
        setHistory(prev => [crashPointRef.current, ...prev.slice(0, 15)]);
        playTone(150, "sawtooth", 0.4);

        // Reset for next round after 3.5s
        setTimeout(() => {
          setHasBet(false);
          setGameState("waiting");
        }, 3500);
        return;
      }

      setCurrentMultiplier(calculatedMult);

      // Check Auto-cashout
      if (hasBet && !hasCashedOut && autoCashoutMult && calculatedMult >= autoCashoutMult) {
        handleCashout(calculatedMult);
      }

      // Draw flight on canvas
      drawFlightCanvas(calculatedMult, elapsedSec);

      animationFrameRef.current = requestAnimationFrame(renderLoop);
    };

    animationFrameRef.current = requestAnimationFrame(renderLoop);

    return () => {
      isRunning = false;
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [gameState, hasBet, hasCashedOut, autoCashoutMult]);

  const drawFlightCanvas = (mult: number, elapsed: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    // Draw background grid lines
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Trajectory curve
    const progress = Math.min(1.0, elapsed / 8.0);
    const startX = 20;
    const startY = h - 25;
    const endX = startX + (w - 70) * Math.min(1.0, progress * 1.2);
    const endY = startY - (h - 70) * Math.pow(progress, 0.85);

    // Red glow gradient under flight path
    const grad = ctx.createLinearGradient(0, endY, 0, h);
    grad.addColorStop(0, "rgba(239, 68, 68, 0.35)");
    grad.addColorStop(1, "rgba(239, 68, 68, 0.0)");

    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.quadraticCurveTo(startX + (endX - startX) * 0.5, startY, endX, endY);
    ctx.lineTo(endX, startY);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Red flight line
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.quadraticCurveTo(startX + (endX - startX) * 0.5, startY, endX, endY);
    ctx.strokeStyle = "#ef4444";
    ctx.lineWidth = 3.5;
    ctx.shadowColor = "#ef4444";
    ctx.shadowBlur = 12;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Draw Rocket / Jet at end point
    ctx.save();
    ctx.translate(endX, endY);
    ctx.rotate(-Math.PI / 6); // tilt upward
    ctx.font = "24px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("🚀", 0, 0);
    ctx.restore();
  };

  const handlePlaceBet = () => {
    if (gameState !== "waiting" && gameState !== "flying") return;
    if (hasBet) return;
    if (user.coins < betAmount) {
      alert(`❌ Insufficient Coins! You need ${betAmount.toLocaleString()} Coins to place this flight bet.`);
      return;
    }

    // Deduct coins & level progress
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

    setHasBet(true);
    playTone(550, "sine", 0.1);
  };

  const handleCashout = (forcedMult?: number) => {
    if (!hasBet || hasCashedOut || gameState !== "flying") return;
    const finalMult = forcedMult || currentMultiplier;
    const winAmount = Math.floor(betAmount * finalMult);
    const profit = winAmount - betAmount;

    setHasCashedOut(true);
    setCashoutMult(finalMult);
    setCashoutProfit(winAmount);

    // Credit to diamonds earning wallet
    setUser(prev => ({
      ...prev,
      diamonds: (prev.diamonds || 0) + winAmount
    }));

    playTone(880, "triangle", 0.35);
    if (onGameWin) onGameWin(winAmount, "Aviator");
  };

  return (
    <div className="w-full h-full flex flex-col justify-between text-white select-none">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-2 border-b border-white/10 shrink-0">
        <button
          onClick={onBack}
          className="flex items-center space-x-1 px-2.5 py-1 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold text-gray-200 transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Lobby</span>
        </button>

        <div className="text-center">
          <h3 className="text-sm font-black text-rose-500 uppercase tracking-wider font-mono flex items-center justify-center space-x-1.5">
            <span>🚀</span>
            <span>AVIATOR CRASH</span>
            <span>💥</span>
          </h3>
        </div>

        <div className="flex items-center space-x-1.5 text-right">
          <span className="text-[10px] text-amber-300 font-mono font-bold bg-black/40 px-2 py-1 rounded-lg border border-amber-500/30">
            🪙 {(user.coins || 0).toLocaleString()}
          </span>
        </div>
      </div>

      {/* History Ribbon of Previous Busts */}
      <div className="flex items-center space-x-1.5 overflow-x-auto py-1 my-1 px-1 scrollbar-none bg-black/30 rounded-xl border border-white/5">
        <span className="text-[8px] text-gray-500 font-bold uppercase tracking-wider pl-1 shrink-0 font-mono">History:</span>
        {history.map((h, i) => (
          <span
            key={i}
            className={`px-2 py-0.5 rounded-md text-[9px] font-mono font-bold shrink-0 shadow ${
              h >= 10
                ? "bg-purple-900/90 text-purple-200 border border-purple-400"
                : h >= 2
                ? "bg-emerald-900/90 text-emerald-200 border border-emerald-400"
                : "bg-red-950/90 text-red-300 border border-red-500/50"
            }`}
          >
            {h.toFixed(2)}x
          </span>
        ))}
      </div>

      {/* Main Flight Arena Window */}
      <div className="flex-1 w-full bg-[#0a0c16] rounded-2xl border-2 border-red-900/50 relative overflow-hidden flex flex-col items-center justify-center shadow-[0_0_30px_rgba(239,68,68,0.15)] my-1">
        <canvas
          ref={canvasRef}
          width={380}
          height={200}
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Live Multiplier Display in Center */}
        <div className="relative z-10 text-center flex flex-col items-center justify-center">
          {gameState === "waiting" ? (
            <div className="space-y-1 animate-pulse">
              <span className="text-3xl block">🚀</span>
              <p className="text-sm font-black text-rose-400 uppercase font-mono tracking-widest">
                NEXT FLIGHT IN {waitingCountdown}s
              </p>
              <div className="w-36 h-1.5 bg-white/10 rounded-full overflow-hidden mx-auto">
                <div
                  className="h-full bg-rose-500 transition-all duration-1000 ease-linear"
                  style={{ width: `${((5 - waitingCountdown) / 5) * 100}%` }}
                />
              </div>
            </div>
          ) : gameState === "flying" ? (
            <div className="space-y-0.5">
              <div className="text-4xl sm:text-5xl font-black font-mono tracking-tighter text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.8)]">
                {currentMultiplier.toFixed(2)}<span className="text-rose-500">x</span>
              </div>
              <p className="text-[10px] text-rose-300 uppercase font-mono font-bold tracking-wider animate-pulse">
                FLIGHT IN PROGRESS...
              </p>
            </div>
          ) : (
            <div className="space-y-1 animate-pop-gift">
              <div className="text-3xl sm:text-4xl font-black font-mono tracking-tighter text-red-500 drop-shadow-[0_0_25px_rgba(239,68,68,0.9)]">
                FLEW AWAY @ {currentMultiplier.toFixed(2)}x
              </div>
              <p className="text-[10px] text-gray-400 font-mono">Preparing next round...</p>
            </div>
          )}

          {/* Cashout Success Toast */}
          {hasCashedOut && (
            <div className="mt-2 px-3 py-1 bg-emerald-500/90 border border-emerald-300 text-black font-black text-xs rounded-full shadow-lg font-mono animate-bounce">
              🎉 CASHED OUT @ {cashoutMult.toFixed(2)}x (+{cashoutProfit.toLocaleString()} 💎)
            </div>
          )}
        </div>
      </div>

      {/* Control Panel: Bet presets & Cashout button */}
      <div className="space-y-2 pt-2 border-t border-white/10 shrink-0">
        {/* Bet Selection & Auto Cashout Config */}
        <div className="flex items-center justify-between text-[10px] text-gray-400 font-bold px-1">
          <span>Bet Amount: <strong className="text-rose-400 font-mono">{betAmount.toLocaleString()} Coins</strong></span>
          <div className="flex items-center space-x-1">
            <span>Auto Cashout:</span>
            <button
              onClick={() => setAutoCashoutMult(prev => prev === 2.0 ? 5.0 : prev === 5.0 ? null : 2.0)}
              className="px-2 py-0.5 bg-white/10 hover:bg-white/20 rounded font-mono text-amber-300 cursor-pointer"
            >
              {autoCashoutMult ? `${autoCashoutMult}x` : "OFF"}
            </button>
          </div>
        </div>

        {/* Quick Bet Buttons */}
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-1">
          {BET_PRESETS.map(amt => (
            <button
              key={amt}
              onClick={() => setBetAmount(amt)}
              disabled={hasBet && gameState === "flying"}
              className={`py-1 rounded-xl text-[9.5px] font-mono font-black transition-all cursor-pointer flex items-center justify-center ${
                betAmount === amt
                  ? "bg-gradient-to-r from-rose-500 to-red-600 text-white border border-rose-300 scale-105 shadow-md"
                  : "bg-white/10 hover:bg-white/20 text-gray-300 border border-white/5"
              }`}
            >
              {amt >= 1000 ? `${amt / 1000}k` : amt}
            </button>
          ))}
        </div>

        {/* Action Button: BET or CASHOUT */}
        {hasBet && gameState === "flying" && !hasCashedOut ? (
          <button
            onClick={() => handleCashout()}
            className="w-full py-3 bg-gradient-to-r from-emerald-400 via-green-500 to-emerald-600 hover:brightness-110 active:scale-95 text-black font-black uppercase text-sm tracking-wider rounded-2xl shadow-[0_0_25px_rgba(16,185,129,0.7)] border border-emerald-300 cursor-pointer flex flex-col items-center justify-center transition-all animate-pulse"
          >
            <span>CASH OUT NOW</span>
            <span className="text-[11px] font-mono">
              +{(Math.floor(betAmount * currentMultiplier)).toLocaleString()} Diamonds ({currentMultiplier.toFixed(2)}x)
            </span>
          </button>
        ) : (
          <button
            onClick={handlePlaceBet}
            disabled={hasBet}
            className={`w-full py-3 font-black uppercase text-xs tracking-wider rounded-2xl border cursor-pointer flex items-center justify-center space-x-2 transition-all ${
              hasBet
                ? "bg-gray-800 text-gray-500 border-gray-700 cursor-not-allowed"
                : "bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 hover:brightness-110 active:scale-95 text-white shadow-[0_0_20px_rgba(225,29,72,0.5)] border-rose-400"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>{hasBet ? "BET PLACED (WAITING)" : `PLACE BET (${betAmount.toLocaleString()} COINS)`}</span>
          </button>
        )}
      </div>
    </div>
  );
};
