# Level + Wallet + Coin Ledger Persistence Fix

## Authoritative progression
- Level is calculated from **lifetime coins actually spent**, not current wallet balance and not temporary UI state.
- `coinSpendTotal` is the authoritative cumulative spend counter.
- Every authenticated response normalizes `userLevel`, `level`, `vipLevel`, and `xp` from the same cumulative spend value.
- VIP level is recalculated automatically from the canonical user level using the existing Pardais level/VIP mapping.

## Durable coin usage history
Every authoritative coin spend records:
- transaction ID
- user ID / username
- amount
- source (`gift`, `party_game`, `pk_match`, `reels_gift`, `transfer`, etc.)
- game/party/match/recipient metadata where available
- timestamp

The user's recent spend history is retained on the user record and a server ledger is maintained for audit/history.

## Creator Center earnings
Creator/game earnings are stored separately from the gifting wallet:
- `diamonds` = Creator Center earning wallet
- `coins` = Gifting/Spending wallet
- `creatorEarningHistory` records every durable earning event

Gift recipients receive the existing **50%** creator share. A 10,000-coin gift remains displayed as a 10,000-coin gift, while 5,000 is credited to the recipient's Creator Center earning wallet.

## Party / Live consistency
Party seats, party viewers, and live host sessions resolve the canonical account from the username before displaying level/VIP/avatar. This prevents stale client-provided levels from replacing the account's real level.

## Games
Lucky Wheel, Chest, Slots, Aviator, Dragon vs Tiger, and team-game stakes now use server-authoritative coin spend persistence. Game winnings are persisted into the Creator Center earning wallet.

## Existing features
No existing feature is intentionally removed. Local UI remains responsive, but the server is now the source of truth for balances and progression after every authoritative transaction.
