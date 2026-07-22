#!/usr/bin/env node

/**
 * Convert SVG icons to PNG using sharp
 */

const sharp = require('sharp');

/**
 * @param {string} svgPath
 * @param {string} pngPath
 * @param {number} size
 */
async function convertIcon(svgPath, pngPath, size) {
  try {
    await sharp(svgPath)
      .resize(size, size)
      .png()
      .toFile(pngPath);
    console.log(`✅ Created ${pngPath}`);
  } catch (error) {
    console.error(`❌ Error creating ${pngPath}:`, error instanceof Error ? error.message : String(error));
    throw error;
  }
}

async function main() {
  console.log('Converting SVG icons to PNG...');

  await convertIcon('icon-192.svg', 'icon-192.png', 192);
  await convertIcon('icon-512.svg', 'icon-512.png', 512);

  console.log('✅ All icons converted successfully');
}

main().catch(error => {
  console.error('Failed to convert icons:', error);
  process.exit(1);
});
