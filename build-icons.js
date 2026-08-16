import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

async function generatePngIcons() {
  const svgPath = path.resolve('public/icon.svg');
  const exactPngPath = path.resolve('public/pardais-party-exact.png');
  if (!fs.existsSync(svgPath)) {
    console.error("public/icon.svg not found!");
    return;
  }

  const svgBuffer = fs.readFileSync(svgPath);
  const exactPng = fs.readFileSync(exactPngPath);

  // Generate 192x192 PNG
  const png192 = await sharp(exactPng)
    .resize(192, 192)
    .png({ compressionLevel: 9, quality: 100 })
    .toBuffer();

  fs.writeFileSync(path.resolve('public/icon-192.png'), png192);
  console.log("Created public/icon-192.png (" + png192.length + " bytes)");

  // Generate 512x512 PNG
  const png512 = await sharp(exactPng)
    .resize(512, 512)
    .png({ compressionLevel: 9, quality: 100 })
    .toBuffer();

  fs.writeFileSync(path.resolve('public/icon-512.png'), png512);
  console.log("Created public/icon-512.png (" + png512.length + " bytes)");

  // Generate 180x180 Apple Touch Icon
  const pngApple = await sharp(exactPng)
    .resize(180, 180)
    .png({ compressionLevel: 9, quality: 100 })
    .toBuffer();

  fs.writeFileSync(path.resolve('public/apple-touch-icon.png'), pngApple);
  console.log("Created public/apple-touch-icon.png (" + pngApple.length + " bytes)");

  // Generate 540x960 Screenshot 1
  const screenshot1Svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 540 960" width="540" height="960">
    <rect width="540" height="960" fill="#09090e"/>
    <circle cx="270" cy="300" r="140" fill="#1e1b4b" opacity="0.6"/>
    <text x="270" y="440" font-family="sans-serif" font-weight="900" font-size="36" fill="#00e676" text-anchor="middle">PARDAIS PARTY</text>
    <text x="270" y="480" font-family="sans-serif" font-weight="600" font-size="20" fill="#a7f3d0" text-anchor="middle">Live Audio Rooms &amp; PK Battles</text>
  </svg>`;
  const pngScreenshot1 = await sharp(Buffer.from(screenshot1Svg))
    .resize(540, 960)
    .png()
    .toBuffer();
  fs.writeFileSync(path.resolve('public/screenshot-1.png'), pngScreenshot1);

  // Generate 1280x720 Screenshot 2
  const screenshot2Svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720" width="1280" height="720">
    <rect width="1280" height="720" fill="#09090e"/>
    <circle cx="640" cy="360" r="220" fill="#1e1b4b" opacity="0.6"/>
    <text x="640" y="360" font-family="sans-serif" font-weight="900" font-size="48" fill="#ffb300" text-anchor="middle">PARDAIS PARTY LIVE</text>
    <text x="640" y="420" font-family="sans-serif" font-weight="600" font-size="24" fill="#00f2fe" text-anchor="middle">Join Millions of Streamers &amp; Voice Rooms</text>
  </svg>`;
  const pngScreenshot2 = await sharp(Buffer.from(screenshot2Svg))
    .resize(1280, 720)
    .png()
    .toBuffer();
  fs.writeFileSync(path.resolve('public/screenshot-2.png'), pngScreenshot2);

  // Also write to dist/ if dist directory exists
  const distDir = path.resolve('dist');
  if (fs.existsSync(distDir)) {
    fs.writeFileSync(path.join(distDir, 'icon-192.png'), png192);
    fs.writeFileSync(path.join(distDir, 'icon-512.png'), png512);
    fs.writeFileSync(path.join(distDir, 'apple-touch-icon.png'), pngApple);
    fs.writeFileSync(path.join(distDir, 'screenshot-1.png'), pngScreenshot1);
    fs.writeFileSync(path.join(distDir, 'screenshot-2.png'), pngScreenshot2);
    if (fs.existsSync(svgPath)) {
      fs.copyFileSync(svgPath, path.join(distDir, 'icon.svg'));
    }
    const manifestPath = path.resolve('public/manifest.json');
    if (fs.existsSync(manifestPath)) {
      fs.copyFileSync(manifestPath, path.join(distDir, 'manifest.json'));
    }
    const swPath = path.resolve('public/sw.js');
    if (fs.existsSync(swPath)) {
      fs.copyFileSync(swPath, path.join(distDir, 'sw.js'));
    }
    console.log("Copied icons, manifest, and sw.js to dist/");
  }

  // Validate Chrome PWA Criteria
  validatePwaCriteria();
}

function validatePwaCriteria() {
  console.log("\n--- Automated PWA Installability Validation ---");
  const manifestPath = path.resolve('public/manifest.json');
  if (!fs.existsSync(manifestPath)) {
    throw new Error("PWA Validation Error: public/manifest.json missing!");
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  if (!manifest.name || !manifest.short_name) {
    throw new Error("PWA Validation Error: manifest name or short_name missing!");
  }
  if (!manifest.start_url || !manifest.scope) {
    throw new Error("PWA Validation Error: start_url or scope missing!");
  }
  if (!['standalone', 'fullscreen', 'minimal-ui'].includes(manifest.display)) {
    throw new Error("PWA Validation Error: manifest display must be standalone, fullscreen, or minimal-ui!");
  }
  if (!manifest.icons || manifest.icons.length < 2) {
    throw new Error("PWA Validation Error: manifest must declare at least 192x192 and 512x512 icons!");
  }

  const swPath = path.resolve('public/sw.js');
  if (!fs.existsSync(swPath)) {
    throw new Error("PWA Validation Error: public/sw.js missing!");
  }
  const swContent = fs.readFileSync(swPath, 'utf8');
  if (!swContent.includes('fetch')) {
    throw new Error("PWA Validation Error: sw.js must register a fetch handler for PWA installability!");
  }

  const icon192Path = path.resolve('public/icon-192.png');
  const icon512Path = path.resolve('public/icon-512.png');
  if (!fs.existsSync(icon192Path) || fs.statSync(icon192Path).size === 0) {
    throw new Error("PWA Validation Error: icon-192.png is missing or empty!");
  }
  if (!fs.existsSync(icon512Path) || fs.statSync(icon512Path).size === 0) {
    throw new Error("PWA Validation Error: icon-512.png is missing or empty!");
  }

  const htmlPath = path.resolve('index.html');
  if (fs.existsSync(htmlPath)) {
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');
    if (!htmlContent.includes('rel="manifest"')) {
      throw new Error("PWA Validation Error: index.html missing <link rel=\"manifest\">!");
    }
  }

  console.log("✅ All PWA installability requirements validated successfully!");
}

generatePngIcons().catch(console.error);

