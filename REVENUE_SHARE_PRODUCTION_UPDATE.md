# Pardais Party — Gifter Revenue Share / Investment Module

Implemented as an additive module inside the existing Shop UI.

## Existing-system protection
- Existing Shop, Gifts, Coins, Wallets, Users, Reels, Moments, Party, Live, navigation and admin controls are untouched.
- Revenue Share uses isolated collections: `investment_plans`, `investments`, `investment_transactions`, `investment_earnings`, `investment_withdrawals`, `revenue_pools`, `revenue_distributions`.
- Firestore synchronization for the new collections is merge-on-nonempty, so a transient empty snapshot does not wipe local financial records.
- Historical investments store a `planSnapshot`; later plan edits do not retroactively rewrite historical investment terms.

## User module
- Shop card: Gifter Revenue Share / Grow with Pardais Party.
- Dynamic minimum deposit from active plans.
- Dashboard: total deposit, active balance, monthly earnings, total earnings, available earnings, pending earnings.
- Dynamic plans from Admin.
- Investment ID generation and pending payment-verification state.
- Separate principal and earnings balances.
- Earnings/principal withdrawal requests with cash or coins payout format.
- Investment and withdrawal history.

## Admin module
- Revenue Share Management navigation item.
- Metrics dashboard.
- Plan creation/edit/enable/disable.
- Investor search and status filter.
- Pending investment approval/rejection.
- Monthly revenue pool creation, approval and one-time distribution.
- Pending withdrawal approval/rejection.
- Server-side validation for amounts, plan limits, payout formats and duplicate pool distribution.

## Distribution rule
For each approved monthly pool, eligible active investments receive a deterministic proportional allocation based on principal, multiplied by the investment's stored plan revenue-share percentage. Each generated earning and distribution is written as a permanent transaction record.

## Important integration note
Payment methods are represented through the existing payment infrastructure boundary. This module does not create a second payment gateway or overwrite the existing wallet/coin system. Deposits remain `Pending` until an authorized admin verifies and activates them.
