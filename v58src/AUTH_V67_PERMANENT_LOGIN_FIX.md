# V67 Authentication Persistence Fix
Base: V66. Android signing workflow is unchanged.
- Signup succeeds only after durable Firestore persistence succeeds.
- Login checks local account first, then one bounded durable lookup.
- Email, username, and Pardais ID login supported.
- Login and create-account requests have hard client timeouts.
- Existing registered account password hash is preserved and used for future login.
