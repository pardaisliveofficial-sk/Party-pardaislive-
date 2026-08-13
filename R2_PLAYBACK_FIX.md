# R2 Reel Playback Fix

- Added `/api/v1/reels/media/*` playback proxy with HTTP Range support.
- Upload responses now save an API playback URL instead of relying on a public R2 custom domain.
- Existing `reels/...` URLs are normalized to the same playback proxy.
- No demo/system video fallback is used.
- Existing username/profile and fake-metrics fixes remain included from the previous ZIP.
