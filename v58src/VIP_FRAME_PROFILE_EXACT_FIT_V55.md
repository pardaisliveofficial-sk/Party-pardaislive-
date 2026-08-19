# V55 — VIP Frame Exact Profile Fit

The supplied VIP artwork was inspected directly. Its canvas is 384×341 and
its transparent inner opening is substantially smaller than the full canvas.
The previous implementation sized the entire SVG too close to the avatar,
which caused the frame artwork to overlap/hide the profile picture.

V55 fixes the geometry:
- Decorative frame defaults to 205% of the avatar width.
- SVG aspect ratio (384:341) is preserved instead of stretching the frame into
  a square.
- The profile/avatar content is rendered above the decorative SVG.
- `overflow-visible` remains enabled so the frame can extend into the reserved
  space around the profile.
- VIP 1–12 artwork and breathing animation remain unchanged.
- Global VIP presence behavior from V54 remains unchanged.
