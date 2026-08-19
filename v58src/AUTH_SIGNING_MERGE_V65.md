# Pardais Party V65 — Signing + Authentication Merge

Base: Pardais-Party-V63-SIGNING-FIX-V4
Authentication source: Pardais-Party-AUTH-MERGED-FIX-V64

The V4 Android signing workflow is preserved unchanged.
Only these authentication integration files are merged from V64:
- v58src/src/App.tsx
- v58src/src/components/PersistentEmailAuth.tsx

This keeps the V4 signing-key configuration while adding the V64
persistent email/password signup, login, username/ID login, and recovery flow.
