# Profile Photo Upload Fix V42

- Added a real pending state to **Save Profile Changes** while the avatar is being uploaded.
- Prevents duplicate saves/uploads while an upload is in progress.
- Compresses normal large Android gallery/camera images client-side to a 512px WebP before upload, reducing upload time dramatically.
- Keeps HEIC/HEIF/GIF/SVG as server-side fallback formats when the browser cannot decode them.
- Added a 45-second client safety timeout so Android WebView cannot hang indefinitely.
- Gallery, Camera and Cancel controls are disabled during the pending upload.
- Existing authenticated API, Cloudflare R2 storage and profile persistence logic remain intact.
