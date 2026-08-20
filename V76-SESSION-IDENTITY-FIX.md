# Pardais Party V76 — Permanent Session + Identity Fix

- Refresh/reload never clears the signed-in UI during auth hydration.
- Only explicit Logout clears durable auth state.
- Same-email OTP login preserves the existing permanent Pardais ID, username and user-selected DP.
- The merged profile is re-synced to `/api/v1/user` after OTP login.
- Android versionCode 4 / versionName 1.0.3.
- Android workflow remains the existing Capacitor build from this same source.
