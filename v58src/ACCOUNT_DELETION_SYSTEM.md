# Pardais Party — Account Deletion System

## Web URL
After deployment, the account-management page is:
`https://pardaisparty.soulverseapps.com/delete-account`

## Flow
- Settings -> Delete Account -> Confirm Delete
- Account is marked `pending_deletion`.
- Permanent deletion is scheduled for 30 days later.
- During the 30-day window, the user can restore using a 6-digit code sent to the registered email.
- The existing password remains unchanged.
- After 30 days, the scheduled cleanup removes the account profile, email registry lock, sessions, user-owned metadata, and configured R2 objects under the user's reels/avatar prefixes.

## Play Console
Use the web URL above as the account-deletion URL in Data safety / App content.
