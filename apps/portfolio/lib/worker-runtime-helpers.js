function buildWorkerRuntimeHelpers({ logToElasticsearchStr }) {
  return String.raw`
function buildDocument(message, level, labels, job) {
  const now = new Date();
  return {
    '@timestamp': now.toISOString(),
    message,
    level: level.toLowerCase(),
    service: job,
    ...labels,
  };
}

function buildEsHeaders(env) {
  const headers = { 'Content-Type': 'application/x-ndjson' };
  const cfId = env?.CF_ACCESS_CLIENT_ID;
  const cfSecret = env?.CF_ACCESS_CLIENT_SECRET;
  if (cfId) headers['CF-Access-Client-Id'] = cfId;
  if (cfSecret) headers['CF-Access-Client-Secret'] = cfSecret;
  const apiKey = env?.ELASTICSEARCH_API_KEY;
  if (apiKey) headers['Authorization'] = 'ApiKey ' + apiKey;
  return headers;
}

const DEFAULT_TIMEOUT_MS = 5000;

${logToElasticsearchStr}

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
    pathname === '/manifest_en.json' ||
    pathname === '/sw.js' ||
    pathname === '/main.js' ||
    pathname === '/robots.txt' ||
    pathname === '/.well-known/security.txt' ||
    pathname === '/security.txt' ||
    pathname === '/sitemap.xml' ||
    pathname === '/og-image.webp' ||
    pathname === '/og-image-en.webp' ||
    pathname === '/og-image-ja.webp' ||
    pathname.endsWith('.pdf') ||
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
`;
}

module.exports = { buildWorkerRuntimeHelpers };
