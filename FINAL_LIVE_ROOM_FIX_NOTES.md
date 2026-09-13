# Pardais Party — Final Live Room Fix

- Version remains 1.0.8 / Android versionCode 9.
- Guest role uses the same Agora live channel as the host/viewers.
- Removed synthetic ambient/speech audio from AgoraStream.
- Removed Direct WebRTC/simulation fallback from AgoraStream join failures.
- Guest broadcaster mode can subscribe to remote video while publishing local camera to its seat.
- Guest camera target is mounted inside the current user's guest seat.
- Guest mic/camera state is synced to the host guest-seat state endpoint.
- Guest leaving removes the server-side seat and stops publishing when role changes back to audience.
- Viewer guest controls are role-limited to mic, camera, share, gift, plus the comment input.
- Guest header no longer exposes moderator/report management controls.
- Live comments are no longer seeded with fake users and auto-scroll only occurs when already near the bottom.
- Removed automatic fake viewer replies from host comments.
- Removed fake initial audio-room occupants and fake guest fallback user.
- Removed fake guest-request demo entries.
- Removed hard-coded live guest diamond display.
- Fixed duplicate `id` destructuring in the invite endpoint.
