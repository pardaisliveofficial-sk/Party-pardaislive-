# Profile Photo Upload Fix V40

- Profile avatar upload now uses the shared authenticated API client in the main `src/App.tsx` build.
- Android/Web uploads send the current Bearer session consistently.
- Empty file selections are rejected with a clear message.
- Avatar multipart limit increased to 25 MB for modern Android camera originals.
- Multipart/Multer failures now return JSON errors instead of an HTML 500 response.
- Existing R2 upload, local fallback, Firestore sync, profile fields and authentication flow remain intact.
