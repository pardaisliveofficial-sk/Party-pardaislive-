# One-vs-One + Guest Flow Production Update

## Solo Live -> Invite Host
- Invite Host opens a half-screen bottom sheet.
- Live hosts are listed with their current mode: `Live Solo`, `Guest`, or `PK`.
- Only Solo Live hosts can receive a 1v1 invite.
- Guest and PK hosts remain visible with a busy state and cannot be invited.
- The list refreshes in real time while the sheet is open.

## Host-to-Host 1v1
- Sender sends a real server-side invitation.
- Receiver gets Accept / Reject.
- Accept creates the shared 1v1 session.
- 1v1 remains a free connected mode until either host starts PK or leaves.
- Starting PK sends the existing in-session challenge to the other host.
- PK starts after the existing countdown and runs for 5 minutes.
- PK result is shown briefly, then both hosts return to the same 1v1 session.

## Viewer -> Guest
- Host can tap a connected viewer's avatar/name.
- The existing viewer action menu now includes `Invite as Guest`.
- The existing guest invitation endpoint is used; the viewer receives the guest-seat invitation and can accept/reject it.
- Guest seats remain compatible with the existing moderation, mute, remove and seat controls.
- Compact guest layouts show only occupied seats for the first 1-3 guests; the existing 1+8 layout is retained for larger guest sessions.

## Existing Features
- Party rooms are not modified by this update.
- Existing gifting, wallet, level, ranking, live camera/mic, moderation and account persistence code remains in place.
