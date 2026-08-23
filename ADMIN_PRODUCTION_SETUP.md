# Pardais Party Admin — Simple Production Setup

You only need to add **4 variables** in your Admin hosting/backend environment:

```env
VITE_API_URL=https://api.pardaisparty.soulverseapps.com
ADMIN_EMAILS=your-admin-email@example.com
ADMIN_PASSWORD=YOUR_STRONG_ADMIN_PASSWORD
ADMIN_AUTH_SECRET=YOUR_LONG_RANDOM_SECRET
```

## What each one means

- `VITE_API_URL` = your existing Pardais Party backend/API URL.
- `ADMIN_EMAILS` = the email(s) allowed to log in to Admin. Multiple emails can be comma-separated.
- `ADMIN_PASSWORD` = the Admin login password you choose.
- `ADMIN_AUTH_SECRET` = a long random secret used by the backend to sign Admin sessions. Keep it private.

## Where to add them

- `VITE_API_URL`: Admin frontend hosting/build environment.
- `ADMIN_EMAILS`, `ADMIN_PASSWORD`, `ADMIN_AUTH_SECRET`: Railway/backend environment variables.

If your Admin frontend and backend are deployed together, you can still keep all four variables in the hosting environment, but **never expose the three ADMIN_* secrets to browser code**.

## Result

Admin login → backend session → protected Admin API → Pardais Party backend/database.

Changes made from Admin are saved through the existing backend/Firestore synchronization and are available to the app through the same production API/data layer.
