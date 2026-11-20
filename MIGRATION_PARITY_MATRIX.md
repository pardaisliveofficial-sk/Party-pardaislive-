# Alpha Mate → Pardais Party feature parity review

The Alpha Mate source ZIP is treated as a read-only reference. Its Firebase config,
Firestore project, account records, media, and database files are not copied or
modified. The Pardais Party app continues to use its own Firebase project, API,
user IDs, balances, chat collections, rooms, and media records.

| Alpha Mate module | Pardais Party implementation retained / mapped |
|---|---|
| Splash / Welcome | Pardais Party splash and welcome/auth gate with supplied Pardais branding |
| Register / Sign In | Pardais AuthModal; email OTP signup, password login, Google sign-in, forgot-password recovery; added Pardais-native Email OTP login |
| Home | Pardais feed with For You/Following tabs, promotion banners, daily-rewards shortcut, stories, room/live discovery, PK filters and Moments entry points |
| Party Rooms | Dedicated Rooms tab and Alpha Mate-style trending/list cards; Pardais room creation, room records, categories, join flow, host controls and seat layouts retained |
| Live Stream | Existing Pardais Agora live host/viewer flows, camera prep, guest seats, reactions, gift broadcast |
| PK Battle | Existing Pardais PK and host-vs-host flows |
| Store | Full Alpha Mate Store UI ported: 58 catalog items, five categories, preview/details, price and level locks, backpack/inventory, purchase/equip. Purchase is server-authoritative on Pardais backend |
| Moments / Video Upload | Existing Pardais Moments/Reels feed and upload flow |
| User Profile | Pardais profile functions retained and cover hero restyled to Alpha Mate's taller stage/glass visual hierarchy; edit profile, cover/avatar upload, ID, stats, level/VIP, stories, reels, agency and account controls remain Pardais-owned |
| Chat / DM | Existing Pardais Firestore conversations and messages, real-time list/message listeners, unread counts, read receipts, text/image/voice/sticker messages, user search and profile preview |
| Wallet | Existing Pardais wallet, coin/diamond balances, transaction and recharge surfaces |
| Level System | Existing Pardais level progression and level center |
| Search | Existing Pardais registered-user search and chat discovery |
| Notifications | Existing Pardais notification inbox and settings |
| Settings / Legal / Delete Account / Recovery | Existing Pardais settings, policy, account deletion and recovery flows |
| Agency Management | Existing Pardais host/coin-seller agency features and revenue-share UI |
| Admin Dashboard | Consumer app admin entry points and bundled admin frontend removed; admin API routes remain in the Pardais backend and must be managed/deployed separately |

## Important implementation rule

Do not transplant Alpha Mate screen components that call Alpha Mate's `AppContext`
or Firebase services unchanged. They would read/write Alpha Mate data. For each
feature, keep or adapt the Pardais implementation so it uses Pardais identity and
storage. The original Alpha Mate ZIP remains untouched.

## Validation status

- Signup/Login and navigation/Rooms additions implemented.
- Full Alpha Mate Store UI/catalog ported and connected to Pardais server-authoritative inventory/purchase/equip endpoints.
- Home For You/Following naming, daily rewards shortcut, profile hero and room listing cards aligned to Alpha Mate's design hierarchy.
- Profile, Live, Store, Moments, Wallet, Agency and DM functionality reviewed and mapped to existing Pardais code.
- Admin frontend entry points removed from the consumer app; backend admin routes not extracted.
- Static TypeScript/TSX syntax validation passed.
- Full npm build and Android runtime validation still pending because dependencies were unavailable in the current environment.
