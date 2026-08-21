import fs from 'fs';
import path from 'path';

async function generatePngIcons() {
  const exactPngPath = path.resolve('public/pardais-party-exact.png');
  const svgPath = path.resolve('public/icon.svg');
  let sharpModule = null;
  try {
    const imported = await import('sharp');
    sharpModule = imported.default || imported;
  } catch (e) {
    console.log("Sharp module not available, using existing generated PNG icons in public/.");
  }

  if (sharpModule) {
    try {
      const sourceBuffer = fs.existsSync(exactPngPath) ? fs.readFileSync(exactPngPath) : fs.readFileSync(svgPath);

      // Generate 192x192 PNG
      const png192 = await sharpModule(sourceBuffer)
        .resize(192, 192)
        .png({ compressionLevel: 9, quality: 100 })
        .toBuffer();
      fs.writeFileSync(path.resolve('public/icon-192.png'), png192);

      // Generate 512x512 PNG
      const png512 = await sharpModule(sourceBuffer)
        .resize(512, 512)
        .png({ compressionLevel: 9, quality: 100 })
        .toBuffer();
      fs.writeFileSync(path.resolve('public/icon-512.png'), png512);

      // Generate 180x180 Apple Touch Icon
      const pngApple = await sharpModule(sourceBuffer)
        .resize(180, 180)
        .png({ compressionLevel: 9, quality: 100 })
        .toBuffer();
      fs.writeFileSync(path.resolve('public/apple-touch-icon.png'), pngApple);

      // Screenshots
      const screenshot1Svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 540 960" width="540" height="960">
        <rect width="540" height="960" fill="#09090e"/>
        <circle cx="270" cy="300" r="140" fill="#1e1b4b" opacity="0.6"/>
        <text x="270" y="440" font-family="sans-serif" font-weight="900" font-size="36" fill="#00e676" text-anchor="middle">PARDAIS PARTY</text>
        <text x="270" y="480" font-family="sans-serif" font-weight="600" font-size="20" fill="#a7f3d0" text-anchor="middle">Live Audio Rooms &amp; PK Battles</text>
      </svg>`;
      const pngScreenshot1 = await sharpModule(Buffer.from(screenshot1Svg))
        .resize(540, 960)
        .png()
        .toBuffer();
      fs.writeFileSync(path.resolve('public/screenshot-1.png'), pngScreenshot1);

      const screenshot2Svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720" width="1280" height="720">
        <rect width="1280" height="720" fill="#09090e"/>
        <circle cx="640" cy="360" r="220" fill="#1e1b4b" opacity="0.6"/>
        <text x="640" y="360" font-family="sans-serif" font-weight="900" font-size="48" fill="#ffb300" text-anchor="middle">PARDAIS PARTY LIVE</text>
        <text x="640" y="420" font-family="sans-serif" font-weight="600" font-size="24" fill="#00f2fe" text-anchor="middle">Join Millions of Streamers &amp; Voice Rooms</text>
      </svg>`;
      const pngScreenshot2 = await sharpModule(Buffer.from(screenshot2Svg))
        .resize(1280, 720)
        .png()
        .toBuffer();
      fs.writeFileSync(path.resolve('public/screenshot-2.png'), pngScreenshot2);
    } catch (err) {
      console.warn("Notice during sharp icon rendering, continuing:", err);
    }
  }

  // Also write to dist/ if dist directory exists
  const distDir = path.resolve('dist');
  if (fs.existsSync(distDir)) {
    const filesToCopy = [
      'icon-192.png',
      'icon-512.png',
      'apple-touch-icon.png',
      'screenshot-1.png',
      'screenshot-2.png',
      'icon.svg',
      'manifest.json',
      'sw.js'
    ];
    for (const f of filesToCopy) {
      const src = path.resolve('public', f);
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, path.join(distDir, f));
      }
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
