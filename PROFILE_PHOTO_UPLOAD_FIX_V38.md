# Pardais Party V38 — Profile Photo Upload Fix

- Profile photo upload now sends the original File via multipart/XHR instead of relying on a large base64 data URL.
- Authorization bearer token is attached explicitly to the upload request.
- Upload timeout increased to 60 seconds with clear network/timeout errors.
- Gallery and native camera file selections preserve the File object.
- Server avatar upload accepts common image MIME types/extensions and raises the limit to 15 MB.
- Existing R2 avatar storage and API playback route are preserved.
- Existing profile persistence/auth flow is preserved.
