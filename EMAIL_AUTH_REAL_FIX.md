# Pardais Party — Real Persistent Email Auth Fix

This build integrates the email/password flow into the actual `index.html` auth gate used by the app.

Flow:
1. First page asks for email.
2. Returning account uses password and does not send OTP.
3. New account: Create account with this email -> OTP -> name + username + create password.
4. Password is stored server-side as a scrypt hash.
5. Pardais ID is generated once from the normalized email and then preserved.
6. Profile name/username are persisted and not replaced by generated placeholders.
7. Forgot password sends an OTP only when explicitly requested.
8. Firebase sync includes stable UID/email documents.

Important: this is a source-level change. A new frontend/backend deployment and a new APK/AAB build are required before the installed app changes.
