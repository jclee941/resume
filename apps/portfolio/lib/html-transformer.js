/**
 * HTML transformation utilities for worker generation
 * @module html-transformer
 */

const { minify } = require('html-minifier-terser');

const EXTERNAL_SRI = {
  GA_GTAG: 'sha384-D95pSxlR5vSF2Mt3lH3SvKEs9L5+WTLM53Lx1o515ZXOlyejGODwfb4YPse/qZk9',
  GOOGLE_GSI: 'sha384-Li3+JwrJUjnnr4ZvOP9SRczNCfPkOLWRVCzUTrD2TOhgQLBfRKs5Q5/lxh2tWguw',
};

function applyExternalSri(html) {
  return html
    .replace(
      /<script\s+async\s+src="https:\/\/www\.googletagmanager\.com\/gtag\/js\?id=G-P9E8XY5K2L"><\/script>/g,
      `<script async src="https://www.googletagmanager.com/gtag/js?id=G-P9E8XY5K2L" integrity="${EXTERNAL_SRI.GA_GTAG}" crossorigin="anonymous" referrerpolicy="no-referrer"></script>`
    )
    .replace(
      /<script\s+src="https:\/\/accounts\.google\.com\/gsi\/client"\s+async\s+defer><\/script>/g,
      `<script src="https://accounts.google.com/gsi/client" async defer integrity="${EXTERNAL_SRI.GOOGLE_GSI}" crossorigin="anonymous" referrerpolicy="no-referrer"></script>`
    );
}

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
 * @param {string} [options.resumeChatDataBase64] - Base64-encoded resume JSON for client chat.
 * @returns {string} HTML with placeholders replaced.
 */
function injectPlaceholders(html, options) {
  return html
    .replace('/* CSS_PLACEHOLDER */', options.cssContent)
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
    .replace("/* RESUME_CHAT_DATA_B64_PLACEHOLDER */ ''", options.resumeChatDataBase64 || "''");
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
  return minifyHtml(applyExternalSri(injected));
}

module.exports = {
  injectPlaceholders,
  minifyHtml,
  escapeForTemplateLiteral,
  buildLocalizedHtml,
};
