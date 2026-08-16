# Pardais Party V44 — Profile Photo Upload Fix

Fixed the three profile-photo failure paths seen on Android:

1. Camera captures are converted directly into a real `File` from the camera data URL.
2. Camera/gallery upload no longer calls the app's API fetch wrapper with a `data:` URL, eliminating `Network fetch failed`.
3. Android providers that report a zero-byte camera `File` are rebuilt from the actual FileReader data.
4. `refreshSession()` now calls the backend refresh-session endpoint with the saved account identity and stores a fresh token, so expired/missing local session tokens no longer produce `Authenticated account could not be restored` when the account can be recovered.
5. R2 avatar upload timeout is 10 seconds before the existing fast persistent fallback is used.
6. File input value is reset so the same camera/gallery image can be selected again.
