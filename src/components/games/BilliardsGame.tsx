import React, { useState, useEffect, useRef } from "react";
import { ArrowLeft, Sparkles, Trophy, RotateCw, Volume2, Users, Bot, Zap, Play } from "lucide-react";
import { UserProfile } from "../../types";
import { InGameVoiceChat } from "./InGameVoiceChat";

interface BilliardsGameProps {
  user: UserProfile;
  setUser: React.Dispatch<React.SetStateAction<UserProfile>>;
  onBack: () => void;
  soundEnabled: boolean;
  stakeCoins: number;
  opponentName?: string;
  opponentAvatar?: string;
  onGameWin?: (coins: number, gameName: string) => void;
}

interface Ball {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  isCue?: boolean;
  isEight?: boolean;
  pocketed: boolean;
}

export const BilliardsGame: React.FC<BilliardsGameProps> = ({
  user,
  setUser,
  onBack,
  soundEnabled,
  stakeCoins,
  opponentName = "Pool_Shark",
  opponentAvatar = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&h=100&q=80",
  onGameWin
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [aimAngle, setAimAngle] = useState<number>(0);
  const [power, setPower] = useState<number>(50);
  const [isShooting, setIsShooting] = useState<boolean>(false);
  const [userPots, setUserPots] = useState<number>(0);
  const [opponentPots, setOpponentPots] = useState<number>(0);
  const [currentTurn, setCurrentTurn] = useState<"user" | "opponent">("user");
  const [winner, setWinner] = useState<string | null>(null);

  const ballsRef = useRef<Ball[]>([]);
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

  const initTable = () => {
    const w = 340;
    const h = 180;
    const initialBalls: Ball[] = [];

    // White Cue Ball
    initialBalls.push({
      id: 0,
      x: 80,
      y: h / 2,
      vx: 0,
      vy: 0,
      radius: 6.5,
      color: "#ffffff",
      isCue: true,
      pocketed: false
    });

    // Triangle of object balls on the right
    const colors = ["#ef4444", "#3b82f6", "#eab308", "#10b981", "#8b5cf6", "#f97316", "#000000", "#ec4899"];
    let count = 0;
    const startX = 230;
    const startY = h / 2;
    const spacing = 13.5;

    for (let col = 0; col < 3; col++) {
      for (let row = 0; row <= col; row++) {
        count++;
        const bx = startX + col * spacing;
        const by = startY + (row - col / 2) * spacing;
        const isEight = count === 5;
        initialBalls.push({
          id: count,
          x: bx,
          y: by,
          vx: 0,
          vy: 0,
          radius: 6.5,
          color: isEight ? "#000000" : colors[count % colors.length],
          isEight,
          pocketed: false
        });
      }
    }

    ballsRef.current = initialBalls;
  };

  useEffect(() => {
    initTable();
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

      const w = 340;
      const h = 180;
      const pockets = [
        { x: 14, y: 14, r: 12 },
        { x: w / 2, y: 10, r: 11 },
        { x: w - 14, y: 14, r: 12 },
        { x: 14, y: h - 14, r: 12 },
        { x: w / 2, y: h - 10, r: 11 },
        { x: w - 14, y: h - 14, r: 12 }
      ];

      // Green Felt Surface
      ctx.fillStyle = "#15803d";
      ctx.fillRect(0, 0, w, h);

      // Cushion Wood Frame
      ctx.strokeStyle = "#451a03";
      ctx.lineWidth = 16;
      ctx.strokeRect(0, 0, w, h);

      // Inner table boundary line
      ctx.strokeStyle = "rgba(0, 0, 0, 0.2)";
      ctx.lineWidth = 1;
      ctx.strokeRect(16, 16, w - 32, h - 32);

      // Pockets
      pockets.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, 2 * Math.PI);
        ctx.fillStyle = "#09090b";
        ctx.fill();
        ctx.strokeStyle = "#27272a";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });

      // Physics update
      let anyMoving = false;
      const balls = ballsRef.current;

      balls.forEach(b => {
        if (b.pocketed) return;

        b.x += b.vx;
        b.y += b.vy;
        b.vx *= 0.98;
        b.vy *= 0.98;

        if (Math.abs(b.vx) < 0.04) b.vx = 0;
        if (Math.abs(b.vy) < 0.04) b.vy = 0;

        if (b.vx !== 0 || b.vy !== 0) anyMoving = true;

        // Cushion rebounds
        const minX = 14 + b.radius;
        const maxX = w - 14 - b.radius;
        const minY = 14 + b.radius;
        const maxY = h - 14 - b.radius;

        if (b.x < minX) { b.x = minX; b.vx = -b.vx * 0.85; playSound(280, "triangle", 0.04); }
        if (b.x > maxX) { b.x = maxX; b.vx = -b.vx * 0.85; playSound(280, "triangle", 0.04); }
        if (b.y < minY) { b.y = minY; b.vy = -b.vy * 0.85; playSound(280, "triangle", 0.04); }
        if (b.y > maxY) { b.y = maxY; b.vy = -b.vy * 0.85; playSound(280, "triangle", 0.04); }

        // Check pocketing
        pockets.forEach(pocket => {
          const dist = Math.hypot(b.x - pocket.x, b.y - pocket.y);
          if (dist < pocket.r) {
            b.pocketed = true;
            b.vx = 0;
            b.vy = 0;
            playSound(500, "sine", 0.15);

            if (!b.isCue) {
              if (currentTurn === "user") {
                setUserPots(prev => prev + 1);
              } else {
                setOpponentPots(prev => prev + 1);
              }
            }
          }
        });
      });

      // Ball-to-ball collisions
      for (let i = 0; i < balls.length; i++) {
        for (let j = i + 1; j < balls.length; j++) {
          const b1 = balls[i];
          const b2 = balls[j];
          if (b1.pocketed || b2.pocketed) continue;

          const dx = b2.x - b1.x;
          const dy = b2.y - b1.y;
          const dist = Math.hypot(dx, dy);

          if (dist < b1.radius + b2.radius) {
            const angle = Math.atan2(dy, dx);
            const sin = Math.sin(angle);
            const cos = Math.cos(angle);

            const overlap = (b1.radius + b2.radius - dist) / 2;
            b1.x -= cos * overlap;
            b1.y -= sin * overlap;
            b2.x += cos * overlap;
            b2.y += sin * overlap;

            const vx1 = b1.vx * cos + b1.vy * sin;
            const vy1 = b1.vy * cos - b1.vx * sin;
            const vx2 = b2.vx * cos + b2.vy * sin;
            const vy2 = b2.vy * cos - b2.vx * sin;

            b1.vx = vx2 * cos - vy1 * sin;
            b1.vy = vy1 * cos + vx2 * sin;
            b2.vx = vx1 * cos - vy2 * sin;
            b2.vy = vy2 * cos + vx1 * sin;

            playSound(520, "sine", 0.03);
          }
        }
      }

      // Draw Aiming Guide Line for Cue Ball
      const cue = balls.find(b => b.isCue);
      if (cue && !isShooting && !cue.pocketed && currentTurn === "user") {
        ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
        ctx.setLineDash([3, 3]);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cue.x, cue.y);
        ctx.lineTo(cue.x + Math.cos(aimAngle) * 90, cue.y + Math.sin(aimAngle) * 90);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Draw Balls
      balls.forEach(b => {
        if (b.pocketed) return;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, 2 * Math.PI);
        ctx.fillStyle = b.color;
        ctx.fill();
        ctx.strokeStyle = b.isCue ? "#d1d5db" : "rgba(0,0,0,0.5)";
        ctx.lineWidth = 1;
        ctx.stroke();

        // Ball shine
        ctx.beginPath();
        ctx.arc(b.x - 2, b.y - 2, 2, 0, 2 * Math.PI);
        ctx.fillStyle = "rgba(255,255,255,0.6)";
        ctx.fill();
      });

      // Handle shot finished
      if (isShooting && !anyMoving) {
        setIsShooting(false);
        // If cue ball was pocketed (scratch), reset to center
        if (cue && cue.pocketed) {
          cue.pocketed = false;
          cue.x = 80;
          cue.y = h / 2;
          cue.vx = 0;
          cue.vy = 0;
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
  }, [isShooting, aimAngle, power, currentTurn]);

  // Bot Turn trigger
  useEffect(() => {
    if (currentTurn === "opponent" && !isShooting && !winner) {
      const botTimer = setTimeout(() => {
        handleBotShot();
      }, 1500);
      return () => clearTimeout(botTimer);
    }
  }, [currentTurn, isShooting, winner]);

  // Automatic match completion after a standard 8-ball target is reached.
  useEffect(() => {
    if (winner) return;
    if (userPots >= 7) {
      handleEndGameWin();
    } else if (opponentPots >= 7) {
      setWinner("Opponent");
    }
  }, [userPots, opponentPots, winner]);

  const handleBotShot = () => {
    const cue = ballsRef.current.find(b => b.isCue);
    if (!cue) return;

    const botAngle = (Math.random() - 0.5) * Math.PI;
    const botPower = 8 + Math.random() * 6;

    cue.vx = Math.cos(botAngle) * botPower;
    cue.vy = Math.sin(botAngle) * botPower;
    setIsShooting(true);
    playSound(520, "triangle", 0.15);
  };

  const handleUserShot = () => {
    if (isShooting || currentTurn !== "user" || winner) return;
    const cue = ballsRef.current.find(b => b.isCue);
    if (!cue) return;

    const speed = (power / 100) * 16;
    cue.vx = Math.cos(aimAngle) * speed;
    cue.vy = Math.sin(aimAngle) * speed;

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
    if (onGameWin) onGameWin(prize, "8-Ball Billiards");
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
          <h3 className="text-sm font-black text-emerald-400 uppercase tracking-wider font-mono flex items-center justify-center space-x-1.5">
            <span>🎱</span>
            <span>8-BALL BILLIARDS</span>
            <span>🏆</span>
          </h3>
        </div>

        <div className="flex items-center space-x-1.5 text-right">
          <span className="text-[10px] text-amber-300 font-mono font-bold bg-black/40 px-2 py-1 rounded-lg border border-amber-500/30">
            Prize: {(stakeCoins * 2).toLocaleString()} 💎
          </span>
        </div>
      </div>

      {/* Players Header */}
      <div className="grid grid-cols-2 gap-3 my-1 px-2">
        <div className={`p-2 rounded-2xl border-2 flex items-center space-x-2 transition-all ${
          currentTurn === "user" ? "bg-emerald-950/40 border-emerald-400 shadow-md" : "bg-black/40 border-white/5 opacity-70"
        }`}>
          <img src={user.avatar} alt="You" className="w-8 h-8 rounded-full object-cover border border-emerald-400" />
          <div className="min-w-0">
            <p className="text-[11px] font-black text-white truncate">You (Cue Ball)</p>
            <p className="text-[9px] font-mono text-emerald-400 font-bold">Pocketed: {userPots} balls</p>
          </div>
        </div>

        <div className={`p-2 rounded-2xl border-2 flex items-center space-x-2 transition-all ${
          currentTurn === "opponent" ? "bg-purple-950/40 border-purple-400 shadow-md" : "bg-black/40 border-white/5 opacity-70"
        }`}>
          <img src={opponentAvatar} alt={opponentName} className="w-8 h-8 rounded-full object-cover border border-purple-400" />
          <div className="min-w-0">
            <p className="text-[11px] font-black text-white truncate">{opponentName}</p>
            <p className="text-[9px] font-mono text-purple-400 font-bold">Pocketed: {opponentPots} balls</p>
          </div>
        </div>
      </div>

      {/* Pool Table Canvas */}
      <div className="flex-1 flex flex-col items-center justify-center relative my-1">
        <div className="rounded-3xl border-4 border-[#2b1810] shadow-[0_0_35px_rgba(0,0,0,0.9)] overflow-hidden bg-[#1c1917] p-1">
          <canvas
            ref={canvasRef}
            width={340}
            height={180}
            className="rounded-2xl block"
          />
        </div>
      </div>

      {/* Controls: Aim Angle & Cue Shot Button */}
      <div className="space-y-2 pt-1 border-t border-white/10 shrink-0">
        {currentTurn === "user" && !isShooting && (
          <div className="space-y-0.5 text-left px-2">
            <div className="flex justify-between text-[9px] text-gray-400 font-bold uppercase font-mono">
              <span>Aim Cue Direction</span>
              <span className="text-emerald-400">{Math.round((aimAngle * 180) / Math.PI)}°</span>
            </div>
            <input
              type="range"
              min={-Math.PI}
              max={Math.PI}
              step="0.05"
              value={aimAngle}
              onChange={e => setAimAngle(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-emerald-400"
            />
          </div>
        )}

        <div className="flex items-center justify-between gap-2 px-2">
          <button
            onClick={handleUserShot}
            disabled={currentTurn !== "user" || isShooting}
            className={`flex-1 py-3 font-black uppercase text-xs tracking-wider rounded-2xl border cursor-pointer flex items-center justify-center space-x-2 transition-all ${
              currentTurn === "user" && !isShooting
                ? "bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-600 hover:brightness-110 active:scale-95 text-black border-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.6)] animate-pulse"
                : "bg-gray-800 border-gray-700 text-gray-500 cursor-not-allowed"
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>{isShooting ? "BALLS ROLLING..." : currentTurn === "user" ? "SHOOT CUE BALL!" : `${opponentName} Aiming...`}</span>
          </button>

          <button
            onClick={handleEndGameWin}
            className="px-3 py-3 bg-amber-500/20 hover:bg-amber-500/40 text-amber-300 rounded-2xl border border-amber-400/40 text-[10px] font-mono font-black uppercase cursor-pointer"
          >
            Claim 🏆
          </button>
        </div>

        {/* In-Game Room Voice & Chat */}
        <InGameVoiceChat
          currentUser={user}
          players={[
            { username: user.username, avatar: user.avatar, isTalking: currentTurn === "user" },
            { username: opponentName, avatar: opponentAvatar, isTalking: currentTurn === "opponent" }
          ]}
          gameName="8-Ball Billiards"
        />
      </div>
    </div>
  );
};
