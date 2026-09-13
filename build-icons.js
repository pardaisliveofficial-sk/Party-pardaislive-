import fs from 'fs';
import path from 'path';

async function generatePngIcons() {
  // The app UI uses the full transparent Pardais Party logo. Launcher/PWA
  // icons use the extracted P mark so the logo stays crisp inside a square.
  const exactPngPath = path.resolve('public/pardais-party-exact.png');
  const markPngPath = path.resolve('public/pardais-p-mark.png');
  const svgPath = path.resolve('public/icon.svg');
  let sharpModule = null;
  try {
    const imported = await import('sharp');
    sharpModule = imported.default || imported;
  } catch (e) {
    console.log('Sharp module not available, using existing generated PNG icons in public/.');
  }

  if (sharpModule) {
    try {
      const iconSource = fs.existsSync(markPngPath) ? fs.readFileSync(markPngPath) : fs.readFileSync(svgPath);
      const logoSource = fs.existsSync(exactPngPath) ? fs.readFileSync(exactPngPath) : iconSource;

      // Generate square PWA/launcher icons from the extracted P mark.
      for (const [size, name] of [[192, 'icon-192.png'], [512, 'icon-512.png'], [180, 'apple-touch-icon.png']]) {
        const png = await sharpModule(iconSource)
          .resize(size, size, { fit: 'contain', background: { r: 9, g: 9, b: 14, alpha: 1 } })
          .png({ compressionLevel: 9 })
          .toBuffer();
        fs.writeFileSync(path.resolve('public', name), png);
      }

      // Keep the exact full logo available as a normal web asset; don't stretch it into an icon.
      if (fs.existsSync(exactPngPath)) {
        const normalized = await sharpModule(logoSource).png({ compressionLevel: 9 }).toBuffer();
        fs.writeFileSync(exactPngPath, normalized);
      }

      // Valid Play Store/PWA screenshots generated from SVG.
      const screenshot1Svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 540 960"><rect width="540" height="960" fill="#09090e"/><circle cx="270" cy="280" r="150" fill="#1e1b4b" opacity=".7"/><text x="270" y="470" font-family="sans-serif" font-weight="900" font-size="34" fill="#fff" text-anchor="middle">PARDAIS PARTY</text><text x="270" y="510" font-family="sans-serif" font-weight="600" font-size="18" fill="#ff55c8" text-anchor="middle">Where Every Party Comes Alive ✨</text></svg>`;
      const screenshot2Svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720"><rect width="1280" height="720" fill="#09090e"/><circle cx="640" cy="300" r="230" fill="#1e1b4b" opacity=".7"/><text x="640" y="430" font-family="sans-serif" font-weight="900" font-size="52" fill="#fff" text-anchor="middle">PARDAIS PARTY LIVE</text><text x="640" y="475" font-family="sans-serif" font-weight="600" font-size="24" fill="#2a7bff" text-anchor="middle">Live Audio • Video • PK Battles</text></svg>`;
      fs.writeFileSync(path.resolve('public/screenshot-1.png'), await sharpModule(Buffer.from(screenshot1Svg)).png().toBuffer());
      fs.writeFileSync(path.resolve('public/screenshot-2.png'), await sharpModule(Buffer.from(screenshot2Svg)).png().toBuffer());
    } catch (err) {
      console.warn('Notice during sharp icon rendering, continuing:', err);
    }
  }

  const distDir = path.resolve('dist');
  if (fs.existsSync(distDir)) {
    for (const f of ['icon-192.png','icon-512.png','apple-touch-icon.png','screenshot-1.png','screenshot-2.png','icon.svg','manifest.json','sw.js','pardais-party-exact.png','pardais-p-mark.png']) {
      const src = path.resolve('public', f);
      if (fs.existsSync(src)) fs.copyFileSync(src, path.join(distDir, f));
    }
  }

  validatePwaCriteria();
}

function validatePwaCriteria() {
  console.log('\n--- Automated PWA Installability Validation ---');
  const manifestPath = path.resolve('public/manifest.json');
  if (!fs.existsSync(manifestPath)) throw new Error('PWA Validation Error: public/manifest.json missing!');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  if (!manifest.name || !manifest.short_name) throw new Error('PWA Validation Error: manifest name or short_name missing!');
  if (!manifest.start_url || !manifest.scope) throw new Error('PWA Validation Error: start_url or scope missing!');
  if (!['standalone','fullscreen','minimal-ui'].includes(manifest.display)) throw new Error('PWA Validation Error: invalid manifest display!');
  if (!manifest.icons || manifest.icons.length < 2) throw new Error('PWA Validation Error: manifest must declare icons!');
  if (!fs.existsSync(path.resolve('public/sw.js'))) throw new Error('PWA Validation Error: public/sw.js missing!');
  for (const f of ['icon-192.png','icon-512.png','screenshot-1.png','screenshot-2.png']) {
    const p = path.resolve('public', f);
    if (!fs.existsSync(p) || fs.statSync(p).size === 0) throw new Error(`PWA Validation Error: ${f} missing or empty!`);
  }
  console.log('✅ All PWA installability requirements validated successfully!');
}

generatePngIcons().catch((err) => { console.error(err); process.exitCode = 1; });
