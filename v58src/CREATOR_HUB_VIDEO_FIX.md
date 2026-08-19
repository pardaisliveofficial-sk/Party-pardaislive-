# Creator Hub + Visitor Video Playback Fix

The Creator Hub now opens the exact uploaded `videoUrl` in a real HTML5 video
player with native controls instead of the old simulated gradient canvas.

The R2 media proxy supports HTTP Range requests. The upload endpoint returns
the same API playback URL, so the host's Creator Hub and every visitor's public
Reels feed resolve the same stored R2 object.
