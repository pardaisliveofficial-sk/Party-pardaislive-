# Pardais Party V32 — Home spacing + per-seat gifting UI

Implemented in `src/App.tsx`:

- Home Google Play and WhatsApp buttons are now compact overlay buttons, so they no longer consume a separate vertical row.
- The home hero/event card starts higher and is slightly taller; the two link buttons may sit over the card without pushing the card downward.
- Existing lower home content/card remains untouched.
- Party-room 12-seat grid now shows a small 🎁 badge beside every seat with that seat's current gifting/diamond total.
- Existing party actions, seat click behavior, mute controls, and gift processing are preserved.

Build note: dependencies are not installed in this ZIP environment, so a local production build was not run here. The source change is ready for the existing GitHub Actions build pipeline.
