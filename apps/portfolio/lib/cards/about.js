const { TEMPLATE_CACHE } =
  /** @type {{ TEMPLATE_CACHE: { dataHash: string | null, aboutContentHtml: string | null } }} */ (
    require('../config')
  );
const { escapeHtml } = require('../template-sanitizer');
const { breakJapanesePhrases, glueKoreanPhrases } = require('./text-breaks');
const logger = require('../../logger');

const ABOUT_LABELS = {
  ko: '경력 하이라이트',
  en: 'Career highlights',
  ja: '経歴ハイライト',
};

/**
 * @typedef {Object} AboutData
 * @property {string[]} [careerHighlights]
 */

/**
 * Generate the About section HTML from SSoT aboutSection data: a localized heading over the
 * career highlights list.
 * @param {AboutData|null} aboutData - aboutSection from data.json
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
  // rendered here.
  const highlights = Array.isArray(aboutData.careerHighlights) ? aboutData.careerHighlights : [];
  const items = highlights
    .map(
      (item) =>
        `<li>${breakJapanesePhrases(glueKoreanPhrases(escapeHtml(String(item)))).replace(/·/g, '·<wbr>')}</li>`
    )
    .join('\n          ');
  const blockHtml =
    highlights.length > 0
      ? `<div class="about-block">
        <span class="about-label">${ABOUT_LABELS[locale] || ABOUT_LABELS.ko}</span>
        <ul class="about-list">
          ${items}
        </ul>
      </div>`
      : '';

  const wrapped = `<div class="about-content">
      ${blockHtml}
    </div>`;

  TEMPLATE_CACHE.aboutContentHtml = wrapped;
  return wrapped;
}

module.exports = { generateAboutContent };
