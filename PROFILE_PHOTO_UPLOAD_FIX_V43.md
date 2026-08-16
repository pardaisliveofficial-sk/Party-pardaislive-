# Profile Photo Upload Fix V43

- Reduced the Cloudflare R2 avatar upload wait from 30 seconds to 7 seconds.
- Added `ContentLength` to the R2 `PutObjectCommand` for more reliable uploads.
- If R2 is unavailable/slow, the existing API upload fallback responds immediately instead of allowing Railway/Cloudflare to produce a 502.
- Existing profile persistence and Firestore synchronization remain unchanged.
