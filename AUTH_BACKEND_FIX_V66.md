# V66 Authentication Backend Fix

Base: V65 (V4 Android signing + V64 frontend authentication)

The V65 Android signing workflow and frontend authentication files are preserved.
The backend authentication routes/helpers were replaced with the known-working
AI Studio authentication implementation from the supplied working ZIP.

Key fixes:
- Fast email OTP verification/session response; Firestore persistence is backgrounded.
- Fast recovery session endpoint.
- Durable email/username/Pardais ID lookup for password login.
- Password login returns without blocking on durable persistence.
- Atomic create-account flow with background persistence.
- Password reset accepts both password and newPassword payloads.
