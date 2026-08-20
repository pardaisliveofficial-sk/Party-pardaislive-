# Pardais Party V80 — Permanent Password Login & Auto-Restore Fix

Implemented in the authoritative `v58src` production source.

## Login
- Returning users can log in with email, username, or permanent Pardais ID + password.
- Existing password-login API is used.
- Successful password login stores the account credentials locally for Android WebView process restarts.

## Signup
- New email accounts now create a permanent password during profile completion.
- Password is stored server-side as a hash, never as plaintext.
- The device stores the login credential needed for automatic restore.

## Automatic restore
- On Android startup, if the short-lived API token is missing or stale, the app silently retries the saved account's password login.
- The real user profile is restored instead of falling back to `Guest_Visitor`.
- Manual Logout removes the saved login credentials so the account does not auto-login after an intentional logout.
