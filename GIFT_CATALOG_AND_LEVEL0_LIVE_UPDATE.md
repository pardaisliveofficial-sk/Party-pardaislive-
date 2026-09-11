# Pardais Party — Level 0 Live + Permanent Gift Catalog Update

## Live access
- Removed the client-side minimum Level 5 gate for starting Solo Live during testing.
- Authenticated users can open Solo Live regardless of current level.
- The old admin-only bypass is no longer required for this testing path.

## Permanent gift catalog
- Added 20 built-in gifts from 10 to 100,000 coins.
- Categories include Love, Popular, Lucky, VIP, Festival, Premium, Luxury and PK.
- Each built-in gift has a bundled static artwork and animated SVG asset under `public/gifts/`.
- The server serves `/gifts/*` as long-lived public assets.
- Built-in gifts are added to the persistent Firestore `gifts` collection only when missing.
- Existing custom/admin gifts are preserved.
- Legacy built-in demo media is upgraded only when it is clearly a sample/emoji/empty animation; custom admin media is not overwritten.
- Admin-uploaded animation storage now uses a deterministic `current.<ext>` path per gift, so replacing media updates the durable asset reference instead of creating a transient-only file.

## Remote real-time gift playback
- Gift events continue to use the server-side room/host gift queues.
- Event payloads carry the gift image and animation URL so all clients in the same Solo, Guest, 1v1, PK or Party room can render the same gift.
- Incoming SVG animations are now accepted by the client gift event resolver and rendered as animated SVG artwork.
- Gift catalog fetch remains remote/server-authoritative; localStorage is only a display cache.
