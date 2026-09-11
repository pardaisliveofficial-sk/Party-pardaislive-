# Find Friends Update

- Added a **Find Friends** button to the profile stats panel alongside Followers, Following, and Total Likes.
- Opens a mobile-friendly, scrollable directory of all registered users already synchronized from Firestore in real time.
- Supports search by username, full name, or permanent Pardais ID.
- Each user has a **Follow** / **Following** action.
- Mutual follow is displayed as **Friends**.
- Follow/unfollow continues using the existing permanent `/api/v1/user/following` synchronization, so existing follow behavior and follower counters remain intact.
- The current user is excluded from the directory.
- No existing profile, chat, live, party, PK, wallet, or gift functionality was removed.
