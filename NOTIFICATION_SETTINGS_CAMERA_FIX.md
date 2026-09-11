# Notification Settings + Camera Black Screen Fix

- Added account-scoped durable notification preferences with localStorage cache.
- Notification categories: New Followers, Follow/Unfollow, Friends, Video/Live Likes, Comments, Messages, Gifts, Coin Transactions, Announcements, Login/Logout, Sound, Push.
- Disabled categories no longer trigger foreground toast/chime/push; history remains available in Inbox until the user clears it.
- Added Notification Settings gear directly in the Pardais Inbox header.
- Added durable Friend, Unfollow and video/post Like notification events.
- Hardened Agora local camera startup: selected camera -> default camera -> real getUserMedia custom-track fallback, plus delayed local track.play retry.
- Reduced the live-video enhancement to a safer brightness/contrast/saturation profile and added explicit Android WebView video sizing/visibility rules to prevent black preview surfaces.
