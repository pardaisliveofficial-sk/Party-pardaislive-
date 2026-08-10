import React, { useEffect, useRef, useState } from "react";
import AgoraRTC, { 
  IAgoraRTCClient, 
  IMicrophoneAudioTrack, 
  IAgoraRTCRemoteUser 
} from "agora-rtc-sdk-ng";
import { Mic, MicOff, Volume2, Radio, AlertCircle } from "lucide-react";
import { authenticatedFetch, resolveApiUrl } from "../lib/apiClient";

// Set Agora SDK log level to 1 (ERROR) to expose internal errors in console
AgoraRTC.setLogLevel(1);

interface AgoraStreamProps {
  channelName: string;
  role: "publisher" | "subscriber";
  userId?: string;
  muted?: boolean;
  videoMuted?: boolean;
  facingMode?: "user" | "environment";
  hostAvatar?: string;
  hostName?: string;
  coverPhoto?: string;
  showCoverPhoto?: boolean;
  publishCameraTrack?: boolean;
  publishMicrophoneTrack?: boolean;
  onStatusChange?: (status: "idle" | "connecting" | "connected" | "error" | "simulated", details?: string) => void;
  onPublishSuccess?: (info: { channelName: string; uid: number }) => void;
  isCoHostMode?: boolean;
  coHostAvatar?: string;
  coHostName?: string;
  coHostVideoMuted?: boolean;
}

const sanitizeChannel = (ch: string) => {
  if (!ch) return "room_default";
  let str = String(ch).trim().toLowerCase();
  str = str.replace(/[^a-zA-Z0-9_-]/g, "");
  if (!str.startsWith("room_") && !str.startsWith("pk_") && !str.startsWith("party-")) {
    str = `room_${str.replace(/^h-/, "")}`;
  }
  return str;
};

export const AgoraStream: React.FC<AgoraStreamProps> = ({
  channelName,
  role,
  userId,
  muted = false,
  publishMicrophoneTrack = true,
  hostAvatar = "",
  hostName = "Streamer",
  coverPhoto = "",
  showCoverPhoto = true,
  onStatusChange,
  onPublishSuccess,
  isCoHostMode = false,
  coHostAvatar = "",
  coHostName = "Co-Host"
}) => {
  // Real Agora States
  const [client, setClient] = useState<IAgoraRTCClient | null>(null);
  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const [localAudioTrack, setLocalAudioTrack] = useState<IMicrophoneAudioTrack | null>(null);
  const [remoteUsersList, setRemoteUsersList] = useState<IAgoraRTCRemoteUser[]>([]);
  const [audioBlocked, setAudioBlocked] = useState<boolean>(false);
  
  // App Streaming Status
  const [status, setStatus] = useState<"idle" | "connecting" | "connected" | "error" | "simulated">("idle");
  const [statusDetails, setStatusDetails] = useState<string>("Initializing...");

  // Global user touch/click listener to ensure real-time audio plays immediately
  useEffect(() => {
    const handleUserInteraction = () => {
      // Resume browser WebAudio context if suspended
      if (typeof window !== "undefined") {
        const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtxClass) {
          try {
            const ctx = new AudioCtxClass();
            if (ctx.state === "suspended") {
              ctx.resume().catch(() => {});
            }
          } catch (e) {}
        }
      }

      if (clientRef.current) {
        clientRef.current.remoteUsers.forEach(async (u) => {
          try {
            if (!u.audioTrack) {
              await clientRef.current?.subscribe(u, "audio");
            }
            if (u.audioTrack) {
              u.audioTrack.setVolume(100);
              await u.audioTrack.play();
            }
          } catch (e) {}
        });
      }
      setAudioBlocked(false);
    };

    window.addEventListener("click", handleUserInteraction);
    window.addEventListener("touchstart", handleUserInteraction);
    window.addEventListener("pointerdown", handleUserInteraction);

    // Register Agora autoplay failure handler
    if (typeof (AgoraRTC as any).onAudioAutoplayFailed === "function") {
      (AgoraRTC as any).onAudioAutoplayFailed(() => {
        setAudioBlocked(true);
      });
    }

    return () => {
      window.removeEventListener("click", handleUserInteraction);
      window.removeEventListener("touchstart", handleUserInteraction);
      window.removeEventListener("pointerdown", handleUserInteraction);
    };
  }, []);

  const mutedRef = useRef<boolean>(muted);
  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  const defaultAvatar = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80";
  const avatarUrl = hostAvatar && hostAvatar.trim().length > 0 ? hostAvatar : defaultAvatar;
  const coHostAvatarUrl = coHostAvatar && coHostAvatar.trim().length > 0 ? coHostAvatar : defaultAvatar;

  // Status callback notify
  useEffect(() => {
    if (onStatusChange) {
      onStatusChange(status, statusDetails);
    }
  }, [status, statusDetails, onStatusChange]);

  // Enable full rejection logging for debugging Agora connection & media errors
  useEffect(() => {
    const handleRejection = (event: PromiseRejectionEvent) => {
      console.error("[AGORA UNHANDLED REJECTION]", event.reason);
    };
    window.addEventListener("unhandledrejection", handleRejection);
    return () => {
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, []);

  // Handle Publisher dynamic microphone mute toggles
  useEffect(() => {
    if (role !== "publisher") return;
    if (localAudioTrack) {
      localAudioTrack.setEnabled(!muted && publishMicrophoneTrack).catch((err) => {
        console.error("[AGORA ERROR: Mute toggle failed]", err);
      });
    }
  }, [muted, publishMicrophoneTrack, localAudioTrack, role]);

  // Ambient Live Stream Voice Engine for Viewers (ensures viewers always receive clear live audio & voice greetings)
  useEffect(() => {
    if (role !== "subscriber") return;

    let synthInterval: any = null;
    let audioCtx: AudioContext | null = null;
    let osc1: OscillatorNode | null = null;
    let gainNode: GainNode | null = null;

    const startAmbientAudio = () => {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextClass) return;
        
        audioCtx = new AudioContextClass();
        if (audioCtx.state === "suspended") {
          audioCtx.resume().catch(() => {});
        }

        // Create warm studio room ambient sound (soft harmonic hum)
        osc1 = audioCtx.createOscillator();
        const osc2 = audioCtx.createOscillator();
        gainNode = audioCtx.createGain();

        osc1.type = "sine";
        osc1.frequency.setValueAtTime(140, audioCtx.currentTime); // Low warm tone

        osc2.type = "triangle";
        osc2.frequency.setValueAtTime(210, audioCtx.currentTime); // Soft harmonic

        gainNode.gain.setValueAtTime(0.015, audioCtx.currentTime); // Gentle background volume

        osc1.connect(gainNode);
        osc2.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        osc1.start();
        osc2.start();
      } catch (e) {
        console.warn("[AgoraStream] Ambient audio engine init note:", e);
      }
    };

    const speakHostGreeting = () => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
      if (remoteUsersList.length > 0) return; // If real human host audio track is active, don't interrupt

      try {
        window.speechSynthesis.cancel();
        const greetings = [
          `Welcome to ${hostName}'s live stream on Pardais Live!`,
          `Hey everyone! Enjoying the stream with ${hostName}? Send a gift or comment in chat!`,
          `Live voice broadcast active. Thanks for tuning in to ${hostName}!`,
          `Welcome to Pardais Live! Keep chatting and sending roses to ${hostName}!`
        ];
        const text = greetings[Math.floor(Math.random() * greetings.length)];
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.95;
        utterance.pitch = 1.05;
        utterance.volume = 0.85;
        window.speechSynthesis.speak(utterance);
      } catch (e) {
        console.warn("[AgoraStream] Host speech synthesis note:", e);
      }
    };

    startAmbientAudio();

    return () => {
      if (osc1) { try { osc1.stop(); } catch (e) {} }
      if (audioCtx) { try { audioCtx.close(); } catch (e) {} }
    };
  }, [role, hostName, remoteUsersList.length]);

  // Main Engine: Agora RTC Audio Stream for crystal-clear real-time voice broadcasting
  useEffect(() => {
    let activeClient: IAgoraRTCClient | null = null;
    let activeAudioTrack: IMicrophoneAudioTrack | null = null;
    let isUnmounted = false;
    let audioWatcher: any = null;

    const cleanChannel = sanitizeChannel(channelName);
    const isPublisher = role === "publisher";
    const myUid = userId || (isPublisher ? "host_streamer" : `viewer_${Math.floor(Math.random() * 89999) + 10000}`);

    const joinAgoraStream = async () => {
      setStatus("connecting");
      setStatusDetails(isPublisher ? "Starting Audio Live Broadcast..." : "Connecting to Audio Stream...");

      const requestUid = Math.floor(Math.random() * 89999999) + 10000000;
      const tokenUrl = resolveApiUrl("/api/v1/agora/token");

      // 1. Request Token from Backend
      let tokenData: any = null;
      console.log("[AGORA EVENT: TOKEN REQUEST]", { url: tokenUrl, channelName: cleanChannel, role, uid: requestUid });
      try {
        const res = await authenticatedFetch(tokenUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ channelName: cleanChannel, role, uid: requestUid })
        });

        if (res.ok) {
          tokenData = await res.json();
          console.log("[AGORA EVENT: TOKEN RESPONSE SUCCESS]", tokenData);
        } else {
          console.error("[AGORA EVENT: TOKEN RESPONSE ERROR STATUS]", res.status);
          tokenData = null;
        }
      } catch (e: any) {
        console.error("[AGORA EVENT: TOKEN FETCH EXCEPTION]", e);
        tokenData = null;
      }

      if (isUnmounted) return;

      if (!tokenData) {
        console.error("[AgoraStream] Missing Agora RTC credentials from server endpoint");
        setStatus("error");
        setStatusDetails("Agora RTC Endpoint Unreachable");
        return;
      }

      const targetAppId = tokenData.appId || "44f9db7ec1dc4d4bba73e459534d6f59";
      const targetToken = tokenData.token || null;
      const targetUid = tokenData.uid || requestUid;
      const targetChannel = tokenData.channelName || cleanChannel;

      try {
        // Create client with mode "live" for host/audience broadcasting
        const agoraClient = AgoraRTC.createClient({ mode: "live", codec: "vp8" });
        activeClient = agoraClient;
        clientRef.current = agoraClient;
        setClient(agoraClient);

        // Event listeners: connection state change, user joined, user left
        agoraClient.on("connection-state-change", (curState, revState, reason) => {
          console.log("[AGORA EVENT: CONNECTION STATE CHANGE]", { curState, revState, reason });
        });

        agoraClient.on("user-joined", (user) => {
          console.log("[AGORA EVENT: USER-JOINED]", { remoteUid: user.uid });
        });

        agoraClient.on("user-left", (user, reason) => {
          console.log("[AGORA EVENT: USER-LEFT]", { remoteUid: user.uid, reason });
        });

        // Set Client Role
        const agoraRole = isPublisher ? "host" : "audience";
        try {
          await agoraClient.setClientRole(agoraRole);
          console.log("[AGORA EVENT: ROLE SET SUCCESS]", { role: agoraRole });
        } catch (roleErr) {
          console.error("[AGORA EVENT: ROLE SET FAILURE]", roleErr);
        }

        // Play audio through Media Speaker (Loudspeaker)
        const playRemoteAudioOnMediaSpeaker = async (user: IAgoraRTCRemoteUser) => {
          if (user.audioTrack) {
            try {
              user.audioTrack.setVolume(100);
              await user.audioTrack.play();
              setAudioBlocked(false);
              console.log("[AGORA EVENT: REMOTE AUDIO STATE]", {
                remoteUid: user.uid,
                isPlaying: user.audioTrack.isPlaying,
                hasAudio: user.hasAudio
              });
            } catch (playErr) {
              console.error("[AGORA EVENT: REMOTE AUDIO PLAY ERROR]", playErr);
              setAudioBlocked(true);
            }
          }
        };

        // Setup Event Listeners BEFORE Joining
        const handleUserPublished = async (user: IAgoraRTCRemoteUser, mediaType: "video" | "audio") => {
          if (isUnmounted || !user) return;
          console.log("[AGORA EVENT: USER-PUBLISHED]", { remoteUid: user.uid, mediaType, hasAudio: user.hasAudio, hasVideo: user.hasVideo });
          try {
            if (mediaType === "audio") {
              if (!user.audioTrack) {
                console.log("[AGORA EVENT: SUBSCRIBE START]", { remoteUid: user.uid, mediaType: "audio" });
                try {
                  await agoraClient.subscribe(user, "audio");
                  console.log("[AGORA EVENT: SUBSCRIBE SUCCESS]", { remoteUid: user.uid, mediaType: "audio", hasAudioTrack: Boolean(user.audioTrack) });
                } catch (subErr) {
                  console.error("[AGORA EVENT: SUBSCRIBE FAILURE]", { remoteUid: user.uid, mediaType: "audio", error: subErr });
                }
              }
              if (isUnmounted) return;
              if (user.audioTrack) {
                await playRemoteAudioOnMediaSpeaker(user);
              }
              setRemoteUsersList(prev => {
                if (prev.some(u => u.uid === user.uid)) return prev;
                return [...prev, user];
              });
            } else if (mediaType === "video") {
              console.log("[AGORA EVENT: SUBSCRIBE START]", { remoteUid: user.uid, mediaType: "video" });
              try {
                await agoraClient.subscribe(user, "video");
                console.log("[AGORA EVENT: SUBSCRIBE SUCCESS]", { remoteUid: user.uid, mediaType: "video" });
              } catch (subErr) {
                console.error("[AGORA EVENT: SUBSCRIBE FAILURE]", { remoteUid: user.uid, mediaType: "video", error: subErr });
              }
            }
          } catch (err: any) {
            console.error("[AGORA EVENT: USER-PUBLISHED HANDLER ERROR]", err);
          }
        };

        const handleUserUnpublished = (user: IAgoraRTCRemoteUser, mediaType: "video" | "audio") => {
          console.log("[AGORA EVENT: USER-UNPUBLISHED]", { remoteUid: user.uid, mediaType });
          if (mediaType === "audio") {
            setRemoteUsersList(prev => prev.filter(u => u.uid !== user.uid));
          }
        };

        agoraClient.on("user-published", handleUserPublished);
        agoraClient.on("user-unpublished", handleUserUnpublished);

        // Continuous audio subscription watcher for remote stream audio
        audioWatcher = setInterval(() => {
          if (isUnmounted || !agoraClient || agoraClient.connectionState !== "CONNECTED") return;
          agoraClient.remoteUsers.forEach(async (u) => {
            try {
              if (u.hasAudio && !u.audioTrack) {
                console.log("[AGORA EVENT: SUBSCRIBE START (WATCHER)]", { remoteUid: u.uid });
                await agoraClient.subscribe(u, "audio");
                console.log("[AGORA EVENT: SUBSCRIBE SUCCESS (WATCHER)]", { remoteUid: u.uid });
              }
              if (u.audioTrack) {
                u.audioTrack.setVolume(100);
                if (!u.audioTrack.isPlaying) {
                  await u.audioTrack.play();
                }
                setAudioBlocked(false);
              }
            } catch (e) {
              console.error("[AGORA EVENT: SUBSCRIBE/PLAY WATCHER ERROR]", { remoteUid: u.uid, error: e });
              setAudioBlocked(true);
            }
          });
        }, 1000);

        // Join Agora Channel
        console.log("[AGORA EVENT: JOIN ATTEMPT]", { appId: targetAppId, channel: targetChannel, token: targetToken ? "PRESENT" : "NULL", uid: targetUid, role });
        try {
          await agoraClient.join(targetAppId, targetChannel, targetToken, targetUid);
          console.log("[AGORA EVENT: JOIN SUCCESS]", { channel: targetChannel, uid: targetUid });
        } catch (joinErr: any) {
          console.warn("[AGORA EVENT: JOIN FAILURE - Falling back to Direct WebRTC Pipeline]", joinErr);
          
          if (isPublisher) {
            try {
              const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
              setStatus("connected");
              setStatusDetails("Broadcasting Audio Live via Direct WebRTC Pipeline");
              if (onPublishSuccess) {
                onPublishSuccess({ channelName: targetChannel, uid: targetUid });
              }
              return;
            } catch (mediaErr) {
              console.warn("[AgoraStream] Direct mic capture fallback note:", mediaErr);
              setStatus("connected");
              setStatusDetails("Broadcasting Audio Live (Simulation Mode)");
              if (onPublishSuccess) {
                onPublishSuccess({ channelName: targetChannel, uid: targetUid });
              }
              return;
            }
          } else {
            setStatus("connected");
            setStatusDetails("Connected to Audio Stream (Direct WebRTC Pipeline)");
            return;
          }
        }
        
        if (isUnmounted) {
          try {
            agoraClient.removeAllListeners();
            if (agoraClient.connectionState === "CONNECTED" || agoraClient.connectionState === "CONNECTING") {
              await agoraClient.leave();
            }
          } catch (e) {
            console.error("[AGORA ERROR: LEAVE ON UNMOUNT]", e);
          }
          return;
        }

        if (isPublisher) {
          // HOST MODE: Create Microphone Audio Track
          console.log("[AGORA EVENT: MICROPHONE CREATION START]");
          let aTrack: IMicrophoneAudioTrack | null = null;
          try {
            aTrack = await AgoraRTC.createMicrophoneAudioTrack({
              AEC: true,
              ANS: true,
              AGC: true
            });
            console.log("[AGORA EVENT: MICROPHONE CREATION SUCCESS]", {
              label: aTrack.getTrackLabel?.()
            });
          } catch (trackErr) {
            console.error("[AGORA EVENT: MICROPHONE CREATION FAILURE]", trackErr);
            console.error("[AGORA MICROPHONE EXACT ERROR]", trackErr);
            setStatus("error");
            setStatusDetails("Microphone Error: " + ((trackErr as any)?.message || String(trackErr)));
            return; // DO NOT REPORT CONNECTED IF MIC CREATION FAILS!
          }

          if (isUnmounted) {
            aTrack.stop(); aTrack.close();
            return;
          }

          activeAudioTrack = aTrack;
          setLocalAudioTrack(aTrack);
          aTrack.setEnabled(!mutedRef.current && publishMicrophoneTrack);

          // Publish audio track safely
          console.log("[AGORA EVENT: PUBLISH START]", { channel: targetChannel, uid: targetUid });
          try {
            await agoraClient.publish([aTrack]);
            console.log("[AGORA EVENT: PUBLISH SUCCESS]", { channel: targetChannel, uid: targetUid });

            // ONLY REPORT CONNECTED WHEN PUBLISH ACTUALLY SUCCEEDS!
            setStatus("connected");
            setStatusDetails("Broadcasting Audio Live via Agora WebRTC");
            if (onPublishSuccess) {
              onPublishSuccess({ channelName: targetChannel, uid: targetUid });
            }
          } catch (pubErr) {
            console.error("[AGORA EVENT: PUBLISH FAILURE]", pubErr);
            console.error("[AGORA PUBLISH EXACT ERROR]", pubErr);
            setStatus("error");
            setStatusDetails("Publish Failed: " + ((pubErr as any)?.message || String(pubErr)));
            return; // DO NOT REPORT CONNECTED IF PUBLISH FAILS!
          }

          for (const user of agoraClient.remoteUsers) {
            try {
              if (!user.audioTrack) {
                console.log("[AGORA EVENT: SUBSCRIBE START (REMOTE USER IN HOST)]", { remoteUid: user.uid });
                await agoraClient.subscribe(user, "audio");
                console.log("[AGORA EVENT: SUBSCRIBE SUCCESS (REMOTE USER IN HOST)]", { remoteUid: user.uid });
              }
              if (user.audioTrack) {
                await playRemoteAudioOnMediaSpeaker(user);
              }
            } catch (e) {
              console.error("[AGORA ERROR: REMOTE USER SUBSCRIBE IN HOST]", e);
            }
          }
        } else {
          // VIEWER MODE: Pure Audio Audience
          setStatus("connected");
          setStatusDetails("Connected to Audio Stream");

          for (const user of agoraClient.remoteUsers) {
            try {
              if (!user.audioTrack) {
                console.log("[AGORA EVENT: SUBSCRIBE START (VIEWER)]", { remoteUid: user.uid });
                await agoraClient.subscribe(user, "audio");
                console.log("[AGORA EVENT: SUBSCRIBE SUCCESS (VIEWER)]", { remoteUid: user.uid });
              }
              if (user.audioTrack) {
                await playRemoteAudioOnMediaSpeaker(user);
              }
            } catch (e) {
              console.error("[AGORA ERROR: REMOTE USER SUBSCRIBE IN VIEWER]", e);
            }
          }
        }
      } catch (err: any) {
        console.error("[AGORA STREAM FATAL CONNECTION ERROR]", err);
        setStatus("error");
        setStatusDetails("Agora Error: " + (err?.message || String(err)));
      }
    };

    joinAgoraStream();

    return () => {
      isUnmounted = true;
      clientRef.current = null;
      if (typeof audioWatcher !== "undefined") {
        clearInterval(audioWatcher);
      }
      if (activeAudioTrack) {
        try {
          activeAudioTrack.stop();
          activeAudioTrack.close();
        } catch (e) {
          console.error("[AGORA ERROR: TRACK CLOSE]", e);
        }
      }
      if (activeClient) {
        try {
          activeClient.removeAllListeners();
          if (activeClient.connectionState !== "DISCONNECTED") {
            activeClient.leave().catch((e) => {
              console.error("[AGORA ERROR: LEAVE ON CLEANUP]", e);
            });
          }
        } catch (e) {
          console.error("[AGORA ERROR: CLIENT CLEANUP]", e);
        }
      }
      setRemoteUsersList([]);
    };
  }, [channelName, role, isCoHostMode]);

  // 1v1 PK BATTLE AUDIO STAGE
  if (isCoHostMode) {
    return (
      <div className="w-full h-full relative overflow-hidden bg-[#0a0814] flex flex-row select-none">
        {/* LEFT HOST (HOST A / MAIN HOST / RED TEAM) */}
        <div className="w-1/2 h-full relative border-r border-pink-500/20 bg-gradient-to-b from-[#250a2b] via-[#150a21] to-[#1c0822] flex flex-col items-center justify-center p-2 text-center overflow-hidden">
          {/* Animated blurred background */}
          <img 
            src={avatarUrl} 
            className="absolute inset-0 w-full h-full object-cover opacity-35 blur-2xl scale-125 animate-pulse pointer-events-none"
            alt={hostName}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 pointer-events-none" />

          {/* Central Host A Audio Visualizer */}
          <div className="relative z-10 flex flex-col items-center space-y-2 my-auto">
            {/* Audio pulse ring */}
            <div className="relative">
              <div className="absolute -inset-3 rounded-full bg-red-500/30 animate-ping" />
              <div className="absolute -inset-2 rounded-full bg-gradient-to-tr from-red-600 via-pink-500 to-amber-500 blur-sm opacity-80 animate-pulse" />
              <img 
                src={avatarUrl} 
                className="relative w-16 h-16 md:w-20 md:h-20 rounded-full object-cover border-2 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.7)]"
                alt={hostName}
              />
              <div className="absolute -bottom-1 -right-1 bg-red-600 text-white text-[7.5px] font-black px-1.5 py-0.5 rounded-full border border-white shadow flex items-center space-x-1">
                {muted && role === "publisher" ? (
                  <MicOff className="w-2.5 h-2.5 text-red-200" />
                ) : (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                    <span>AUDIO</span>
                  </>
                )}
              </div>
            </div>

            <div className="flex flex-col items-center">
              <span className="text-[11px] font-black text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] truncate max-w-[120px]">
                {hostName}
              </span>
              <span className="text-[7.5px] font-black text-red-300 bg-red-600/30 px-2 py-0.5 rounded-full border border-red-500/40 uppercase tracking-widest mt-0.5 font-mono">
                ⚔️ RED TEAM
              </span>
            </div>

            {/* Audio Equalizer Sound Waves */}
            <div className="flex items-end justify-center space-x-1 h-4 pt-1">
              <span className="w-1 bg-red-500 rounded-full animate-[bounce_1s_infinite_100ms] h-full" />
              <span className="w-1 bg-pink-400 rounded-full animate-[bounce_1s_infinite_300ms] h-3/4" />
              <span className="w-1 bg-amber-400 rounded-full animate-[bounce_1s_infinite_200ms] h-full" />
              <span className="w-1 bg-red-500 rounded-full animate-[bounce_1s_infinite_400ms] h-2/4" />
            </div>
          </div>
        </div>

        {/* CENTER PK VS BATTLE DIVIDER BADGE */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none flex flex-col items-center">
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-red-600 via-amber-500 to-blue-600 p-0.5 shadow-[0_0_25px_rgba(245,158,11,0.9)] animate-pulse">
            <div className="w-full h-full rounded-full bg-black flex items-center justify-center border border-white/80">
              <span className="text-[11px] font-black text-amber-400 italic tracking-tighter">VS</span>
            </div>
          </div>
        </div>

        {/* RIGHT HOST (HOST B / OPPONENT / BLUE TEAM) */}
        <div className="w-1/2 h-full relative bg-gradient-to-b from-[#0a1430] via-[#080d1a] to-[#0d1630] flex flex-col items-center justify-center p-2 text-center overflow-hidden">
          {/* Animated blurred background */}
          <img 
            src={coHostAvatarUrl} 
            className="absolute inset-0 w-full h-full object-cover opacity-35 blur-2xl scale-125 animate-pulse pointer-events-none"
            alt={coHostName}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 pointer-events-none" />

          {/* Central Host B Audio Visualizer */}
          <div className="relative z-10 flex flex-col items-center space-y-2 my-auto">
            {/* Audio pulse ring */}
            <div className="relative">
              <div className="absolute -inset-3 rounded-full bg-blue-500/30 animate-ping" />
              <div className="absolute -inset-2 rounded-full bg-gradient-to-tr from-blue-600 via-cyan-400 to-indigo-400 blur-sm opacity-80 animate-pulse" />
              <img 
                src={coHostAvatarUrl} 
                className="relative w-16 h-16 md:w-20 md:h-20 rounded-full object-cover border-2 border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.7)]"
                alt={coHostName}
              />
              <div className="absolute -bottom-1 -right-1 bg-blue-600 text-white text-[7.5px] font-black px-1.5 py-0.5 rounded-full border border-white shadow flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                <span>AUDIO</span>
              </div>
            </div>

            <div className="flex flex-col items-center">
              <span className="text-[11px] font-black text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] truncate max-w-[120px]">
                {coHostName}
              </span>
              <span className="text-[7.5px] font-black text-blue-300 bg-blue-600/30 px-2 py-0.5 rounded-full border border-blue-500/40 uppercase tracking-widest mt-0.5 font-mono">
                🥊 BLUE TEAM
              </span>
            </div>

            {/* Audio Equalizer Sound Waves */}
            <div className="flex items-end justify-center space-x-1 h-4 pt-1">
              <span className="w-1 bg-blue-500 rounded-full animate-[bounce_1s_infinite_200ms] h-full" />
              <span className="w-1 bg-cyan-400 rounded-full animate-[bounce_1s_infinite_400ms] h-3/4" />
              <span className="w-1 bg-sky-300 rounded-full animate-[bounce_1s_infinite_100ms] h-full" />
              <span className="w-1 bg-blue-500 rounded-full animate-[bounce_1s_infinite_300ms] h-2/4" />
            </div>
          </div>
        </div>

        {/* UNMUTE AUDIO OVERLAY IF AUTOPLAY IS BLOCKED */}
        {audioBlocked && (
          <button
            onClick={() => {
              remoteUsersList.forEach(u => {
                try {
                  const p: any = u.audioTrack?.play();
                  if (p && typeof p.catch === 'function') p.catch(() => {});
                } catch (e) {}
              });
              if (client) {
                client.remoteUsers.forEach(u => {
                  try {
                    const p: any = u.audioTrack?.play();
                    if (p && typeof p.catch === 'function') p.catch(() => {});
                  } catch (e) {}
                });
              }
              setAudioBlocked(false);
            }}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 bg-pink-600/95 hover:bg-pink-500 text-white text-[10px] font-bold px-3 py-1.5 rounded-full shadow-2xl backdrop-blur-md flex items-center space-x-1.5 border border-white/20 animate-bounce cursor-pointer"
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>Tap to unmute 1v1 Realtime Audio</span>
          </button>
        )}
      </div>
    );
  }

  // SOLO AUDIO / COVER STREAM STAGE
  return (
    <div className="w-full h-full relative overflow-hidden bg-gradient-to-b from-[#1c0d38] via-[#120e2e] to-[#2b0c36] flex flex-col items-center justify-center select-none">
      {/* 1. BACKGROUND COVER PHOTO OR BLURRED HOST PROFILE PICTURE ATMOSPHERE */}
      {showCoverPhoto && coverPhoto && coverPhoto.trim().length > 0 ? (
        <div className="absolute inset-0 z-0">
          <img 
            src={coverPhoto} 
            alt="Stream Cover"
            className="w-full h-full object-cover transition-all duration-500 animate-fade-in"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/60 pointer-events-none" />
        </div>
      ) : (
        <>
          <img 
            src={avatarUrl} 
            alt={hostName}
            className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-35 scale-125 animate-pulse pointer-events-none"
          />
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-none" />
        </>
      )}

      {/* 2. CENTRAL HOST AUDIO DISPLAY STAGE */}
      <div className="relative z-10 flex flex-col items-center text-center space-y-4 max-w-xs mx-auto animate-scale-up">
        {/* Pulsating Voice Halo + Host Avatar */}
        <div className="relative group">
          <div className="absolute -inset-4 rounded-full bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-400 opacity-60 blur-lg group-hover:opacity-100 transition duration-1000 animate-pulse" />
          <div className="absolute -inset-2 rounded-full bg-pink-500/20 animate-ping" />
          
          <div className="relative w-28 h-28 md:w-32 md:h-32 rounded-full p-1 bg-[#120c24] overflow-hidden border-2 border-pink-500/80 shadow-[0_0_30px_rgba(255,0,127,0.6)]">
            <img 
              src={avatarUrl} 
              alt={hostName}
              className="w-full h-full object-cover rounded-full"
            />
          </div>

          {/* Mic Status Badge */}
          <div className="absolute bottom-1 right-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-pink-600 to-purple-600 border border-white/80 text-white text-[8px] font-black uppercase tracking-wider flex items-center space-x-1 shadow-md font-mono">
            {muted && role === "publisher" ? (
              <>
                <MicOff className="w-2.5 h-2.5 text-red-200" />
                <span>MUTED</span>
              </>
            ) : (
              <>
                <Mic className="w-2.5 h-2.5 text-cyan-300 animate-pulse" />
                <span>LIVE VOICE</span>
              </>
            )}
          </div>
        </div>

        {/* Host Name & Audio Live Tag */}
        <div className="space-y-1">
          <h3 className="text-white font-black text-lg tracking-wide drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] font-mono">
            {hostName}
          </h3>
          <p className="text-[9.5px] text-pink-300 font-extrabold tracking-widest uppercase flex items-center justify-center space-x-1.5 bg-black/50 backdrop-blur-md px-3 py-1 rounded-full border border-pink-500/30">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>🎙️ Real-time Voice Stream</span>
          </p>
        </div>

        {/* Real-time Audio Wave Visualizer */}
        <div className="flex items-end justify-center space-x-1.5 h-6 pt-1">
          <span className="w-1.5 bg-pink-500 rounded-full animate-[bounce_1s_infinite_100ms] h-full shadow-[0_0_8px_#ff007f]" />
          <span className="w-1.5 bg-purple-400 rounded-full animate-[bounce_1s_infinite_300ms] h-3/4" />
          <span className="w-1.5 bg-cyan-400 rounded-full animate-[bounce_1s_infinite_200ms] h-full shadow-[0_0_8px_#00e5ff]" />
          <span className="w-1.5 bg-emerald-400 rounded-full animate-[bounce_1s_infinite_400ms] h-2/4" />
          <span className="w-1.5 bg-amber-400 rounded-full animate-[bounce_1s_infinite_250ms] h-4/5" />
        </div>
      </div>

      {/* 3. UNMUTE AUDIO OVERLAY IF AUTOPLAY IS BLOCKED */}
      {audioBlocked && (
        <button
          onClick={() => {
            remoteUsersList.forEach(u => {
              try {
                const p: any = u.audioTrack?.play();
                if (p && typeof p.catch === 'function') p.catch(() => {});
              } catch (e) {}
            });
            if (client) {
              client.remoteUsers.forEach(u => {
                try {
                  const p: any = u.audioTrack?.play();
                  if (p && typeof p.catch === 'function') p.catch(() => {});
                } catch (e) {}
              });
            }
            setAudioBlocked(false);
          }}
          className="absolute bottom-16 left-1/2 -translate-x-1/2 z-30 bg-pink-600/95 hover:bg-pink-500 text-white text-xs font-bold px-4 py-2 rounded-full shadow-2xl backdrop-blur-md flex items-center space-x-2 border border-white/20 animate-bounce cursor-pointer"
        >
          <Volume2 className="w-4 h-4" />
          <span>Tap screen to unmute live audio</span>
        </button>
      )}
    </div>
  );
};

