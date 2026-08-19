# Profile Photo Persistence V45

- User-selected profile photos are now account-persistent until the user explicitly changes/removes them.
- Added `avatarUpdatedAt`, `avatarSource`, and `profileUpdatedAt` metadata.
- Firestore canonical user selection now prefers the newest profile/avatar record, preventing an older mirror from replacing the current DP after refresh.
- App startup/refresh no longer lets a stale cached `/api/v1/user` or `/api/v1/auth/me` response overwrite a newer local custom avatar.
- Avatar upload persists the new URL against the authenticated account before returning success.
- Default/generated avatar is only used when the user has no custom avatar.
