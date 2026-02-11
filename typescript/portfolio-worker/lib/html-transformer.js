/**
 * HTML transformation utilities for worker generation
 * @module html-transformer
 */

const { minify } = require('html-minifier-terser');

/**
 * Replace known HTML placeholders.
 * @param {string} html - Raw HTML template.
 * @param {Object} options - Placeholder values.
 * @param {string} options.cssContent - Bundled CSS.
 * @param {string} options.heroContentHtml - Hero section.
 * @param {string} options.resumeDescriptionHtml - Resume description.
 * @param {string} options.resumeCardsHtml - Resume cards.
 * @param {string} options.projectCardsHtml - Project cards.
 * @param {string} options.infrastructureCardsHtml - Infrastructure cards.
 * @param {string} options.certCardsHtml - Certification cards.
 * @param {string} options.skillsHtml - Skills list.
 * @param {string} options.contactGridHtml - Contact grid.
 * @param {string} options.resumePdfUrl - Resume PDF URL.
 * @param {string} options.resumeDocxUrl - Resume DOCX URL.
 * @param {string} options.resumeMdUrl - Resume markdown URL.
 * @param {string} [options.resumeChatDataJson] - Serialized resume JSON for client chat.
 * @returns {string} HTML with placeholders replaced.
 */
function injectPlaceholders(html, options) {
  return html
    .replace('<!-- CSS_PLACEHOLDER -->', options.cssContent)
    .replace('<!-- HERO_CONTENT_PLACEHOLDER -->', options.heroContentHtml)
    .replace('<!-- RESUME_DESCRIPTION_PLACEHOLDER -->', options.resumeDescriptionHtml)
    .replace('<!-- RESUME_CARDS_PLACEHOLDER -->', options.resumeCardsHtml)
    .replace('<!-- PROJECT_CARDS_PLACEHOLDER -->', options.projectCardsHtml)
    .replace('<!-- INFRASTRUCTURE_CARDS_PLACEHOLDER -->', options.infrastructureCardsHtml)
    .replace('<!-- CERTIFICATION_CARDS_PLACEHOLDER -->', options.certCardsHtml)
    .replace('<!-- SKILLS_LIST_PLACEHOLDER -->', options.skillsHtml)
    .replace('<!-- CONTACT_GRID_PLACEHOLDER -->', options.contactGridHtml)
    .replace('<!-- RESUME_PDF_URL -->', options.resumePdfUrl)
    .replace('<!-- RESUME_DOCX_URL -->', options.resumeDocxUrl)
    .replace('<!-- RESUME_MD_URL -->', options.resumeMdUrl)
    .replace('/* RESUME_CHAT_DATA_PLACEHOLDER */ {}', options.resumeChatDataJson || '{}');
}

/**
 * Minify generated HTML.
 * @param {string} html - HTML content.
 * @returns {Promise<string>} Minified HTML.
 */
async function minifyHtml(html) {
  return minify(html, {
    collapseWhitespace: true,
    removeComments: true,
    minifyCSS: { level: 0 },
    minifyJS: true,
  });
}

/**
 * Escape HTML for safe JavaScript template literal embedding.
 * CRITICAL: Escape order matters: backslash first, then backtick and dollar.
 * @param {string} html - HTML content.
 * @param {{BACKSLASH: RegExp, BACKTICK: RegExp, DOLLAR: RegExp}} escapePatterns - Escape patterns.
 * @returns {string} Escaped HTML.
 */
function escapeForTemplateLiteral(html, escapePatterns) {
  return html
    .replace(escapePatterns.BACKSLASH, '\\\\')
    .replace(escapePatterns.BACKTICK, '\\`')
    .replace(escapePatterns.DOLLAR, '\\$');
}

/**
 * Build and minify localized HTML page from template data.
 * @param {string} html - Raw HTML template.
 * @param {Object} options - Placeholder replacement values.
 * @returns {Promise<string>} Minified HTML page.
 */
async function buildLocalizedHtml(html, options) {
  const injected = injectPlaceholders(html, options);
  return minifyHtml(injected);
}

module.exports = {
  injectPlaceholders,
  minifyHtml,
  escapeForTemplateLiteral,
  buildLocalizedHtml,
};
