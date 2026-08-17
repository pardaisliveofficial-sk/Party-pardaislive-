# Pardais Party V62 — Permanent Coin System Fix

Implemented from the V61 source.

## Admin accounts
- Four configured admin emails are enforced server-side.
- Admin accounts are marked `isAdmin=true` and `role=admin`.
- One-time migration initializes existing admin accounts to 1,000,000 starting coins.
- New accounts created from an authorized admin email receive the same 1,000,000 starting balance.
- Normal users do not receive the admin balance.

## Normal coin circulation
- One-time V61→V62 migration resets ordinary user purchasing-wallet coins to 0.
- Removed the old wallet/settings +5,000 free-coin buttons.
- Removed the old “Claim Bonus Coins” guidance from gifting/reels UI.
- Payment recharge remains server-authoritative.

## Daily reward
- Added `/api/v1/daily-tasks/status`.
- Added `/api/v1/daily-tasks/claim`.
- Normal users can claim 120 coins + 300 XP once per 24 hours.
- Claim timestamp is stored on the durable user record.
- Refresh, logout/login, app restart, and updates do not reset the cooldown.

## Gifting
- Gift requests now use the authenticated API client from the app.
- Sender balance is deducted server-side and persisted.
- Full gift value remains the display value (100%).
- Recipient creator earning is exactly 50% of the gift value.
- Platform share is the remaining 50%.
- Recipient notification includes the full gift amount and the 50% Creator Center credit.
- Gift banner/party display shows the actual full coin value beside the gift.
- Gift XP/level progression is persisted server-side.

## Creator Center
- Existing Creator Center earning balance is retained in the durable `diamonds` field for backward compatibility, but the UI now labels it **Creator Coins**.
- Added server-authoritative Creator Coins → Gifting Coins exchange.
- Added server-authoritative Creator Coins withdrawal request endpoint.
- Exchange/withdrawal operations are persisted in the transaction ledger.

## Persistence
- User wallet changes are written to the durable user mirrors.
- Creator earnings survive refresh/re-login/restart/update.
- XP/level data survives the same lifecycle.

## Important
The source remains the existing React/Vite + Express/Firebase architecture. No UI redesign was made outside the coin/wallet/gifting changes.
