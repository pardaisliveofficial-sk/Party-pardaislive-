import React from "react";
import { Volume2, X } from "lucide-react";

export type PartyReactionSoundId =
  | "laugh"
  | "cry"
  | "cheer"
  | "applause"
  | "wow"
  | "boo"
  | "drumroll"
  | "airhorn";

export const PARTY_REACTION_SOUNDS: Array<{ id: PartyReactionSoundId; label: string; emoji: string; hint: string }> = [
  { id: "laugh", label: "Laugh", emoji: "😂", hint: "Funny laugh" },
  { id: "cry", label: "Cry", emoji: "😭", hint: "Sad reaction" },
  { id: "cheer", label: "Cheer", emoji: "🎉", hint: "Celebration" },
  { id: "applause", label: "Applause", emoji: "👏", hint: "Clapping" },
  { id: "wow", label: "Wow", emoji: "😮", hint: "Surprise" },
  { id: "boo", label: "Boo", emoji: "😡", hint: "Funny boo" },
  { id: "drumroll", label: "Drum Roll", emoji: "🥁", hint: "Build-up" },
  { id: "airhorn", label: "Air Horn", emoji: "📣", hint: "Big moment" },
];

interface PartyReactionSoundsProps {
  onPlay: (id: PartyReactionSoundId) => void;
  onClose: () => void;
}

export const PartyReactionSounds: React.FC<PartyReactionSoundsProps> = ({ onPlay, onClose }) => (
  <div className="absolute top-16 right-3 z-[90] w-[260px] rounded-2xl border border-cyan-400/30 bg-[#090b14]/98 p-3 shadow-[0_0_30px_rgba(34,211,238,0.18)] backdrop-blur-xl animate-slide-up">
    <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-cyan-500/15 border border-cyan-400/30 flex items-center justify-center">
          <Volume2 className="w-3.5 h-3.5 text-cyan-300" />
        </div>
        <div>
          <p className="text-[9px] font-black text-white uppercase tracking-widest font-mono">Reaction Sounds</p>
          <p className="text-[6.5px] text-gray-400">Everyone in the party hears it live.</p>
        </div>
      </div>
      <button onClick={onClose} className="w-6 h-6 rounded-full bg-white/5 text-gray-400 hover:text-white flex items-center justify-center cursor-pointer" title="Close">
        <X className="w-3 h-3" />
      </button>
    </div>
    <div className="grid grid-cols-2 gap-1.5">
      {PARTY_REACTION_SOUNDS.map(sound => (
        <button
          key={sound.id}
          type="button"
          onClick={() => onPlay(sound.id)}
          className="flex items-center gap-2 p-2 rounded-xl bg-white/[0.035] hover:bg-cyan-500/10 border border-white/5 hover:border-cyan-400/30 transition-all active:scale-95 cursor-pointer text-left"
          title={sound.hint}
        >
          <span className="text-base leading-none">{sound.emoji}</span>
          <span className="min-w-0">
            <span className="block text-[8px] font-black text-white truncate">{sound.label}</span>
            <span className="block text-[6px] text-gray-500 truncate">{sound.hint}</span>
          </span>
        </button>
      ))}
    </div>
    <p className="text-[6px] text-gray-500 mt-2 text-center font-mono">Host control • short sound effect • no music file required</p>
  </div>
);
