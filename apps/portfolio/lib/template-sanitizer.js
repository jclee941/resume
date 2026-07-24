/**
 * Template sanitization and HTML escaping utilities
 * @module template-sanitizer
 */

/**
 * Validate JSON string and parse it safely
 * @param {string} jsonString - JSON string to parse
 * @param {string} [source='unknown'] - Source identifier for error messages
 * @returns {Object} Parsed JSON object
 * @throws {Error} If JSON parsing fails
 */
function safeParseJSON(jsonString, source = 'unknown') {
  try {
    return JSON.parse(jsonString);
  } catch (err) {
    if (err instanceof SyntaxError) {
      // Try to find the error location
      const match = err.message.match(/position (\d+)/);
      const position = match ? parseInt(match[1], 10) : -1;
      const context =
        position > 0
          ? `...${jsonString.substring(Math.max(0, position - 20), position + 20)}...`
          : '';
      throw new Error(
        `Invalid JSON in ${source}: ${err.message}${context ? ` near: ${context}` : ''}`,
        { cause: err }
      );
    }
    throw err;
  }
}

/**
 * Sanitize string for safe embedding in template literals
 * @param {string} str - String to sanitize
 * @returns {string} Sanitized string
 */
function sanitizeForTemplate(str) {
  return str.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$');
}

/**
 * Escape HTML special characters to prevent XSS attacks
 * @param {string} unsafe - Potentially unsafe string
 * @returns {string} HTML-escaped safe string
 * @example
 * escapeHtml('<script>alert("xss")</script>')
 * // Returns: '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
 */
function escapeHtml(unsafe) {
  if (typeof unsafe !== 'string') {
    return String(unsafe || '');
  }
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Sanitize a URL for safe use in href attributes.
 * Blocks dangerous protocols (javascript:, data:, vbscript:) while allowing
 * http:, https:, mailto:, tel:, and relative paths.
 * @param {string} url - URL to sanitize
 * @returns {string} Safe URL or empty string if dangerous
 */
function sanitizeHref(url) {
  if (typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  // Block control characters (null-byte injection, tab/newline smuggling)
  if (hasControlCharacter(trimmed)) return '';
  // Block protocol-relative URLs (//evil.com). Browsers normalize backslashes to
  // forward slashes in URL context, so a leading backslash is the same threat
  // (\\evil.com -> //evil.com); block any leading / or \ run that isn't a single
  // absolute path slash.
  if (trimmed.startsWith('//') || trimmed.startsWith('\\')) return '';
  if (/^[/\\]{2,}/.test(trimmed) || /^\\/.test(trimmed)) return '';
  // Relative paths are safe — but reject protocol-relative URLs (//evil.com)
  if (
    (trimmed.startsWith('/') && !trimmed.startsWith('//')) ||
    trimmed.startsWith('#') ||
    trimmed.startsWith('.')
  )
    return trimmed;
  // Allow only safe protocols
  const safeProtocols = ['https:', 'http:', 'mailto:', 'tel:'];
  try {
    const parsed = new URL(trimmed);
    if (safeProtocols.includes(parsed.protocol)) return trimmed;
  } catch (_e) {
    // Not a valid URL — if it has no colon before first slash, treat as relative
    if (!trimmed.includes(':') || trimmed.indexOf('/') < trimmed.indexOf(':')) return trimmed;
  }
  return '';
}

function hasControlCharacter(value) {
  for (const char of value) {
    const code = char.charCodeAt(0);
    if (code <= 0x1f || code === 0x7f) return true;
  }
  return false;
}

module.exports = {
  safeParseJSON,
  sanitizeForTemplate,
  escapeHtml,
  sanitizeHref,
};
