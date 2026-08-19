# Pardais Party — Permanent Reels Fix

- The production Reels screen no longer mounts the hook-heavy ReelsView component that caused React error #321 on the Reels tab; the stable App-owned Reels implementation is used instead.
- All Reels list requests use `resolveApiUrl()` so Capacitor/Android does not request `/api/v1/reels` from the local `file://` frontend origin.
- The server hydrates the Reels cache from Firestore before returning `/api/v1/reels`, preventing cold-start/refresh disappearance.
- New reel metadata is awaited through the Firestore sync before the publish endpoint returns.
- React and ReactDOM are pinned to the same exact 19.2.7 version and Vite aliases/dedupes both packages to one installation.
- Existing R2 upload/playback flow is preserved.

- Each published reel metadata record is also mirrored to `reels/_metadata/{id}.json` in the same R2 bucket; the API restores that mirror on cold start/refresh if Firestore is empty or temporarily unavailable.
