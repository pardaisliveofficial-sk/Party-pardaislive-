V17 Auth Create Account Fix

OTP verification flow is unchanged.
The verified signup session token is now persisted in sessionStorage and sent both as Authorization Bearer and verificationToken to the create-account endpoint. This prevents the post-OTP Create Account step from losing the verified session during a React remount/state reset.
