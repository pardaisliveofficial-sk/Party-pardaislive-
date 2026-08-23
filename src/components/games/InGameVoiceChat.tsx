import React, { useState } from "react";
import { Mic, MicOff, Volume2, VolumeX, MessageSquare, Smile, Send } from "lucide-react";
import { UserProfile } from "../../types";

interface InGameVoiceChatProps {
  currentUser: UserProfile;
  players: { username: string; avatar?: string; isMuted?: boolean; isTalking?: boolean; color?: string }[];
  gameName: string;
}

const QUICK_PHRASES = [
  "Roll a 6! 🎲",
  "Nice Shot! 🎯",
  "Don't hit my token! ⚔️",
  "Queen is mine! 👑",
  "Good Game! 🤝",
  "Hahaha! 😂",
  "Oops! 💥",
  "Hurry up! ⏳",
  "Watch this trick! 🎱",
  "Well played! 👏"
];

export const InGameVoiceChat: React.FC<InGameVoiceChatProps> = ({
  currentUser,
  players,
  gameName
}) => {
  const [isMicOn, setIsMicOn] = useState<boolean>(true);
  const [isSpeakerOn, setIsSpeakerOn] = useState<boolean>(true);
  const [showQuickPhrases, setShowQuickPhrases] = useState<boolean>(false);
  const [messages, setMessages] = useState<{ id: string; sender: string; text: string; time: string }[]>([
    { id: "1", sender: "System", text: `🎮 Welcome to ${gameName} Room! Voice & chat connected.`, time: "Now" }
  ]);
  const [customText, setCustomText] = useState<string>("");

  const handleSendPhrase = (phrase: string) => {
    setMessages(prev => [
      ...prev,
      {
        id: String(Date.now()),
        sender: currentUser.username || "You",
        text: phrase,
        time: "Just now"
      }
    ].slice(-8));
    setShowQuickPhrases(false);
  };

  const handleSendCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customText.trim()) return;
    handleSendPhrase(customText.trim());
    setCustomText("");
  };

  return (
    <div className="w-full bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl p-2.5 space-y-2 select-none shadow-lg">
      {/* Top row: Connected In-Game Players Voice Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="flex -space-x-1.5 overflow-hidden">
            {players.map((p, idx) => (
              <div
                key={idx}
                className="relative inline-block w-6 h-6 rounded-full ring-2 ring-purple-500 overflow-hidden bg-gray-800"
                title={`${p.username} (${p.isTalking ? "Talking" : "Connected"})`}
              >
                <img
                  src={p.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=50&h=50&q=80"}
                  alt={p.username}
                  className="w-full h-full object-cover"
                />
                {p.isTalking && (
                  <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                )}
              </div>
            ))}
          </div>
          <span className="text-[9px] font-mono text-emerald-400 font-bold flex items-center space-x-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Game Voice Active ({players.length})</span>
          </span>
        </div>

        {/* Voice Toggles */}
        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => setIsMicOn(prev => !prev)}
            className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
              isMicOn
                ? "bg-emerald-600/30 border-emerald-400 text-emerald-300"
                : "bg-red-950/60 border-red-500 text-red-400"
            }`}
            title={isMicOn ? "In-Game Mic: ON" : "In-Game Mic: MUTED"}
          >
            {isMicOn ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={() => setIsSpeakerOn(prev => !prev)}
            className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
              isSpeakerOn
                ? "bg-purple-600/30 border-purple-400 text-purple-300"
                : "bg-gray-800 border-gray-600 text-gray-400"
            }`}
            title={isSpeakerOn ? "In-Game Audio: ON" : "In-Game Audio: MUTED"}
          >
            {isSpeakerOn ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={() => setShowQuickPhrases(prev => !prev)}
            className="px-2 py-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 rounded-xl text-[9.5px] font-mono text-amber-300 font-bold flex items-center space-x-1 cursor-pointer"
          >
            <Smile className="w-3 h-3" />
            <span>Chat</span>
          </button>
        </div>
      </div>

      {/* Quick Phrases Dropup / Popover */}
      {showQuickPhrases && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 bg-[#120826] border border-purple-500/30 rounded-xl p-2 animate-fade-in max-h-32 overflow-y-auto">
          {QUICK_PHRASES.map((phrase, i) => (
            <button
              key={i}
              onClick={() => handleSendPhrase(phrase)}
              className="px-2 py-1 bg-white/5 hover:bg-white/15 rounded-lg text-[9.5px] text-gray-200 text-left truncate cursor-pointer transition-all border border-white/5"
            >
              {phrase}
            </button>
          ))}
        </div>
      )}

      {/* Live Recent Message Ticker */}
      {messages.length > 0 && (
        <div className="flex items-center space-x-2 bg-white/5 px-2 py-1 rounded-xl text-[9px] font-mono text-gray-300 truncate">
          <span className="font-bold text-amber-300 shrink-0">@{messages[messages.length - 1].sender}:</span>
          <span className="truncate">{messages[messages.length - 1].text}</span>
        </div>
      )}
    </div>
  );
};
