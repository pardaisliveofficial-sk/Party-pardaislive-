# Pardais Party — Google Signup Flow Fix

Updated authentication flow:

1. Signup screen now shows **Continue with Google** and **Continue with Email**.
2. Google authentication uses the real Firebase `GoogleAuthProvider`.
3. Popup is attempted first; Firebase redirect is used if popup is blocked.
4. The old fake/local Google-account fallback has been removed.
5. A new Google identity receives a deterministic Pardais ID from the verified email identity.
6. New Google users are kept on the registration screen until they provide name, optional username, and a password.
7. Password + profile are persisted through the backend before the account is allowed into the app.
8. Existing completed Google/email accounts can sign in normally.
9. Google identities are persisted durably, but the permanent email registry is locked only after password registration completes.

## Firebase setting required

In Firebase Console for the Pardais Party Firebase project:

- Authentication → Sign-in method → **Google** → Enable.
- Authentication → Settings → Authorized domains: include the production web domain used by the app and `pardais-party-production.firebaseapp.com`.
- For Android/native Google sign-in, add the **actual SHA-1 and SHA-256** fingerprints of the signing certificate used to build/install the APK/AAB to the Android Firebase app. Do not use placeholder fingerprints.

The web Firebase config already points at `pardais-party-production.firebaseapp.com` and the app package is `com.pardaisparty.app`.
