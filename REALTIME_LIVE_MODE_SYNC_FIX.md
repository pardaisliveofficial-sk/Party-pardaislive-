# Pardais Party — Canonical Real-Time Live Mode Sync Fix

## Canonical modes
Every active host now exposes one authoritative `liveMode`:
- `solo`
- `guest`
- `1v1`
- `pk`

The backend also publishes `liveStateVersion` / `liveStateUpdatedAt` when the mode changes.

## Host -> server
The host heartbeat sends the canonical mode instead of treating every co-host connection as PK:
- PK countdown/active/result => `pk`
- connected free co-host => `1v1`
- guest seats active => `guest`
- otherwise => `solo`

## Viewer -> server snapshot
Viewer live-room polling consumes `liveMode` as the source of truth and clears stale local state when it changes. This prevents a viewer from remaining on an old PK layout after the hosts return to 1v1, guest, or solo.

## PK -> 1v1
The active PK session keeps the same shared channel while `pkState` transitions back to `1v1_connected`. The host record changes from `liveMode=pk` to `liveMode=1v1`, so viewers immediately switch to the free 1v1 layout without leaving the stream.

## PK/1v1 -> Solo / Guest / Ended
When the session is ended, the host record clears PK/co-host state and becomes the actual current mode. If the host broadcast ends, `/api/v1/hosts/:id` returns `404/ENDED` and the viewer exits the live room.
