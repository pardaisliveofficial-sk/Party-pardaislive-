# V74 OTP Replica Fix

Railway logs showed OTP email send succeeding, but OTP verification returning 401 alongside `Could not load the default credentials`. This patch makes OTP verification replica-safe by returning a signed expiring challenge token from `send-email-otp` and validating it locally during `verify-email-otp` and recovery. Firestore remains only a fallback for older clients.

Changed: `server.ts`, `src/App.tsx`.
Deploy by replacing those files, commit/push to `main`, then let Railway auto-deploy. Keep the existing `SESSION_SECRET`/`JWT_SECRET` unchanged.
