# Alpha Mate → Pardais Party corrective parity pass

This correction replaces the previous incomplete Shop placeholder with the real Alpha Mate Store UI and catalog, adapted to Pardais Party's own data and backend.

## Store
- Five categories: VIP Frames, Special Entries, Custom Gifts, Customized Gifts, Tags.
- 58 purchasable catalog entries.
- Item previews, details, pricing, level locks, backpack/inventory, purchase and equip.
- Purchase and equip are validated and persisted by Pardais backend APIs; client-side coin deduction is not trusted.
- Pardais user balances and inventory are updated from the server response.

## Home
- Explore renamed to For You; Following retained.
- Daily Rewards shortcut opens the existing Pardais daily-task overlay.
- Existing Pardais live/party discovery, story and PK functions retained.

## Profile
- Taller stage-cover hero with gradient and glass treatment inspired by Alpha Mate.
- Pardais cover/avatar upload, profile editing, stats, stories, reels, wallet, agency and settings retained.

## Party Rooms
- Alpha Mate-style purple glass/trending cards for room discovery.
- Room creation and in-room UI remain Pardais-owned.

## Live
- Existing Pardais Agora live, PK, gifts, viewers, reactions, comments and camera controls retained. No Alpha Firebase live data layer is copied.

## Data isolation
The Alpha Mate source project is a read-only reference. Pardais continues to use its own Firebase project, backend, database, users, coins, IDs, rooms, messages and media.
