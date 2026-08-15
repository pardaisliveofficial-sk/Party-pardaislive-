# OTP/Auth Root Cause Fix

## Root cause
Older auth logic treated an `emailRegistry` row or `accountStatus=registered` as proof that an email/password account was complete. Those records could exist after an interrupted signup or an update that lost the password hash. As a result, new OTP requests returned `EMAIL_ALREADY_REGISTERED`, and the verify endpoint could reject a valid OTP before checking the OTP itself.

## Fix
- A completed email/password account is now defined by a real non-empty `passwordHash`.
- Registry-only/stale records no longer block signup OTP.
- Verify Email no longer performs the slow completed-account gate before reading the OTP.
- After OTP matches, an existing Firestore user is restored with a bounded 2-second lookup so the original UID/profile is preserved.
- If no user exists, the canonical email UID is created and the flow continues to profile/password setup.
- The durable email registry is still written when the password is created, so one email remains permanently bound to one account after registration is actually complete.

## Expected flow
New email -> Send OTP -> Verify OTP -> Name/Username/Password -> same account logged in.
Existing password account -> Signup/Send OTP is rejected as already registered -> Login/Forgot Password.
Legacy/stale registry without password -> OTP can complete/recover the same canonical UID instead of being blocked.
