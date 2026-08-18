// This script dynamically generates all Android launcher icons and splash screen resources from public/icon.svg at build time.
// This ensures the Android app icon matches the web app icon exactly and fits fully inside device launchers.

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const RES_DIR = path.join(__dirname, 'android', 'app', 'src', 'main', 'res');
const WEB_ICON_PATH = path.join(__dirname, 'public', 'icon.svg');
const EXACT_PNG_PATH = path.join(__dirname, 'public', 'pardais-party-exact.png');

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

// Helper to generate a splash SVG with dark luxury background and centered logo
const getSplashSVG = (width, height, rawIconSvg) => {
  const iconSize = Math.min(width, height) * 0.45;
  const tx = (width - iconSize) / 2;
  const ty = (height - iconSize) / 2;

  let innerIconContent = rawIconSvg;
  const svgMatch = rawIconSvg.match(/<svg[^>]*>([\s\S]*)<\/svg>/i);
  if (svgMatch && svgMatch[1]) {
    innerIconContent = svgMatch[1];
  }

  return `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Deep Midnight Dark Gradient -->
    <linearGradient id="splash-bg-grad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#030008"/>
      <stop offset="50%" stop-color="#0d041e"/>
      <stop offset="100%" stop-color="#020005"/>
    </linearGradient>
    <filter id="splashGlow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="60" />
    </filter>
  </defs>

  <rect x="0" y="0" width="${width}" height="${height}" fill="url(#splash-bg-grad)"/>

  <circle cx="${width * 0.2}" cy="${height * 0.3}" r="160" fill="#ff007f" opacity="0.2" filter="url(#splashGlow)"/>
  <circle cx="${width * 0.8}" cy="${height * 0.7}" r="200" fill="#bf00ff" opacity="0.2" filter="url(#splashGlow)"/>
  <circle cx="${width * 0.5}" cy="${height * 0.5}" r="120" fill="#00f2fe" opacity="0.15" filter="url(#splashGlow)"/>

  <g transform="translate(${tx}, ${ty}) scale(${iconSize / 512})">
    ${innerIconContent}
  </g>
</svg>
`;
};

async function execute() {
  console.log('------------------------------------------------------------');
  console.log('🎨 Starting Android Resource Generation Process... 🎨');
  console.log('------------------------------------------------------------');

  if (!fs.existsSync(EXACT_PNG_PATH)) {
    throw new Error(`Exact Pardais Party logo missing at: ${EXACT_PNG_PATH}`);
  }

  const iconBuffer = fs.readFileSync(EXACT_PNG_PATH);
  const rawIconSvg = fs.existsSync(WEB_ICON_PATH) ? fs.readFileSync(WEB_ICON_PATH, 'utf8') : ''; 

  // 1. Generate Launcher Icons (mipmap)
  console.log('\nGenerating Android Launcher Icons (mipmap) from public/pardais-party-exact.png:');
  for (const config of ICON_CONFIGS) {
    const dirPath = path.join(RES_DIR, config.dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    // Standard Legacy Icon (Full 1:1)
    const launcherPath = path.join(dirPath, 'ic_launcher.png');
    await sharp(iconBuffer)
      .resize(config.iconSize, config.iconSize)
      .png({ palette: false, quality: 100 })
      .toFile(launcherPath);
    console.log(` ✅ Saved 32-bit: ${launcherPath} (${config.iconSize}x${config.iconSize})`);

    // Round Legacy Icon
    const roundPath = path.join(dirPath, 'ic_launcher_round.png');
    await sharp(iconBuffer)
      .resize(config.iconSize, config.iconSize)
      .png({ palette: false, quality: 100 })
      .toFile(roundPath);
    console.log(` ✅ Saved 32-bit: ${roundPath} (${config.iconSize}x${config.iconSize})`);

    // Foreground Adaptive Icon (Scaled to 70% safe inner area so full logo and text fit cleanly on device screen)
    const fgInnerSize = Math.round(config.foregroundSize * 0.72);
    const fgPadding = Math.round((config.foregroundSize - fgInnerSize) / 2);
    const foregroundPath = path.join(dirPath, 'ic_launcher_foreground.png');

    const resizedInner = await sharp(iconBuffer)
      .resize(fgInnerSize, fgInnerSize)
      .toBuffer();

    await sharp({
      create: {
        width: config.foregroundSize,
        height: config.foregroundSize,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    })
    .composite([{ input: resizedInner, top: fgPadding, left: fgPadding }])
    .png({ palette: false, quality: 100 })
    .toFile(foregroundPath);

    console.log(` ✅ Saved Adaptive Foreground: ${foregroundPath} (${config.foregroundSize}x${config.foregroundSize}, inner ${fgInnerSize}px)`);
  }

  // 2. Generate Splash Screens (drawable)
  console.log('\nGenerating Android Splash Screens (drawable):');
  for (const config of SPLASH_CONFIGS) {
    const dirPath = path.join(RES_DIR, config.dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    const splashPath = path.join(dirPath, 'splash.png');
    const logo = await sharp(iconBuffer).resize({ width: Math.round(config.width * 0.82), height: Math.round(config.height * 0.82), fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
    await sharp({ create: { width: config.width, height: config.height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 } } })
      .composite([{ input: logo, gravity: 'center' }])
      .png({ palette: false, quality: 100 })
      .toFile(splashPath);
    console.log(` ✅ Saved 32-bit: ${splashPath} (${config.width}x${config.height})`);
  }

  console.log('\n------------------------------------------------------------');
  console.log('🎉 All Android Resources Generated Successfully from the exact Pardais Party PNG! 🎉');
  console.log('------------------------------------------------------------');
}

execute().catch(err => {
  console.error('❌ Error during resource generation:', err);
  process.exit(1);
});
