# 16-Person Guest Room Mobile Layout Update

- 8-seat Guest Room layout remains unchanged: 2 columns x 4 rows.
- 16-person room is Host + 15 Guest seats: Host is displayed above the seats and Guest seats use a 5 x 3 grid.
- The lower comments/navigation area keeps the existing 40% room allocation.
- The 16-person capacity remains persisted as `guestSeatCapacity: 16` while the visible Guest seat array contains 15 seats.
- Host camera continues to use the existing Agora local video mount and camera state; no new camera implementation was introduced.
- Existing Guest seat handlers, requests, mic/camera controls, music, gift, share and other functions are preserved.
