# Pardais Party — Camera State + Gift Drawer Fix

## Changes
- Replaced the duplicate Cover Photo action in the shared Guest/1v1 bottom rail with a real Camera ON/OFF control. Cover Photo remains available inside More.
- Added explicit Agora remote video publication state tracking. Remote video rendering now follows `user-published` / `user-unpublished` events, so camera ON/OFF state propagates to the other host and viewers without relying on stale `videoTrack` objects.
- Existing remote video users are subscribed when already publishing video after join, and remote video state is cleared when a user leaves.
- Gift drawer is now a viewport-level fixed bottom sheet with high z-index, preventing the drawer from being clipped by the live/PK/1v1 overflow containers. Gift content remains scrollable and the existing gift sending/history system is unchanged.

## Validation
- Modified TypeScript files were checked with delimiter balance and the existing TypeScript environment was inspected.
- Full build could not be completed in this container because the repository dependencies were not installed before the build timeout. Existing repository dependency errors are unchanged.
