# Pardais Party V39 — Android Mobile Layout + System Back Navigation

## Changes
- Party-room top action bar is responsive on narrow Android phones.
- Games remains available as a compact icon on narrow screens; Share and Close remain visible.
- Party-room bottom chat/action row now uses strict min/max widths so the microphone and gift buttons cannot be pushed outside the viewport.
- Added safe-area bottom spacing for Android gesture/navigation bars.
- Added Capacitor App hardware/system Back-button integration. Android Back now follows the existing Pardais Party navigation/exit-confirmation flow instead of closing the WebView unexpectedly.
- Existing party, gift, seat, moderation, music and navigation logic is preserved.

## Build
npm install
npm run android:build:apk
npm run android:build:aab
