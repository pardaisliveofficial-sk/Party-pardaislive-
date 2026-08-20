# Pardais Party V72 — V69 Auth + Production Real Email OTP Fix

Base: Pardais-Party-V72-V69-AUTH-PRODUCTION-FIX

Changes in this hardening pass:
- Keeps the V69 Pardais Party AuthScreen (Login / Sign Up / Forgot Password).
- Production web auth requests use https://api.pardaisparty.soulverseapps.com.
- Password login keeps the bounded 20-second timeout and safe non-JSON handling.
- Signup OTP is delivered only through the production Resend email gateway.
- The API never returns `otp`, `debugOtp`, or `simulated` values.
- The frontend never auto-fills or displays a generated verification/recovery code.
- If real email delivery fails, the request fails and the pending OTP is cleaned up; no fallback code is exposed.
- Railway must have `RESEND_API_KEY` and a verified `RESEND_FROM_EMAIL` configured.
- Existing V69 atomic signup route remains: email OTP -> verification -> profile/name/username/password -> permanent account.
- Existing 30-day account deletion/recovery logic is preserved.
- Android signing workflow is not modified.
