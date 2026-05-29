// Per-response nonce placeholder. The runtime replaces it with a freshly generated
// random nonce (16 bytes base64) on each HTML response. Cloudflare's auto-injected
// JS Detections script also picks up this nonce, eliminating the need for static hash allowlists.
const CSP_NONCE_PLACEHOLDER = '__CSP_NONCE__';

const CLOUDFLARE_STYLE_HASHES = ["'sha256-b/NzXPDoe2isM/MKIj3ExOIXdb0mbKWzX0VnJlT7jvY='"];

const CLOUDFLARE_ANALYTICS = {
  script: 'https://static.cloudflareinsights.com',
  connect: 'https://cloudflareinsights.com',
};

/**
 * Cache control strategies for different resource types
 * @type {Object.<string, string>}
 */
const CACHE_STRATEGIES = {
  // HTML pages - short cache with revalidation
  HTML: 'public, max-age=3600, must-revalidate',
  // Static assets (images, fonts) - long cache, immutable
  STATIC: 'public, max-age=31536000, immutable',
  // Documents (PDF, DOCX) - medium cache
  DOCUMENT: 'public, max-age=86400',
  // API endpoints - no cache
  API: 'no-cache, no-store, must-revalidate',
  // Service Worker - always revalidate
  SW: 'max-age=0, must-revalidate',
};

function buildScriptSrc(nonce) {
  return [
    "'self'",
    `'nonce-${nonce}'`,
    "'strict-dynamic'",
    'https://www.googletagmanager.com',
    CLOUDFLARE_ANALYTICS.script,
    'https://accounts.google.com',
  ].join(' ');
}

/**
 * @param {string[]} styleHashes
 * @param {{ nonce?: string }} [options]
 */
function generateSecurityHeaders(styleHashes, options = {}) {
  const nonce = options.nonce || CSP_NONCE_PLACEHOLDER;
  const scriptSrc = buildScriptSrc(nonce);
  const styleSrc = `'self' ${styleHashes.join(' ')} ${CLOUDFLARE_STYLE_HASHES.join(' ')}`;

  const cspDirectives = [
    "default-src 'none'",
    `script-src ${scriptSrc}`,
    `script-src-elem ${scriptSrc}`,
    `style-src ${styleSrc}`,
    `style-src-elem ${styleSrc}`,
    `connect-src 'self' https://www.google-analytics.com https://analytics.google.com https://www.google.com https://oauth2.googleapis.com ${CLOUDFLARE_ANALYTICS.connect}`,
    "img-src 'self' https: data:",
    'report-uri /api/csp-violation',
    "font-src 'self'",
    "manifest-src 'self'",
    "worker-src 'self'",
    "frame-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    'upgrade-insecure-requests',
  ];

  return {
    'Content-Type': 'text/html;charset=UTF-8',
    'Content-Security-Policy': cspDirectives.join('; '),
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-Permitted-Cross-Domain-Policies': 'none',
    'X-XSS-Protection': '0',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-origin',
    'Origin-Agent-Cluster': '?1',
    'Cache-Control': CACHE_STRATEGIES.HTML,
    'Permissions-Policy':
      'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()',
  };
}

/**
 * Get cache headers for specific resource type
 * @param {string} resourceType - Type of resource (HTML, STATIC, DOCUMENT, API, SW)
 * @returns {Object} Cache headers object
 */
function getCacheHeaders(resourceType) {
  const cacheControl = CACHE_STRATEGIES[resourceType] || CACHE_STRATEGIES.HTML;
  return { 'Cache-Control': cacheControl };
}

module.exports = {
  generateSecurityHeaders,
  getCacheHeaders,
  CACHE_STRATEGIES,
  CSP_NONCE_PLACEHOLDER,
};
