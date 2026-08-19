# V50 Android Build Fix

Fixed the production build failure shown in the GitHub Actions log:

- `/api/v1/user` POST handler now uses `async`, allowing its existing durable persistence `await persistUserDurably(...)` to compile correctly.
- Removed the duplicate `@capacitor/app` entry from `package.json` that was producing the duplicate-object warning.
- No party, gifting, profile, or UI feature logic was intentionally changed in this patch.

The previous V49 failure was:
`ERROR [await] can only be used inside an async function`

The failing location was `server.ts` around the `/api/v1/user` POST route.
