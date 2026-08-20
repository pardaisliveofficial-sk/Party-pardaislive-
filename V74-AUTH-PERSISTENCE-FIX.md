# Pardais Party V74 — Permanent OTP Identity + Session Persistence Fix

Changes:
- Returning email OTP login now resolves the existing durable Firestore account before creating a new user.
- Pardais ID (`uniqueId`) remains stable for the email account.
- User-selected profile photo remains attached to the same durable account across OTP logins and Railway restarts.
- Railway refresh-session now restores accounts from Firestore instead of creating a random replacement account.
- Browser/WebView refresh can recreate a valid session from the saved durable profile when the local token is missing or stale.
- Android versionCode: 3
- Android versionName: 1.0.2
- Existing Android signing/workflow files are preserved.
