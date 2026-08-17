# VIP Frame Profile Fit V53

Fixed the VIP frame overlay so the profile photo is not hidden by the frame artwork.

Change:
- VIP overlay increased from 145% to 168% relative to the profile-photo container.
- This compensates for the transparent inner opening of the supplied VIP artwork.
- The profile photo remains fully visible inside the frame.
- The frame stays centered around the photo.
- `overflow-visible` is enabled so the decorative frame can extend outside the avatar without clipping.
- Breathing SVG animation and VIP 1–12 designs are unchanged.
