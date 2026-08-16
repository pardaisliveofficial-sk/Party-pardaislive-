# Pardais Party V29 — Party Room UI & Leave/End Fix

Applied without changing existing party creation, joining, seats, Agora audio, comments, gifts, games, sharing, requests, mute, invite, or explicit close functions.

## UI changes
- Removed duplicate/top microphone request control from the top bar.
- Kept **GAMES**, **Share**, and the visible **X/Close** button.
- Top status line now shows only **REAL VOICE**.
- Moved room information below the 12-seat area to save vertical space.
- Added live viewer count for all connected room users, regardless of seat occupancy.
- Added live party duration timer.
- Added overall Host and Gifter rank indicators.
- Host seat-request control is still available, moved into the lower status row.
- Existing bottom microphone and gift controls remain unchanged.

## Room behavior
- **Leave Party** never ends the room.
- A host can leave and the room remains active so other users can continue using it.
- **End Party (Close Room)** remains the explicit action that permanently closes the room.
- Existing seat cleanup and participant presence behavior remains intact.
