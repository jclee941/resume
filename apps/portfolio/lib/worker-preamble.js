/**
 * Worker preamble generator - constants, metrics, and utility functions.
 * Extracted from generate-worker.js template literal (L357-454).
 * @module worker-preamble
 */

const { buildWorkerRuntimeHelpers } = require('./worker-runtime-helpers');

/**
 * Generate the worker preamble code (constants, metrics, logging, auth).
 * @param {object} opts - Build-time values to interpolate
 * @param {string} opts.deployedAt - ISO timestamp of deployment
 * @param {string} opts.indexHtml - Escaped HTML content (Korean)
 * @param {string} opts.indexEnHtml - Escaped HTML content (English)
 * @param {string} opts.indexJaHtml - Escaped HTML content (Japanese)
 * @param {string} opts.resumeDataJson - Escaped portfolio data JSON (Korean)
 * @param {string} opts.resumeDataEnJson - Escaped portfolio data JSON (English)
 * @param {string} opts.resumeDataJaJson - Escaped portfolio data JSON (Japanese)
 * @param {string} opts.manifestJson - Escaped manifest.json content (Korean)
 * @param {string} opts.manifestEnJson - Escaped manifest.json content (English)
 * @param {string} opts.serviceWorker - Escaped service worker JS
 * @param {string} opts.mainJs - Escaped main.js content
 * @param {string} opts.robotsTxt - Escaped robots.txt content
 * @param {string} opts.sitemapXml - Escaped sitemap.xml content
 * @param {string} opts.ogImageBase64 - Base64 OG image (Korean)
 * @param {string} opts.ogImageEnBase64 - Base64 OG image (English)
 * @param {string} opts.securityHeadersJson - JSON.stringify'd security headers (pretty)
 * @param {string} opts.metricsJson - JSON.stringify'd initial metrics (pretty)
 * @param {string} opts.initHistogramBucketsStr - initHistogramBuckets function source
 * @param {string} opts.generateHistogramLinesStr - generateHistogramLines function source
 * @param {string} opts.generateMetricsStr - generateMetrics function source
 * @param {string} opts.logToElasticsearchStr - logToElasticsearch function source
 * @param {string} opts.rateLimitConfigJson - JSON.stringify'd rate limit config
 * @param {string} opts.authHelpersStr - Generated auth helper code
 * @returns {string} Worker preamble code
 */
function generateWorkerPreamble(opts) {
  return `// Cloudflare Worker - Auto-generated (IMPROVED VERSION)
// Generated: ${opts.deployedAt}
// Features: Template caching, JSDoc types, link helper, constants, rate limiting

const INDEX_HTML = \`${opts.indexHtml}\`;
const INDEX_EN_HTML = \`${opts.indexEnHtml}\`;
const INDEX_JA_HTML = \`${opts.indexJaHtml}\`;
const RESUME_DATA_JSON = \`${opts.resumeDataJson}\`;
const RESUME_DATA_EN_JSON = \`${opts.resumeDataEnJson}\`;
const RESUME_DATA_JA_JSON = \`${opts.resumeDataJaJson}\`;

const MANIFEST_JSON = \`${opts.manifestJson}\`;
const MANIFEST_EN_JSON = \`${opts.manifestEnJson}\`;
const SERVICE_WORKER = \`${opts.serviceWorker}\`;
const MAIN_JS = \`${opts.mainJs}\`;

// SEO files
const ROBOTS_TXT = \`${opts.robotsTxt}\`;
const SITEMAP_XML = \`${opts.sitemapXml}\`;
const OG_IMAGE_BASE64 = '${opts.ogImageBase64}';
const OG_IMAGE_EN_BASE64 = '${opts.ogImageEnBase64}';
const OG_IMAGE_JA_BASE64 = '${opts.ogImageJaBase64}';

const CSP_NONCE_PLACEHOLDER = '__CSP_NONCE__';

const SECURITY_HEADERS = ${opts.securityHeadersJson};

function generateCspNonce() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function applyNonceToHeaders(baseHeaders, nonce) {
  const headers = { ...baseHeaders };
  if (typeof headers['Content-Security-Policy'] === 'string') {
    headers['Content-Security-Policy'] = headers['Content-Security-Policy'].split(CSP_NONCE_PLACEHOLDER).join(nonce);
  }
  return headers;
}

function applyNonceToHtml(html, nonce) {
  return html.split(CSP_NONCE_PLACEHOLDER).join(nonce);
}

const CACHE_POLICIES = {
  html: { 'Cache-Control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400' },
  static: { 'Cache-Control': 'public, max-age=31536000, immutable' },
  api: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
};

// Metrics
const metrics = ${opts.metricsJson};

// Histogram bucket boundaries (Prometheus standard)
const HISTOGRAM_BUCKETS = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];

${opts.initHistogramBucketsStr}

${opts.generateHistogramLinesStr}

${opts.generateMetricsStr}

${buildWorkerRuntimeHelpers({ logToElasticsearchStr: opts.logToElasticsearchStr })}

${opts.authHelpersStr}
`;
}

module.exports = { generateWorkerPreamble };
