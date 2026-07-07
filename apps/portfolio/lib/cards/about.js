const { TEMPLATE_CACHE } = require('../config');
const { escapeHtml } = require('../template-sanitizer');
const logger = require('../../logger');

const ABOUT_LABELS = {
  ko: '경력 하이라이트',
  en: 'Career highlights',
  ja: '経歴ハイライト',
};

/**
 * Generate about section content HTML from SSoT aboutSection data.
 * Clean layout: localized reader-facing heading + bullet list per block.
 * @param {Object|null} aboutData - aboutSection from data.json
 * @param {string} dataHash - Hash for cache validation
 * @param {'ko'|'en'|'ja'} [locale='ko'] - Locale for the block heading
 * @returns {string} HTML string for about section content
 */
function generateAboutContent(aboutData, dataHash, locale = 'ko') {
  if (!aboutData) return '';
  if (TEMPLATE_CACHE.dataHash === dataHash && TEMPLATE_CACHE.aboutContentHtml) {
    logger.log('✓ Using cached about HTML');
    return TEMPLATE_CACHE.aboutContentHtml;
  }

  // career_highlights data is the single About narrative block. tech_philosophy
  // and current_focus restated the same career story (also covered by
  // achievements and the career timeline), so they are intentionally not
  // rendered here. The visible heading is localized reader-facing copy.
  const blocks = [
    { label: ABOUT_LABELS[locale] || ABOUT_LABELS.ko, items: aboutData.careerHighlights || [] },
  ];

  const blocksHtml = blocks
    .filter((block) => Array.isArray(block.items) && block.items.length > 0)
    .map((block) => {
      const items = block.items
        .map((item) => `<li>${escapeHtml(String(item))}</li>`)
        .join('\n          ');
      return `<div class="about-block">
        <span class="about-label">${block.label}</span>
        <ul class="about-list">
          ${items}
        </ul>
      </div>`;
    })
    .join('\n      ');

  const wrapped = `<div class="about-content">
      ${blocksHtml}
    </div>`;

  TEMPLATE_CACHE.aboutContentHtml = wrapped;
  return wrapped;
}

module.exports = { generateAboutContent };
