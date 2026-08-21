Pardais Party auth hotfix:
- Only completed email/password accounts are treated as permanently registered.
- Incomplete OTP/profile attempts no longer permanently reserve email.
- Existing completed accounts remain locked to the email and require login.
- Password login returns specific recovery/setup errors.
- Forgot-password challenge is written to hot storage first and durable mirror is background.
- Recovery email has a dedicated subject/body.
- Verification client has bounded timeout.
