# Pardais Party 1.0.4 (Version Code 5)

## Production persistence + update safety
- Permanent account-state synchronization across username, UID, Pardais ID and email Firestore mirrors.
- Profile photo (DP) remains tied to the authenticated account and durable R2 storage.
- Followers, following/friend relationships, likes, coin balance, creator balance and uploaded reels/posts remain account-scoped and survive app updates/restarts.
- Lifetime coin spending is permanent and is the sole source of user level progression.
- Legacy spending history/XP/level data is migrated instead of resetting existing users to Level 1.
- Daily free coins no longer increase the lifetime-spending level.
- Backend outage during Google restore can no longer create a fake Level-1/zero-wallet profile over an existing account.
- Existing live/party/PK/guest/gift/notification/AR functionality retained.

## Google Play release configuration
- Android application ID: `com.pardaisparty.app`
- Version name: `1.0.4`
- Version code: `5`
- Release signing continues to use the existing configured signing workflow.
