Pardais Party auth hotfix:
- Only completed email/password accounts are treated as permanently registered.
- Incomplete OTP/profile attempts no longer permanently reserve email.
- Existing completed accounts remain locked to the email and require login.
- Password login returns specific recovery/setup errors.
- Forgot-password challenge is written to hot storage first and durable mirror is background.
- Recovery email has a dedicated subject/body.
- Verification client has bounded timeout.


## Atomic signup completion
- Added `POST /api/v1/auth/create-account` to complete verified signup in one operation: password, name, username, registration state, persistence, and session are created together.
- The auth gate now uses this endpoint instead of separate set-password/setup-profile calls. Login and forgot-password endpoints remain unchanged.
