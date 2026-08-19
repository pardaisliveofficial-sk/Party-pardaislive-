# V58 — 12/25 Seat Party + Private Room

Implemented on top of the supplied V57 source.

## Party capacity
- Create Room now offers 12 Seats or 25 Seats.
- The selected capacity is sent to the backend and persisted as `seatCount` / `maxCapacity`.
- The party room renders 12 seats as 3x4 and 25 seats as 5x5.
- Existing host, moderator, viewer, gift, comment, share, music, mute and seat-lock controls remain on the same party system.

## Private rooms
- Private Room requires a password when created.
- Private room cards display a lock/private badge.
- Joining a private room requires the correct password.
- Backend validates the password; the stored room password is not returned in party list/detail/join responses.

## Compatibility
- Existing 12-seat rooms continue to resolve to 12 seats.
- No separate party implementation was introduced; both capacities use the same party-room flow.
