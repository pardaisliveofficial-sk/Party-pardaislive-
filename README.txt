Pardais Party — User Persistence Fix

1. Upload fix_persistence.py into the root of your GitHub Codespace workspace:
   /workspaces/Party-pardaislive-

2. Open Terminal and run:
   python3 fix_persistence.py

3. Then validate:
   npx tsc --noEmit

4. Then build:
   npm run build

5. If both pass:
   git add src/db/firebaseDb.ts server.ts
   git commit -m "fix: persist email user identity and profiles"
   git push origin main

The patch:
- stops Firestore empty/stale snapshots from wiping the local users cache
- keeps active sessions from being erased by an empty snapshot
- makes the email account record authoritative in the server cache
- selects the most complete account if old duplicate email records exist
- locks the username after initial profile setup
- preserves user-entered profile data instead of generated avatar/default values
