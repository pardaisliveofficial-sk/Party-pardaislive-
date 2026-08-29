# Moments Feed + Upload Reliability Fix

- Moments All now renders public reels inline alongside Stories and Posts.
- Reels uploaded by any user remain in the existing Reels system and are surfaced in Moments from the same shared reels state.
- Posts remain a global feed from the durable posts collection/API, not profile-only data.
- Photo publishing now uses a two-step mobile-safe flow: upload media first, then create the post as JSON.
- Server accepts a pre-uploaded mediaUrl while retaining the original multipart endpoint for backward compatibility.
- Story sync now uses the shared authenticated API client so Android/Capacitor resolves the production API correctly.
- Existing Reels, profile, Creator Hub, Shop, gifts, live, wallet, and admin functionality is unchanged.
