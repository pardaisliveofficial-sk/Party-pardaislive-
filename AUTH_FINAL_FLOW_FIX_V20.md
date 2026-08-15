# Pardais Party Auth Final Flow Fix V20

- OTP verification flow is unchanged.
- Static auth gate Create Account now sends the verified signup token as Authorization Bearer and verificationToken.
- Create-account completes immediately and mirrors durable user/registry state in the background.
- Email status distinguishes completed accounts from pending/incomplete signups.
- Password login reports pending accounts as PASSWORD_NOT_SET instead of pretending the account does not exist.
- Forgot Password accepts recoverable legacy/pending email accounts.
- Reset Password responds immediately after updating local account state and persists the durable mirror in the background.
- React recovery/reset API timeout increased to 20 seconds.
- Password eye controls remain enabled; no OTP code was changed.
