# Moments unified feed + publishing fix

- Moments > All now merges public Reels and Posts into one chronological feed.
- Existing Reels system remains unchanged; tapping a reel opens the existing Reels viewer.
- Stories remain at the top and all active users' stories remain visible.
- Post/photo publishing uses the production-aware authenticated API resolver for APK/WebView.
- Post reads also use authenticated API routing rather than a WebView-relative endpoint.
- Story sync now uses the same production-aware API resolver.
- Moments R2 media URLs preserve path segments correctly.
- Existing profile/Creator Hub data and Reels collections are unchanged.
