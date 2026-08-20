# V78 Production Source Lock

- APK/web must be built from this source, not the old AI Studio export.
- Removed the simulated Reels Follow/Unfollow UI and local-only follow toggles.
- Refresh restores the durable local account without requiring the volatile login flag.
- Same-account restore preserves username, Pardais uniqueId and user-uploaded avatar.
- Existing OTP/Firebase/Railway/live/party/gift flows are intentionally untouched.
