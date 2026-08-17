# VIP Frame Global Presence V54

VIP profile frames are now driven by the user's `vipLevel`, not only by the profile-page selected frame.

Applied consistently to:
- Profile avatar
- 12-seat Party Room seats
- Party Room host avatar
- Live/Guest Room host and guest profile presentations
- Solo Live central avatar / camera-off avatar presentation
- PK / 1v1 Host A and Host B central avatars
- PK / 1v1 header avatar where available

Behavior:
- VIP 1–12 use the same supplied animated SVG frames.
- The frame continues its subtle breathing/glow animation.
- A user's VIP frame follows them when they move between profile, party seat, guest room, solo live, and PK.
- Party seat join payload now persists `vipLevel` on the seat.
- Party host creation/reactivation persists the host's current `vipLevel` on seat #1.
- Party seat leave clears the stored `vipLevel`.
- Live co-host synchronization carries `coHostVipLevel` so the opponent's VIP frame is preserved in PK.
- Small contexts use a reduced frame scale while keeping the same artwork.
