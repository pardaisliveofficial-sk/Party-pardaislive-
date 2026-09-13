# Pardais Party Logo / Railway Build Fix

- Replaced corrupted PNG assets with valid PNG files extracted from the supplied original Pardais Party logo.
- Added transparent full-logo asset for in-app UI and an extracted P-mark asset for square launcher/splash icons.
- Splash screen now uses the extracted P mark; login/account UI continues to use the full Pardais Party logo.
- Regenerated valid PWA/launcher icons and valid screenshot PNGs.
- Updated build-icons.js so the full rectangular logo is never stretched into a square launcher icon.
- Added a cache-busting asset query/cache name so old corrupted logo files are not reused by the service worker.
- App package version remains 1.0.8 and Version Code remains 9.
