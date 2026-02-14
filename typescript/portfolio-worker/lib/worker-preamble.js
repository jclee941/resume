/**
 * Worker preamble generator - constants, metrics, and utility functions.
 * Extracted from generate-worker.js template literal (L357-454).
 * @module worker-preamble
 */

/**
 * Generate the worker preamble code (constants, metrics, logging, auth).
 * @param {object} opts - Build-time values to interpolate
 * @param {string} opts.deployedAt - ISO timestamp of deployment
 * @param {string} opts.indexHtml - Escaped HTML content (Korean)
 * @param {string} opts.indexEnHtml - Escaped HTML content (English)
 * @param {string} opts.manifestJson - Escaped manifest.json content
 * @param {string} opts.serviceWorker - Escaped service worker JS
 * @param {string} opts.mainJs - Escaped main.js content
 * @param {string} opts.robotsTxt - Escaped robots.txt content
 * @param {string} opts.sitemapXml - Escaped sitemap.xml content
 * @param {string} opts.ogImageBase64 - Base64 OG image (Korean)
 * @param {string} opts.ogImageEnBase64 - Base64 OG image (English)
 * @param {string} opts.resumePdfBase64 - Base64 resume PDF
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

const MANIFEST_JSON = \`${opts.manifestJson}\`;
const SERVICE_WORKER = \`${opts.serviceWorker}\`;
const MAIN_JS = \`${opts.mainJs}\`;

// SEO files
const ROBOTS_TXT = \`${opts.robotsTxt}\`;
const SITEMAP_XML = \`${opts.sitemapXml}\`;
const OG_IMAGE_BASE64 = '${opts.ogImageBase64}';
const OG_IMAGE_EN_BASE64 = '${opts.ogImageEnBase64}';
const RESUME_PDF_BASE64 = '${opts.resumePdfBase64}';

// Security headers
const SECURITY_HEADERS = ${opts.securityHeadersJson};

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

function buildEcsDocument(message, level, labels, job) {
  const now = new Date();
  return {
    '@timestamp': now.toISOString(),
    message,
    log: { level: level.toLowerCase() },
    service: { name: job },
    ecs: { version: '8.11' },
    ...labels,
  };
}

// ES Logger module-level state (inlined from lib/es-logger.js)
const DEFAULT_TIMEOUT_MS = 5000;
const BATCH_SIZE = 10;
const BATCH_FLUSH_MS = 1000;
const MAX_QUEUE_SIZE = 1000;
let logQueue = [];
let flushTimer = null;

async function flushLogs(env, index) {
  if (logQueue.length === 0) return;

  const logs = logQueue.splice(0, logQueue.length);
  const esUrl = env?.ELASTICSEARCH_URL;
  const apiKey = env?.ELASTICSEARCH_API_KEY;

  if (!esUrl || !apiKey) return;

  const bulkBody =
    logs
      .map((doc) => {
        const action = JSON.stringify({ index: { _index: index } });
        const document = JSON.stringify(doc);
        return \`\${action}\\n\${document}\`;
      })
      .join('\\n') + '\\n';

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    await fetch(\`\${esUrl}/_bulk\`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/x-ndjson',
        Authorization: \`ApiKey \${apiKey}\`,
      },
      body: bulkBody,
    });
  } catch (err) {
    metrics.requests_error++;
    console.error('[ES] Bulk flush failed:', err.message || err);
  } finally {
    clearTimeout(timeoutId);
  }
}

${opts.logToElasticsearchStr}

const ipCache = new Map();
const RATE_LIMIT_POLICIES = {
  api: { limit: 30, windowMs: 60 * 1000 },
  health: { limit: 20, windowMs: 60 * 1000 },
  page: { limit: 120, windowMs: 60 * 1000 },
  static: { limit: 200, windowMs: 60 * 1000 },
};
const RATE_LIMIT_CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let lastRateLimitCleanupAt = 0;

function getRateLimitPolicy(pathname) {
  if (pathname === '/health' || pathname === '/metrics') {
    return RATE_LIMIT_POLICIES.health;
  }

  if (pathname.startsWith('/api/')) {
    return RATE_LIMIT_POLICIES.api;
  }

  if (
    pathname.startsWith('/assets/') ||
    pathname.startsWith('/fonts/') ||
    pathname === '/manifest.json' ||
    pathname === '/sw.js' ||
    pathname === '/main.js' ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml' ||
    pathname === '/og-image.webp' ||
    pathname === '/og-image-en.webp' ||
    pathname === '/resume.pdf' ||
    pathname.endsWith('.css') ||
    pathname.endsWith('.js') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.jpg') ||
    pathname.endsWith('.jpeg') ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.ico') ||
    pathname.endsWith('.webp') ||
    pathname.endsWith('.woff') ||
    pathname.endsWith('.woff2')
  ) {
    return RATE_LIMIT_POLICIES.static;
  }

  return RATE_LIMIT_POLICIES.page;
}

function cleanupStaleRateLimitEntries(now) {
  if (now - lastRateLimitCleanupAt < RATE_LIMIT_CLEANUP_INTERVAL_MS) {
    return;
  }

  for (const [key, entry] of ipCache.entries()) {
    if (!entry || entry.resetAt + RATE_LIMIT_CLEANUP_INTERVAL_MS < now) {
      ipCache.delete(key);
    }
  }

  lastRateLimitCleanupAt = now;
}

function checkRateLimit(ip, pathname) {
  const now = Date.now();
  cleanupStaleRateLimitEntries(now);

  const policy = getRateLimitPolicy(pathname);
  const routeKey = pathname === '/health' || pathname === '/metrics'
    ? 'health'
    : pathname.startsWith('/api/')
      ? 'api'
      : policy === RATE_LIMIT_POLICIES.static
        ? 'static'
        : 'page';
  const key = ip + ':' + routeKey;

  let entry = ipCache.get(key);
  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: now + policy.windowMs };
  }

  entry.count += 1;
  ipCache.set(key, entry);

  const allowed = entry.count <= policy.limit;
  const remaining = Math.max(0, policy.limit - entry.count);

  return {
    allowed,
    remaining,
    limit: policy.limit,
    resetAt: entry.resetAt,
  };
}

function getRateLimitHeaders(rateLimit) {
  return {
    'X-RateLimit-Limit': String(rateLimit.limit),
    'X-RateLimit-Remaining': String(rateLimit.remaining),
    'X-RateLimit-Reset': String(Math.ceil(rateLimit.resetAt / 1000)),
  };
}

function getRetryAfterSeconds(resetAt) {
  return String(Math.max(1, Math.ceil((resetAt - Date.now()) / 1000)));
}

const ALLOWED_CORS_ORIGINS = ['https://resume.jclee.me', 'https://resume-staging.jclee.me'];
const CORS_ALLOW_METHODS = 'GET, POST, OPTIONS';
const CORS_ALLOW_HEADERS = 'Content-Type, Authorization';
const CORS_MAX_AGE_SECONDS = '86400';

function isApiRoute(pathname) {
  return pathname.startsWith('/api/');
}

function getCorsHeaders(request, pathname) {
  if (!isApiRoute(pathname)) {
    return {};
  }

  const origin = request.headers.get('Origin');
  if (!origin || !ALLOWED_CORS_ORIGINS.includes(origin)) {
    return {};
  }

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': CORS_ALLOW_METHODS,
    'Access-Control-Allow-Headers': CORS_ALLOW_HEADERS,
    'Access-Control-Max-Age': CORS_MAX_AGE_SECONDS,
    Vary: 'Origin',
  };
}

function createPreflightResponse(request, pathname) {
  if (!(request.method === 'OPTIONS' && isApiRoute(pathname))) {
    return null;
  }

  const origin = request.headers.get('Origin');
  if (!origin || !ALLOWED_CORS_ORIGINS.includes(origin)) {
    return new Response(JSON.stringify({ error: 'CORS origin not allowed' }), {
      status: 403,
      headers: {
        ...SECURITY_HEADERS,
        'Content-Type': 'application/json',
        Vary: 'Origin',
      },
    });
  }

  return new Response(null, {
    status: 204,
    headers: {
      ...SECURITY_HEADERS,
      ...getCorsHeaders(request, pathname),
    },
  });
}

function hasJsonContentType(request) {
  const contentType = request.headers.get('Content-Type') || '';
  return contentType.toLowerCase().includes('application/json');
}

${opts.authHelpersStr}
`;
}

module.exports = { generateWorkerPreamble };
