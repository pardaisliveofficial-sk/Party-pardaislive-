import React, { useEffect, useRef, useState } from "react";
import AgoraRTC, { 
  IAgoraRTCClient, 
  IMicrophoneAudioTrack, 
  IAgoraRTCRemoteUser 
} from "agora-rtc-sdk-ng";
import { authenticatedFetch, resolveApiUrl } from "../lib/apiClient";

// Set Agora SDK log level to 1 (ERROR) to expose internal errors in console
AgoraRTC.setLogLevel(1);

// Ensure all console.error calls are printed without suppression
if (typeof window !== "undefined") {
  const origConsoleError = console.error;
  console.error = function (...args: any[]) {
    origConsoleError.apply(console, args);
  };
}

interface AgoraPartyAudioProps {
  partyId: string;
  channelName: string;
  userRole: "host" | "speaker" | "listener";
  isMuted: boolean;
  username: string;
  avatar: string;
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
  }, []);

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

  return (
    <audio ref={audioOutputRef} autoPlay playsInline className="hidden" />
  );
};
