# Pardais Party V59 — 25-Seat Runtime Fix

Fixed the reported behavior where Create Room briefly displayed the 25-seat UI
then switched back to a 12-seat room.

Root cause:
- `handleCreateParty()` calculated `seatCapacity` correctly (12 or 25).
- The optimistic party had the correct 25-seat state.
- But the POST body sent to `/api/v1/parties` did NOT include `seatCount`.
- The server therefore resolved the missing value to its 12-seat default.
- The returned backend party replaced the optimistic 25-seat party, causing the
  room to switch to 12 seats.

Fix:
1. Send `seatCount: seatCapacity` to the backend.
2. Also send `maxCapacity: seatCapacity` for explicit compatibility.
3. Normalize the returned party before replacing the optimistic state.
4. Preserve a 25-seat seat array when the backend response is missing/incomplete.
5. Existing 12-seat behavior remains unchanged.

Result:
- Select 12 -> room remains 12.
- Select 25 -> room remains 25 after backend synchronization.
- 25-seat 5x5 UI and all existing room functions can now be tested without the
  one-second downgrade to 12.
