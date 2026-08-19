# Pardais Party V72 — V69 Auth + Production API Routing Fix

Base: Pardais-Party-V71-V69-AUTH-FLOW-RESTORE

Changes:
- Keeps the V69 Pardais Party AuthScreen (Login / Sign Up / Forgot Password).
- Production web auth requests now default to https://api.pardaisparty.soulverseapps.com instead of relative /api routes. This prevents auth POST requests from accidentally reaching the frontend/Cloudflare edge and returning HTTP 405 or empty responses.
- Password login now has a bounded 20-second timeout and safely handles empty/non-JSON API responses instead of throwing `Unexpected end of JSON input`.
- Login sends both `identifier` and `email` so the backend supports email and username consistently.
- Railway can start the actual Express backend with `npm run start` (`tsx server.ts`) so the auth routes are served by the same production backend that builds the frontend.
- Existing V69 atomic signup route remains: email OTP -> verification -> profile/name/username/password -> permanent account.
- Existing 30-day account deletion/recovery logic is preserved.
- Android signing workflow is not modified.

Production API: https://api.pardaisparty.soulverseapps.com
Production frontend: https://pardaisparty.soulverseapps.com/
