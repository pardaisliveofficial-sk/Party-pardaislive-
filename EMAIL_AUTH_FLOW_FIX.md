# Pardais Party — Persistent Email Account & Password Login Fix

## Backend changes included
- Email account identity is keyed by normalized email and stable UID.
- Existing Pardais uniqueId is preserved forever once assigned.
- New email accounts get a deterministic `pardes_<hash>` ID.
- User records are persisted in Firestore under legacy username plus stable UID/email keys.
- Generated DiceBear avatar is never restored over a user's saved photo.
- Added password hashing with Node `crypto.scrypt`.
- Added:
  - POST `/api/v1/auth/set-password`
  - POST `/api/v1/auth/password-login`
  - POST `/api/v1/auth/forgot-password`
  - POST `/api/v1/auth/reset-password`
- Normal login no longer requires an email OTP after the password has been created.
- OTP is only used for first-time email verification and explicit password recovery.

## Frontend flow to wire to these endpoints
1. First page: Email + `Continue`.
2. If email has no account:
   - Send email OTP.
   - Verify OTP.
   - Show `Create your Pardais account` screen:
     - Name
     - Username
     - Email (locked)
     - Password
     - Confirm password
     - Profile photo
   - Call `/api/v1/auth/set-password` using the token returned by OTP verification.
   - Then call `/api/v1/auth/setup-profile`.
3. If email already has a password:
   - Show Email + Password.
   - Call `/api/v1/auth/password-login`.
   - Do NOT send an OTP.
4. `Forgot password`:
   - Enter email.
   - Call `/api/v1/auth/forgot-password`.
   - Enter OTP + new password.
   - Call `/api/v1/auth/reset-password`.
   - Use returned token/user to enter the app.
5. Never fall back to guest login after a successful email verification/login.
6. Never overwrite saved username, Pardais ID, full name, or avatar during a returning login.
7. Only create a new user record when the normalized email does not already exist.
8. Keep all existing Party/Live/Reels/Gifts functionality unchanged.
