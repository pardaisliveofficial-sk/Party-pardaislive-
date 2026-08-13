import React, { useState, useEffect, useRef } from "react";
import { getProgressionFromCoins } from "../levelUtils";
import {
  Heart,
  MessageSquare,
  Bookmark,
  Share2,
  Download,
  Sparkles,
  VolumeX,
  Volume2,
  RefreshCw,
  Lock,
  Globe,
  Send,
  ArrowLeft,
  Film,
  LockKeyhole,
  Search,
  User,
  Check,
  Plus,
  MessageCircle
} from "lucide-react";

// Normalize Cloudflare R2 / S3 custom public domains
const normalizeReelUrl = (url: string): string => {
  if (!url) return "";

  if (url.startsWith("blob:") || url.startsWith("file:") || url.startsWith("content:")) {
    return url;
  }

  // Handle local fallback uploads with relative path for web preview and absolute domain for android APK
  if (url.startsWith("/uploads/")) {
    const isAndroidAPK = typeof window !== "undefined" && (
      (window as any).Capacitor || 
      window.location.protocol === "file:" ||
      window.location.protocol.includes("capacitor")
    );
    if (isAndroidAPK) {
      return `https://api.pardaisparty.soulverseapps.com${url}`;
    }
    return url;
  }

  // Parse reels/ key from the URL and convert to public custom R2 delivery domain
  const reelsIndex = url.indexOf("reels/");
  if (reelsIndex !== -1) {
    const objectKey = url.substring(reelsIndex);
    return `https://media.pardaisparty.soulverseapps.com/${objectKey}`;
  }

  // If S3 or Cloudflare old endpoint
  if (url.includes("cloudflarestorage.com") || url.includes("amazonaws.com") || url.includes("pardaisparty-reels")) {
    const parts = url.split("pardaisparty-reels/");
    if (parts.length > 1 && parts[1]) {
      return `https://media.pardaisparty.soulverseapps.com/${parts[1]}`;
    }
  }

  return url;
};

interface ReelVideoPlayerProps {
  videoUrl: string;
  muted: boolean;
  isActive: boolean;
  videoBg?: string;
  onToggleMute: () => void;
}

const ReelVideoPlayer: React.FC<ReelVideoPlayerProps> = ({
  videoUrl,
  muted,
  isActive,
  videoBg = "bg-[#12121a]",
  onToggleMute,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);

  const cleanUrl = normalizeReelUrl(videoUrl);
  const [activeUrl, setActiveUrl] = useState<string>(cleanUrl);
  const [retryCount, setRetryCount] = useState<number>(0);

  // Keep activeUrl and retryCount in sync when videoUrl / cleanUrl changes
  useEffect(() => {
    setActiveUrl(cleanUrl);
    setRetryCount(0);
    setHasError(false);
  }, [cleanUrl]);

  // Play / Pause effect based on isActive state
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isActive) {
      setHasError(false);
      setIsLoading(true);
      console.log(`[PARDAIS-PARTY PLAYER] Playing URL: "${activeUrl}" (original: "${videoUrl}")`);
      video.load(); // Force fresh reload of the new URL
      video.play()
        .then(() => {
          setIsPlaying(true);
          setIsLoading(false);
        })
        .catch((err) => {
          console.warn("[PARDAIS-PARTY PLAYER] Playback blocked or interrupted by browser autoplay policy:", err);
          setIsPlaying(false);
          setIsLoading(false);
        });
    } else {
      video.pause();
      setIsPlaying(false);
    }
  }, [isActive, activeUrl]);

  // Full-scale memory and decoder cleanup on unmount
  useEffect(() => {
    return () => {
      const video = videoRef.current;
      if (video) {
        try {
          console.log("[PARDAIS-PARTY PLAYER] Disposing video player resources cleanly...");
          video.pause();
          video.src = "";
          video.load();
        } catch (e) {
          console.error("[PARDAIS-PARTY PLAYER] Error disposing player:", e);
        }
      }
    };
  }, []);

  // Handle Play/Pause Tap on video
  const handleVideoTap = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      video.play()
        .then(() => {
          setIsPlaying(true);
          setHasError(false);
        })
        .catch((err) => {
          console.error("[PARDAIS-PARTY PLAYER] Manual play failed:", err);
        });
    }
  };

  return (
    <div 
      onClick={handleVideoTap}
      className={`absolute inset-0 ${videoBg} flex items-center justify-center overflow-hidden cursor-pointer`}
    >
      {/* Real Video Element */}
      {!hasError && activeUrl && (
        <video
          ref={videoRef}
          src={activeUrl}
          className="w-full h-full object-cover z-0"
          loop
          playsInline
          muted={muted}
          onWaiting={() => setIsLoading(true)}
          onPlaying={() => {
            setIsLoading(false);
            setHasError(false);
          }}
          onCanPlay={() => setIsLoading(false)}
          onLoadedData={() => setIsLoading(false)}
          onError={(e) => {
            const errCode = (e.currentTarget as HTMLVideoElement)?.error?.code || 0;
            const errMsg = (e.currentTarget as HTMLVideoElement)?.error?.message || "Source or format unavailable";
            console.warn(`[PARDAIS-PARTY PLAYER] Native HTML5 video error note (code: ${errCode}, msg: "${errMsg}") on "${activeUrl}"`);
            
            // IMPORTANT: Never replace a user's uploaded reel with a demo/system video.
            // The previous implementation silently switched to public sample MP4s when
            // the real URL failed, which made every uploaded reel appear as the same
            // system video. Retry the exact uploaded URL only, then show the real error.
            if (retryCount < 2) {
              const nextRetry = retryCount + 1;
              setRetryCount(nextRetry);
              setHasError(false);
              setIsLoading(true);

              setTimeout(() => {
                const v = videoRef.current;
                if (v) {
                  v.load();
                  v.play().catch((err) => {
                    console.warn("[PARDAIS-PARTY PLAYER] Retry play call was blocked or failed:", err);
                  });
                }
              }, 500);
            } else {
              setHasError(true);
              setIsLoading(false);
            }
          }}
        />
      )}

      {/* Loading overlay spinner */}
      {isLoading && !hasError && (
        <div className="absolute inset-0 bg-black/30 z-10 flex items-center justify-center pointer-events-none">
          <div className="w-8 h-8 border-4 border-[#ff007f] border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      {/* Playback Error overlay */}
      {hasError && (
        <div className="absolute inset-0 bg-black/90 z-20 flex flex-col items-center justify-center p-6 text-center space-y-4">
          <div className="p-3 bg-red-500/10 rounded-full border border-red-500/30">
            <VolumeX className="w-8 h-8 text-red-500 animate-pulse" />
          </div>
          <div>
            <h4 className="text-sm font-black text-white uppercase tracking-wider font-mono">PLAYBACK CONNECTION FAILED</h4>
            <p className="text-[9px] text-gray-400 mt-1.5 max-w-[240px] leading-relaxed">
              Your connection failed or the R2 media link is still provisioning. Retrying with ultra-speed CDN fallback...
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export function recommendReels(
  reelsList: any[],
  interactions: Record<string, {
    watchTime: number;
    completions: number;
    rewatches: number;
    skippedQuickly: boolean;
    likes: number;
    commentsCount: number;
    shares: number;
    saves: number;
    isFollowed: boolean;
  }> = {}
) {
  return [...(reelsList || [])].sort((a, b) => {
    // 1. Calculate general engagement score (baseline for trending/popular content)
    const popularityA = (a.likes || 0) * 1 + (a.commentsCount || 0) * 2 + (a.shares || 0) * 3 + (a.saves || 0) * 2;
    const popularityB = (b.likes || 0) * 1 + (b.commentsCount || 0) * 2 + (b.shares || 0) * 3 + (b.saves || 0) * 2;
    
    let scoreA = popularityA * 0.01;
    let scoreB = popularityB * 0.01;

    // 2. Adjust score based on explicit interactions
    const interA = interactions[a.id];
    const interB = interactions[b.id];

    if (interA) {
      scoreA += (interA.watchTime || 0) * 2;
      scoreA += (interA.completions || 0) * 25;
      scoreA += (interA.rewatches || 0) * 40;
      if (interA.skippedQuickly) {
        scoreA -= 50;
      }
    }

    if (interB) {
      scoreB += (interB.watchTime || 0) * 2;
      scoreB += (interB.completions || 0) * 25;
      scoreB += (interB.rewatches || 0) * 40;
      if (interB.skippedQuickly) {
        scoreB -= 50;
      }
    }

    // 3. Regional and language relevance boost
    const isPakA = a.location?.toLowerCase().includes("pakistan") || a.caption?.toLowerCase().includes("urdu") || a.caption?.toLowerCase().includes("sahr");
    const isPakB = b.location?.toLowerCase().includes("pakistan") || b.caption?.toLowerCase().includes("urdu") || b.caption?.toLowerCase().includes("sahr");
    
    if (isPakA) scoreA += 15;
    if (isPakB) scoreB += 15;

    // 4. Follow boost
    if (a.isFollowed) scoreA += 30;
    if (b.isFollowed) scoreB += 30;

    return scoreB - scoreA;
  });
}

export interface ReelsViewProps {
  reels: any[];
  setReels: React.Dispatch<React.SetStateAction<any[]>>;
  user: any;
  setUser: React.Dispatch<React.SetStateAction<any>>;
  goBack: () => void;
  reelsTab: "foryou" | "following" | "explore";
  setReelsTab: (tab: "foryou" | "following" | "explore") => void;
  clientView: string;
  setClientView: (view: string) => void;
  reelsMuted: boolean;
  setReelsMuted: React.Dispatch<React.SetStateAction<boolean>>;
  blockedUsers: string[];
  toggleSaveReel: (id: string) => void;
  triggerDownloadReel: (id: string) => void;
  downloadProgress: number | null;
  downloadingReelId: string | null;
  shareToPardaisChat: (reel: any) => void;
  currentReelIndex: number;
  setCurrentReelIndex: React.Dispatch<React.SetStateAction<number>>;
  dragY: number;
  setDragY: (y: number) => void;
  reelInteractions: Record<string, any>;
  setReelInteractions: React.Dispatch<React.SetStateAction<any>>;
  onOpenUploadReel?: () => void;
  onRequireAuth?: (actionName: string) => boolean;
}

export const ReelsView: React.FC<ReelsViewProps> = ({
  reels,
  setReels,
  user,
  setUser,
  goBack,
  reelsTab,
  setReelsTab,
  clientView,
  setClientView,
  reelsMuted,
  setReelsMuted,
  blockedUsers,
  toggleSaveReel,
  triggerDownloadReel,
  downloadProgress,
  downloadingReelId,
  shareToPardaisChat,
  currentReelIndex,
  setCurrentReelIndex,
  dragY,
  setDragY,
  reelInteractions,
  setReelInteractions,
  onOpenUploadReel,
  onRequireAuth
}) => {
  const [showCommentDrawer, setShowCommentDrawer] = useState<boolean>(false);
  const [newCommentText, setNewCommentText] = useState<string>("");
  const [selectedCommentForReply, setSelectedCommentForReply] = useState<{ commentId: string; userName: string } | null>(null);
  const [replyText, setReplyText] = useState<string>("");
  const [showShareDrawer, setShowShareDrawer] = useState<boolean>(false);
  const [showReelGiftOverlay, setShowReelGiftOverlay] = useState<boolean>(false);
  const [activeReelGiftAnimation, setActiveReelGiftAnimation] = useState<{ icon: string; name: string } | null>(null);

  const [pullY, setPullY] = useState<number>(0);
  const [isPulling, setIsPulling] = useState<boolean>(false);
  const [pullStartY, setPullStartY] = useState<number>(0);
  const lastTouchYRef = useRef<number>(0);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // TikTok-style Search & Creator Interaction State
  const [showSearch, setShowSearch] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchTab, setSearchTab] = useState<"top" | "users" | "videos">("top");
  const [selectedUserProfile, setSelectedUserProfile] = useState<any | null>(null);
  const [selectedUserChat, setSelectedUserChat] = useState<any | null>(null);
  const [directChatText, setDirectChatText] = useState<string>("");
  const [localDMs, setLocalDMs] = useState<Record<string, Array<{ sender: string; text: string; timestamp: string }>>>({});

  // Derive unique creators from reels
  const searchCreators = React.useMemo(() => {
    const creatorMap: Record<string, any> = {};
    reels.forEach(r => {
      if (!creatorMap[r.creator]) {
        creatorMap[r.creator] = {
          username: r.creator,
          avatar: r.avatar,
          isFollowed: r.isFollowed || false,
          bio: r.creator === "Pardais Party 🎵" 
            ? "Official Pardais Party Star 🌟 Singer | Performer | PK King Pakistan"
            : `Pardais Party Official Content Creator 🎥 | ${r.location || "Pakistan"}`,
          followers: r.creator === "Pardais Party 🎵" ? "1.4M" : "142K",
          following: r.creator === "Pardais Party 🎵" ? "280" : "185",
          likes: r.creator === "Pardais Party 🎵" ? "25.4M" : "890K",
          videos: []
        };
      }
      creatorMap[r.creator].videos.push(r);
    });
    return Object.values(creatorMap);
  }, [reels]);

  const filteredCreators = React.useMemo(() => {
    if (!searchQuery.trim()) return searchCreators || [];
    return (searchCreators || []).filter(c => 
      (c?.username || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c?.bio || "").toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchCreators, searchQuery]);

  const filteredSearchReels = React.useMemo(() => {
    if (!searchQuery.trim()) return reels || [];
    return (reels || []).filter(r => 
      (r?.creator || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r?.caption || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r?.song || "").toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [reels, searchQuery]);

  // Filter and sort reels
  const filteredReels = (reels || []).filter(r => {
    if (!r) return false;
    if ((blockedUsers || []).includes(r.creator)) return false;
    if (reelsTab === "following") return r.isFollowed && r.privacy === "public";
    if (reelsTab === "explore") return r.isExplore && r.privacy === "public";
    return r.privacy === "public";
  });

  const sortedReels = reelsTab === "foryou"
    ? recommendReels(filteredReels, reelInteractions)
    : filteredReels;

  const safeIndex = currentReelIndex >= sortedReels.length ? 0 : currentReelIndex;
  const currentReel = sortedReels[safeIndex];

  return (
    <div className="flex-1 flex flex-col bg-[#09090e] relative select-none pb-0 w-full h-full">
      {/* Custom Keyframe Animations */}
      <style>{`
        @keyframes floatUp {
          0% { transform: translateY(0) scale(0.6); opacity: 0; }
          15% { opacity: 1; }
          85% { opacity: 1; }
          100% { transform: translateY(-350px) scale(1.3); opacity: 0; }
        }
        @keyframes carDrive {
          0% { transform: translateX(-150%) scale(0.8); }
          45% { transform: translateX(0) scale(1.1); }
          55% { transform: translateX(0) scale(1.1); }
          100% { transform: translateX(150%) scale(0.8); }
        }
        .animate-float-up {
          animation: floatUp 2s ease-out forwards;
        }
        .animate-car-drive {
          animation: carDrive 2.5s ease-in-out forwards;
        }
        @keyframes spinSlow {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spinSlow 5s linear infinite;
        }
      `}</style>

      {/* Fixed Header Tab Navigation Bar */}
      <div className="absolute top-0 inset-x-0 bg-gradient-to-b from-black/95 via-black/45 to-transparent flex items-center justify-between px-4 z-40 pt-10 pb-4">
        <button
          type="button"
          onClick={goBack}
          className="p-2 rounded-full bg-black/45 backdrop-blur-md border border-white/10 text-white hover:bg-white hover:text-black transition-all cursor-pointer flex-shrink-0 shadow"
          title="Back"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        
        <div className="flex items-center space-x-6">
          <button
            onClick={() => {
              setReelsTab("following");
              setCurrentReelIndex(0);
            }}
            className={`text-xs font-black tracking-wider uppercase transition-all duration-200 relative pb-1.5 ${
              reelsTab === "following" ? "text-[#ff007f] scale-105 font-black" : "text-white/60 hover:text-white"
            }`}
          >
            Following
            {reelsTab === "following" && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-[#ff007f] rounded-full"></span>
            )}
          </button>
          
          <button
            onClick={() => {
              setReelsTab("foryou");
              setCurrentReelIndex(0);
            }}
            className={`text-xs font-black tracking-wider uppercase transition-all duration-200 relative pb-1.5 ${
              reelsTab === "foryou" ? "text-[#ff007f] scale-105 font-black" : "text-white/60 hover:text-white"
            }`}
          >
            For You
            {reelsTab === "foryou" && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-[#ff007f] rounded-full"></span>
            )}
          </button>

          <button
            onClick={() => {
              setReelsTab("explore");
              setCurrentReelIndex(0);
            }}
            className={`text-xs font-black tracking-wider uppercase transition-all duration-200 relative pb-1.5 ${
              reelsTab === "explore" ? "text-[#ff007f] scale-105 font-black" : "text-white/60 hover:text-white"
            }`}
          >
            Explore 🌍
            {reelsTab === "explore" && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-[#ff007f] rounded-full"></span>
            )}
          </button>
        </div>
        
        <div className="flex items-center space-x-2">
          {onOpenUploadReel && (
            <button
              onClick={onOpenUploadReel}
              className="p-2 rounded-full bg-gradient-to-r from-[#ff007f] via-[#7b2cbf] to-[#66fcf1] text-white hover:brightness-110 transition-all cursor-pointer flex-shrink-0 shadow active:scale-95 border border-pink-400/30"
              title="Create & Upload Reel"
            >
              <Plus className="w-4 h-4 text-white" />
            </button>
          )}
          <button
            onClick={() => setShowSearch(true)}
            className="p-2 rounded-full bg-black/45 backdrop-blur-md border border-white/10 text-white hover:bg-[#ff007f] hover:text-white transition-all cursor-pointer flex-shrink-0 shadow active:scale-95"
            title="Search Reels & Creators"
          >
            <Search className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Pull-to-Refresh Slider Indicator */}
      <div
        className="absolute inset-x-0 top-0 flex flex-col items-center justify-center bg-[#ff007f]/10 border-b border-[#ff007f]/20 text-center transition-all z-50 pointer-events-none"
        style={{
          height: `${pullY}px`,
          opacity: pullY > 0 ? 1 : 0,
          overflow: "hidden"
        }}
      >
        <div className="flex items-center space-x-2 text-white text-[10px] font-black uppercase font-mono tracking-wider">
          <RefreshCw className={`w-3.5 h-3.5 text-pink-400 ${pullY > 60 ? "animate-spin" : ""}`} />
          <span>{pullY > 60 ? "Release to Refresh Pardais Stream!" : "Pull Down to Refresh..."}</span>
        </div>
        <span className="text-[7.5px] text-gray-400 font-mono mt-0.5">Pardais Pakistan CDN Direct Hub</span>
      </div>

      {/* Main Gestures & Display Area */}
      {sortedReels.length === 0 ? (
        <div className="flex-1 flex flex-col justify-center items-center bg-[#09090e] p-6 text-center space-y-4">
          <Film className="w-12 h-12 text-[#ff007f] animate-pulse" />
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">No Reels Available!</h3>
            <p className="text-[9px] text-gray-400 mt-1 max-w-[220px] mx-auto leading-relaxed">
              No short-video content matches this filter currently. Be the first to upload a video or explore other tabs!
            </p>
          </div>
          <div className="flex items-center space-x-2">
            {onOpenUploadReel && (
              <button
                onClick={onOpenUploadReel}
                className="px-4 py-2 bg-gradient-to-r from-[#ff007f] to-[#7b2cbf] rounded-full text-[9px] font-black text-white uppercase tracking-wider flex items-center space-x-1.5 shadow-lg active:scale-95 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Upload Reel Now 🎬</span>
              </button>
            )}
            <button
              onClick={() => setReelsTab("foryou")}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/10 rounded-full text-[9px] font-black text-white uppercase tracking-wider"
            >
              Go to For You
            </button>
          </div>
        </div>
      ) : (
        <div
          className="flex-1 flex flex-col bg-black relative overflow-hidden cursor-grab active:cursor-grabbing h-full w-full"
          onMouseDown={(e) => {
            setIsPulling(true);
            setPullStartY(e.clientY);
            lastTouchYRef.current = e.clientY;
          }}
          onMouseMove={(e) => {
            if (!isPulling) return;
            lastTouchYRef.current = e.clientY;
            const diff = e.clientY - pullStartY;
            if (diff > 0 && safeIndex === 0) {
              setPullY(Math.min(90, diff));
              setDragY(Math.min(90, diff));
            } else {
              setPullY(0);
              setDragY(diff);
            }
          }}
          onMouseUp={() => {
            if (isPulling) {
              setIsPulling(false);
              const totalDiffY = lastTouchYRef.current - pullStartY;
              setDragY(0);
              setPullY(0);

              if (totalDiffY < -60) {
                setCurrentReelIndex(prev => (prev + 1) % sortedReels.length);
              } else if (totalDiffY > 60) {
                if (safeIndex === 0) {
                  setIsRefreshing(true);
                  setTimeout(() => {
                    setReels(prev => {
                      const shuffled = [...prev];
                      for (let i = shuffled.length - 1; i > 0; i--) {
                        const j = Math.floor(Math.random() * (i + 1));
                        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
                      }
                      return shuffled;
                    });
                    setIsRefreshing(false);
                    setCurrentReelIndex(0);
                  }, 1000);
                } else {
                  setCurrentReelIndex(prev => (prev - 1 + sortedReels.length) % sortedReels.length);
                }
              }
            }
          }}
          onMouseLeave={() => {
            if (isPulling) {
              setIsPulling(false);
              setDragY(0);
              setPullY(0);
            }
          }}
          onTouchStart={(e) => {
            setIsPulling(true);
            setPullStartY(e.touches[0].clientY);
            lastTouchYRef.current = e.touches[0].clientY;
          }}
          onTouchMove={(e) => {
            if (!isPulling) return;
            lastTouchYRef.current = e.touches[0].clientY;
            const diff = e.touches[0].clientY - pullStartY;
            if (diff > 0 && safeIndex === 0) {
              setPullY(Math.min(90, diff));
              setDragY(Math.min(90, diff));
            } else {
              setPullY(0);
              setDragY(diff);
            }
          }}
          onTouchEnd={() => {
            if (isPulling) {
              setIsPulling(false);
              const totalDiffY = lastTouchYRef.current - pullStartY;
              setDragY(0);
              setPullY(0);

              if (totalDiffY < -60) {
                setCurrentReelIndex(prev => (prev + 1) % sortedReels.length);
              } else if (totalDiffY > 60) {
                if (safeIndex === 0) {
                  setIsRefreshing(true);
                  setTimeout(() => {
                    setReels(prev => {
                      const shuffled = [...prev];
                      for (let i = shuffled.length - 1; i > 0; i--) {
                        const j = Math.floor(Math.random() * (i + 1));
                        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
                      }
                      return shuffled;
                    });
                    setIsRefreshing(false);
                    setCurrentReelIndex(0);
                  }, 1000);
                } else {
                  setCurrentReelIndex(prev => (prev - 1 + sortedReels.length) % sortedReels.length);
                }
              }
            }
          }}
        >
          {/* Refreshing Overlay Spinner */}
          {isRefreshing && (
            <div className="absolute inset-0 bg-black/80 z-50 flex flex-col items-center justify-center space-y-3 pointer-events-none">
              <div className="w-10 h-10 border-4 border-[#ff007f] border-t-transparent rounded-full animate-spin"></div>
              <div className="text-center">
                <p className="text-[10px] font-black text-[#ff007f] uppercase font-mono tracking-widest">Refreshing Live Stream</p>
                <p className="text-[7.5px] text-gray-500 font-mono mt-0.5">Contacting Karachi & Lahore CDNs...</p>
              </div>
            </div>
          )}

          {/* Slidably Connected Reel Track */}
          <div
            className="w-full h-full flex flex-col"
            style={{
              transform: `translateY(calc(-${safeIndex * 100}% + ${dragY}px))`,
              transition: isPulling ? "none" : "transform 350ms cubic-bezier(0.15, 0.45, 0.3, 1)"
            }}
          >
            {sortedReels.map((reel, idx) => {
              const isCurrentlyActive = idx === safeIndex;
              const isRendered = Math.abs(idx - safeIndex) <= 1 || 
                                 (safeIndex === 0 && idx === sortedReels.length - 1) || 
                                 (safeIndex === sortedReels.length - 1 && idx === 0);

              if (!isRendered) {
                return (
                  <div key={`${reel.id || 'spacer'}-${idx}`} className="w-full h-full shrink-0 bg-[#040406]" />
                );
              }

              return (
                <div 
                  key={`${reel.id || 'active'}-${idx}`} 
                  className="w-full h-full shrink-0 relative bg-black flex flex-col justify-end"
                >
                  <ReelVideoPlayer
                    videoUrl={reel.videoUrl}
                    muted={reelsMuted}
                    isActive={clientView === "reels" && isCurrentlyActive && !isRefreshing}
                    videoBg={reel.videoBg}
                    onToggleMute={() => setReelsMuted(prev => !prev)}
                  />

                  {/* Gradient Backing for text readability */}
                  <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/95 via-black/40 to-transparent pointer-events-none z-10" />

                  {/* Top Mute/Volume controls */}
                  <div className="absolute top-24 right-4 z-20 pointer-events-auto">
                    <button
                      onClick={() => setReelsMuted(!reelsMuted)}
                      className="p-1.5 bg-black/45 hover:bg-black/75 rounded-full text-white transition-all border border-white/5"
                    >
                      {reelsMuted ? <VolumeX className="w-3.5 h-3.5 text-red-400 animate-pulse" /> : <Volume2 className="w-3.5 h-3.5 text-green-400" />}
                    </button>
                  </div>

                  {/* Left Side Info Panel */}
                  <div className="absolute bottom-4 left-3 z-20 max-w-[70%] text-left space-y-2 pointer-events-auto">
                    <div className="flex items-center space-x-1.5 flex-wrap">
                      <span className="text-sm font-black text-white hover:underline cursor-pointer">@{reel.creator}</span>
                      <span className="text-[7px] bg-[#ff007f] text-white px-1.5 py-0.5 rounded-full font-black uppercase tracking-wider font-mono">LIVE MATCH</span>
                      {reel.privacy === "private" ? (
                        <span className="text-[6.5px] bg-red-500/20 text-red-400 border border-red-500/20 px-1 py-0.5 rounded font-bold flex items-center space-x-0.5">
                          <Lock className="w-1.5 h-1.5" />
                          <span>PRIVATE</span>
                        </span>
                      ) : (
                        <span className="text-[6.5px] bg-green-500/20 text-green-400 border border-green-500/20 px-1 py-0.5 rounded font-bold flex items-center space-x-0.5 font-mono">
                          <Globe className="w-1.5 h-1.5" />
                          <span>PUBLIC</span>
                        </span>
                      )}
                    </div>

                    <p className="text-[10px] text-gray-200 leading-relaxed font-medium drop-shadow">
                      {reel.caption}
                    </p>

                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      <div className="flex items-center space-x-1 text-white/90 text-[8px] font-mono bg-black/40 backdrop-blur-sm px-2 py-1 rounded-full max-w-[170px] border border-white/5">
                        <span className="animate-pulse text-pink-400">🎵</span>
                        <span className="truncate">{reel.song}</span>
                      </div>

                      {reel.location && (
                        <div className="flex items-center space-x-1 text-cyan-400 text-[8px] font-mono bg-[#12121a]/80 border border-cyan-500/20 px-2 py-1 rounded-full">
                          <span>📍 {reel.location}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Side Vertical Control Column */}
                  <div className="absolute right-2 bottom-4 flex flex-col items-center space-y-3 z-20 pointer-events-auto">
                    
                    {/* User Profile and Follow button */}
                    <div className="relative flex flex-col items-center mb-1">
                      <div className="w-10 h-10 rounded-full border-2 border-[#ff007f] overflow-hidden bg-[#1e1e2d] shadow-xl transition-all hover:scale-105 active:scale-95">
                        <img src={reel.avatar} className="w-full h-full object-cover" alt="creator" />
                      </div>
                      <button
                        onClick={() => {
                          if (onRequireAuth && !onRequireAuth("follow creators")) return;
                          setReels(prev => prev.map(r => {
                            if (r.creator === reel.creator) {
                              return { ...r, isFollowed: !r.isFollowed };
                            }
                            return r;
                          }));
                          alert(reel.isFollowed ? `Unfollowed @${reel.creator}` : `Followed @${reel.creator}! Added to your 'Following' Reels feed!`);
                        }}
                        className={`absolute -bottom-1.5 left-1/2 -translate-x-1/2 rounded-full font-black text-[9px] w-4.5 h-4.5 flex items-center justify-center text-white border border-[#12121a] shadow transition-all duration-300 ${
                          reel.isFollowed ? "bg-[#00f5ff] text-[#051622]" : "bg-[#ff007f]"
                        }`}
                      >
                        {reel.isFollowed ? "✓" : "+"}
                      </button>
                    </div>

                    {/* Like Action */}
                    <button
                      onClick={() => {
                        if (onRequireAuth && !onRequireAuth("like short videos")) return;
                        setReels(prev => prev.map(r => {
                          if (r.id === reel.id) {
                            const newLiked = !r.liked;
                            return {
                              ...r,
                              liked: newLiked,
                              likes: r.likes + (newLiked ? 1 : -1)
                            };
                          }
                          return r;
                        }));
                      }}
                      className="flex flex-col items-center group active:scale-75 transition-transform"
                    >
                      <div className={`p-2.5 rounded-full backdrop-blur-md border transition-all duration-300 ${
                        reel.liked 
                          ? "bg-red-500 text-white border-red-500/30 shadow-[0_0_12px_rgba(239,68,68,0.5)]" 
                          : "bg-black/40 text-white border-white/10 hover:bg-black/65"
                      }`}>
                        <Heart className={`w-4 h-4 ${reel.liked ? "fill-current scale-110" : ""}`} />
                      </div>
                      <span className="text-[9px] font-mono font-black text-white mt-1">{reel.likes}</span>
                    </button>

                    {/* Comment Drawer Trigger */}
                    <button
                      onClick={() => {
                        if (onRequireAuth && !onRequireAuth("comment on videos")) return;
                        setShowCommentDrawer(true);
                      }}
                      className="flex flex-col items-center active:scale-75 transition-transform"
                    >
                      <div className="p-2.5 rounded-full bg-black/40 text-white border border-white/10 hover:bg-black/65 backdrop-blur-md">
                        <MessageSquare className="w-4 h-4" />
                      </div>
                      <span className="text-[9px] font-mono font-black text-white mt-1">{reel.commentsCount}</span>
                    </button>

                    {/* Save Bookmark Action */}
                    <button
                      onClick={() => toggleSaveReel(reel.id)}
                      className="flex flex-col items-center active:scale-75 transition-transform"
                    >
                      <div className={`p-2.5 rounded-full backdrop-blur-md border transition-all duration-300 ${
                        reel.saved 
                          ? "bg-yellow-500 text-white border-yellow-500/30 shadow-[0_0_12px_rgba(234,179,8,0.5)]" 
                          : "bg-black/40 text-white border-white/10 hover:bg-black/65"
                      }`}>
                        <Bookmark className={`w-4 h-4 ${reel.saved ? "fill-current" : ""}`} />
                      </div>
                      <span className="text-[9px] font-mono font-black text-white mt-1">{reel.saves}</span>
                    </button>

                    {/* Share Action */}
                    <button
                      onClick={() => setShowShareDrawer(true)}
                      className="flex flex-col items-center active:scale-75 transition-transform"
                    >
                      <div className="p-2.5 rounded-full bg-black/40 text-white border border-white/10 hover:bg-black/65 backdrop-blur-md">
                        <Share2 className="w-4 h-4" />
                      </div>
                      <span className="text-[9px] font-mono font-black text-white mt-1">{reel.shares}</span>
                    </button>

                    {/* Download Action */}
                    <button
                      onClick={() => triggerDownloadReel(reel.id)}
                      disabled={downloadingReelId !== null}
                      className="flex flex-col items-center active:scale-75 transition-transform"
                    >
                      <div className={`p-2.5 rounded-full border backdrop-blur-md transition-all duration-300 ${
                        downloadingReelId === reel.id
                          ? "bg-[#00f5ff]/20 text-[#00f5ff] border-[#00f5ff]/40 animate-pulse"
                          : "bg-black/40 text-white border-white/10 hover:bg-black/65"
                      }`}>
                        <Download className="w-4 h-4" />
                      </div>
                      <span className="text-[9px] font-mono font-black text-white mt-1">
                        {downloadingReelId === reel.id ? `${downloadProgress}%` : reel.downloads}
                      </span>
                    </button>

                    {/* Gift Action Trigger */}
                    <button
                      onClick={() => setShowReelGiftOverlay(!showReelGiftOverlay)}
                      className="flex flex-col items-center active:scale-75 transition-transform"
                    >
                      <div className={`p-2.5 rounded-full border backdrop-blur-md ${
                        showReelGiftOverlay ? "bg-[#ff007f] text-white border-[#ff007f] shadow-[0_0_12px_#ff007f]" : "bg-black/40 text-pink-500 border-pink-500/25 hover:bg-black/65"
                      }`}>
                        <Sparkles className="w-4 h-4 animate-pulse" />
                      </div>
                      <span className="text-[8px] font-black uppercase text-pink-400 mt-1">GIFT 🎁</span>
                    </button>

                    {/* Spinning Vinyl Soundtrack Record */}
                    <div className="relative w-10 h-10 mt-1 flex items-center justify-center">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-gray-900 via-gray-700 to-black border border-white/20 flex items-center justify-center animate-spin-slow shadow-lg">
                        <div className="w-3.5 h-3.5 rounded-full overflow-hidden bg-pink-500 flex items-center justify-center">
                          <img src={reel.avatar} className="w-full h-full object-cover" alt="disc" />
                        </div>
                      </div>
                      <span className="absolute bottom-0 right-0 text-[10px] animate-bounce">🎵</span>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Gift animation showcase popup */}
      {activeReelGiftAnimation && (
        <div className="absolute inset-0 z-50 pointer-events-none flex flex-col items-center justify-center bg-black/30">
          {activeReelGiftAnimation.icon === "🌹" && (
            <div className="relative w-full h-full overflow-hidden">
              {[...Array(15)].map((_, i) => (
                <span
                  key={i}
                  className="absolute text-4xl animate-float-up text-red-500"
                  style={{
                    left: `${10 + Math.random() * 80}%`,
                    bottom: "5%",
                    animationDelay: `${i * 0.15}s`,
                    animationDuration: `${1.5 + Math.random() * 1.5}s`
                  }}
                >
                  🌹
                </span>
              ))}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/85 border border-pink-500 rounded-2xl p-4 text-center shadow">
                <span className="text-5xl animate-bounce block">🌹</span>
                <p className="text-white text-[11px] font-black mt-2 uppercase tracking-widest font-mono">Rose Shower Sent!</p>
                <span className="text-[8px] text-gray-400 block mt-0.5">Deducted 10 Coins</span>
              </div>
            </div>
          )}
          
          {activeReelGiftAnimation.icon === "👑" && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/90 border-2 border-yellow-400 rounded-3xl p-6 text-center animate-pulse shadow-[0_0_30px_rgba(234,179,8,0.5)]">
              <span className="text-7xl animate-spin-slow block mb-2">👑</span>
              <p className="text-yellow-400 text-xs font-black uppercase tracking-widest font-mono">PK KING CROWN SENT!</p>
              <span className="text-[9px] text-white/70 block mt-1">Glitter shower activated on @{currentReel?.creator}</span>
              <span className="text-[8px] text-yellow-500/90 block font-mono font-bold">(-250 Coins)</span>
            </div>
          )}

          {activeReelGiftAnimation.icon === "🏎️" && (
            <div className="absolute inset-x-0 bottom-1/4 flex flex-col items-center pointer-events-none">
              <div className="animate-car-drive flex items-center space-x-2">
                <span className="text-7xl">🏎️💨</span>
              </div>
              <div className="bg-black/90 border border-cyan-400 rounded-2xl px-5 py-2.5 text-center mt-6 shadow-[0_0_20px_rgba(34,211,238,0.3)]">
                <p className="text-cyan-400 text-[10px] font-black uppercase tracking-widest font-mono">Sports Car Drifting Sent!</p>
                <span className="text-[8px] text-gray-400 font-mono block">Deducted 1,000 Coins</span>
              </div>
            </div>
          )}

          {activeReelGiftAnimation.icon === "🏰" && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/90 border-2 border-purple-500 rounded-3xl p-6 text-center shadow-[0_0_40px_rgba(168,85,247,0.5)] animate-bounce">
              <span className="text-8xl block mb-3">🏰</span>
              <p className="text-purple-400 text-xs font-black uppercase tracking-widest font-mono">PARDAIS CASTLE BUILT!</p>
              <p className="text-[8px] text-gray-300 mt-1">Massive +5,000 Battle points transferred!</p>
              <span className="text-[8px] text-purple-400 font-mono block">Deducted 5,000 Coins</span>
            </div>
          )}
        </div>
      )}

      {/* Gift drawer overlay tray */}
      {showReelGiftOverlay && currentReel && (
        <div className="absolute inset-x-2 bottom-20 bg-black/95 backdrop-blur-xl border border-[#ff007f]/40 p-4 rounded-2xl z-40 animate-pop-gift shadow-[0_-5px_25px_rgba(0,0,0,0.8)]">
          <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-3">
            <div className="flex items-center space-x-1.5">
              <span className="text-yellow-400">🪙</span>
              <span className="text-[9.5px] font-black text-pink-400 uppercase tracking-wider font-mono">Send Gift to @{currentReel.creator}</span>
            </div>
            <button
              onClick={() => setShowReelGiftOverlay(false)}
              className="text-gray-400 hover:text-white text-xs font-black transition-colors"
            >
              ✕ CLOSE
            </button>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[
              { id: "g1", icon: "🌹", name: "Rose Spark", cost: 10 },
              { id: "g2", icon: "👑", name: "PK Crown", cost: 250 },
              { id: "g3", icon: "🏎️", name: "Sports Car", cost: 1000 },
              { id: "g4", icon: "🏰", name: "Pardais Castle", cost: 5000 }
            ].map((g) => (
              <button
                key={g.id}
                onClick={() => {
                  if (user.coins < g.cost) {
                    alert("⚠ Insufficient Gold Coins! Go to your profile wallet and tap 'Claim Bonus Coins' to get free virtual coins! 🪙");
                    return;
                  }
                  setUser(prev => {
                    const newXp = (prev.xp || 0) + g.cost;
                    const prog = getProgressionFromCoins(newXp);
                    return {
                      ...prev,
                      coins: Math.max(0, prev.coins - g.cost),
                      xp: newXp,
                      userLevel: prog.level,
                      level: prog.level,
                      vipLevel: prog.vipLevel
                    };
                  });
                  setShowReelGiftOverlay(false);
                  
                  setActiveReelGiftAnimation({ icon: g.icon, name: g.name });
                  setTimeout(() => {
                    setActiveReelGiftAnimation(null);
                  }, 2600);
                }}
                className="bg-white/5 hover:bg-[#ff007f]/20 border border-white/10 hover:border-pink-500/30 rounded-xl p-2.5 text-center transition-all flex flex-col items-center justify-between group active:scale-95"
              >
                <span className="text-3xl block mb-1 group-hover:scale-110 transition-transform">{g.icon}</span>
                <p className="text-[8px] font-black text-white truncate max-w-full">{g.name}</p>
                <span className="text-[7.5px] bg-yellow-400/20 text-yellow-400 font-mono font-black border border-yellow-400/10 rounded px-1.5 py-0.5 mt-1">{g.cost} c</span>
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-white/5 text-[8.5px] text-gray-400">
            <span>My Balance: <strong className="text-yellow-400 font-mono font-black">{user.coins} Coins</strong></span>
            <button
              onClick={() => {
                setClientView("wallet");
                setShowReelGiftOverlay(false);
              }}
              className="text-[#00f5ff] hover:underline font-bold"
            >
              Recharge Coins 🪙
            </button>
          </div>
        </div>
      )}

      {/* Share Drawer Layout */}
      {showShareDrawer && currentReel && (
        <div className="absolute inset-x-0 bottom-0 bg-[#0b0b11]/98 border-t border-[#303045] rounded-t-3xl p-4 z-50 animate-slide-up shadow-[0_-5px_30px_rgba(0,0,0,0.9)] text-left">
          <div className="flex items-center justify-between border-b border-white/5 pb-2.5 mb-4">
            <span className="text-[10px] font-black text-white uppercase tracking-wider font-mono">Share This Video Reel</span>
            <button
              onClick={() => setShowShareDrawer(false)}
              className="text-gray-400 hover:text-white text-xs font-black"
            >
              ✕
            </button>
          </div>
          <div className="grid grid-cols-5 gap-2 text-center">
            <button
              onClick={() => {
                setShowShareDrawer(false);
                alert("🟢 Simulating Share to WhatsApp...\nMessage sent: 'Check out this awesome Pardais Party Reel by @" + currentReel.creator + "!'");
              }}
              className="flex flex-col items-center space-y-1.5 p-1 rounded-xl hover:bg-white/5 transition-all"
            >
              <div className="w-10 h-10 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center border border-green-500/30 text-lg">
                💬
              </div>
              <span className="text-[8px] font-bold text-gray-300">WhatsApp</span>
            </button>

            <button
              onClick={() => {
                setShowShareDrawer(false);
                alert("🔵 Simulating Share to Facebook...\nReel linked posted successfully.");
              }}
              className="flex flex-col items-center space-y-1.5 p-1 rounded-xl hover:bg-white/5 transition-all"
            >
              <div className="w-10 h-10 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30 text-lg">
                👤
              </div>
              <span className="text-[8px] font-bold text-gray-300">Facebook</span>
            </button>

            <button
              onClick={() => {
                setShowShareDrawer(false);
                alert("📸 Simulating Share to Instagram Stories...");
              }}
              className="flex flex-col items-center space-y-1.5 p-1 rounded-xl hover:bg-white/5 transition-all"
            >
              <div className="w-10 h-10 rounded-full bg-pink-500/20 text-pink-400 flex items-center justify-center border border-pink-500/30 text-lg">
                📷
              </div>
              <span className="text-[8px] font-bold text-gray-300">Instagram</span>
            </button>

            <button
              onClick={() => {
                setShowShareDrawer(false);
                const url = `https://pardais.party/reel/${currentReel.id}`;
                try {
                  navigator.clipboard.writeText(url);
                  alert("🔗 Link Copied to Clipboard!\n" + url);
                } catch (err) {
                  alert("Link: " + url);
                }
              }}
              className="flex flex-col items-center space-y-1.5 p-1 rounded-xl hover:bg-white/5 transition-all"
            >
              <div className="w-10 h-10 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30 text-lg">
                🔗
              </div>
              <span className="text-[8px] font-bold text-gray-300">Copy Link</span>
            </button>

            <button
              onClick={() => {
                setShowShareDrawer(false);
                shareToPardaisChat(currentReel);
              }}
              className="flex flex-col items-center space-y-1.5 p-1 rounded-xl hover:bg-white/5 transition-all"
            >
              <div className="w-10 h-10 rounded-full bg-pink-500/30 text-pink-500 flex items-center justify-center border border-pink-500/50 text-lg animate-pulse">
                🎤
              </div>
              <span className="text-[8px] font-bold text-[#FF2DCE]">Pardais Chat</span>
            </button>
          </div>
        </div>
      )}

      {/* Comment Drawer Layout */}
      {showCommentDrawer && currentReel && (
        <div className="absolute inset-x-0 bottom-0 h-[60%] bg-[#0b0b11]/98 border-t border-[#303045] rounded-t-3xl flex flex-col justify-between p-4 z-50 animate-slide-up shadow-[0_-5px_30px_rgba(0,0,0,0.9)] text-left">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <div className="flex items-center space-x-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-pink-500" />
              <span className="text-[10px] font-black text-white uppercase tracking-wider font-mono">
                Comments ({currentReel.commentsCount})
              </span>
            </div>
            <button
              onClick={() => {
                setShowCommentDrawer(false);
                setSelectedCommentForReply(null);
              }}
              className="text-gray-400 hover:text-white text-xs font-black"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto py-2.5 space-y-3.5 pr-1 text-left">
            {currentReel.comments && currentReel.comments.length > 0 ? (
              currentReel.comments.map((comment: any, cIdx: number) => (
                <div key={comment.id || `comment-${cIdx}`} className="space-y-2">
                  <div className="flex items-start space-x-2">
                    <img
                      src={comment.userAvatar}
                      className="w-7 h-7 rounded-full border border-white/10 shrink-0"
                      alt="user"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black text-[#ff007f] font-mono">@{comment.userName}</span>
                        <span className="text-[7.5px] text-gray-500">{comment.timestamp}</span>
                      </div>
                      <p className="text-[9.5px] text-gray-200 mt-0.5 leading-snug">{comment.text}</p>
                      
                      <div className="flex items-center space-x-3.5 mt-1">
                        <button
                          onClick={() => {
                            setSelectedCommentForReply({
                              commentId: comment.id,
                              userName: comment.userName
                            });
                          }}
                          className="text-[7.5px] text-[#ff007f] hover:underline font-black uppercase tracking-wider"
                        >
                          Reply ↩
                        </button>
                        <button
                          onClick={() => {
                            setReels(prev => prev.map(r => {
                              if (r.id === currentReel.id) {
                                return {
                                  ...r,
                                  comments: (r.comments || []).map((c: any) => {
                                    if (c.id === comment.id) {
                                      const liked = !c.likedByUser;
                                      return {
                                        ...c,
                                        likedByUser: liked,
                                        likes: c.likes + (liked ? 1 : -1)
                                      };
                                    }
                                    return c;
                                  })
                                };
                              }
                              return r;
                            }));
                          }}
                          className={`text-[7.5px] font-bold flex items-center space-x-1 ${comment.likedByUser ? "text-red-500" : "text-gray-500 hover:text-white"}`}
                        >
                          <span>❤️ {comment.likes || 0}</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Comment Replies */}
                  {comment.replies && comment.replies.map((rep: any, rIdx: number) => (
                    <div key={rep.id || `reply-${rIdx}`} className="ml-9 flex items-start space-x-2 bg-white/5 p-2 rounded-xl border border-white/5">
                      <img
                        src={rep.userAvatar}
                        className="w-5.5 h-5.5 rounded-full border border-white/10 shrink-0"
                        alt="rep user"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-[8px] font-black text-cyan-400 font-mono">@{rep.userName}</span>
                          <span className="text-[7px] text-gray-500">{rep.timestamp}</span>
                        </div>
                        <p className="text-[9px] text-gray-200 mt-0.5 leading-snug">{rep.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center space-y-2">
                <span className="text-2xl">💬</span>
                <p className="text-[9px] text-gray-400 uppercase font-mono font-black tracking-wider">No comments yet</p>
                <p className="text-[8px] text-gray-500">Be the first to comment on Pardais Party!</p>
              </div>
            )}
          </div>

          {/* Comment input form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (selectedCommentForReply) {
                const text = replyText.trim();
                if (!text) return;

                const newReplyObj = {
                  id: "rep_" + Date.now(),
                  userName: user.name,
                  userAvatar: user.avatar,
                  text: text,
                  timestamp: "Just now",
                  likes: 0,
                  likedByUser: false
                };

                setReels(prev => prev.map(r => {
                  if (r.id === currentReel.id) {
                    return {
                      ...r,
                      comments: (r.comments || []).map((c: any) => {
                        if (c.id === selectedCommentForReply.commentId) {
                          return {
                            ...c,
                            replies: [...(c.replies || []), newReplyObj]
                          };
                        }
                        return c;
                      })
                    };
                  }
                  return r;
                }));

                setReplyText("");
                setSelectedCommentForReply(null);
              } else {
                const text = newCommentText.trim();
                if (!text) return;

                const newCommentObj = {
                  id: "com_" + Date.now(),
                  userName: user.name,
                  userAvatar: user.avatar,
                  text: text,
                  timestamp: "Just now",
                  likes: 0,
                  likedByUser: false,
                  replies: []
                };

                setReels(prev => prev.map(r => {
                  if (r.id === currentReel.id) {
                    return {
                      ...r,
                      commentsCount: r.commentsCount + 1,
                      comments: [newCommentObj, ...(r.comments || [])]
                    };
                  }
                  return r;
                }));

                setNewCommentText("");
              }
            }}
            className="flex space-x-2 pt-2 border-t border-white/5 shrink-0"
          >
            <input
              type="text"
              value={selectedCommentForReply ? replyText : newCommentText}
              onChange={(e) => {
                if (selectedCommentForReply) {
                  setReplyText(e.target.value);
                } else {
                  setNewCommentText(e.target.value);
                }
              }}
              placeholder={selectedCommentForReply ? `Reply to @${selectedCommentForReply.userName}...` : "Add a public comment..."}
              className="flex-1 bg-[#12121a] border border-[#303040] rounded-xl px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#ff007f]"
              required
              maxLength={120}
            />
            <button
              type="submit"
              className="bg-[#ff007f] hover:bg-[#ff1a8c] text-white rounded-xl px-3.5 py-1.5 text-[10px] font-black uppercase tracking-wider flex items-center justify-center space-x-1 transition-all duration-300"
            >
              <Send className="w-3 h-3" />
              <span>Send</span>
            </button>
          </form>
        </div>
      )}

      {/* 🔎 TIKTOK-STYLE SEARCH OVERLAY */}
      {showSearch && (
        <div className="absolute inset-0 bg-[#07070a]/98 z-50 flex flex-col text-left">
          {/* Search Header Input bar */}
          <div className="pt-12 pb-3 px-4 flex items-center space-x-3 border-b border-white/5 bg-[#09090e]">
            <div className="flex-1 bg-white/5 border border-white/10 rounded-full py-2 px-3.5 flex items-center space-x-2.5 focus-within:border-[#ff007f]/50 focus-within:bg-white/10 transition-all">
              <Search className="w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search usernames, songs, bios, or captions..."
                className="bg-transparent border-none outline-none text-white text-xs w-full placeholder-gray-500 font-medium"
                autoFocus
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery("")}
                  className="text-[10px] bg-white/10 hover:bg-white/20 text-gray-300 rounded-full px-1.5 py-0.5"
                >
                  ✕
                </button>
              )}
            </div>
            <button
              onClick={() => {
                setShowSearch(false);
                setSearchQuery("");
              }}
              className="text-xs font-bold text-[#ff007f] tracking-wide active:scale-95 transition-transform"
            >
              Cancel
            </button>
          </div>

          {/* TikTok Search Tabs */}
          <div className="flex items-center justify-around border-b border-white/5 bg-[#09090e] py-1 text-center">
            {(["top", "users", "videos"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setSearchTab(t)}
                className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-wider transition-all duration-150 relative ${
                  searchTab === t ? "text-[#ff007f] font-black" : "text-white/60 hover:text-white"
                }`}
              >
                {t}
                {searchTab === t && (
                  <span className="absolute bottom-0 inset-x-8 h-0.5 bg-[#ff007f] rounded-full" />
                )}
              </button>
            ))}
          </div>

          {/* Search Results Main Display Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* If query is empty, show trending tags/suggestions */}
            {!searchQuery.trim() && (
              <div className="space-y-4">
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-gray-400 font-mono mb-2.5">Suggested Searches</h4>
                  <div className="flex flex-wrap gap-2">
                    {["Pardais Live 🎵", "Karachi battles", "Lahore concert", "PK match gold", "singing reels", "PK King"].map((term) => (
                      <button
                        key={term}
                        onClick={() => setSearchQuery(term)}
                        className="bg-white/5 hover:bg-white/10 border border-white/5 rounded-full px-3 py-1.5 text-[9.5px] font-bold text-gray-200 transition-colors"
                      >
                        🔎 {term}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2">
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-gray-400 font-mono mb-2.5">Trending Pardais Creators</h4>
                  <div className="space-y-2.5">
                    {searchCreators.slice(0, 3).map((creator) => (
                      <div 
                        key={creator.username}
                        onClick={() => setSelectedUserProfile(creator)}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-all cursor-pointer"
                      >
                        <div className="flex items-center space-x-3 min-w-0">
                          <img src={creator.avatar} className="w-9 h-9 rounded-full object-cover border border-[#ff007f]/30" alt="" />
                          <div className="min-w-0">
                            <div className="flex items-center space-x-1">
                              <span className="text-[11px] font-black text-white truncate">@{creator.username}</span>
                              <span className="text-[7px] bg-[#ff007f] text-white px-1 rounded-sm font-mono scale-90">VERIFIED</span>
                            </div>
                            <p className="text-[8px] text-gray-400 truncate max-w-[170px] mt-0.5">{creator.bio}</p>
                          </div>
                        </div>
                        <span className="text-[8.5px] text-gray-400 font-mono font-bold mr-1">{creator.followers} followers</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {searchQuery.trim() && (
              <div className="space-y-5">
                {/* 1. USERS SECTION */}
                {(searchTab === "top" || searchTab === "users") && (
                  <div>
                    {searchTab === "top" && (
                      <h4 className="text-[10px] font-black uppercase tracking-wider text-gray-400 font-mono mb-2.5">Accounts</h4>
                    )}
                    {filteredCreators.length === 0 ? (
                      searchTab === "users" && (
                        <div className="text-center py-6 text-gray-500 text-[10px]">No creators found matching "{searchQuery}"</div>
                      )
                    ) : (
                      <div className="space-y-3">
                        {filteredCreators.map((creator) => (
                          <div 
                            key={creator.username}
                            className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-all cursor-pointer"
                            onClick={() => setSelectedUserProfile(creator)}
                          >
                            <div className="flex items-center space-x-3 min-w-0">
                              <img src={creator.avatar} className="w-10 h-10 rounded-full object-cover border border-[#ff007f]/40" alt="" />
                              <div className="min-w-0">
                                <div className="flex items-center space-x-1">
                                  <span className="text-[11px] font-black text-white truncate">@{creator.username}</span>
                                  <span className="text-[7px] bg-blue-500 text-white px-1 rounded-sm font-mono scale-90">✓ POPULAR</span>
                                </div>
                                <p className="text-[8.5px] text-gray-400 truncate max-w-[160px] mt-0.5">{creator.bio}</p>
                                <span className="text-[7.5px] text-gray-500 font-mono">{creator.followers} Followers • {creator.likes} Likes</span>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => {
                                  setReels(prev => prev.map(r => {
                                    if (r.creator === creator.username) {
                                      return { ...r, isFollowed: !r.isFollowed };
                                    }
                                    return r;
                                  }));
                                }}
                                className={`px-2.5 py-1 rounded-full text-[8.5px] font-black uppercase tracking-wider transition-all duration-300 ${
                                  creator.isFollowed 
                                    ? "bg-white/10 text-white border border-white/15" 
                                    : "bg-[#ff007f] text-white hover:bg-[#ff007f]/90"
                                }`}
                              >
                                {creator.isFollowed ? "Following" : "Follow"}
                              </button>

                              <button
                                onClick={() => setSelectedUserChat(creator)}
                                className="p-1.5 bg-white/5 hover:bg-[#ff007f]/20 border border-white/10 hover:border-pink-500/30 rounded-full text-pink-500 transition-colors"
                                title="Message Creator"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 2. VIDEOS / REELS GRID SECTION */}
                {(searchTab === "top" || searchTab === "videos") && (
                  <div>
                    {searchTab === "top" && (
                      <h4 className="text-[10px] font-black uppercase tracking-wider text-gray-400 font-mono mb-2.5">Videos</h4>
                    )}
                    {filteredSearchReels.length === 0 ? (
                      <div className="text-center py-6 text-gray-500 text-[10px]">No videos found matching "{searchQuery}"</div>
                    ) : (
                      <div className="grid grid-cols-3 gap-1.5">
                        {filteredSearchReels.map((reel, sIdx) => {
                          const rawIndex = sortedReels.findIndex(r => r.id === reel.id);
                          return (
                            <div
                              key={`${reel.id}-${sIdx}`}
                              onClick={() => {
                                if (rawIndex !== -1) {
                                  setCurrentReelIndex(rawIndex);
                                  setShowSearch(false);
                                } else {
                                  alert("Playing searched video stream...");
                                  setShowSearch(false);
                                }
                              }}
                              className="aspect-[9/16] relative bg-[#12121a] rounded-xl overflow-hidden cursor-pointer group hover:scale-102 transition-all border border-white/5"
                            >
                              <div className="absolute inset-0 bg-black/25 z-10" />
                              <div className={`absolute inset-0 ${reel.videoBg || "bg-gradient-to-tr from-indigo-900 to-pink-900"} flex items-center justify-center`}>
                                <Film className="w-5 h-5 text-white/20 group-hover:scale-110 transition-transform" />
                              </div>

                              <div className="absolute inset-x-0 bottom-0 p-1.5 bg-gradient-to-t from-black/90 to-transparent z-20">
                                <p className="text-[7.5px] text-white line-clamp-2 leading-tight font-medium mb-1">
                                  {reel.caption}
                                </p>
                                <div className="flex items-center justify-between text-[6.5px] text-gray-400 font-mono">
                                  <span>@{reel.creator}</span>
                                  <span>❤️ {reel.likes}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 👤 TIKTOK-STYLE USER PROFILE MODAL */}
      {selectedUserProfile && (
        <div className="absolute inset-0 bg-[#07070a]/99 z-50 flex flex-col text-left animate-fade-in">
          {/* Header Bar */}
          <div className="pt-12 pb-3 px-4 flex items-center justify-between border-b border-white/5 bg-[#09090e]">
            <button
              onClick={() => setSelectedUserProfile(null)}
              className="flex items-center space-x-1 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase font-mono tracking-wider">Close</span>
            </button>
            <span className="text-xs font-black text-white font-mono uppercase tracking-wider">Creator Room</span>
            <div className="w-8 h-8"></div>
          </div>

          <div className="flex-1 overflow-y-auto pb-8">
            {/* User Big Info Card */}
            <div className="p-5 flex flex-col items-center text-center space-y-4 bg-gradient-to-b from-[#12121c]/40 to-transparent border-b border-white/5">
              <div className="relative">
                <img 
                  src={selectedUserProfile.avatar} 
                  className="w-20 h-20 rounded-full object-cover border-2 border-[#ff007f] shadow-lg shadow-[#ff007f]/10" 
                  alt="" 
                />
                <span className="absolute bottom-0 right-0 text-xl animate-bounce">⚡</span>
              </div>

              <div>
                <div className="flex items-center justify-center space-x-1.5">
                  <h3 className="text-base font-black text-white">@{selectedUserProfile.username}</h3>
                  <span className="text-[7.5px] bg-[#ff007f] text-white px-1.5 py-0.5 rounded-sm font-black uppercase tracking-wider font-mono">STAR</span>
                </div>
                <p className="text-[10.5px] text-gray-400 mt-1 max-w-[280px] leading-relaxed mx-auto">
                  {selectedUserProfile.bio}
                </p>
                <div className="flex items-center justify-center space-x-2 mt-2">
                  <span className="text-[8px] bg-white/5 border border-white/10 rounded px-2 py-0.5 text-[#00f5ff] font-mono font-bold">
                    📍 Karachi Server
                  </span>
                  <span className="text-[8px] bg-[#ff007f]/10 border border-[#ff007f]/20 rounded px-2 py-0.5 text-[#ff007f] font-mono font-bold">
                    🛡️ Verified PK Host
                  </span>
                </div>
              </div>

              {/* Stats Counters */}
              <div className="grid grid-cols-3 gap-6 text-center w-full max-w-[280px] py-2">
                <div>
                  <p className="text-xs font-mono font-black text-white">{selectedUserProfile.following}</p>
                  <p className="text-[8.5px] text-gray-500 uppercase font-bold tracking-wider mt-0.5">Following</p>
                </div>
                <div>
                  <p className="text-xs font-mono font-black text-white">{selectedUserProfile.followers}</p>
                  <p className="text-[8.5px] text-gray-500 uppercase font-bold tracking-wider mt-0.5">Followers</p>
                </div>
                <div>
                  <p className="text-xs font-mono font-black text-white">{selectedUserProfile.likes}</p>
                  <p className="text-[8.5px] text-gray-500 uppercase font-bold tracking-wider mt-0.5">Likes</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-3 w-full max-w-[280px]">
                <button
                  onClick={() => {
                    setReels(prev => prev.map(r => {
                      if (r.creator === selectedUserProfile.username) {
                        return { ...r, isFollowed: !r.isFollowed };
                      }
                      return r;
                    }));
                    setSelectedUserProfile(prev => ({
                      ...prev,
                      isFollowed: !prev.isFollowed
                    }));
                  }}
                  className={`flex-1 py-2 rounded-full text-[9.5px] font-black uppercase tracking-wider transition-all duration-300 ${
                    selectedUserProfile.isFollowed 
                      ? "bg-white/10 text-white border border-white/15" 
                      : "bg-gradient-to-r from-[#ff007f] to-[#7b2cbf] text-white hover:opacity-90"
                  }`}
                >
                  {selectedUserProfile.isFollowed ? "✓ Following" : "Follow Creator"}
                </button>

                <button
                  onClick={() => setSelectedUserChat(selectedUserProfile)}
                  className="flex-1 py-2 bg-[#12121e] border border-pink-500/25 hover:border-pink-500 text-[#ff007f] rounded-full text-[9.5px] font-black uppercase tracking-wider transition-colors flex items-center justify-center space-x-1"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Send Message</span>
                </button>
              </div>
            </div>

            {/* Creator Videos Gallery Section */}
            <div className="p-4 space-y-3">
              <div className="flex items-center space-x-1.5 border-b border-white/5 pb-2">
                <Film className="w-3.5 h-3.5 text-pink-500" />
                <h4 className="text-[9.5px] font-black uppercase tracking-wider text-white font-mono">
                  All Broadcasts & Videos ({selectedUserProfile.videos?.length || 0})
                </h4>
              </div>

              {selectedUserProfile.videos?.length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-[10px]">This star hasn't uploaded any clips yet.</div>
              ) : (
                <div className="grid grid-cols-3 gap-1.5">
                  {selectedUserProfile.videos?.map((v: any, vIdx: number) => {
                    const idx = sortedReels.findIndex(r => r.id === v.id);
                    return (
                      <div
                        key={`${v.id}-${vIdx}`}
                        onClick={() => {
                          if (idx !== -1) {
                            setCurrentReelIndex(idx);
                            setSelectedUserProfile(null);
                            setShowSearch(false);
                          }
                        }}
                        className="aspect-[9/16] relative rounded-xl overflow-hidden bg-[#12121c] border border-white/5 cursor-pointer group hover:opacity-85 transition-opacity"
                      >
                        <div className="absolute inset-0 bg-black/20" />
                        <div className={`absolute inset-0 ${v.videoBg || "bg-indigo-950"} flex items-center justify-center`}>
                          <span className="text-xs">🎬</span>
                        </div>
                        <div className="absolute bottom-0 inset-x-0 p-1.5 bg-gradient-to-t from-black/90 to-transparent">
                          <p className="text-[7px] text-white truncate font-semibold">{v.caption}</p>
                          <span className="text-[6.5px] text-gray-400 block font-mono">❤️ {v.likes}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 💬 Sleek Direct Message Modal */}
      {selectedUserChat && (
        <div className="absolute inset-0 bg-[#07070a]/99 z-[60] flex flex-col text-left animate-fade-in">
          {/* Header Bar */}
          <div className="pt-12 pb-3 px-4 flex items-center justify-between border-b border-white/5 bg-[#09090e]">
            <button
              onClick={() => setSelectedUserChat(null)}
              className="flex items-center space-x-1 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase font-mono tracking-wider">Back</span>
            </button>
            <div className="flex items-center space-x-2">
              <img src={selectedUserChat.avatar} className="w-6 h-6 rounded-full object-cover" alt="" />
              <span className="text-[10px] font-black text-white font-mono uppercase">Chat with @{selectedUserChat.username}</span>
            </div>
            <div className="w-8 h-8"></div>
          </div>

          {/* DM Conversation History Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
            <div className="text-center py-4 text-[8px] text-gray-500 font-mono">
              🛡️ End-to-end Encrypted on Pardais PK Live Stream Network
            </div>

            {/* Default greeting message from creator */}
            <div className="flex items-start space-x-2">
              <img src={selectedUserChat.avatar} className="w-7 h-7 rounded-full object-cover border border-white/5" alt="" />
              <div className="bg-white/5 border border-white/5 text-white rounded-2xl rounded-tl-none p-3 max-w-[75%] text-xs leading-relaxed">
                Asalam-o-Alaikum! Welcome to my chat room. Follow me and support my live PK matches with rose gifts! 🌹
                <span className="block text-[7px] text-gray-500 font-mono mt-1 text-right">Just now</span>
              </div>
            </div>

            {/* Locally saved messages */}
            {(localDMs[selectedUserChat.username] || []).map((msg, index) => (
              <div key={index} className="flex items-start justify-end space-x-2">
                <div className="bg-gradient-to-r from-[#ff007f] to-[#7b2cbf] text-white rounded-2xl rounded-tr-none p-3 max-w-[75%] text-xs leading-relaxed">
                  {msg.text}
                  <span className="block text-[7px] text-white/60 font-mono mt-1 text-right">{msg.timestamp}</span>
                </div>
              </div>
            ))}
          </div>

          {/* DM Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!directChatText.trim()) return;

              const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              setLocalDMs(prev => {
                const list = prev[selectedUserChat.username] || [];
                return {
                  ...prev,
                  [selectedUserChat.username]: [...list, {
                    sender: "Me",
                    text: directChatText,
                    timestamp
                  }]
                };
              });
              setDirectChatText("");
            }}
            className="p-3 bg-[#09090e] border-t border-white/5 flex items-center space-x-2 pb-6"
          >
            <input
              type="text"
              value={directChatText}
              onChange={(e) => setDirectChatText(e.target.value)}
              placeholder={`Send message to @${selectedUserChat.username}...`}
              className="flex-1 bg-white/5 border border-white/10 rounded-full py-2.5 px-4 text-xs text-white outline-none placeholder-gray-500 focus:border-[#ff007f]/50 transition-all"
            />
            <button
              type="submit"
              className="p-2.5 bg-gradient-to-r from-[#ff007f] to-[#7b2cbf] hover:opacity-95 text-white rounded-full transition-transform active:scale-95 flex items-center justify-center"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
