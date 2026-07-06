const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const logger = require('./logger');

/**
 * Generate Open Graph images for resume site
 * Supports Korean and English variants
 * Size: 1200x630px (recommended for og:image)
 * Design: Minimal with brand colors and language-specific text
 */
async function generateOGImage(language = 'ko') {
  const width = 1200;
  const height = 630;
  const centerX = width / 2;
  const centerY = height / 2;

  // Language-specific content
  const content = {
    ko: {
      name: '이재철',
      subtitleLines: ['Security Automation', 'Infrastructure Engineer'],
      stats: '8년차 | 금융 보안 인프라 · SIEM · IaC',
      url: 'resume.jclee.me',
      label: '한국어',
    },
    en: {
      name: 'Jaecheol Lee',
      subtitleLines: ['Security Automation', 'Infrastructure Engineer'],
      stats: '8 years | Financial Security Infrastructure · SIEM · IaC',
      url: 'resume.jclee.me',
      label: 'English',
    },
    ja: {
      name: 'イ・ジェチョル',
      subtitleLines: ['Security Automation', 'Infrastructure Engineer'],
      stats: '8年目 | 金融セキュリティインフラ · SIEM · IaC',
      url: 'resume.jclee.me',
      label: '日本語',
    },
  };

  const data = content[language] || content.ko;

  // Build SVG string
  let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`;
  svg += '<defs><linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">';
  svg += '<stop offset="0%" style="stop-color:#0c0c12;stop-opacity:1" />';
  svg += '<stop offset="60%" style="stop-color:#0a1418;stop-opacity:1" />';
  svg += '<stop offset="100%" style="stop-color:#05181c;stop-opacity:1" />';
  svg += '</linearGradient></defs>';
  svg += `<rect width="${width}" height="${height}" fill="url(#grad)"/>`;

  // Language badge (top-right)
  const badgeX = width - 115;
  const badgeY = 65;
  svg += `<rect x="${width - 200}" y="30" width="170" height="50" rx="25" fill="#00d4e0" opacity="0.12" stroke="#00d4e0" stroke-width="2"/>`;
  svg += `<text x="${badgeX}" y="${badgeY}" font-family="Inter, sans-serif" font-size="20" font-weight="600" fill="#00d4e0" text-anchor="middle">${escapeXml(data.label)}</text>`;

  // Content group
  svg += `<g transform="translate(${centerX}, ${centerY})">`;

  // Name
  svg += `<text x="0" y="-80" font-family="Inter, sans-serif" font-size="72" font-weight="800" fill="#ffffff" text-anchor="middle" letter-spacing="-0.02em">${escapeXml(data.name)}</text>`;

  // Subtitle
  const subtitleLines = data.subtitleLines || ['Security Automation', 'Infrastructure Engineer'];
  subtitleLines.forEach((line, index) => {
    const y = index === 0 ? -18 : 34;
    svg += `<text x="0" y="${y}" font-family="Inter, sans-serif" font-size="46" font-weight="600" fill="#00d4e0" text-anchor="middle">${escapeXml(line)}</text>`;
  });

  // Stats
  svg += `<text x="0" y="105" font-family="Inter, sans-serif" font-size="32" font-weight="500" fill="#c8d2d6" text-anchor="middle">${escapeXml(data.stats)}</text>`;

  // URL
  svg += `<text x="0" y="165" font-family="Inter, sans-serif" font-size="28" font-weight="400" fill="#d946a8" text-anchor="middle">${escapeXml(data.url)}</text>`;

  svg += '</g></svg>';

  // Generate both PNG and WebP for each language
  const formats = [
    { ext: 'png', format: 'png' },
    { ext: 'webp', format: 'webp' },
  ];

  const results = [];

  for (const fmt of formats) {
    const fileName =
      language === 'ko'
        ? `og-image.${fmt.ext}`
        : language === 'ja'
          ? `og-image-ja.${fmt.ext}`
          : `og-image-en.${fmt.ext}`;
    const outputPath = path.join(__dirname, fileName);

    try {
      await sharp(Buffer.from(svg))[fmt.format]().toFile(outputPath);

      const stats = fs.statSync(outputPath);
      results.push({
        file: fileName,
        size: stats.size,
        language,
      });

      logger.log(`✅ Generated: ${fileName} (${(stats.size / 1024).toFixed(2)} KB)`);
    } catch (error) {
      logger.error(`❌ Error generating ${fileName}:`, error.message);
      throw error;
    }
  }

  return results;
}

// Helper function to escape XML special characters
function escapeXml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Run if called directly
if (require.main === module) {
  (async () => {
    try {
      logger.log('📸 Generating Open Graph images...');
      logger.log('');

      // Generate Korean version
      logger.log('🇰🇷 Korean version:');
      await generateOGImage('ko');
      logger.log('');

      // Generate English version
      logger.log('🇺🇸 English version:');
      await generateOGImage('en');
      logger.log('');

      // Generate Japanese version
      logger.log('🇯🇵 Japanese version:');
      await generateOGImage('ja');
      logger.log('');

      logger.log('✅ All Open Graph images generated successfully!');
    } catch (error) {
      logger.error('❌ Generation failed:', error.message);
      process.exit(1);
    }
  })();
}

module.exports = { generateOGImage };
