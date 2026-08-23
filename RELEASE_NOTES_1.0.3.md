# Pardais Party 1.0.3 (Version Code 4)

Production release configuration for the Google Play update.

- Android application ID: `com.pardaisparty.app`
- Version name: `1.0.3`
- Version code: `4`
- Release signing uses the existing GitHub Actions Pardais Party signing secrets only.
- No release keystore is stored in this source ZIP; GitHub Actions decodes the existing secret keystore temporarily during the release build.
- Release APK and AAB are signature-verified in CI before artifact upload.

## Level + Gift Wallet Persistence Pass
- Gift-based user level is now permanently monotonic and stored with a dedicated cumulative `giftSpentCoins` counter.
- Refresh/update/logout/login/session restore cannot downgrade `userLevel`, `level`, `vipLevel`, or `xp` from stale user mirrors.
- Party seat gift badge displays 2x room gift points (10,000 gift => 20,000 shown), while the underlying transaction value remains 10,000 for rankings/ledger.
- Recipient earning/diamond wallet receives exactly 50% of the real gift value (10,000 => 5,000).
- Gift API immediately returns canonical progression fields to the sender client.
