# Party refresh persistence patch

The patch preserves the active party connection across a browser refresh by
preventing unload/pagehide handlers from explicitly leaving/removing/disseating
the party. Normal explicit Leave/Exit actions remain unchanged.

Reels persistence and the profile Install-button removal from the base ZIP are
retained.
