# Pardais Party — Gift Broadcast Production Fix v15

## Gift delivery
- Every successful gift creates one canonical server `giftEvent` with a stable `eventId`.
- The same event is stored on the active live host, the active party room, and both PK host streams where applicable.
- A low-latency `/api/v1/gifts/events` endpoint returns only events newer than the client's cursor.
- Clients poll the authoritative gift event feed every 800ms while inside a live/party room.
- Existing queue polling remains as a fallback.
- Client event-id deduplication prevents the sender's local render and the server-confirmed event from playing twice.

## Audience
The same gift animation event is delivered to:
- sender
- recipient/host
- party seated guests
- party viewers/listeners
- solo live viewers
- PK host A and host B audiences

## Premium global gifts
- Gifts >= 10,000 coins show the global patti/banner to every client receiving the event.
- Smaller gifts keep the compact sender -> recipient toast.

## Animation media
- Existing MP4/WebM transparent overlay path remains in `GiftAnimationEngine`.
- The backend catalog is authoritative; app catalog refreshes from `/api/v1/gifts` every 2 seconds.
- Admin-added/edited gift media and metadata therefore propagate without requiring an APK update.

## Validation
- Global TypeScript parser check completed with no TS1005/TS1109/TS1128/TS1136/TS1160/TS1381/TS1382/TS17002/TS17008/TS17015/TS2657 syntax errors.
- Full dependency build could not be executed in this environment because npm dependency installation timed out; GitHub Actions should run the normal `npm install` and production build.
