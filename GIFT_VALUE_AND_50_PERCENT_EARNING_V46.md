# Pardais Party V46 — Gift Value Display & 50% Earning Credit

## Implemented

- Party seat gift badge now shows the **actual 100% gift value**.
  - 100-coin gift => 🎁 100
  - 2,000-coin gift => 🎁 2,000
- The displayed seat total accumulates the full gift value received in that room.
- Recipient earning/diamond wallet receives exactly **50%** of the gift value.
  - 100 coins => 50 earning/diamonds
  - 2,000 coins => 1,000 earning/diamonds
- Backend gift transactions now expose `recipientEarnings`, `recipientWalletCredit`, and `displayGiftValue`.
- Recipient wallet is persisted in the backend user record when the recipient can be resolved.
- Party seat state stores both `giftCoins` (100% display total) and `earningCoins` (50% wallet credit) separately.
- Existing PK score and gift-spend accounting continues to use the full gift amount.

## Important distinction

The **screen/seat gift box is a display of 100% of the gift value**. It is not the amount credited to the recipient wallet.

The recipient wallet/earning credit is **50%** of that displayed value.
