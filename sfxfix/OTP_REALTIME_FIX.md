# Pardais Party OTP Real-Time Verification Fix

Fixed the email signup OTP flow so the verification code is:
- normalized against the same lowercase/trimmed email
- stored in the hot API cache immediately
- persisted to Firestore before the verification email is sent when Firestore is available
- recoverable from Firestore when verification reaches another Railway instance
- synchronized into the hot cache through the authChallenges listener
- rejected with distinct NOT_FOUND / EXPIRED / INVALID / ALREADY_USED responses

The frontend now sends the normalized email and trimmed OTP to the verification endpoint.

Deployment:
1. Deploy the updated backend/frontend to Railway/hosting.
2. Rebuild the Android APK/AAB after the frontend deployment.
3. Test: Sign Up -> OTP email -> immediately Verify Email.
