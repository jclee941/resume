const { TEMPLATE_CACHE } = require('../config');
const { escapeHtml } = require('../template-sanitizer');
const logger = require('../../logger');

/**
 * Generate about section content HTML from SSoT aboutSection data.
 * Mirrors terminal-cmd aesthetic: label + bullet list per block.
 * @param {Object|null} aboutData - aboutSection from data.json
 * @param {string} dataHash - Hash for cache validation
 * @returns {string} HTML string for about section content
 */
function generateAboutContent(aboutData, dataHash) {
  if (!aboutData) return '';
  if (TEMPLATE_CACHE.dataHash === dataHash && TEMPLATE_CACHE.aboutContentHtml) {
    logger.log('✓ Using cached about HTML');
    return TEMPLATE_CACHE.aboutContentHtml;
  }

  const blocks = [
    { label: 'career_highlights', items: aboutData.careerHighlights || [] },
    { label: 'tech_philosophy', items: aboutData.techPhilosophy || [] },
    { label: 'current_focus', items: aboutData.currentFocus || [] },
  ];

  const blocksHtml = blocks
    .filter((block) => Array.isArray(block.items) && block.items.length > 0)
    .map((block) => {
      const items = block.items
        .map((item) => `<li>${escapeHtml(String(item))}</li>`)
        .join('\n          ');
      return `<div class="about-block">
        <span class="about-label">&gt; ${block.label}</span>
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
