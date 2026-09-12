# Level + Party Gift Wallet Persistence Fix

- User gifting progression is now monotonic and durable through refresh, app update, logout/login and session restore.
- `giftSpentCoins`, `xp`, `userLevel`, `level`, `vipLevel`, and `progressUpdatedAt` are persisted with the canonical user mirrors.
- Duplicate Firestore user mirrors cannot downgrade a user's level/XP/VIP anymore; progression fields are merged using the highest known value.
- Party seat gift badge displays **2x room gift points** (for example 10,000 sent => 20,000 shown on the seat badge), while `giftCoins` remains the real 10,000 transaction value for rankings/ledger accuracy.
- Recipient earning wallet remains **50%** of the actual gift spend (10,000 => 5,000 diamonds/earning wallet).
- Gift API response now returns canonical `xp`, `userLevel`, `vipLevel`, and `giftSpentCoins` so the client immediately adopts the server state.
