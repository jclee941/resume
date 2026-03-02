/**
 * Template generation utilities for resume worker
 * @module templates
 */

const { generateHash } = require('./utils');

/**
 * Generate HTML link element
 * @typedef {Object} LinkConfig
 * @property {string} url - Link URL
 * @property {string} text - Link text
 * @property {string} className - CSS class name
 * @property {string} ariaLabel - Accessibility label
 * @property {boolean} [isExternal=false] - Whether link opens in new tab
 * @property {boolean} [isDownload=false] - Whether link is a download
 *
 * @param {LinkConfig} config - Link configuration
 * @returns {string} HTML link string
 */
function generateLink(config) {
  const { url, text, className, ariaLabel, isExternal = false, isDownload = false } = config;
  const externalAttrs = isExternal ? ' target="_blank" rel="noopener noreferrer"' : '';
  const downloadAttr = isDownload ? ' download' : '';

  return `<a href="${url}"${externalAttrs}${downloadAttr} class="${className}" aria-label="${ariaLabel}">${text}</a>`;
}

/**
 * Extract inline scripts and styles from HTML and generate hashes
 * @param {string} html - HTML content
 * @returns {Object} Object with script and style hashes
 * @returns {string[]} return.scriptHashes - Array of script CSP hashes
 * @returns {string[]} return.styleHashes - Array of style CSP hashes
 */
function extractInlineHashes(html) {
  const scriptHashes = [];
  const styleHashes = [];

  // Extract inline scripts
  // CRITICAL: Do NOT trim() - browser calculates hash with exact whitespace
  // Match all <script> tags without src attribute (inline scripts), including those with type="application/ld+json"
  const scriptRegex = /<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/g;
  let scriptMatch;
  while ((scriptMatch = scriptRegex.exec(html)) !== null) {
    const scriptContent = scriptMatch[1]; // NO TRIM!
    if (scriptContent) {
      const hash = generateHash(scriptContent);
      scriptHashes.push(`'sha256-${hash}'`);
    }
  }

  // Extract inline styles
  // CRITICAL: Do NOT trim() - browser calculates hash with exact whitespace
  const styleRegex = /<style>([\s\S]*?)<\/style>/g;
  let styleMatch;
  while ((styleMatch = styleRegex.exec(html)) !== null) {
    const styleContent = styleMatch[1]; // NO TRIM!
    if (styleContent) {
      const hash = generateHash(styleContent);
      styleHashes.push(`'sha256-${hash}'`);
    }
  }

  return { scriptHashes, styleHashes };
}

module.exports = {
  generateLink,
  extractInlineHashes
};
