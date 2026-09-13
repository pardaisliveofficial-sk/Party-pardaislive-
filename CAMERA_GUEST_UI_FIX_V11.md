# Guest UI / Camera Fix v11

- Restored the Guest Room lower area to a single full-width comments + navigation section (removed the accidental nested duplicate lower panel).
- Kept existing handlers for Mic, Camera, Rotate, Music, Gift, Share and Guest Requests.
- Changed the lower rail to a 7-column responsive layout so all controls remain visible on mobile.
- Kept comments as a scrolling list without slicing to the last 15 messages.
- Solo Live now lets AgoraStream render its own local full-screen video target; the external Guest target is only used while Guest Room mode is visible.
- Added a short target retry and a ref-target dependency so the camera video mounts when the Guest overlay appears.
- Royal empty guest seats use the exact throne reference crop from the approved UI mockup.
- package.json version remains 1.0.8; no version-code metadata was changed.
