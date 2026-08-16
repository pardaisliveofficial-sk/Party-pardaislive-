# Railway Bun Lockfile Fix

Fixed the Railway build failure:
`bun install --frozen-lockfile` -> `error: lockfile had changes, but lockfile is frozen`.

Changes:
- Synced `package.json` dependency versions with `bun.lock`.
- Added the required `@capacitor/app` dependency to the lockfile for the Android back-button integration already used by `src/App.tsx`.
- Kept the existing V40 profile-photo upload changes intact.

Railway can now run its frozen Bun install against the committed lockfile.
