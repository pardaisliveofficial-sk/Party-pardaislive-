# Pardais Party — Notifications Production Update

- Notifications are now written through a durable server helper and synced to Firestore.
- Notification history is no longer automatically deleted after 24 hours.
- Follow/unfollow changes generate targeted social notifications.
- Live likes and live comments generate targeted notifications for the host.
- Direct chat messages generate targeted message notifications when a recipient is supplied.
- Successful password login and logout create account-security notification events.
- The notification permission UI now calls the browser's real Notification permission API instead of only marking a local flag as granted.
- Existing notification inbox/read/clear endpoints remain compatible.
- Existing user, wallet, gift, party, PK and live data collections are not replaced by this update.

## Event types
Login, Logout, Follow, Unfollow, Like, Comment, Message, Gift, and admin/system notifications can coexist in the same durable notification collection.

## Deployment note
For Android background push while the app process is fully closed, connect Firebase Cloud Messaging (FCM) to the existing notification collection/server dispatcher and store each device's FCM registration token against its durable user UID. The current build provides durable notification events and foreground/browser notifications without inventing or requiring a VAPID key.
