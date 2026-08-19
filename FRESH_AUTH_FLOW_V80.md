# Pardais Party V80 — Fresh Auth Flow

New isolated production auth flow:
- `/api/v2/auth/signup/request` -> email OTP
- `/api/v2/auth/signup/verify` -> verified pending account + session
- `/api/v2/auth/signup/complete` -> permanent profile + durable user + locked email registry
- `/api/v2/auth/login/request` -> login OTP
- `/api/v2/auth/login/verify` -> existing account session
- `/api/v2/auth/health` -> production auth configuration check

The existing Pardais session token format is retained so the rest of the app continues to work. Android version remains 3 / 1.0.2.
