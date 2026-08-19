# V63 — Reels Permanent Persistence / Creator Hub Fix

This revision addresses the remaining disappearance paths after app/backend updates.

## Durable ownership identity
New reels now store:
- `uploaderId`
- `uploaderEmail`
- `uploaderUid`
- `ownerKey`

Creator Hub matching now accepts the stable email/UID in addition to the existing
Pardais unique ID, so a profile/account refresh that changes the displayed unique ID
cannot hide previously uploaded reels.

## Durable API collection
`POST /api/v1/reels/sync` no longer replaces the server's entire reel collection with
a partial/stale client array. It merges by stable reel ID and persists the supplied
records to Firestore and the R2 metadata mirror.

## R2 metadata recovery
R2 metadata recovery is now paginated with `ContinuationToken`, so more than 1,000
stored reel metadata files are not silently truncated during recovery.

## Canonical reel list
`GET /api/v1/reels` forces a Firestore hydration, merges the R2 metadata mirror,
deduplicates by stable ID, sorts by creation time, and saves the recovered cache before
returning it.

## Important deployment step
The Railway/API server must be redeployed from this source, and the Android/web build
must be rebuilt so the new source is actually used. Existing old deployed server code
will continue using its previous reel behavior until redeployed.
