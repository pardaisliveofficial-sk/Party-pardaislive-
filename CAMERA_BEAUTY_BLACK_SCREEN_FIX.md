# Camera Beauty / Black Screen Fix

- Restored the last known-working Agora camera publisher implementation.
- Removed the Android WebView-unfriendly CSS GPU filter from the live `<video>`.
- Removed transform/backface manipulation from the actual camera video surface.
- Kept only a subtle non-destructive light/beauty overlay on the live surface.
- Front/back camera switching remains the existing in-place Agora `setDevice()` flow.
- Notification settings changes remain included and are not removed.

The intent is specifically to keep the camera working exactly as before while retaining a very light visual enhancement, rather than changing the camera capture pipeline.
