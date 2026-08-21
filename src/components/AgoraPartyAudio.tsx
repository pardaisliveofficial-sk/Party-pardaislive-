import React, { useEffect, useRef, useState } from "react";
import type { 
  IAgoraRTCClient, 
  IMicrophoneAudioTrack, 
  IAgoraRTCRemoteUser 
} from "agora-rtc-sdk-ng";
import { authenticatedFetch, resolveApiUrl } from "../lib/apiClient";
import type { MusicTrack } from "../musicData";

let cachedAgoraRTC: any = null;
async function getAgoraRTC() {
  if (cachedAgoraRTC) return cachedAgoraRTC;
  if (typeof window === "undefined") return null;
  try {
    const mod = await import("agora-rtc-sdk-ng");
    cachedAgoraRTC = (mod as any).default || mod;
    if (typeof cachedAgoraRTC.setLogLevel === "function") {
      try { cachedAgoraRTC.setLogLevel(1); } catch (e) {}
    }
    return cachedAgoraRTC;
  } catch (err) {
    console.warn("[AgoraPartyAudio] Dynamic AgoraRTC import note:", err);
    return null;
  }
}

interface AgoraPartyAudioProps {
  partyId: string;
  channelName: string;
  userRole: "host" | "speaker" | "listener";
  isMuted: boolean;
  username: string;
  avatar: string;
  musicTrack?: MusicTrack | null;
  musicPlaying?: boolean;
  musicVolume?: number;
  onStatusChange?: (status: "idle" | "connecting" | "connected" | "error", details?: string) => void;
}

// Generate unique numeric UID for Agora (username hash + random session offset to prevent UID_CONFLICT)
const getNumericUid = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < (str || "guest").length; i++) {
    hash = (hash << 5) - hash + (str || "guest").charCodeAt(i);
    hash |= 0;
  }
  const sessionRand = Math.floor(Math.random() * 89999) + 10000;
  return ((Math.abs(hash) % 1000) * 100000) + sessionRand;
};

export const AgoraPartyAudio: React.FC<AgoraPartyAudioProps> = ({
  partyId,
  channelName,
  userRole,
  isMuted,
  username,
  avatar,
  musicTrack = null,
  musicPlaying = false,
  musicVolume = 0.45,
  onStatusChange
}) => {
  // Real Agora SDK Instances & Refs
  const [client, setClient] = useState<IAgoraRTCClient | null>(null);
  const clientRef = useRef<IAgoraRTCClient | null>(null);
  
  // Persistent microphone track ref across renders to prevent audio dropout / closing
  const localAudioTrackRef = useRef<IMicrophoneAudioTrack | null>(null);
  const [, setTrackStateDummy] = useState<number>(0); // Triggers re-render when track is initialized
  
  const [activeSpeakers, setActiveSpeakers] = useState<string[]>([]);
  const audioOutputRef = useRef<HTMLAudioElement | null>(null);

  // Party background music is published as a separate Agora audio track so
  // music and microphone voices can be heard simultaneously by everyone.
  const partyMusicAudioRef = useRef<HTMLAudioElement | null>(null);
  const partyMusicContextRef = useRef<AudioContext | null>(null);
  const partyMusicGainRef = useRef<GainNode | null>(null);
  const partyMusicCustomTrackRef = useRef<any>(null);

  // Status states
  const [status, setStatus] = useState<"idle" | "connecting" | "connected" | "error">("idle");
  const [statusDetails, setStatusDetails] = useState<string>("Initializing...");

  // Keep latest props in refs for watchers
  const userRoleRef = useRef<"host" | "speaker" | "listener">(userRole);
  const isMutedRef = useRef<boolean>(isMuted);

  useEffect(() => {
    userRoleRef.current = userRole;
  }, [userRole]);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  // Log all unhandled rejections to expose real Agora errors
  useEffect(() => {
    const handleRejection = (event: PromiseRejectionEvent) => {
      console.error("[AGORA PARTY UNHANDLED REJECTION]", event.reason);
    };
    window.addEventListener("unhandledrejection", handleRejection);
    return () => {
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, []);

  // Global user interaction handler to resume WebAudio Context if suspended
  useEffect(() => {
    const handleUserInteraction = () => {
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

      // Recover party music playback after a browser/Android autoplay interruption.
      if (partyMusicAudioRef.current && musicPlaying) {
        partyMusicAudioRef.current.play().catch(() => {});
      }

      if (clientRef.current) {
        clientRef.current.remoteUsers.forEach(async (u) => {
          try {
            if (u.hasAudio && !u.audioTrack) {
              await clientRef.current?.subscribe(u, "audio");
            }
            if (u.audioTrack) {
              u.audioTrack.setVolume(100);
              if (!u.audioTrack.isPlaying) {
                await u.audioTrack.play();
              }
            }
          } catch (e) {}
        });
      }
    };

    window.addEventListener("click", handleUserInteraction);
    window.addEventListener("touchstart", handleUserInteraction);
    window.addEventListener("pointerdown", handleUserInteraction);

    return () => {
      window.removeEventListener("click", handleUserInteraction);
      window.removeEventListener("touchstart", handleUserInteraction);
      window.removeEventListener("pointerdown", handleUserInteraction);
    };
  }, [musicPlaying]);

  // Report status changes to parent
  useEffect(() => {
    if (onStatusChange) {
      onStatusChange(status, statusDetails);
    }
  }, [status, statusDetails, onStatusChange]);

  // Handle dynamic mute / unmute for persistent microphone track
  useEffect(() => {
    const track = localAudioTrackRef.current;
    if (track) {
      track.setEnabled(!isMuted)
        .then(() => {
          console.log(`[AgoraPartyAudio] Mic track enabled state set to: ${!isMuted}`);
        })
        .catch(err => console.error("[AgoraPartyAudio] Error setting mic state:", err));
    }
  }, [isMuted]);

  // Main Initialize & Connection Lifecycle Effect
  useEffect(() => {
    let isUnmounted = false;
    let partyAudioWatcher: any = null;
    let retryTimeout: any = null;

    const initAgoraWithRetry = async (retryCount = 0) => {
      setStatus("connecting");
      setStatusDetails("Fetching secure voice credentials...");

      const numericUid = getNumericUid(username);
      let tokenData: any = null;

      const tokenUrl = resolveApiUrl("/api/v1/agora/token");
      console.log("[AGORA PARTY TOKEN REQUEST]", { url: tokenUrl, channelName, userRole, uid: numericUid });

      try {
        const res = await authenticatedFetch(tokenUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            channelName,
            role: userRole === "listener" ? "subscriber" : "publisher",
            uid: numericUid
          })
        });

        if (res.ok) {
          tokenData = await res.json();
        } else {
          console.warn(`[AGORA PARTY TOKEN API WARNING] Server status ${res.status}. Using default Voice RTC parameters.`);
          tokenData = {
            appId: "44f9db7ec1dc4d4bba73e459534d6f59",
            token: null,
            uid: numericUid,
            channelName
          };
        }
      } catch (err: any) {
        console.warn("[AGORA PARTY TOKEN FETCH EXCEPTION]", err);
        tokenData = {
          appId: "44f9db7ec1dc4d4bba73e459534d6f59",
          token: null,
          uid: numericUid,
          channelName
        };
      }

      if (!tokenData) {
        tokenData = {
          appId: "44f9db7ec1dc4d4bba73e459534d6f59",
          token: null,
          uid: numericUid,
          channelName
        };
      }

      try {
        setStatusDetails("Connecting to WebRTC voice gateway...");

        const AgoraRTC = await getAgoraRTC();
        if (!AgoraRTC) {
          throw new Error("Agora WebRTC engine could not be initialized.");
        }
        const agoraClient = AgoraRTC.createClient({ mode: "live", codec: "vp8" });
        clientRef.current = agoraClient;
        setClient(agoraClient);

        agoraClient.on("connection-state-change", (curState, revState, reason) => {
          console.log("[AGORA PARTY CONNECTION STATE]", { curState, revState, reason });
          if (curState === "CONNECTED" && !isUnmounted) {
            setStatus("connected");
            setStatusDetails("REAL VOICE LIVE / CONNECTED");
          } else if (curState === "DISCONNECTED") {
            setStatus("connecting");
            setStatusDetails("Reconnecting to voice server...");
          }
        });

        // Set initial client role
        const initialAgoraRole = userRoleRef.current === "listener" ? "audience" : "host";
        await agoraClient.setClientRole(initialAgoraRole);

        // Subscribing handler for remote speakers
        const handleUserPublished = async (remoteUser: IAgoraRTCRemoteUser, mediaType: "audio" | "video") => {
          if (isUnmounted) return;
          console.log("[AGORA PARTY USER-PUBLISHED]", { remoteUid: remoteUser.uid, mediaType, hasAudio: remoteUser.hasAudio });
          if (mediaType === "audio") {
            try {
              if (!remoteUser.audioTrack) {
                await agoraClient.subscribe(remoteUser, "audio");
              }
              if (isUnmounted) return;
              if (remoteUser.audioTrack) {
                remoteUser.audioTrack.setVolume(100);
                try {
                  await remoteUser.audioTrack.play();
                } catch (playErr) {
                  console.warn("[AGORA PARTY AUDIO PLAY BLOCKED BY BROWSER]", playErr);
                }
                setActiveSpeakers(prev => {
                  const uidStr = String(remoteUser.uid);
                  return prev.includes(uidStr) ? prev : [...prev, uidStr];
                });
              }
            } catch (subErr: any) {
              console.error("[AGORA PARTY SUBSCRIBE FAILURE]", { remoteUid: remoteUser.uid, error: subErr });
            }
          }
        };

        const handleUserUnpublished = (remoteUser: IAgoraRTCRemoteUser, mediaType: "audio" | "video") => {
          if (mediaType === "audio") {
            setActiveSpeakers(prev => prev.filter(uid => uid !== String(remoteUser.uid)));
          }
        };

        const handleUserJoined = (remoteUser: IAgoraRTCRemoteUser) => {
          console.log("[AGORA PARTY USER-JOINED]", { remoteUid: remoteUser.uid });
        };

        const handleUserLeft = (remoteUser: IAgoraRTCRemoteUser, reason: string) => {
          console.log("[AGORA PARTY USER-LEFT]", { remoteUid: remoteUser.uid, reason });
          setActiveSpeakers(prev => prev.filter(uid => uid !== String(remoteUser.uid)));
        };

        agoraClient.on("user-published", handleUserPublished);
        agoraClient.on("user-unpublished", handleUserUnpublished);
        agoraClient.on("user-joined", handleUserJoined);
        agoraClient.on("user-left", handleUserLeft);

        // Continuous Voice Stream Watcher: auto-subscribes, auto-plays, auto-republishes host/speaker mic track
        partyAudioWatcher = setInterval(async () => {
          if (isUnmounted || !agoraClient || agoraClient.connectionState !== "CONNECTED") return;

          // 1. Check and subscribe/play all remote audio tracks
          agoraClient.remoteUsers.forEach(async (u) => {
            if (u.hasAudio && !u.audioTrack) {
              try {
                await agoraClient.subscribe(u, "audio");
              } catch (e) {
                console.error("[AGORA PARTY WATCHER SUBSCRIBE ERROR]", { remoteUid: u.uid, error: e });
              }
            }
            if (u.audioTrack) {
              try {
                u.audioTrack.setVolume(100);
                if (!u.audioTrack.isPlaying) {
                  await u.audioTrack.play();
                }
              } catch (e) {
                console.error("[AGORA PARTY WATCHER AUDIO PLAY ERROR]", { remoteUid: u.uid, error: e });
              }
            }
          });

          // 2. Host/Speaker Mic Publication Health Check (Ensures host mic NEVER drops out silently)
          const currentRole = userRoleRef.current;
          if (currentRole === "host" || currentRole === "speaker") {
            const track = localAudioTrackRef.current;
            if (track) {
              const isAlreadyPublished = agoraClient.localTracks.some(t => t === track);
              if (!isAlreadyPublished) {
                console.warn("[AgoraPartyAudio Watcher] Mic track missing from client.localTracks. Re-publishing now...");
                try {
                  await agoraClient.setClientRole("host");
                  await agoraClient.publish([track]);
                  console.log("[AgoraPartyAudio Watcher] Re-publish SUCCESSFUL!");
                } catch (pubErr) {
                  console.error("[AgoraPartyAudio Watcher] Re-publish failed:", pubErr);
                }
              }
            }
          }
        }, 1000);

        // Join voice room
        const targetJoinUid = tokenData.uid || numericUid;
        try {
          await agoraClient.join(
            tokenData.appId,
            tokenData.channelName,
            tokenData.token || null,
            targetJoinUid
          );
          console.log("[AGORA PARTY JOIN SUCCESS]", { channel: tokenData.channelName, uid: targetJoinUid });
        } catch (joinErr: any) {
          console.warn("[AGORA PARTY JOIN FAILURE]", joinErr);
          if (
            joinErr?.code === "UID_CONFLICT" ||
            String(joinErr?.message || joinErr).includes("UID_CONFLICT")
          ) {
            console.warn("[AgoraPartyAudio] UID_CONFLICT detected. Retrying join with fresh UID...");
            const fallbackUid = Math.floor(Math.random() * 89999999) + 10000000;
            await agoraClient.join(
              tokenData.appId,
              tokenData.channelName,
              tokenData.token || null,
              fallbackUid
            );
          } else {
            throw joinErr;
          }
        }

        if (isUnmounted) {
          if (partyAudioWatcher) clearInterval(partyAudioWatcher);
          agoraClient.removeAllListeners();
          if (agoraClient.connectionState !== "DISCONNECTED") {
            await agoraClient.leave();
          }
          return;
        }

        setStatus("connected");
        setStatusDetails("REAL VOICE LIVE / CONNECTED");

        // Subscribe to existing remote users in channel
        for (const remoteUser of agoraClient.remoteUsers) {
          if (remoteUser.hasAudio) {
            await handleUserPublished(remoteUser, "audio");
          }
        }

      } catch (err: any) {
        console.error("[AGORA PARTY FATAL CONNECTION ERROR]", err);
        if (retryCount < 5 && !isUnmounted) {
          console.warn(`[AgoraPartyAudio] Connection retry ${retryCount + 1}/5 in 2s...`);
          retryTimeout = setTimeout(() => initAgoraWithRetry(retryCount + 1), 2000);
          return;
        }
        setStatus("error");
        setStatusDetails(`Connection Error: ${err.message || "Failed to join room"}`);
      }
    };

    initAgoraWithRetry();

    return () => {
      isUnmounted = true;
      if (retryTimeout) clearTimeout(retryTimeout);
      if (partyAudioWatcher) clearInterval(partyAudioWatcher);

      console.log("[AgoraPartyAudio] Cleaning up WebRTC voice channels...");
      
      const track = localAudioTrackRef.current;
      if (track) {
        try {
          if (clientRef.current && clientRef.current.connectionState === "CONNECTED") {
            clientRef.current.unpublish([track]).catch(() => {});
          }
          track.stop();
          track.close();
        } catch (e) {}
        localAudioTrackRef.current = null;
      }

      if (clientRef.current) {
        try {
          clientRef.current.removeAllListeners();
          if (clientRef.current.connectionState !== "DISCONNECTED") {
            clientRef.current.leave().catch(() => {});
          }
        } catch (e) {}
        clientRef.current = null;
      }
    };
  }, [channelName, username]);

  // Role management & Mic publication lifecycle effect (Host / Speaker / Listener role switches)
  useEffect(() => {
    const agoraClient = client;
    if (!agoraClient || status !== "connected") return;

    let isCancelled = false;

    const syncRoleAndMic = async () => {
      try {
        if (userRole === "host" || userRole === "speaker") {
          // 1. Upgrade client role to "host" (broadcaster)
          await agoraClient.setClientRole("host");

          // 2. Ensure microphone track exists
          let track = localAudioTrackRef.current;
          if (!track) {
            console.log("[AgoraPartyAudio] Creating microphone audio track...");
            const AgoraRTC = await getAgoraRTC();
            if (!AgoraRTC) return;
            track = await AgoraRTC.createMicrophoneAudioTrack({
              AEC: true,
              ANS: true,
              AGC: true
            });
            localAudioTrackRef.current = track;
            setTrackStateDummy(Date.now());
          }

          if (isCancelled) return;

          // 3. Set current mute state
          await track.setEnabled(!isMutedRef.current);

          // 4. Publish to Agora channel if not already published
          const isPublished = agoraClient.localTracks.some(t => t === track);
          if (!isPublished) {
            console.log("[AgoraPartyAudio] Publishing microphone audio track to channel...");
            await agoraClient.publish([track]);
            console.log("[AgoraPartyAudio] Microphone publish SUCCESSFUL!");
          }
        } else {
          // Downgrade client role to "audience" (listener)
          console.log("[AgoraPartyAudio] Downgrading role to listener...");
          const track = localAudioTrackRef.current;
          if (track) {
            try {
              if (agoraClient.connectionState === "CONNECTED") {
                await agoraClient.unpublish([track]);
              }
            } catch (unpubErr) {
              console.error("[AgoraPartyAudio] Unpublish error:", unpubErr);
            }
            track.stop();
            track.close();
            localAudioTrackRef.current = null;
            setTrackStateDummy(Date.now());
          }

          await agoraClient.setClientRole("audience");
        }
      } catch (err: any) {
        console.error("[AgoraPartyAudio] Role sync / mic publication error:", err);
      }
    };

    syncRoleAndMic();

    return () => {
      isCancelled = true;
    };
  }, [userRole, client, status]);

  // 🎵 Publish background music as a second audio source. The microphone remains
  // published separately, so music never replaces or mutes the live voices.
  useEffect(() => {
    let cancelled = false;

    const stopPartyMusic = async () => {
      const agoraClient = clientRef.current;
      const customTrack = partyMusicCustomTrackRef.current;
      try {
        if (agoraClient && customTrack && agoraClient.connectionState === "CONNECTED") {
          await agoraClient.unpublish([customTrack]);
        }
      } catch (e) {
        console.warn("[AgoraPartyAudio] Failed to unpublish party music:", e);
      }
      try { customTrack?.stop?.(); } catch {}
      try { customTrack?.close?.(); } catch {}
      partyMusicCustomTrackRef.current = null;
      if (partyMusicAudioRef.current) {
        partyMusicAudioRef.current.pause();
        partyMusicAudioRef.current.src = "";
      }
      partyMusicGainRef.current = null;
      if (partyMusicContextRef.current) {
        try { await partyMusicContextRef.current.close(); } catch {}
        partyMusicContextRef.current = null;
      }
    };

    const startPartyMusic = async () => {
      const agoraClient = clientRef.current;
      if (!agoraClient || status !== "connected" || !musicTrack || !musicPlaying || userRole === "listener") return;

      try {
        await stopPartyMusic();
        if (cancelled) return;

        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) throw new Error("Web Audio is not supported on this device");

        const audio = new Audio();
        audio.crossOrigin = "anonymous";
        audio.preload = "auto";
        audio.loop = true;
        audio.src = musicTrack.url;
        partyMusicAudioRef.current = audio;

        const ctx: AudioContext = new AudioCtx();
        partyMusicContextRef.current = ctx;
        if (ctx.state === "suspended") await ctx.resume().catch(() => {});

        const source = ctx.createMediaElementSource(audio);
        const gain = ctx.createGain();
        gain.gain.value = Math.max(0, Math.min(1, musicVolume));
        partyMusicGainRef.current = gain;

        const destination = ctx.createMediaStreamDestination();
        source.connect(gain);
        gain.connect(ctx.destination);
        gain.connect(destination);

        const mediaTrack = destination.stream.getAudioTracks()[0];
        if (!mediaTrack) throw new Error("Unable to create party music audio track");

        const AgoraRTC = await getAgoraRTC();
        if (!AgoraRTC) return;
        const customTrack = (AgoraRTC as any).createCustomAudioTrack({ mediaStreamTrack: mediaTrack });
        partyMusicCustomTrackRef.current = customTrack;
        await agoraClient.publish([customTrack]);
        await audio.play();
        console.log("[AgoraPartyAudio] Party background music published:", musicTrack.title);
      } catch (e) {
        console.warn("[AgoraPartyAudio] Party music start failed:", e);
        await stopPartyMusic();
      }
    };

    if (musicTrack && musicPlaying && status === "connected") {
      startPartyMusic();
    } else if (!musicPlaying || !musicTrack || userRole === "listener") {
      stopPartyMusic();
    }

    return () => { cancelled = true; };
  }, [client, status, userRole, musicTrack?.id, musicPlaying]);

  useEffect(() => {
    if (partyMusicGainRef.current) {
      partyMusicGainRef.current.gain.value = Math.max(0, Math.min(1, musicVolume));
    }
  }, [musicVolume]);

  return (
    <audio ref={audioOutputRef} autoPlay playsInline className="hidden" />
  );
};
