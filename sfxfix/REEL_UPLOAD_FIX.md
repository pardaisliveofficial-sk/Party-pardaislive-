# Reel Upload Fix

## Current fix
Reel uploads now use the centralized production API for both Web and Android/Capacitor:
`https://api.pardaisparty.soulverseapps.com`

Relative `/api/...` requests no longer fall back to the frontend/web origin when `VITE_API_URL` is stale or missing. This is especially important for multipart `POST /api/v1/reels/upload-video` requests.

The server-side R2 upload timeout is 10 minutes.

## Deploy
1. Deploy `server.ts` to the production Railway service.
2. Build the web frontend so the updated `apiClient.ts` is bundled.
3. For Android, run the normal Capacitor sync/build flow to refresh `android/app/src/main/assets/public`.
