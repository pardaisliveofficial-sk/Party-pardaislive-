# V71 Authentication Preservation

The production authentication UI now uses `src/components/AuthScreen.tsx` for both:
- the main authentication screen
- the in-app authentication modal

The alternate `PersistentEmailAuth` UI is no longer mounted by `App.tsx` so the AI Studio-style/alternate login flow cannot replace the production Pardais Party login UI.

The existing AuthScreen email/password login, OTP signup, profile completion, forgot-password recovery, and Google sign-in callback wiring are preserved.

Signing configuration and the 30-day account deletion system are unchanged.
