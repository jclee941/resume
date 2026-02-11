const CLOUDFLARE_SCRIPT_HASHES = [
  "'sha256-ejv3KuWsiHLmQk4H/gGfcyNdLfHz0/RVasWLywuSzIM='",
  "'sha256-zs+4J8cC1q5fwDOyvn4APEMKVZsN1GmQ2jr0OQ2Z4Ng='",
  "'sha256-aqgtbzDOW7zHIbhXqXNSxzAlXB8Psw8OG18Wht/X/n0='",
];

// Cloudflare Web Analytics domains
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

/**
 * Generate security headers with CSP
 * @param {string[]} scriptHashes - SHA-256 hashes for inline scripts
 * @param {string[]} styleHashes - SHA-256 hashes for inline styles
 * @returns {Object} Security headers object
 */
function generateSecurityHeaders(scriptHashes, styleHashes) {
  const cspDirectives = [
    "default-src 'none'",
    `script-src 'self' 'strict-dynamic' ${scriptHashes.join(' ')} ${CLOUDFLARE_SCRIPT_HASHES.join(' ')} https://www.googletagmanager.com ${CLOUDFLARE_ANALYTICS.script} https://accounts.google.com https://browser.sentry-cdn.com`,
    `style-src 'self' ${styleHashes.join(' ')}`,
    `style-src-elem 'self' ${styleHashes.join(' ')}`,
    "style-src-attr 'unsafe-inline'",
    `connect-src 'self' https://www.google-analytics.com https://analytics.google.com https://oauth2.googleapis.com ${CLOUDFLARE_ANALYTICS.connect} https://glitchtip.jclee.me`,
    "img-src 'self' data:",
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
    'X-XSS-Protection': '1; mode=block',

    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-origin',
    'Origin-Agent-Cluster': '?1',
    'Cache-Control': CACHE_STRATEGIES.HTML,
    'Permissions-Policy':
      'accelerometer=(), ambient-light-sensor=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=(), interest-cohort=()',
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

module.exports = { generateSecurityHeaders, getCacheHeaders, CACHE_STRATEGIES };
