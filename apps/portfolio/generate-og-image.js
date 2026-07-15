const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const logger = require('./logger');

const WIDTH = 1200;
const HEIGHT = 630;
const CONTENT = {
  ko: {
    name: '이재철',
    primaryTitle: '풀스택 엔지니어',
    supportingLine: '보안 자동화 · 엣지 인프라',
  },
  en: {
    name: 'Jaecheol Lee',
    primaryTitle: 'Full-Stack Engineer',
    supportingLine: 'Security Automation & Edge Infrastructure',
  },
  ja: {
    name: '李在哲',
    primaryTitle: 'フルスタックエンジニア',
    supportingLine: 'セキュリティ自動化・エッジインフラ',
  },
};

const COLORS = {
  background: '#0f1115',
  surface: '#15181e',
  card: '#171a21',
  text: '#e7e9ee',
  secondaryText: '#aab1bd',
  accent: '#5aa9b8',
  accentStrong: '#9bd8e1',
  border: '#333845',
};

function escapeXml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildSvg(language) {
  const copy = CONTENT[language] || CONTENT.ko;
  const primarySize = language === 'ja' ? 54 : 60;
  const supportingSize = language === 'en' ? 36 : 38;
  const fonts = 'Inter, Noto Sans CJK KR, Noto Sans CJK JP, sans-serif';

  return `<svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="background" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${COLORS.background}"/>
        <stop offset="0.62" stop-color="${COLORS.surface}"/>
        <stop offset="1" stop-color="${COLORS.card}"/>
      </linearGradient>
      <radialGradient id="accent" cx="1" cy="0" r="1">
        <stop offset="0" stop-color="${COLORS.accent}" stop-opacity="0.28"/>
        <stop offset="0.58" stop-color="${COLORS.accent}" stop-opacity="0.08"/>
        <stop offset="1" stop-color="${COLORS.accent}" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#background)"/>
    <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#accent)"/>
    <path d="M112 118 H1088" stroke="${COLORS.border}" stroke-width="2"/>
    <path d="M112 118 H360" stroke="${COLORS.accentStrong}" stroke-width="4"/>
    <circle cx="1036" cy="504" r="118" fill="none" stroke="${COLORS.accent}" stroke-opacity="0.16" stroke-width="2"/>
    <circle cx="1036" cy="504" r="72" fill="none" stroke="${COLORS.accentStrong}" stroke-opacity="0.12" stroke-width="2"/>
    <g font-family="${fonts}">
      <text x="112" y="228" font-size="36" font-weight="600" fill="${COLORS.secondaryText}">${escapeXml(copy.name)}</text>
      <text x="112" y="340" font-size="${primarySize}" font-weight="700" letter-spacing="-1" fill="${COLORS.text}">${escapeXml(copy.primaryTitle)}</text>
      <text x="112" y="425" font-size="${supportingSize}" font-weight="500" fill="${COLORS.accentStrong}">${escapeXml(copy.supportingLine)}</text>
    </g>
  </svg>`;
}

async function generateOGImage(language = 'ko') {
  const formats = [
    { extension: 'png', encoder: 'png' },
    { extension: 'webp', encoder: 'webp' },
  ];
  const outputs = [];

  for (const format of formats) {
    const suffix = language === 'ko' ? '' : `-${language === 'ja' ? 'ja' : 'en'}`;
    const file = `og-image${suffix}.${format.extension}`;
    const outputPath = path.join(__dirname, file);
    const image = sharp(Buffer.from(buildSvg(language)));
    const encoded = format.encoder === 'png' ? image.png() : image.webp();
    await encoded.toFile(outputPath);
    const bytes = fs.statSync(outputPath).size;
    outputs.push({ file, bytes, language });
    logger.log(`Generated ${file} (${(bytes / 1024).toFixed(2)} KB)`);
  }

  return outputs;
}

if (require.main === module) {
  (async () => {
    try {
      for (const language of ['ko', 'en', 'ja']) await generateOGImage(language);
      logger.log('All Open Graph images generated successfully.');
    } catch (error) {
      logger.error('Open Graph image generation failed:', error.message);
      process.exit(1);
    }
  })();
}

module.exports = { buildSvg, generateOGImage };
