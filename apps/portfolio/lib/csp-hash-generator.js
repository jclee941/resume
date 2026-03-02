/**
 * CSP Hash Generator Module
 * Extracts inline scripts and styles from HTML and generates SHA-256 hashes for CSP directives
 * @module csp-hash-generator
 */

const { generateHash } = require('./utils');

/**
 * Extract inline script tags from HTML and generate SHA-256 hashes
 * CRITICAL: Do NOT trim() - browser calculates hash with exact whitespace as-is
 * @param {string} html - HTML content to scan
 * @returns {string[]} Array of CSP script hash strings (e.g., ["'sha256-abc...123'", "'sha256-def...456'"])
 * @throws {Error} If HTML parsing fails
 */
function extractScriptHashes(html) {
  if (typeof html !== 'string') {
    throw new Error('HTML must be a string');
  }

  const scriptHashes = [];
  
  // Match all <script> tags without src attribute (inline scripts)
  // Includes scripts with any attributes like type="application/ld+json"
  // Regex breakdown:
  //   <script          - opening tag
  //   (?![^>]*src=)    - negative lookahead: ensure no 'src=' attribute
  //   [^>]*>           - any attributes before closing >
  //   ([\s\S]*?)       - capture inline script content (including whitespace)
  //   <\/script>       - closing tag
  const scriptRegex = /<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/g;
  
  let scriptMatch;
  while ((scriptMatch = scriptRegex.exec(html)) !== null) {
    const scriptContent = scriptMatch[1]; // Captured content (NO TRIM)
    
    // Only hash non-empty scripts
    if (scriptContent.trim()) {
      const hash = generateHash(scriptContent);
      scriptHashes.push(`'sha256-${hash}'`);
    }
  }

  return scriptHashes;
}

/**
 * Extract inline style tags from HTML and generate SHA-256 hashes
 * CRITICAL: Do NOT trim() - browser calculates hash with exact whitespace as-is
 * @param {string} html - HTML content to scan
 * @returns {string[]} Array of CSP style hash strings (e.g., ["'sha256-abc...123'"])
 * @throws {Error} If HTML parsing fails
 */
function extractStyleHashes(html) {
  if (typeof html !== 'string') {
    throw new Error('HTML must be a string');
  }

  const styleHashes = [];
  
  // Match all <style> tags with inline CSS
  // Regex breakdown:
  //   <style           - opening tag (no attributes used typically)
  //   ([\s\S]*?)       - capture inline style content (including whitespace)
  //   <\/style>        - closing tag
  const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/g;
  
  let styleMatch;
  while ((styleMatch = styleRegex.exec(html)) !== null) {
    const styleContent = styleMatch[1]; // Captured content (NO TRIM)
    
    // Only hash non-empty styles
    if (styleContent.trim()) {
      const hash = generateHash(styleContent);
      styleHashes.push(`'sha256-${hash}'`);
    }
  }

  return styleHashes;
}

/**
 * Extract ALL inline script and style hashes from HTML
 * Returns both script and style hashes as separate arrays
 * @param {string} html - HTML content to scan
 * @returns {Object} Object containing extracted hashes
 * @returns {string[]} return.scriptHashes - Array of script CSP hashes (e.g., ["'sha256-...'"])
 * @returns {string[]} return.styleHashes - Array of style CSP hashes (e.g., ["'sha256-...'"])
 * @example
 * const { scriptHashes, styleHashes } = extractAllHashes(htmlContent);
 * // scriptHashes: ["'sha256-abc123...'", "'sha256-def456...'"]
 * // styleHashes: ["'sha256-xyz789...'"]
 */
function extractAllHashes(html) {
  if (typeof html !== 'string') {
    throw new Error('HTML must be a string');
  }

  const scriptHashes = extractScriptHashes(html);
  const styleHashes = extractStyleHashes(html);

  return { scriptHashes, styleHashes };
}

/**
 * Merge hashes from multiple HTML documents using Set union (removes duplicates)
 * Useful for combining KO and EN portfolio hashes
 * @param {string[]} hash1 - First hash array
 * @param {string[]} hash2 - Second hash array
 * @returns {string[]} Merged hash array with duplicates removed
 * @example
 * const koHashes = extractScriptHashes(koHtml);
 * const enHashes = extractScriptHashes(enHtml);
 * const merged = mergeHashes(koHashes, enHashes);
 */
function mergeHashes(hash1, hash2) {
  if (!Array.isArray(hash1) || !Array.isArray(hash2)) {
    throw new Error('Both parameters must be arrays');
  }

  // Use Set to automatically deduplicate
  return Array.from(new Set([...hash1, ...hash2]));
}

/**
 * Validate that hashes are in correct CSP format
 * @param {string[]} hashes - Array of hashes to validate
 * @returns {boolean} True if all hashes are valid CSP format
 * @example
 * validateHashFormat(["'sha256-abc123...'", "'sha256-def456...'"]); // true
 * validateHashFormat(["sha256-abc123..."]); // false (missing quotes)
 */
function validateHashFormat(hashes) {
  if (!Array.isArray(hashes)) {
    return false;
  }

  // CSP hash format: 'sha256-<base64>'
  const hashPattern = /^'sha256-[A-Za-z0-9+/=]+='?$/;
  
  return hashes.every(hash => {
    if (typeof hash !== 'string') {
      return false;
    }
    return hashPattern.test(hash);
  });
}

module.exports = {
  extractScriptHashes,
  extractStyleHashes,
  extractAllHashes,
  mergeHashes,
  validateHashFormat,
};
