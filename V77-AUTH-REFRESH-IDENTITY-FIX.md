# V77 AUTH REFRESH / IDENTITY FIX

Targeted patch only. Preserves the existing V75 backend/auth/OTP flow.

Changes:
- A persisted real profile is sufficient to keep the UI authenticated across refresh.
- Refresh/bootstrap never treats a stale login flag as an explicit logout.
- Backend auth/me responses enrich the saved account instead of replacing stable uid/email/username/uniqueId with incomplete values.
- Explicit Logout remains the only normal path that clears the persistent account state.
- No OTP, Railway, Firebase, Firestore, live, party, gifts, or other production flows were rewritten.
