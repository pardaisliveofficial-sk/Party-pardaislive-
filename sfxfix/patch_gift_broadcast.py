from pathlib import Path

root = Path('/mnt/data/giftv14/sfxfix')
app = root/'src/App.tsx'
server = root/'server.ts'

s = server.read_text()
# Add authoritative gift event endpoint before supporters endpoint.
needle = '// GET /api/v1/gifts/supporters - Retrieve real top supporters aggregated from backend gift transactions\n'
endpoint = r'''// GET /api/v1/gifts/events - Low-latency authoritative gift event feed.
// Reads the same server-side room/host queues used for persistence, but returns
// only events newer than the caller's timestamp. This prevents recipients from
// depending on UI state refresh timing and makes sender/host/viewer/guest/PK
// animation delivery use the exact same event payload.
app.get("/api/v1/gifts/events", (req, res) => {
  const partyId = String(req.query.partyId || req.query.roomId || "").trim();
  const hostId = String(req.query.hostId || "").trim();
  const since = Number(req.query.since || 0);
  const queues: any[][] = [];

  const pushQueue = (q: any) => {
    if (Array.isArray(q) && q.length) queues.push(q);
  };

  if (partyId) {
    const party = (dbData.parties || []).find((p: any) => String(p?.id || "") === partyId);
    if (party) pushQueue(party.giftEventQueue);
  }

  if (hostId) {
    const host = (dbData.hosts || []).find((h: any) =>
      String(h?.id || "") === hostId ||
      String(h?.hostUsername || "").toLowerCase() === hostId.toLowerCase() ||
      String(h?.hostUid || "").toLowerCase() === hostId.toLowerCase()
    );
    if (host) pushQueue(host.giftEventQueue);

    // PK delivery: both host-side queues receive the same event, so include
    // the related active PK counterpart queue as well.
    Object.values(activePkSessions).forEach((sess: any) => {
      if (!sess || sess.status === "ended") return;
      const names = [sess.hostA?.username, sess.hostB?.username].filter(Boolean).map((x: any) => String(x).toLowerCase());
      const hostMatches = names.includes(hostId.toLowerCase());
      const userIds = [sess.hostA?.userId, sess.hostB?.userId].filter(Boolean).map((x: any) => String(x).toLowerCase());
      const idMatches = userIds.includes(hostId.toLowerCase());
      if (!hostMatches && !idMatches) return;
      [sess.hostA, sess.hostB].filter(Boolean).forEach((participant: any) => {
        const counterpart = (dbData.hosts || []).find((h: any) =>
          (participant.username && String(h?.hostUsername || h?.name || "").toLowerCase() === String(participant.username).toLowerCase()) ||
          (participant.userId && String(h?.hostUid || h?.id || "").toLowerCase() === String(participant.userId).toLowerCase())
        );
        if (counterpart) pushQueue(counterpart.giftEventQueue);
      });
    });
  }

  const unique = new Map<string, any>();
  queues.flat().forEach((evt: any) => {
    if (!evt?.eventId) return;
    if (Number(evt.timestamp || 0) <= since) return;
    unique.set(String(evt.eventId), evt);
  });

  const events = Array.from(unique.values()).sort((a: any, b: any) => Number(a.timestamp || 0) - Number(b.timestamp || 0));
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.json({ events });
});

'''
if needle not in s:
    raise SystemExit('server insertion point not found')
s = s.replace(needle, endpoint + needle, 1)

# Ensure response contains the canonical server event for sender confirmation.
needle2 = '  saveDatabase();\n\n  return res.json(responseData);\n});\n\n// GET /api/v1/gifts/events'
replacement2 = '  // Return the canonical server event as well. The sender may already have\n  // rendered the same requestId locally; client-side event-id dedupe prevents duplicates.\n  responseData.giftEvent = giftEvent;\n\n  saveDatabase();\n\n  return res.json(responseData);\n});\n\n// GET /api/v1/gifts/events'
if needle2 not in s:
    raise SystemExit('response insertion point not found')
s = s.replace(needle2, replacement2, 1)
server.write_text(s)

# Frontend changes
s = app.read_text()
# Add global threshold constant next to banner state.
needle = '  // Global premium big-gift broad banner patti state\n'
insert = '  // Gifts >= 10,000 coins use the global room-wide patti. Smaller gifts\n  // keep the compact sender -> recipient toast only.\n  const GLOBAL_GIFT_THRESHOLD = 10000;\n\n'
if needle not in s:
    raise SystemExit('global threshold insertion point not found')
s = s.replace(needle, insert + needle, 1)

# Make global banner conditional by threshold.
old = '''    // Trigger Global Gift Banner for ALL viewers and host in the room!\n    triggerGlobalGiftBanner(sender, giftName, `${giftIcon} x${count}`, recipient, Number(giftEvt.totalCost) || 0);\n'''
new = '''    // Premium gifts are global: host, sender, every guest and every viewer/listener\n    // that receives the same authoritative event gets the same patti.\n    const eventCost = Number(giftEvt.totalCost) || 0;\n    if (eventCost >= GLOBAL_GIFT_THRESHOLD) {\n      triggerGlobalGiftBanner(sender, giftName, `${giftIcon} x${count}`, recipient, eventCost);\n    }\n'''
if old not in s:
    raise SystemExit('global trigger block not found')
s = s.replace(old, new, 1)

# Add low-latency gift event polling after processIncomingGiftEvent callback.
needle = '''  }, [triggerGlobalGiftBanner]);\n  const userLiveMessagesRef = useRef<ChatMessage[]>([]);\n'''
insert = '''  }, [triggerGlobalGiftBanner]);\n\n  // Authoritative low-latency gift delivery. This runs independently from the\n  // normal room-data refresh so gift animation delivery is not delayed by a\n  // 3-5 second UI refresh cycle. The server returns only events newer than\n  // the current room cursor and all clients use the same event payload.\n  useEffect(() => {\n    const inParty = clientView === "party-room" && !!activePartyId;\n    const inLive = (clientView === "live-room" || clientView === "viewer-live" || clientView === "user-live") && !!(activeHost?.id || user?.uniqueId || user?.username);\n    if (!inParty && !inLive) return;\n\n    let cancelled = false;\n    const poll = async () => {\n      try {\n        const since = Math.max(0, Math.floor(Math.min(\n          lastPartyGiftEventTimestamp.current || Date.now(),\n          lastHostGiftEventTimestamp.current || Date.now(),\n          lastViewerGiftEventTimestamp.current || Date.now()\n        )));\n        const params = new URLSearchParams({ since: String(since) });\n        if (inParty) {\n          params.set("partyId", String(activePartyId));\n        } else {\n          params.set("hostId", String(activeHost?.id || `h-${user?.uniqueId || user?.username || "pardais_1001"}`));\n        }\n        const res = await fetch(`/api/v1/gifts/events?${params.toString()}`, { cache: "no-store" });\n        if (!res.ok || cancelled) return;\n        const payload = await res.json().catch(() => ({}));\n        const events = Array.isArray(payload?.events) ? payload.events : [];\n        events.forEach((evt: any) => {\n          const ts = Number(evt?.timestamp || Date.now());\n          lastPartyGiftEventTimestamp.current = Math.max(lastPartyGiftEventTimestamp.current, ts);\n          lastHostGiftEventTimestamp.current = Math.max(lastHostGiftEventTimestamp.current, ts);\n          lastViewerGiftEventTimestamp.current = Math.max(lastViewerGiftEventTimestamp.current, ts);\n          processIncomingGiftEvent(evt);\n        });\n      } catch (err) {\n        // Gift polling is best-effort; the normal room sync remains as a fallback.\n      }\n    };\n\n    poll();\n    const timer = window.setInterval(poll, 800);\n    return () => {\n      cancelled = true;\n      window.clearInterval(timer);\n    };\n  }, [clientView, activePartyId, activeHost?.id, user?.uniqueId, user?.username, processIncomingGiftEvent]);\n\n  const userLiveMessagesRef = useRef<ChatMessage[]>([]);\n'''
if needle not in s:
    raise SystemExit('gift polling insertion point not found')
s = s.replace(needle, insert, 1)

# On successful send, process canonical event from server response as confirmation.
old = '''                            if (data.remainingCoins !== undefined) {\n                              setUser(prev => ({ ...prev, coins: data.remainingCoins }));\n                            }\n'''
new = '''                            if (data.remainingCoins !== undefined) {\n                              setUser(prev => ({ ...prev, coins: data.remainingCoins }));\n                            }\n                            if (data.giftEvent) {\n                              processIncomingGiftEvent(data.giftEvent);\n                            }\n'''
# Replace both occurrences (solo and party send) if present.
s = s.replace(old, new)

# Make backend gifts authoritative on every app sync: do not save stale local-only data over server.
old = '''          if (Array.isArray(data) && data.length > 0) {\n            setGiftsList(data);\n            saveGiftsToStorage(data);\n          }\n'''
new = '''          if (Array.isArray(data)) {\n            setGiftsList(data);\n            saveGiftsToStorage(data);\n          }\n'''
s = s.replace(old, new)

# Reduce normal admin/catalog polling to 2s (gift event feed remains 800ms).
s = s.replace('    const pollInterval = setInterval(() => {', '    const pollInterval = setInterval(() => {', 1)
s = s.replace('    }, 3000);\n    return () => clearInterval(pollInterval);', '    }, 2000);\n    return () => clearInterval(pollInterval);', 1)

app.write_text(s)
print('patched')
