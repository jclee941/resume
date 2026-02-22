#!/usr/bin/env node
/**
 * Optimize images for typescript/portfolio-worker deployment
 * Reduces file sizes while maintaining quality
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const WEB_DIR = path.join(__dirname, '../../../typescript/portfolio-worker');

async function optimizeImage(inputPath, outputPath, options = {}) {
  const {width = null, height = null, quality = 80, effort = 6} = options;

  console.log(`Optimizing ${path.basename(inputPath)}...`);

  const beforeSize = fs.statSync(inputPath).size;

  let pipeline = sharp(inputPath);

  if (width || height) {
    pipeline = pipeline.resize(width, height, {fit: 'cover'});
  }

  // Determine format from extension
  const ext = path.extname(inputPath).toLowerCase();
  if (ext === '.webp') {
    pipeline = pipeline.webp({quality, effort});
  } else if (ext === '.png') {
    pipeline = pipeline.png({quality, compressionLevel: 9});
  } else if (ext === '.jpg' || ext === '.jpeg') {
    pipeline = pipeline.jpeg({quality, mozjpeg: true});
  }

  await pipeline.toFile(outputPath);

  const afterSize = fs.statSync(outputPath).size;
  const reduction = ((1 - afterSize / beforeSize) * 100).toFixed(1);

  console.log(`  Before: ${(beforeSize / 1024).toFixed(1)}KB`);
  console.log(`  After:  ${(afterSize / 1024).toFixed(1)}KB`);
  console.log(`  Saved:  ${reduction}%\n`);
}

async function main() {
  console.log('🖼️  Image Optimization\n');

  // Optimize OG image
  const ogImagePath = path.join(WEB_DIR, 'og-image.webp');
  if (fs.existsSync(ogImagePath)) {
    await optimizeImage(
      ogImagePath,
      path.join(WEB_DIR, 'og-image-optimized.webp'),
      {width: 1200, height: 630, quality: 80, effort: 6}
    );
  }

  // Optimize icons
  const icons = ['icon-192.png', 'icon-512.png'];
  for (const icon of icons) {
    const iconPath = path.join(WEB_DIR, icon);
    if (fs.existsSync(iconPath)) {
      await optimizeImage(
        iconPath,
        path.join(
          WEB_DIR,
          `${path.basename(icon, path.extname(icon))}-optimized${path.extname(icon)}`
        ),
        {quality: 85}
      );
    }
  }

  console.log('✅ Image optimization complete!');
}

main().catch(err => {
  console.error('❌ Optimization failed:', err.message);
  process.exit(1);
});
