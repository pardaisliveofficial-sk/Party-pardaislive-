import React, { useState } from "react";
import { X, Users, UserCheck, Sparkles, Trophy, Send, Coins, Bot, ShieldCheck } from "lucide-react";
import { UserProfile } from "../../types";

interface GameInviteModalProps {
  gameName: string;
  currentUser: UserProfile;
  partyGuests: { username: string; avatar?: string; userLevel?: number; vipLevel?: number; isHost?: boolean }[];
  onSendInvite: (guestUsername: string, stakeCoins: number) => void;
  onPlayWithAi: (stakeCoins: number) => void;
  onClose: () => void;
}

const STAKE_OPTIONS = [100, 500, 1000, 5000, 10000, 50000];

export const GameInviteModal: React.FC<GameInviteModalProps> = ({
  gameName,
  currentUser,
  partyGuests,
  onSendInvite,
  onPlayWithAi,
  onClose
}) => {
  const [selectedStake, setSelectedStake] = useState<number>(500);
  const [invitedUsers, setInvitedUsers] = useState<string[]>([]);

  const handleInvite = (username: string) => {
    if (invitedUsers.includes(username)) return;
    setInvitedUsers(prev => [...prev, username]);
    onSendInvite(username, selectedStake);
  };

  // Filter out current user from the list
  const eligibleGuests = partyGuests.filter(g => g.username && g.username !== currentUser.username);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[999] flex items-center justify-center p-4 animate-fade-in select-none">
      <div className="bg-[#18112e] border-2 border-purple-500/40 rounded-3xl p-5 w-full max-w-sm shadow-[0_0_35px_rgba(168,85,247,0.3)] relative text-white space-y-4">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-full bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Title */}
        <div className="flex items-center space-x-2 border-b border-white/10 pb-3 text-left">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-600 flex items-center justify-center text-lg shadow-md">
            🎮
          </div>
          <div>
            <h3 className="text-sm font-black text-white uppercase tracking-wider font-mono">
              Invite to {gameName}
            </h3>
            <p className="text-[9px] text-gray-400 font-sans">
              Choose table stake & invite party room guests
            </p>
          </div>
        </div>

        {/* Stake Selector */}
        <div className="space-y-1.5 text-left">
          <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center justify-between">
            <span>Entry Stake (Coins)</span>
            <span className="text-amber-400 font-mono font-bold">Prize Pool: {(selectedStake * 2).toLocaleString()} 🪙</span>
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            {STAKE_OPTIONS.map(stake => (
              <button
                key={stake}
                onClick={() => setSelectedStake(stake)}
                className={`py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                  selectedStake === stake
                    ? "bg-gradient-to-r from-amber-400 to-yellow-500 text-black border border-amber-300 font-black scale-102 shadow-md"
                    : "bg-white/5 hover:bg-white/10 text-gray-300 border border-white/5"
                }`}
              >
                {stake >= 1000 ? `${stake / 1000}k` : stake} 🪙
              </button>
            ))}
          </div>
        </div>

        {/* Play with Smart Bot / Instant Match Button */}
        <button
          onClick={() => onPlayWithAi(selectedStake)}
          className="w-full py-2.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:brightness-110 active:scale-95 text-white font-black uppercase text-xs tracking-wider rounded-2xl shadow-md border border-purple-400/50 cursor-pointer flex items-center justify-center space-x-2 transition-all"
        >
          <Bot className="w-4 h-4 text-cyan-300" />
          <span>Quick Match (Instant AI / Online)</span>
        </button>

        {/* Party Guests List */}
        <div className="space-y-2 text-left">
          <div className="flex items-center justify-between text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            <span>Party Room Guests ({eligibleGuests.length})</span>
          </div>

          <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
            {eligibleGuests.length === 0 ? (
              <div className="text-center py-4 text-[10px] text-gray-500 font-mono">
                No other seated guests in party right now. Use Quick Match above!
              </div>
            ) : (
              eligibleGuests.map((guest, idx) => {
                const isInvited = invitedUsers.includes(guest.username);
                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/5 hover:border-purple-500/30 transition-all"
                  >
                    <div className="flex items-center space-x-2 min-w-0">
                      <img
                        src={guest.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=60&h=60&q=80"}
                        alt={guest.username}
                        className="w-8 h-8 rounded-full object-cover border border-white/10"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center space-x-1">
                          <span className="text-[11px] font-black text-white truncate">@{guest.username}</span>
                          {guest.isHost && (
                            <span className="text-[7px] bg-amber-400 text-black px-1 rounded font-black font-mono">HOST</span>
                          )}
                        </div>
                        <span className="text-[8px] text-purple-300 font-mono">Lv.{guest.userLevel || 1}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleInvite(guest.username)}
                      disabled={isInvited}
                      className={`px-3 py-1 rounded-xl text-[10px] font-mono font-bold transition-all cursor-pointer ${
                        isInvited
                          ? "bg-emerald-600/40 text-emerald-300 border border-emerald-500/50 cursor-default"
                          : "bg-gradient-to-r from-pink-500 to-rose-600 hover:brightness-110 text-white shadow active:scale-95"
                      }`}
                    >
                      {isInvited ? "Invited ✓" : "Invite 🎮"}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
