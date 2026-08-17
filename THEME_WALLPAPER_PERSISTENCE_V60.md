# V60 — Theme & WhatsApp Doodle Wallpaper Persistence

Implemented the requested save behavior:

## App Theme Customizer
- Selecting a theme no longer immediately overwrites the saved preference.
- After selecting a different theme, a `Save Theme` button appears.
- Saving applies the theme and stores it in localStorage.
- The saved theme is restored after refresh/relaunch.
- A per-user storage key is also used, so different accounts on the same device
  can keep their own saved theme.
- The existing global key is retained for compatibility.

## WhatsApp Party Wallpaper
- Selecting a wallpaper stages the selection.
- A `Save Wallpaper` button appears after a change.
- Saving applies and persists the wallpaper.
- The saved wallpaper is restored after refresh/relaunch.
- A per-user storage key is used.
- The existing global key is retained for compatibility.

The saved choice remains until the user selects another option and explicitly
saves it.
