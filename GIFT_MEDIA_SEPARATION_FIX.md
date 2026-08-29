# Gift Media Separation & Playback Fix

- Gift picture (`imageUrl`/`icon`) is separate from animation media.
- PNG/JPG/JPEG/GIF can never be mounted as gift video.
- Playback candidates are resolved from valid WebM/MP4 URLs only for video playback.
- Remote gift videos are mounted only after cache/preload resolves, avoiding URL->Blob source swaps during playback.
- Removed playback-time `currentTime=0` resets from `canplay` and source-cache transitions.
- Existing SVG/SVGA animation records remain supported through `animationFile`/`animationUrl`.
- Server gift events normalize legacy queued records at the delivery boundary so image URLs do not enter video playback fields.
- Existing data is not deleted or reset.
