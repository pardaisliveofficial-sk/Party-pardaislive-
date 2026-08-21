# Pardais Party Email OTP / Recovery Fix

- Signup verification OTPs are now durably stored in Firestore `authChallenges` before the email is sent.
- Verification falls back to Firestore when the hot cache is empty, so an APK request can verify after an API restart/replica change.
- Used/expired challenges are deleted from both cache and Firestore.
- Password recovery OTPs use the same durable challenge store.
- The frontend no longer creates a fake local account when OTP verification fails. It shows the real API error instead.
- The app has resend controls for signup verification and password recovery.
- `RESEND_API_KEY` must be configured on the production backend and the sender domain/address must be verified in Resend. The code uses `noreply@mail.pardaisparty.soulverseapps.com`.
