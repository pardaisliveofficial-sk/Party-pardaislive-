# Pardais Party — Production Hardening Pass

Changes in this build:
- Screen Wake Lock while in Party/Live views; released when leaving.
- Profile photo API URLs use the HTTPS production API base to avoid mixed-content failures.
- Express trusts the Railway/Cloudflare proxy.
- Profile save waits for the account-scoped backend response and stores the canonical returned user.
- Profile/avatar user matching prioritizes UID, then normalized email, then username.
- Android workflow uses `npm install --legacy-peer-deps` instead of `npm ci`, avoiding stale lock-file dependency failures.
- Existing AUTH, Reels/video and Party flows are preserved.

CI target:
1. npm install
2. npm run build
3. Capacitor sync
4. Signed release APK
5. Release AAB
6. Debug APK
