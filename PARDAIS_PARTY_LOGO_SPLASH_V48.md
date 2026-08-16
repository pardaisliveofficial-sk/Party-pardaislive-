# Pardais Party V48 — White Screen / Exact Splash Fix

- Supplied artwork is stored as a real PNG, not a JPEG renamed to `.png`.
- HTML boot splash, sign-up gate, PWA manifest/icons and React splash use the exact supplied artwork.
- Service-worker cache bumped to v8 and the exact artwork is precached.
- Android native launch splash uses the exact artwork and black handoff background.
- HTML boot splash stays visible until React mounts, with a 5-second safety timeout.
- Existing application functionality is unchanged.
