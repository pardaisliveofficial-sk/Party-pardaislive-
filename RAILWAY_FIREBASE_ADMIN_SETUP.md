# Railway Firebase Admin setup

This build keeps the existing package/dependency versions, Android signing files, and workflow unchanged.

The backend now prefers Firebase Admin SDK for server-side authentication and durable account persistence. `firebase-admin` was already present in `package.json`.

## Required Railway variable

Set:

`FIREBASE_SERVICE_ACCOUNT_JSON`

Value: the complete Firebase service-account JSON for the same Firebase project used by Pardais Party.

Supported alternatives:
- `GOOGLE_APPLICATION_CREDENTIALS` = path to a service-account JSON file
- `GOOGLE_APPLICATION_CREDENTIALS_JSON` = complete service-account JSON
- `FIREBASE_PROJECT_ID` = optional project ID override

After setting the variable, redeploy.

Expected deploy log:

`[PARDAIS-PARTY FIREBASE] Railway Firebase Admin Firestore initialized.`

Auth path on Railway:

Email OTP -> verify -> Firebase Admin Firestore lookup/write -> permanent account/session.

The existing browser/Preview Client SDK remains unchanged for the rest of the application.
