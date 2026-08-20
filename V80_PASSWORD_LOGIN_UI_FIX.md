# Pardais Party V80 — Permanent Password Login UI Fix

This patch targets the **actual Android production source used by GitHub Actions: `v58src/`**.

## Changes
- Replaced the old initial OTP-only Login gate with **Email / Username / Pardais ID + Password** login.
- Added **Password** and **Confirm Password** fields to the verified Sign Up profile step.
- Password is sent to the existing `/api/v1/auth/create-account` endpoint.
- Successful login/signup saves the identifier + password in `pardais_saved_login_credentials` for Android WebView session restoration.
- Added silent startup restore:
  1. Validate the saved auth token.
  2. If token is stale/missing, silently use the saved permanent password account.
  3. Only show the login screen if restoration fails.
- Added working Forgot Password recovery UI using the existing `/api/v1/auth/forgot-password` and `/api/v1/auth/reset-password` endpoints.
- Existing server-side password hashing and `/api/v1/auth/password-login` endpoint are retained.

## Important
GitHub Actions builds Android from `v58src/`, so the production fix is made there rather than only in the root `src/` directory.

The local build could not be completed in this environment because `sharp` was not installed after the dependency-install command timed out. The modified authentication module was syntax-checked successfully with Node.js.
