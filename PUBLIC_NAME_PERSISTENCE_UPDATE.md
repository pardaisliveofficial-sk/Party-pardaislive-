# Public Name Persistence Update

- Public UI now prefers the user's persisted `fullName`/`displayName` instead of the account username.
- Username remains the stable internal/account identifier for login, lookups, follows, invitations, and transactions.
- Live hosts, co-hosts, PK participants, party seats, party viewers, guest seats, and live/party chat display `displayName` when available.
- The server enriches active host/party records from the canonical user record so an app update or session restart does not regenerate or replace the public name.
- A user can change the public name through the existing profile-name flow; otherwise it remains unchanged across sessions and app updates.
