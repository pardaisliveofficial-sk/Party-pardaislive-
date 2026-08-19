# V75 — Production Login OTP Fix

Base: V74 (Version Code 3 / Version Name 1.0.2)

Production-only auth connectivity fix:
- Firebase Admin Firestore initialization is lazy/retry-safe.
- Railway supports FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY.
- Login account lookup and login OTP verification use bounded production-safe Firestore timeouts.
- Durable login lookup uses one canonical user lookup rather than two sequential short reads.
- Signup UI/OTP flow, dependencies, Android signing, and GitHub workflow remain unchanged.
- Version remains Code 3 / Name 1.0.2.
