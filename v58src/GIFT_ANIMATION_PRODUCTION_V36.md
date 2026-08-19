# Pardais Party V36 — Production Gift Animation

## Gift animation pipeline
Admin Gift Manager -> `/api/v1/gifts/upload-animation` -> Cloudflare R2 -> `/api/v1/gifts/animation?key=...` -> GiftAnimationEngine overlay.

Supported uploaded animation media:
- WebM (`video/webm`) — transparent overlay recommended
- MP4 (`video/mp4`) — full-frame/overlay video
- SVG (`image/svg+xml`)
- GIF (`image/gif`)

The gift record stores a stable playback URL instead of a large base64 media blob. The playback endpoint supports HTTP Range requests so mobile browsers/WebViews can stream video correctly.

Gift video elements are muted for reliable mobile/WebView autoplay. Gift sound effects remain handled by the separate gift audio engine, so the visual animation can start immediately without autoplay audio restrictions.

## Railway requirements
Set:
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_ENDPOINT`
- `R2_BUCKET_NAME`
- `PUBLIC_API_BASE`

The R2 bucket must allow the Railway server credentials to PutObject/GetObject under `gifts/animations/`.
