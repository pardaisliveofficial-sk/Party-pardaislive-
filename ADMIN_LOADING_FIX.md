# Pardais Party Admin — Loading Fix

Fixed the Admin Portal navigation/loading deadlock in WebView/APK.

## Root cause
`AdminApp` initialized `isLoading` to `true`, while the database request only started when an existing admin session was authenticated. On a fresh WebView/device this meant the Admin Portal could remain permanently on the database-sync splash screen.

## Fix
- Fresh Admin Portal now opens the login screen immediately.
- Existing valid admin sessions still load the production database automatically.
- Login starts the database loading state and the normal authenticated fetch.
- Existing API URL and database logic remain unchanged.
