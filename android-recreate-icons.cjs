// This script dynamically generates all Android launcher icons and splash screen resources from SVG definitions at build time.
// This prevents Git binary/text transfer corruption and ensures valid 32-bit RGBA PNG files.

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const RES_DIR = path.join(__dirname, 'android', 'app', 'src', 'main', 'res');

// Configurations for Launcher Icons
const ICON_CONFIGS = [
  { dir: 'mipmap-mdpi', iconSize: 48, foregroundSize: 108 },
  { dir: 'mipmap-hdpi', iconSize: 72, foregroundSize: 162 },
  { dir: 'mipmap-xhdpi', iconSize: 96, foregroundSize: 216 },
  { dir: 'mipmap-xxhdpi', iconSize: 144, foregroundSize: 324 },
  { dir: 'mipmap-xxxhdpi', iconSize: 192, foregroundSize: 432 }
];

// Configurations for Splash Screens
const SPLASH_CONFIGS = [
  { dir: 'drawable', width: 480, height: 800 },
  { dir: 'drawable-land-mdpi', width: 480, height: 320 },
  { dir: 'drawable-land-hdpi', width: 800, height: 480 },
  { dir: 'drawable-land-xhdpi', width: 1280, height: 720 },
  { dir: 'drawable-land-xxhdpi', width: 1920, height: 1080 },
  { dir: 'drawable-land-xxxhdpi', width: 2560, height: 1440 },
  { dir: 'drawable-port-mdpi', width: 320, height: 480 },
  { dir: 'drawable-port-hdpi', width: 480, height: 800 },
  { dir: 'drawable-port-xhdpi', width: 720, height: 1280 },
  { dir: 'drawable-port-xxhdpi', width: 1080, height: 1920 },
  { dir: 'drawable-port-xxxhdpi', width: 1440, height: 2560 }
];

// SVG Definitions
const getLegacyIconSVG = () => `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="sehrGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ff007f" />
      <stop offset="60%" stop-color="#7b2cbf" />
      <stop offset="100%" stop-color="#00f5ff" />
    </linearGradient>
    <linearGradient id="sehrBorderGrad" x1="100%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#00f5ff" />
      <stop offset="50%" stop-color="#7b2cbf" />
      <stop offset="100%" stop-color="#ff007f" />
    </linearGradient>
    <filter id="logoGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="3" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>
  {/* Outer rounded-squircle backplate */}
  <rect x="16" y="16" width="480" height="480" rx="140" fill="#09090e" stroke="url(#sehrBorderGrad)" stroke-width="12"/>
  
  {/* Nested brand symbol with exact centering and premium scaling */}
  <g transform="translate(112, 112) scale(2.88)">
    <circle
      cx="50"
      cy="50"
      r="41"
      stroke="url(#sehrGrad)"
      stroke-width="1.2"
      stroke-dasharray="6, 12"
      opacity="0.5"
    />
    <path
      d="M 68 28 C 68 22, 32 20, 28 32 C 24 44, 48 46, 48 52 C 48 58, 32 60, 32 54"
      stroke="url(#sehrGrad)"
      stroke-width="7"
      stroke-linecap="round"
      fill="none"
      opacity="0.15"
    />
    <path
      d="M 70 30 C 70 20, 30 20, 30 32 C 30 42, 50 42, 50 48 C 50 54, 40 56, 32 54"
      stroke="url(#sehrGrad)"
      stroke-width="8.5"
      stroke-linecap="round"
      fill="none"
    />
    <path
      d="M 30 70 C 30 80, 70 80, 70 68 C 70 58, 50 58, 50 52 C 50 46, 60 44, 68 46"
      stroke="url(#sehrGrad)"
      stroke-width="8.5"
      stroke-linecap="round"
      fill="none"
    />
    <g filter="url(#logoGlow)">
      <polygon points="44,38 64,50 44,62" fill="#09090e" />
      <polygon points="45,40 61,50 45,60" fill="url(#sehrGrad)" />
    </g>
    <path
      d="M 68,43 C 71,46 71,54 68,57"
      stroke="#00f5ff"
      stroke-width="2.5"
      stroke-linecap="round"
      fill="none"
    />
  </g>
</svg>
`;

const getLegacyRoundIconSVG = () => `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="sehrGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ff007f" />
      <stop offset="60%" stop-color="#7b2cbf" />
      <stop offset="100%" stop-color="#00f5ff" />
    </linearGradient>
    <linearGradient id="sehrBorderGrad" x1="100%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#00f5ff" />
      <stop offset="50%" stop-color="#7b2cbf" />
      <stop offset="100%" stop-color="#ff007f" />
    </linearGradient>
    <filter id="logoGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="3" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>
  {/* Circle backplate for round icons */}
  <circle cx="256" cy="256" r="240" fill="#09090e" stroke="url(#sehrBorderGrad)" stroke-width="12"/>
  
  <g transform="translate(112, 112) scale(2.88)">
    <circle
      cx="50"
      cy="50"
      r="41"
      stroke="url(#sehrGrad)"
      stroke-width="1.2"
      stroke-dasharray="6, 12"
      opacity="0.5"
    />
    <path
      d="M 68 28 C 68 22, 32 20, 28 32 C 24 44, 48 46, 48 52 C 48 58, 32 60, 32 54"
      stroke="url(#sehrGrad)"
      stroke-width="7"
      stroke-linecap="round"
      fill="none"
      opacity="0.15"
    />
    <path
      d="M 70 30 C 70 20, 30 20, 30 32 C 30 42, 50 42, 50 48 C 50 54, 40 56, 32 54"
      stroke="url(#sehrGrad)"
      stroke-width="8.5"
      stroke-linecap="round"
      fill="none"
    />
    <path
      d="M 30 70 C 30 80, 70 80, 70 68 C 70 58, 50 58, 50 52 C 50 46, 60 44, 68 46"
      stroke="url(#sehrGrad)"
      stroke-width="8.5"
      stroke-linecap="round"
      fill="none"
    />
    <g filter="url(#logoGlow)">
      <polygon points="44,38 64,50 44,62" fill="#09090e" />
      <polygon points="45,40 61,50 45,60" fill="url(#sehrGrad)" />
    </g>
    <path
      d="M 68,43 C 71,46 71,54 68,57"
      stroke="#00f5ff"
      stroke-width="2.5"
      stroke-linecap="round"
      fill="none"
    />
  </g>
</svg>
`;

const getAdaptiveForegroundSVG = () => `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="sehrGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ff007f" />
      <stop offset="60%" stop-color="#7b2cbf" />
      <stop offset="100%" stop-color="#00f5ff" />
    </linearGradient>
    <filter id="logoGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="3" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>
  {/* Foreground element without hard backplate for adaptive styling */}
  <g transform="translate(112, 112) scale(2.88)">
    <circle
      cx="50"
      cy="50"
      r="41"
      stroke="url(#sehrGrad)"
      stroke-width="1.2"
      stroke-dasharray="6, 12"
      opacity="0.5"
    />
    <path
      d="M 68 28 C 68 22, 32 20, 28 32 C 24 44, 48 46, 48 52 C 48 58, 32 60, 32 54"
      stroke="url(#sehrGrad)"
      stroke-width="7"
      stroke-linecap="round"
      fill="none"
      opacity="0.15"
    />
    <path
      d="M 70 30 C 70 20, 30 20, 30 32 C 30 42, 50 42, 50 48 C 50 54, 40 56, 32 54"
      stroke="url(#sehrGrad)"
      stroke-width="8.5"
      stroke-linecap="round"
      fill="none"
    />
    <path
      d="M 30 70 C 30 80, 70 80, 70 68 C 70 58, 50 58, 50 52 C 50 46, 60 44, 68 46"
      stroke="url(#sehrGrad)"
      stroke-width="8.5"
      stroke-linecap="round"
      fill="none"
    />
    <g filter="url(#logoGlow)">
      <polygon points="44,38 64,50 44,62" fill="#09090e" />
      <polygon points="45,40 61,50 45,60" fill="url(#sehrGrad)" />
    </g>
    <path
      d="M 68,43 C 71,46 71,54 68,57"
      stroke="#00f5ff"
      stroke-width="2.5"
      stroke-linecap="round"
      fill="none"
    />
  </g>
</svg>
`;

const getSplashSVG = (width, height) => {
  const scale = 0.55;
  const tx = width / 2 - 256 * scale;
  const ty = height / 2 - 256 * scale;

  return `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    {/* Premium deep dark gradient */}
    <linearGradient id="bg-grad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#050508"/>
      <stop offset="50%" stop-color="#110724"/>
      <stop offset="100%" stop-color="#09090e"/>
    </linearGradient>
    <linearGradient id="sehrGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ff007f" />
      <stop offset="60%" stop-color="#7b2cbf" />
      <stop offset="100%" stop-color="#00f5ff" />
    </linearGradient>
    <linearGradient id="sehrBorderGrad" x1="100%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#00f5ff" />
      <stop offset="50%" stop-color="#7b2cbf" />
      <stop offset="100%" stop-color="#ff007f" />
    </linearGradient>
    <filter id="logoGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="3" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
    {/* Glow Filter for lights background */}
    <filter id="neonBlur" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="50" />
    </filter>
  </defs>
  
  {/* Dark gradient background */}
  <rect x="0" y="0" width="${width}" height="${height}" fill="url(#bg-grad)"/>

  {/* Ambient glowing circles (subtle neon light-wave effect) */}
  <circle cx="${width * 0.2}" cy="${height * 0.3}" r="150" fill="#ff007f" opacity="0.08" filter="url(#neonBlur)"/>
  <circle cx="${width * 0.8}" cy="${height * 0.7}" r="180" fill="#7b2cbf" opacity="0.10" filter="url(#neonBlur)"/>
  <circle cx="${width * 0.5}" cy="${height * 0.5}" r="100" fill="#00f5ff" opacity="0.05" filter="url(#neonBlur)"/>

  {/* Center brand logo box */}
  <g transform="translate(${tx}, ${ty}) scale(${scale})">
    {/* Premium rounded-squircle plate inside splash */}
    <rect x="16" y="16" width="480" height="480" rx="140" fill="#09090e" stroke="url(#sehrBorderGrad)" stroke-width="10"/>

    <g transform="translate(112, 112) scale(2.88)">
      <circle
        cx="50"
        cy="50"
        r="41"
        stroke="url(#sehrGrad)"
        stroke-width="1.2"
        stroke-dasharray="6, 12"
        opacity="0.5"
      />
      <path
        d="M 68 28 C 68 22, 32 20, 28 32 C 24 44, 48 46, 48 52 C 48 58, 32 60, 32 54"
        stroke="url(#sehrGrad)"
        stroke-width="7"
        stroke-linecap="round"
        fill="none"
        opacity="0.15"
      />
      <path
        d="M 70 30 C 70 20, 30 20, 30 32 C 30 42, 50 42, 50 48 C 50 54, 40 56, 32 54"
        stroke="url(#sehrGrad)"
        stroke-width="8.5"
        stroke-linecap="round"
        fill="none"
      />
      <path
        d="M 30 70 C 30 80, 70 80, 70 68 C 70 58, 50 58, 50 52 C 50 46, 60 44, 68 46"
        stroke="url(#sehrGrad)"
        stroke-width="8.5"
        stroke-linecap="round"
        fill="none"
      />
      <g filter="url(#logoGlow)">
        <polygon points="44,38 64,50 44,62" fill="#09090e" />
        <polygon points="45,40 61,50 45,60" fill="url(#sehrGrad)" />
      </g>
      <path
        d="M 68,43 C 71,46 71,54 68,57"
        stroke="#00f5ff"
        stroke-width="2.5"
        stroke-linecap="round"
        fill="none"
      />
    </g>
  </g>
</svg>
`;
};

async function execute() {
  console.log('------------------------------------------------------------');
  console.log('🎨 Starting Android Resource Generation Process... 🎨');
  console.log('------------------------------------------------------------');

  const legacySVG = Buffer.from(getLegacyIconSVG());
  const roundSVG = Buffer.from(getLegacyRoundIconSVG());
  const foregroundSVG = Buffer.from(getAdaptiveForegroundSVG());

  // 1. Generate Launcher Icons
  console.log('\nGenerating Android Launcher Icons (mipmap):');
  for (const config of ICON_CONFIGS) {
    const dirPath = path.join(RES_DIR, config.dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    const launcherPath = path.join(dirPath, 'ic_launcher.png');
    await sharp(legacySVG)
      .resize(config.iconSize, config.iconSize)
      .png({ palette: false, quality: 100 })
      .toFile(launcherPath);
    console.log(` ✅ Saved 32-bit: ${launcherPath} (${config.iconSize}x${config.iconSize})`);

    const roundPath = path.join(dirPath, 'ic_launcher_round.png');
    await sharp(roundSVG)
      .resize(config.iconSize, config.iconSize)
      .png({ palette: false, quality: 100 })
      .toFile(roundPath);
    console.log(` ✅ Saved 32-bit: ${roundPath} (${config.iconSize}x${config.iconSize})`);

    const foregroundPath = path.join(dirPath, 'ic_launcher_foreground.png');
    await sharp(foregroundSVG)
      .resize(config.foregroundSize, config.foregroundSize)
      .png({ palette: false, quality: 100 })
      .toFile(foregroundPath);
    console.log(` ✅ Saved 32-bit: ${foregroundPath} (${config.foregroundSize}x${config.foregroundSize})`);
  }

  // 2. Generate Splash Screens
  console.log('\nGenerating Android Splash Screens (drawable):');
  for (const config of SPLASH_CONFIGS) {
    const dirPath = path.join(RES_DIR, config.dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    const svgString = getSplashSVG(config.width, config.height);
    const svgBuffer = Buffer.from(svgString);

    const splashPath = path.join(dirPath, 'splash.png');
    await sharp(svgBuffer)
      .resize(config.width, config.height)
      .png({ palette: false, quality: 100 })
      .toFile(splashPath);
    console.log(` ✅ Saved 32-bit: ${splashPath} (${config.width}x${config.height})`);
  }

  console.log('\n------------------------------------------------------------');
  console.log('🎉 All Android Resources Generated Successfully! 🎉');
  console.log('------------------------------------------------------------');
}

execute().catch(err => {
  console.error('❌ Error during generation:', err);
  process.exit(1);
});
