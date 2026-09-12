import React, { useState, useEffect, useRef } from "react";
import { ArrowLeft, Sparkles, Trophy, RotateCw, Volume2, Users, Bot, Zap, Play } from "lucide-react";
import { UserProfile } from "../../types";
import { InGameVoiceChat } from "./InGameVoiceChat";

interface CarromGameProps {
  user: UserProfile;
  setUser: React.Dispatch<React.SetStateAction<UserProfile>>;
  onBack: () => void;
  soundEnabled: boolean;
  stakeCoins: number;
  opponentName?: string;
  opponentAvatar?: string;
  onGameWin?: (coins: number, gameName: string) => void;
}

interface Piece {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  type: "striker" | "white" | "black" | "queen";
  color: string;
  points: number;
  pocketed: boolean;
}

export const CarromGame: React.FC<CarromGameProps> = ({
  user,
  setUser,
  onBack,
  soundEnabled,
  stakeCoins,
  opponentName = "Carrom_Master",
  opponentAvatar = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&h=100&q=80",
  onGameWin
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [strikerXRatio, setStrikerXRatio] = useState<number>(0.5);
  const [aimAngle, setAimAngle] = useState<number>(-Math.PI / 2);
  const [power, setPower] = useState<number>(60);
  const [isShooting, setIsShooting] = useState<boolean>(false);
  const [userScore, setUserScore] = useState<number>(0);
  const [opponentScore, setOpponentScore] = useState<number>(0);
  const [currentTurn, setCurrentTurn] = useState<"user" | "opponent">("user");
  const [winner, setWinner] = useState<string | null>(null);

  const piecesRef = useRef<Piece[]>([]);
  const animFrameRef = useRef<number | null>(null);

  // Sound effects generator
  const playSound = (freq: number, type: OscillatorType = "sine", duration: number = 0.08) => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {}
  };

  // Initialize board pieces
  const initBoard = () => {
    const size = 320;
    const center = size / 2;
    const initialPieces: Piece[] = [];

    // Red Queen in center
    initialPieces.push({
      id: 0,
      x: center,
      y: center,
      vx: 0,
      vy: 0,
      radius: 9,
      type: "queen",
      color: "#dc2626",
      points: 25,
      pocketed: false
    });

    // Ring of 6 Carrom men around Queen
    const r = 18;
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      const isWhite = i % 2 === 0;
      initialPieces.push({
        id: i + 1,
        x: center + Math.cos(angle) * r,
        y: center + Math.sin(angle) * r,
        vx: 0,
        vy: 0,
        radius: 8.5,
        type: isWhite ? "white" : "black",
        color: isWhite ? "#f3f4f6" : "#1f2937",
        points: isWhite ? 10 : 5,
        pocketed: false
      });
    }

    // Striker
    initialPieces.push({
      id: 99,
      x: center,
      y: size - 45,
      vx: 0,
      vy: 0,
      radius: 12,
      type: "striker",
      color: "#eab308",
      points: 0,
      pocketed: false
    });

    piecesRef.current = initialPieces;
  };

  useEffect(() => {
    initBoard();
  }, []);

  // Main canvas animation & physics loop
  useEffect(() => {
    let isRunning = true;

    const render = () => {
      if (!isRunning) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const size = 320;
      const pockets = [
        { x: 20, y: 20, r: 16 },
        { x: size - 20, y: 20, r: 16 },
        { x: 20, y: size - 20, r: 16 },
        { x: size - 20, y: size - 20, r: 16 }
      ];

      // Draw Wooden Board Surface
      ctx.fillStyle = "#e6c280";
      ctx.fillRect(0, 0, size, size);

      // Board border & frame
      ctx.strokeStyle = "#451a03";
      ctx.lineWidth = 14;
      ctx.strokeRect(0, 0, size, size);

      // Inner boundary lines
      ctx.strokeStyle = "rgba(0, 0, 0, 0.4)";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(28, 28, size - 56, size - 56);

      // Center circle
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, 32, 0, 2 * Math.PI);
      ctx.strokeStyle = "rgba(180, 83, 9, 0.6)";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Pockets
      pockets.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, 2 * Math.PI);
        ctx.fillStyle = "#1c1917";
        ctx.fill();
        ctx.strokeStyle = "#451a03";
        ctx.lineWidth = 2;
        ctx.stroke();
      });

      // Baselines
      ctx.strokeStyle = "rgba(0,0,0,0.5)";
      ctx.lineWidth = 1.5;
      // Bottom baseline
      ctx.beginPath();
      ctx.moveTo(50, size - 45);
      ctx.lineTo(size - 50, size - 45);
      ctx.stroke();
      // Top baseline
      ctx.beginPath();
      ctx.moveTo(50, 45);
      ctx.lineTo(size - 50, 45);
      ctx.stroke();

      // Physics update
      let anyMoving = false;
      const pieces = piecesRef.current;

      pieces.forEach(p => {
        if (p.pocketed) return;

        // Apply velocity & friction
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.96;
        p.vy *= 0.96;

        if (Math.abs(p.vx) < 0.05) p.vx = 0;
        if (Math.abs(p.vy) < 0.05) p.vy = 0;

        if (p.vx !== 0 || p.vy !== 0) anyMoving = true;

        // Wall collisions
        const minX = 16 + p.radius;
        const maxX = size - 16 - p.radius;
        const minY = 16 + p.radius;
        const maxY = size - 16 - p.radius;

        if (p.x < minX) { p.x = minX; p.vx = -p.vx * 0.8; playSound(300, "triangle", 0.05); }
        if (p.x > maxX) { p.x = maxX; p.vx = -p.vx * 0.8; playSound(300, "triangle", 0.05); }
        if (p.y < minY) { p.y = minY; p.vy = -p.vy * 0.8; playSound(300, "triangle", 0.05); }
        if (p.y > maxY) { p.y = maxY; p.vy = -p.vy * 0.8; playSound(300, "triangle", 0.05); }

        // Check pocketing
        pockets.forEach(pocket => {
          const dist = Math.hypot(p.x - pocket.x, p.y - pocket.y);
          if (dist < pocket.r) {
            p.pocketed = true;
            p.vx = 0;
            p.vy = 0;
            playSound(600, "sine", 0.2);

            if (p.type !== "striker") {
              if (currentTurn === "user") {
                setUserScore(prev => prev + p.points);
              } else {
                setOpponentScore(prev => prev + p.points);
              }
            }
          }
        });
      });

      // Piece-to-piece collisions
      for (let i = 0; i < pieces.length; i++) {
        for (let j = i + 1; j < pieces.length; j++) {
          const p1 = pieces[i];
          const p2 = pieces[j];
          if (p1.pocketed || p2.pocketed) continue;

          const dx = p2.x - p1.x;
          const dy = p2.y - p1.y;
          const dist = Math.hypot(dx, dy);

          if (dist < p1.radius + p2.radius) {
            // Elastic collision
            const angle = Math.atan2(dy, dx);
            const sin = Math.sin(angle);
            const cos = Math.cos(angle);

            // Separate overlapping
            const overlap = (p1.radius + p2.radius - dist) / 2;
            p1.x -= cos * overlap;
            p1.y -= sin * overlap;
            p2.x += cos * overlap;
            p2.y += sin * overlap;

            // Velocity swap
            const vx1 = p1.vx * cos + p1.vy * sin;
            const vy1 = p1.vy * cos - p1.vx * sin;
            const vx2 = p2.vx * cos + p2.vy * sin;
            const vy2 = p2.vy * cos - p2.vx * sin;

            p1.vx = vx2 * cos - vy1 * sin;
            p1.vy = vy1 * cos + vx2 * sin;
            p2.vx = vx1 * cos - vy2 * sin;
            p2.vy = vy2 * cos + vx1 * sin;

            playSound(450, "sine", 0.04);
          }
        }
      }

      // Draw Aiming Guide Line if not shooting & user's turn
      const striker = pieces.find(p => p.type === "striker");
      if (striker && !isShooting && !striker.pocketed && currentTurn === "user") {
        ctx.strokeStyle = "rgba(239, 68, 68, 0.8)";
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(striker.x, striker.y);
        ctx.lineTo(striker.x + Math.cos(aimAngle) * 80, striker.y + Math.sin(aimAngle) * 80);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Draw all pieces
      pieces.forEach(p => {
        if (p.pocketed) return;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, 2 * Math.PI);
        ctx.fillStyle = p.color;
        ctx.fill();
        ctx.strokeStyle = p.type === "queen" ? "#fef08a" : p.type === "striker" ? "#ca8a04" : "#9ca3af";
        ctx.lineWidth = 2;
        ctx.stroke();

        // Inner piece ring
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 0.4, 0, 2 * Math.PI);
        ctx.strokeStyle = p.type === "queen" ? "#fff" : "rgba(0,0,0,0.3)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });

      // Handle shot finished
      if (isShooting && !anyMoving) {
        setIsShooting(false);
        // Reset striker to baseline
        if (striker) {
          striker.pocketed = false;
          striker.x = 50 + strikerXRatio * (size - 100);
          striker.y = currentTurn === "user" ? size - 45 : 45;
          striker.vx = 0;
          striker.vy = 0;
        }

        // Switch turn
        setCurrentTurn(prev => prev === "user" ? "opponent" : "user");
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      isRunning = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isShooting, strikerXRatio, aimAngle, power, currentTurn]);

  // Bot Turn trigger
  useEffect(() => {
    if (currentTurn === "opponent" && !isShooting && !winner) {
      const botTimer = setTimeout(() => {
        handleBotStrike();
      }, 1500);
      return () => clearTimeout(botTimer);
    }
  }, [currentTurn, isShooting, winner]);

  // Automatic match completion once a player reaches the target score.
  useEffect(() => {
    if (winner) return;
    if (userScore >= 50) {
      handleEndGameWin();
    } else if (opponentScore >= 50) {
      setWinner("Opponent");
    }
  }, [userScore, opponentScore, winner]);

  const handleBotStrike = () => {
    const striker = piecesRef.current.find(p => p.type === "striker");
    if (!striker) return;
    striker.y = 45;
    striker.x = 80 + Math.random() * 160;

    const botAngle = Math.PI / 2 + (Math.random() - 0.5) * 0.8;
    const botPower = 12 + Math.random() * 8;

    striker.vx = Math.cos(botAngle) * botPower;
    striker.vy = Math.sin(botAngle) * botPower;
    setIsShooting(true);
    playSound(550, "triangle", 0.15);
  };

  const handleUserStrike = () => {
    if (isShooting || currentTurn !== "user" || winner) return;
    const striker = piecesRef.current.find(p => p.type === "striker");
    if (!striker) return;

    striker.x = 50 + strikerXRatio * (320 - 100);
    striker.y = 320 - 45;

    const shotSpeed = (power / 100) * 20;
    striker.vx = Math.cos(aimAngle) * shotSpeed;
    striker.vy = Math.sin(aimAngle) * shotSpeed;

    setIsShooting(true);
    playSound(600, "triangle", 0.2);
  };

  const handleEndGameWin = () => {
    setWinner("You");
    const prize = stakeCoins * 2;
    setUser(prev => ({
      ...prev,
      diamonds: (prev.diamonds || 0) + prize
    }));
    playSound(880, "sine", 0.5);
    if (onGameWin) onGameWin(prize, "Carrom Board");
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
            <span>⚪</span>
            <span>CARROM MASTER</span>
            <span>🎯</span>
          </h3>
        </div>

        <div className="flex items-center space-x-1.5 text-right">
          <span className="text-[10px] text-amber-300 font-mono font-bold bg-black/40 px-2 py-1 rounded-lg border border-amber-500/30">
            Prize: {(stakeCoins * 2).toLocaleString()} 💎
          </span>
        </div>
      </div>

      {/* Players Score Header */}
      <div className="grid grid-cols-2 gap-3 my-1 px-2">
        <div className={`p-2 rounded-2xl border-2 flex items-center space-x-2 transition-all ${
          currentTurn === "user" ? "bg-amber-950/40 border-amber-400 shadow-md" : "bg-black/40 border-white/5 opacity-70"
        }`}>
          <img src={user.avatar} alt="You" className="w-8 h-8 rounded-full object-cover border border-amber-400" />
          <div className="min-w-0">
            <p className="text-[11px] font-black text-white truncate">You (Striker)</p>
            <p className="text-[9px] font-mono text-amber-400 font-bold">Score: {userScore} pts</p>
          </div>
        </div>

        <div className={`p-2 rounded-2xl border-2 flex items-center space-x-2 transition-all ${
          currentTurn === "opponent" ? "bg-purple-950/40 border-purple-400 shadow-md" : "bg-black/40 border-white/5 opacity-70"
        }`}>
          <img src={opponentAvatar} alt={opponentName} className="w-8 h-8 rounded-full object-cover border border-purple-400" />
          <div className="min-w-0">
            <p className="text-[11px] font-black text-white truncate">{opponentName}</p>
            <p className="text-[9px] font-mono text-purple-400 font-bold">Score: {opponentScore} pts</p>
          </div>
        </div>
      </div>

      {/* Carrom Board Canvas Window */}
      <div className="flex-1 flex flex-col items-center justify-center relative my-1">
        <div className="rounded-3xl border-4 border-amber-950 shadow-[0_0_35px_rgba(0,0,0,0.9)] overflow-hidden bg-[#451a03] p-1">
          <canvas
            ref={canvasRef}
            width={320}
            height={320}
            className="rounded-2xl block"
          />
        </div>
      </div>

      {/* Controls: Striker Placement Slider & Strike Button */}
      <div className="space-y-2 pt-1 border-t border-white/10 shrink-0">
        {currentTurn === "user" && !isShooting && (
          <div className="grid grid-cols-2 gap-2 px-2">
            <div className="space-y-0.5 text-left">
              <label className="text-[9px] text-gray-400 font-bold uppercase font-mono">Striker Position</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.02"
                value={strikerXRatio}
                onChange={e => setStrikerXRatio(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-amber-400"
              />
            </div>

            <div className="space-y-0.5 text-left">
              <label className="text-[9px] text-gray-400 font-bold uppercase font-mono">Aim Angle</label>
              <input
                type="range"
                min={-Math.PI + 0.2}
                max={-0.2}
                step="0.05"
                value={aimAngle}
                onChange={e => setAimAngle(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-rose-500"
              />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-2 px-2">
          <button
            onClick={handleUserStrike}
            disabled={currentTurn !== "user" || isShooting}
            className={`flex-1 py-3 font-black uppercase text-xs tracking-wider rounded-2xl border cursor-pointer flex items-center justify-center space-x-2 transition-all ${
              currentTurn === "user" && !isShooting
                ? "bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600 hover:brightness-110 active:scale-95 text-black border-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.6)] animate-pulse"
                : "bg-gray-800 border-gray-700 text-gray-500 cursor-not-allowed"
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>{isShooting ? "COINS IN MOTION..." : currentTurn === "user" ? "STRIKE NOW!" : `${opponentName} Aiming...`}</span>
          </button>

          <button
            onClick={handleEndGameWin}
            className="px-3 py-3 bg-amber-500/20 hover:bg-amber-500/40 text-amber-300 rounded-2xl border border-amber-400/40 text-[10px] font-mono font-black uppercase cursor-pointer"
          >
            Claim 🏆
          </button>
        </div>

        {/* Private In-Game Room Voice & Chat */}
        <InGameVoiceChat
          currentUser={user}
          players={[
            { username: user.username, avatar: user.avatar, isTalking: currentTurn === "user" },
            { username: opponentName, avatar: opponentAvatar, isTalking: currentTurn === "opponent" }
          ]}
          gameName="Carrom Master"
        />
      </div>
    </div>
  );
};
