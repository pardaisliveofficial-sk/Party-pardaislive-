# Pardais Party — UI + Music Fix v7

Base: `Live Error Fix v3`

- Version remains `1.0.8`.
- Android `versionCode` remains `9`.
- Party status/stats row (viewers, SFX, timer, rankings, host mic, log, mute all, seats lock) is moved in the JSX before the 12/25-seat grid.
- Existing handlers for those controls are unchanged.
- Solo Live and Video Guest Music now use the same production `/api/v1/music` catalog as Party.
- Opening Solo/Guest Music refreshes the production library instead of relying only on the initial page load.
- Solo/Guest Music has Library, Audius Search, Saved, admin Add Song, play/pause, stop, and volume controls.
- Selecting a track updates both Solo/Guest playback state and the shared Party music state so the existing Agora music publisher receives the selected track.
- Audius search effect is active for both Party Music and Solo/Guest Music.
- No demo/mock catalog was added.
