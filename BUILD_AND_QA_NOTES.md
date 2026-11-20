# Pardais Party Migration — Build & Test Notes

## Current code changes
- Pardais-native signup/login retained and extended with Email OTP login.
- Main navigation updated to Home → Rooms → Store → Plus → Videos → Chat → Profile.
- Dedicated Rooms screen uses existing Pardais party records and join handler.
- Supplied Pardais Party logo is used by the splash screen, PWA/browser icons, and Android launcher/adaptive icons.
- Admin frontend is excluded from the consumer app build. A separate Admin Portal source package is supplied separately.
- Profile, Live, Store, Moments, Wallet, Agency, and DM functionality remains on Pardais-owned data services.

## Local build
Use Node.js compatible with the project's Vite/Capacitor dependencies, then run:

```bash
npm ci
npm run build
```

For Android, use the existing package scripts:

```bash
npm run android:build:debug
npm run android:build:apk
npm run android:build:aab
```

A successful source syntax pass is not the same as a successful production build. The dependency installation and Vite/Android build could not be completed in this environment because package installation timed out.

## First QA pass
1. Register a new test account using email OTP and complete profile setup.
2. Log in using password, then separately test Email OTP login.
3. Test Google sign-in and forgot-password recovery.
4. Verify the seven bottom tabs and dedicated Rooms screen.
5. Join a room, check room categories, and create a test room.
6. Update profile avatar/cover and verify the Pardais ID, level, VIP and wallet values persist.
7. Send text, image, voice and sticker DMs between two test accounts; verify unread count and read receipts.
8. Test live host/viewer connection, guest seats, PK flow and gifts.
9. Test Store, Moments/Reels upload/playback, wallet and notifications.
10. Confirm no Alpha Mate account, wallet, chat, room or media records were changed.

## Data protection
The original Alpha Mate ZIP and Pardais database/config files are retained as backups. No database merge or destructive migration was performed.
