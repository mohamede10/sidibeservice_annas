/**
 * Script de génération des icônes PWA pour Sidibe Services
 * Génère toutes les tailles requises à partir de l'icône source
 * Usage: node scripts/generate-icons.js
 */

const fs = require('fs');
const path = require('path');

// Tailles requises pour PWA Android + iOS
const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const ICONS_DIR = path.join(__dirname, '..', 'public', 'icons');

// S'assurer que le dossier existe
if (!fs.existsSync(ICONS_DIR)) {
  fs.mkdirSync(ICONS_DIR, { recursive: true });
}

// Vérifier si sharp est disponible
let sharp;
try {
  sharp = require('sharp');
} catch {
  console.log('⚠️  sharp non installé. Essai avec jimp...');
}

let Jimp;
try {
  Jimp = require('jimp');
} catch {
  // pas de jimp non plus
}

const sourceIcon = path.join(__dirname, '..', 'public', 'icon-512x512.jpg');

async function generateIcons() {
  if (!fs.existsSync(sourceIcon)) {
    console.error('❌ Icône source introuvable:', sourceIcon);
    console.log('   Placez votre icône 512x512 dans public/icon-512x512.jpg');
    process.exit(1);
  }

  console.log('🎨 Génération des icônes PWA Sidibe Services...\n');

  if (sharp) {
    // Utiliser sharp (meilleure qualité)
    for (const size of SIZES) {
      const outPath = path.join(ICONS_DIR, `icon-${size}x${size}.png`);
      await sharp(sourceIcon)
        .resize(size, size, { fit: 'cover', position: 'center' })
        .png({ quality: 95 })
        .toFile(outPath);
      console.log(`  ✅ icon-${size}x${size}.png`);
    }
    
    // Apple Touch Icon (180x180)
    await sharp(sourceIcon)
      .resize(180, 180, { fit: 'cover', position: 'center' })
      .png({ quality: 95 })
      .toFile(path.join(__dirname, '..', 'public', 'apple-touch-icon.png'));
    console.log('  ✅ apple-touch-icon.png (180x180 — iOS)');

    // favicon.ico equivalent (32x32)
    await sharp(sourceIcon)
      .resize(32, 32, { fit: 'cover', position: 'center' })
      .png({ quality: 95 })
      .toFile(path.join(__dirname, '..', 'public', 'favicon-32x32.png'));
    console.log('  ✅ favicon-32x32.png');

  } else if (Jimp) {
    // Fallback avec jimp
    const image = await Jimp.read(sourceIcon);
    for (const size of SIZES) {
      const outPath = path.join(ICONS_DIR, `icon-${size}x${size}.png`);
      await image.clone().resize(size, size).writeAsync(outPath);
      console.log(`  ✅ icon-${size}x${size}.png`);
    }
  } else {
    console.log('⚠️  Aucune lib image disponible.');
    console.log('   Installez sharp: npm install sharp --save-dev');
    console.log('   Puis relancez: node scripts/generate-icons.js');
    
    // Créer des icônes SVG de fallback
    generateSvgFallbacks();
    return;
  }

  console.log('\n✨ Toutes les icônes PWA ont été générées avec succès !');
  console.log(`   Dossier: ${ICONS_DIR}`);
}

function generateSvgFallbacks() {
  console.log('\n📐 Génération des icônes SVG de fallback...');
  
  const svgTemplate = (size) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0f172a"/>
      <stop offset="100%" style="stop-color:#090d16"/>
    </linearGradient>
    <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#fcd34d"/>
      <stop offset="50%" style="stop-color:#f59e0b"/>
      <stop offset="100%" style="stop-color:#d97706"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${size * 0.18}" fill="url(#bg)"/>
  <rect x="${size*0.04}" y="${size*0.04}" width="${size*0.92}" height="${size*0.92}" rx="${size*0.15}" fill="none" stroke="url(#gold)" stroke-width="${size*0.02}" opacity="0.6"/>
  <text x="50%" y="58%" font-family="Georgia, serif" font-size="${size * 0.55}" font-weight="bold" fill="url(#gold)" text-anchor="middle" dominant-baseline="middle">S</text>
</svg>`;

  for (const size of SIZES) {
    const outPath = path.join(ICONS_DIR, `icon-${size}x${size}.svg`);
    fs.writeFileSync(outPath, svgTemplate(size));
    console.log(`  ✅ icon-${size}x${size}.svg`);
  }
  
  // Apple touch icon SVG
  const applePath = path.join(path.dirname(ICONS_DIR), 'apple-touch-icon.svg');
  fs.writeFileSync(applePath, svgTemplate(180));
  console.log('  ✅ apple-touch-icon.svg');
  
  console.log('\n⚠️  SVG générés. Pour des PNG, installez sharp et relancez.');
}

generateIcons().catch(console.error);
