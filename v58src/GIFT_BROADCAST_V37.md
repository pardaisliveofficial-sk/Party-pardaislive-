# Pardais Party V37 — Room-Wide Gift Animation Broadcast

Gift animations are now treated as room-wide events rather than sender-only local effects.

## Audience
A single gift event is delivered to every active participant in the same context:
- sender
- recipient/host
- seated guests
- room viewers/listeners
- party room participants
- solo live viewers
- guest-mode live viewers
- both PK sides and their viewers

## Important fix
The sender was previously pre-marking the request ID as processed before calling the local animation engine. That caused the local event to be discarded by the deduplication guard. V37 removes that premature mark. The sender now renders the same event as everyone else, while the event ID still prevents duplicate processing.

## PK
The backend now attaches the same gift event to both active PK host states when the gift belongs to a PK session, so viewers connected through either side receive the same animation.
