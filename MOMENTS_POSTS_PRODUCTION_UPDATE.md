# Pardais Party — Moments / Posts Production Update

## Added
- Moments is now the social content surface for Posts, Stories and the existing Reels system.
- Photo + text posts can be published from Moments.
- Device photo upload is supported for posts.
- Existing 24-hour Stories remain available and story photo upload now supports a real device file.
- Existing Reels upload/playback flow is preserved.
- Create (+) sheet now includes Create Post, Post Story, Upload Reel, Live and Party Lounge.
- Profile Creator Hub now has separate Reels and Posts modes. Posts mode shows the user's published posts and stories.
- Durable `posts` collection with Firestore synchronization and merge-on-refresh behavior.
- Post likes are persisted server-side.

## Persistence safety
- Posts and stories are merged by stable IDs instead of replacing the durable collection with an empty/stale client list.
- Existing functions and existing reel records are not removed by this feature update.
