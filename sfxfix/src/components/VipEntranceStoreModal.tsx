import React, { useState } from "react";
import { X, Play, Crown, Sparkles, Volume2, ShieldCheck, CheckCircle2 } from "lucide-react";
import { VIP_ENTRY_EFFECTS, VipEntryEffect } from "../vipEntryConfig";
import { VipRideAnimationOverlay } from "./VipRideAnimationOverlay";
import { VipSvgMount } from "./VipSvgMounts";

interface VipEntranceStoreModalProps {
  userVipLevel: number;
  username: string;
  onClose: () => void;
}

export const VipEntranceStoreModal: React.FC<VipEntranceStoreModalProps> = ({
  userVipLevel,
  username,
  onClose,
}) => {
  const [selectedEffect, setSelectedEffect] = useState<VipEntryEffect>(
    VIP_ENTRY_EFFECTS.find(e => e.vipLevel === userVipLevel) || VIP_ENTRY_EFFECTS[0]
  );
  const [testActive, setTestActive] = useState<boolean>(false);

  const handleTestRide = (effect: VipEntryEffect) => {
    setSelectedEffect(effect);
    setTestActive(true);
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[90] flex items-center justify-center p-3 sm:p-4 text-left animate-fade-in">
      
      {/* Test Entrance Ride Overlay */}
      {testActive && (
        <VipRideAnimationOverlay
          vipLevel={selectedEffect.vipLevel}
          username={username}
          onClose={() => setTestActive(false)}
        />
      )}

      <div className="bg-[#12121a] border-2 border-yellow-500/30 rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl relative overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-yellow-950/40 via-[#181824] to-purple-950/40">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-yellow-500 to-amber-600 flex items-center justify-center text-black font-black shadow-lg">
              <Crown className="w-5 h-5 fill-black" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider font-mono flex items-center space-x-1.5">
                <span>VIP Entry Mounts & Rides</span>
                <span className="text-[9px] bg-yellow-500/20 text-yellow-300 border border-yellow-400/40 px-1.5 py-0.2 rounded-full font-mono">
                  12 LIVE SVG RIDES
                </span>
              </h3>
              <p className="text-[9.5px] text-gray-400 font-mono">
                5.8s SVG animated entrance effects when joining live audio rooms
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Selected Mount Hero Showcase Banner with SVG Live Animation */}
        <div className={`p-4 border-b border-white/10 bg-gradient-to-r ${selectedEffect.bannerBg} relative overflow-hidden transition-all duration-300`}>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 relative z-10">
            <div className="flex items-center space-x-3 text-center sm:text-left">
              {/* Animated Live SVG Mount Container */}
              <div className="w-20 h-20 rounded-2xl bg-black/40 border-2 border-white/30 flex items-center justify-center p-1 shadow-2xl shrink-0 overflow-hidden relative">
                <VipSvgMount vipLevel={selectedEffect.vipLevel} className="w-full h-full" />
              </div>
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-0.5 rounded-full text-[8px] font-mono font-black border ${selectedEffect.badgeBg}`}>
                    VIP {selectedEffect.vipLevel} MOUNT
                  </span>
                  {userVipLevel >= selectedEffect.vipLevel ? (
                    <span className="text-[8px] font-mono font-bold text-emerald-400 flex items-center space-x-1 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-500/30">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      <span>Unlocked</span>
                    </span>
                  ) : (
                    <span className="text-[8px] font-mono font-bold text-gray-400 bg-black/40 px-1.5 py-0.5 rounded border border-white/10">
                      Unlocks at VIP {selectedEffect.vipLevel}
                    </span>
                  )}
                </div>
                <h4 className="text-base font-black text-white font-mono uppercase tracking-wide">
                  {selectedEffect.name}
                </h4>
                <p className="text-[9.5px] text-gray-300 font-sans line-clamp-1">
                  {selectedEffect.description}
                </p>
              </div>
            </div>

            {/* Test Ride Button */}
            <button
              type="button"
              onClick={() => handleTestRide(selectedEffect)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-600 hover:brightness-110 text-black font-black text-[10px] uppercase font-mono tracking-wider transition-all shadow-lg active:scale-95 flex items-center space-x-1.5 shrink-0 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-black" />
              <span>Test 5.8s Entrance Ride</span>
            </button>
          </div>
        </div>

        {/* 12 VIP Entrance Effects Grid */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-3 scroll-view-y">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {VIP_ENTRY_EFFECTS.map((effect) => {
              const isUnlocked = userVipLevel >= effect.vipLevel;
              const isSelected = selectedEffect.vipLevel === effect.vipLevel;
              return (
                <div
                  key={effect.vipLevel}
                  onClick={() => setSelectedEffect(effect)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer relative overflow-hidden ${
                    isSelected
                      ? `bg-white/10 ${effect.borderColor} shadow-lg scale-[1.01]`
                      : "bg-[#181824] border-white/5 hover:border-white/20 hover:bg-[#1f1f2e]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${effect.mountBgGradient} border border-white/30 flex items-center justify-center text-xl shadow-md shrink-0`}>
                        <span>{effect.icon}</span>
                      </div>
                      <div className="min-w-0 text-left">
                        <div className="flex items-center space-x-1">
                          <span className={`text-[7.5px] font-mono font-black uppercase px-1.5 py-0.2 rounded ${effect.badgeBg}`}>
                            VIP {effect.vipLevel}
                          </span>
                          <span className="text-[8px] font-mono text-gray-400 font-semibold truncate">
                            {effect.category}
                          </span>
                        </div>
                        <h5 className="text-xs font-black text-white truncate mt-0.5 font-mono">
                          {effect.vehicleName}
                        </h5>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTestRide(effect);
                      }}
                      className="p-1.5 rounded-lg bg-yellow-500/20 hover:bg-yellow-500/40 text-yellow-300 transition-colors border border-yellow-400/30 shrink-0 cursor-pointer"
                      title="Test Preview"
                    >
                      <Play className="w-3 h-3 fill-yellow-300" />
                    </button>
                  </div>

                  <div className="mt-2 flex items-center justify-between text-[8px] font-mono border-t border-white/5 pt-1.5 text-gray-400">
                    <span className="truncate max-w-[150px]">{effect.soundText}</span>
                    {isUnlocked ? (
                      <span className="text-emerald-400 font-bold shrink-0">✓ Active</span>
                    ) : (
                      <span className="text-amber-400/80 font-bold shrink-0">VIP {effect.vipLevel} Req.</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 border-t border-white/10 bg-[#14141f] flex items-center justify-between text-[9px] font-mono text-gray-400">
          <div className="flex items-center space-x-1">
            <ShieldCheck className="w-3.5 h-3.5 text-yellow-400" />
            <span>VIP Entrance Ride active automatically upon entering live broads</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
