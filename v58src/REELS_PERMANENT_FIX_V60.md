# V60 — Permanent Reels / Creator Hub Persistence Fix

- Reel video files remain in Cloudflare R2.
- Reel metadata is saved to Firestore and mirrored to R2 under `reels/_metadata/{id}.json`.
- Publishing now waits for at least one durable cloud copy (Firestore or R2 metadata mirror) before returning success.
- If both durable stores fail, the client receives a failure instead of a false successful publish.
- A transient/empty Firestore `reels` snapshot cannot overwrite the existing reel cache.
- On cold start, `/api/v1/reels` hydrates from Firestore and the R2 metadata mirror.
- Creator Hub rebuilds Uploaded/Private reels from the durable reels list, so refresh/relaunch/redeploy does not remove published reels.
