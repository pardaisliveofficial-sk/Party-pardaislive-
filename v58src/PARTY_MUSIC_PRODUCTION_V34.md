# Pardais Party V34 — Music + Mic Fix

## UI changes
- Music Library button is now inside the party comment/action row.
- Gift button remains in the same bottom action row and is kept visible on narrow screens.
- Party music library supports search, track selection, play/pause, stop and volume.

## Real-time audio architecture
`AgoraPartyAudio` already supports a second custom Web Audio source. V34 now passes the selected party track into that component, so the selected music can be published separately from the microphone and heard simultaneously by remote participants.

## Production music library
The current `src/musicData.ts` list is still a development catalog. For production, replace it with a server-managed catalog:
1. Store only tracks that Pardais has the required distribution/broadcast rights for.
2. Put the audio files in Cloudflare R2 (or another CDN/object store).
3. Keep metadata in the backend/Firestore: id, title, artist, cover URL, duration, category, and signed playback URL/object key.
4. Expose an authenticated endpoint such as `GET /api/v1/music/library?q=&category=`.
5. The app fetches that catalog and passes the selected signed audio URL to `AgoraPartyAudio`.
6. Keep the audio URL short-lived/signed and do not expose storage credentials in the app.

A normal music metadata/search API is not enough by itself: the app needs an actual playback source that the platform permits to be rebroadcast into the party. Spotify's current developer documentation explicitly restricts commercial streaming integrations and non-interactive broadcasting, so Spotify should not be used as Pardais Party's room-broadcast music source. See the official Spotify policy and Web Playback SDK docs for the current restrictions.

## Microphone behavior
V34 adds a per-room local mute latch. When a user explicitly mutes their own party microphone, a room refresh/poll cannot silently enable it again. The mic remains disabled until the user explicitly taps Unmute.
