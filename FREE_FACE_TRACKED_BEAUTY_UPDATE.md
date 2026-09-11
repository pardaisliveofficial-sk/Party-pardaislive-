# Free Face-Tracked Beauty & AR Update

- Replaced the previous fixed-position emoji/gradient filter overlay with MediaPipe Face Landmarker tracking.
- Face landmarks are loaded client-side from the MediaPipe CDN and the official face-landmarker model.
- Beauty effects use a face-positioned backdrop blur/saturation/brightness layer so the visible skin area is actually softened instead of adding a screen-wide white glow.
- Beauty intensity is connected to the existing Smooth / Brightness / Whitening controls.
- Cat, Bunny, Dog, Devil Horns, Crown, Glasses, Hearts, Flower Crown, Sparkle and Alien effects now follow the detected face position/rotation.
- Agora camera capture/publish code is not replaced or transformed. The AR/beauty layer is render-only and fails closed if MediaPipe cannot load.
- Added a direct Beauty button to the active Solo/Guest/PK bottom control rail; it is no longer buried inside More.
