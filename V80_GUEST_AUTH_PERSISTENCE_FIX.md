# Pardais Party V80 — Guest Authentication Persistence Fix

## Fixed

The Quick Guest Login button was creating a complete guest profile only in browser `localStorage` and was not calling the production backend guest-login endpoint. As a result, the guest account/session could disappear from the server and backend-dependent features could not reliably resolve the guest user.

## New behavior

1. The app calls `POST /api/v1/auth/guest-login` first.
2. The current device ID is sent to the backend for the existing hardware-ban check.
3. The backend-created user and session token are stored locally.
4. The returned user is marked as `isGuest: true` / `authProvider: "guest"` on the client.
5. Profile setup continues using the real backend session token.
6. If the backend rejects the request, the app stays logged out and shows the actual error instead of creating a fake local-only account.

Updated production source files:
- `v58src/src/App.tsx`
- `v58src/App.tsx`

The duplicate root copies were updated as well so an accidental root-level frontend build does not reintroduce the old guest-login behavior.
