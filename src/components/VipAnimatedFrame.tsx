import React from "react";

export interface VipFrameConfig {
  id: string;
  vipLevel: number;
  name: string;
  minLevel: number;
  glowColor: string;
  gradientFrom: string;
  gradientTo: string;
  badgeEmoji: string;
  isActive: boolean;
  description?: string;
  asset: string;
}

export const VIP_FRAMES_LIST: VipFrameConfig[] = [
  { id:"vip-frame-1", vipLevel:1, minLevel:8,  name:"VIP 1",  glowColor:"#f5b72a", gradientFrom:"from-amber-500", gradientTo:"to-yellow-500", badgeEmoji:"👑", isActive:true, asset:"/assets/vip-frames/vip-frame-1.svg", description:"Royal gold VIP frame." },
  { id:"vip-frame-2", vipLevel:2, minLevel:16, name:"VIP 2",  glowColor:"#48a7ff", gradientFrom:"from-blue-500", gradientTo:"to-cyan-400", badgeEmoji:"👑", isActive:true, asset:"/assets/vip-frames/vip-frame-2.svg", description:"Ice-blue royal VIP frame." },
  { id:"vip-frame-3", vipLevel:3, minLevel:24, name:"VIP 3",  glowColor:"#b44cff", gradientFrom:"from-purple-500", gradientTo:"to-pink-500", badgeEmoji:"👑", isActive:true, asset:"/assets/vip-frames/vip-frame-3.svg", description:"Purple royal VIP frame." },
  { id:"vip-frame-4", vipLevel:4, minLevel:32, name:"VIP 4",  glowColor:"#d89b26", gradientFrom:"from-amber-500", gradientTo:"to-yellow-600", badgeEmoji:"🐉", isActive:true, asset:"/assets/vip-frames/vip-frame-4.svg", description:"Golden dragon VIP frame." },
  { id:"vip-frame-5", vipLevel:5, minLevel:40, name:"VIP 5",  glowColor:"#ff4da6", gradientFrom:"from-pink-500", gradientTo:"to-rose-500", badgeEmoji:"💗", isActive:true, asset:"/assets/vip-frames/vip-frame-5.svg", description:"Pink heart VIP frame." },
  { id:"vip-frame-6", vipLevel:6, minLevel:48, name:"VIP 6",  glowColor:"#ff9d18", gradientFrom:"from-orange-500", gradientTo:"to-amber-500", badgeEmoji:"👑", isActive:true, asset:"/assets/vip-frames/vip-frame-6.svg", description:"Fire-gold wing VIP frame." },
  { id:"vip-frame-7", vipLevel:7, minLevel:56, name:"VIP 7",  glowColor:"#24bfff", gradientFrom:"from-cyan-400", gradientTo:"to-fuchsia-500", badgeEmoji:"🎙️", isActive:true, asset:"/assets/vip-frames/vip-frame-7.svg", description:"Neon audio VIP frame." },
  { id:"vip-frame-8", vipLevel:8, minLevel:64, name:"VIP 8",  glowColor:"#d9e8ff", gradientFrom:"from-slate-200", gradientTo:"to-blue-300", badgeEmoji:"👑", isActive:true, asset:"/assets/vip-frames/vip-frame-8.svg", description:"Crystal silver VIP frame." },
  { id:"vip-frame-9", vipLevel:9, minLevel:72, name:"VIP 9",  glowColor:"#ffd34a", gradientFrom:"from-yellow-400", gradientTo:"to-amber-500", badgeEmoji:"⭐", isActive:true, asset:"/assets/vip-frames/vip-frame-9.svg", description:"Golden star VIP frame." },
  { id:"vip-frame-10", vipLevel:10, minLevel:80, name:"VIP 10", glowColor:"#9c65ff", gradientFrom:"from-violet-500", gradientTo:"to-purple-500", badgeEmoji:"🌙", isActive:true, asset:"/assets/vip-frames/vip-frame-10.svg", description:"Moonlight purple VIP frame." },
  { id:"vip-frame-11", vipLevel:11, minLevel:88, name:"VIP 11", glowColor:"#c8c8c8", gradientFrom:"from-slate-400", gradientTo:"to-zinc-600", badgeEmoji:"🦁", isActive:true, asset:"/assets/vip-frames/vip-frame-11.svg", description:"Imperial lion VIP frame." },
  { id:"vip-frame-12", vipLevel:12, minLevel:96, name:"VIP 12", glowColor:"#28bfff", gradientFrom:"from-cyan-400", gradientTo:"to-blue-500", badgeEmoji:"🎧", isActive:true, asset:"/assets/vip-frames/vip-frame-12.svg", description:"Neon headset VIP frame." }
];

export const VipAnimatedFrame: React.FC<{
  frameId?: string | null;
  vipLevel?: number;
  showLevelBadge?: boolean;
  className?: string;
  children: React.ReactNode;
  /** Scale of the decorative frame relative to the avatar.
   The supplied artwork has a transparent inner opening; 205% keeps
   the full avatar inside that opening while the artwork surrounds it. */
  frameScale?: number;
}> = ({ frameId, vipLevel, showLevelBadge = true, className = "", children, frameScale = 205 }) => {
  let frame: VipFrameConfig | undefined;

  if (frameId) {
    frame = VIP_FRAMES_LIST.find(f => f.id === frameId && f.isActive);
  }
  if (!frame && vipLevel && vipLevel > 0) {
    frame = VIP_FRAMES_LIST.find(f => f.vipLevel === vipLevel && f.isActive);
    if (!frame) {
      frame = VIP_FRAMES_LIST.reduce(
        (prev, curr) => curr.vipLevel <= vipLevel && curr.vipLevel > prev.vipLevel ? curr : prev,
        VIP_FRAMES_LIST[0]
      );
    }
  }

  if (!frame) {
    return <div className={`relative inline-block overflow-visible ${className}`}>{children}</div>;
  }

  return (
    <div className={`relative inline-block overflow-visible ${className}`}>
      <img
        src={frame.asset}
        alt={`${frame.name} profile frame`}
        className="absolute pointer-events-none z-20 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 object-contain"
        style={{
          width: `${frameScale}%`,
          height: "auto",
          maxWidth: "none",
          aspectRatio: "384 / 341"
        }}
        draggable={false}
      />
      {showLevelBadge && (
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 z-30">
          <span className={`px-1.5 py-0.5 rounded-full text-[7.5px] font-black font-mono uppercase tracking-wider text-white shadow-lg border border-white/40 flex items-center gap-0.5 animate-pulse bg-gradient-to-r ${frame.gradientFrom} ${frame.gradientTo}`}>
            <span>VIP</span>
            <span className="text-yellow-200 font-extrabold">{frame.vipLevel}</span>
          </span>
        </div>
      )}
      <div className="relative z-30">{children}</div>
    </div>
  );
};
