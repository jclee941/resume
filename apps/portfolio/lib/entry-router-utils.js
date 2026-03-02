const LAST_MODIFIED = 'Sun, 15 Feb 2026 00:00:00 GMT';
const SITEMAP_ETAG = 'W/"resume-sitemap-2026-02-15"';
const DEFAULT_LANGUAGE = 'ko';
const SUPPORTED_LANGUAGES = ['ko', 'en', 'ja'];
const SINGLE_WORKER_PROFILE_SYNC_PATH = '/api/automation/resume-update';
const SINGLE_WORKER_PROFILE_SYNC_STATUS_PATTERN = /^\/api\/automation\/resume-update\/([^/]+)$/;
const JOB_ROUTE_PREFIX = '/job';
const LOCALE_ROUTES = new Set(['/', '/ko', '/ko/', '/en', '/en/', '/ja', '/ja/']);

const HREFLANG_LINKS = [
  '<link rel="alternate" hreflang="ko-KR" href="https://resume.jclee.me/" />',
  '<link rel="alternate" hreflang="en-US" href="https://resume.jclee.me/en/" />',
  '<link rel="alternate" hreflang="ja-JP" href="https://resume.jclee.me/ja/" />',
  '<link rel="alternate" hreflang="x-default" href="https://resume.jclee.me/" />',
].join('\n    ');

const SITEMAP_XML = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://resume.jclee.me/</loc>
    <lastmod>2026-02-15</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://resume.jclee.me/en</loc>
    <lastmod>2026-02-15</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://resume.jclee.me/ja</loc>
    <lastmod>2026-02-15</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://resume.jclee.me/job</loc>
    <lastmod>2026-02-15</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>https://resume.jclee.me/job/dashboard</loc>
    <lastmod>2026-02-15</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>https://resume.jclee.me/health</loc>
    <lastmod>2026-02-15</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.3</priority>
  </url>
</urlset>`;

function getLocaleFromPath(pathname) {
  const segment = pathname.split('/').filter(Boolean)[0];
  if (!segment) {
    return null;
  }

  return SUPPORTED_LANGUAGES.includes(segment) ? segment : null;
}

function parseAcceptLanguageHeader(headerValue) {
  if (!headerValue) {
    return null;
  }

  const ranked = headerValue
    .split(',')
    .map((entry, index) => {
      const [rawRange, ...params] = entry.trim().split(';');
      if (!rawRange) {
        return null;
      }

      let quality = 1;
      for (const param of params) {
        const trimmed = param.trim();
        if (!trimmed.startsWith('q=')) {
          continue;
        }

        const parsed = Number.parseFloat(trimmed.slice(2));
        if (Number.isFinite(parsed)) {
          quality = parsed;
        }
      }

      return {
        index,
        quality,
        code: rawRange.toLowerCase(),
      };
    })
    .filter((item) => item && item.quality > 0)
    .sort((a, b) => {
      if (b.quality !== a.quality) {
        return b.quality - a.quality;
      }

      return a.index - b.index;
    });

  for (const candidate of ranked) {
    const [baseCode] = candidate.code.split('-');
    if (SUPPORTED_LANGUAGES.includes(baseCode)) {
      return baseCode;
    }
  }

  return null;
}

function detectRequestLanguage(request, pathname) {
  const pathLanguage = getLocaleFromPath(pathname);
  if (pathLanguage) {
    return {
      language: pathLanguage,
      source: 'path',
    };
  }

  const headerLanguage = parseAcceptLanguageHeader(request.headers.get('Accept-Language'));
  if (headerLanguage) {
    return {
      language: headerLanguage,
      source: 'accept-language',
    };
  }

  return {
    language: DEFAULT_LANGUAGE,
    source: 'default',
  };
}

function getPortfolioTargetPath(pathname, language) {
  if (pathname === '/en' || pathname === '/en/') {
    return '/en/';
  }

  if (pathname === '/ko' || pathname === '/ko/' || pathname === '/ja' || pathname === '/ja/') {
    return '/';
  }

  if (pathname === '/') {
    if (language === 'en') {
      return '/en/';
    }

    return '/';
  }

  return pathname;
}

function mergeVaryHeader(existingValue, valuesToAdd) {
  const merged = new Set(
    String(existingValue || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  );

  for (const value of valuesToAdd) {
    merged.add(value);
  }

  return Array.from(merged).join(', ');
}

function localizeHtmlDocument(html, language) {
  const localized = SUPPORTED_LANGUAGES.includes(language) ? language : DEFAULT_LANGUAGE;
  const htmlWithLang = /<html[^>]*\slang=["'][^"']*["'][^>]*>/i.test(html)
    ? html.replace(/(<html[^>]*\slang=["'])[^"']*(["'][^>]*>)/i, `$1${localized}$2`)
    : html.replace(/<html([^>]*)>/i, `<html lang="${localized}"$1>`);

  const htmlWithoutAlternates = htmlWithLang.replace(
    /\s*<link\s+rel=["']alternate["'][^>]*>/gi,
    ''
  );

  if (htmlWithoutAlternates.includes('</head>')) {
    return htmlWithoutAlternates.replace('</head>', `    ${HREFLANG_LINKS}\n  </head>`);
  }

  return htmlWithoutAlternates;
}

function isHtmlResponse(response) {
  const contentType = response.headers.get('Content-Type') || '';
  return contentType.includes('text/html');
}

async function localizeHtmlResponse(response, language) {
  const html = await response.text();
  const headers = new Headers(response.headers);
  const localizedHtml = localizeHtmlDocument(html, language);

  return new Response(localizedHtml, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function getCacheControlForPath(pathname) {
  if (pathname === '/health' || pathname === '/healthz' || pathname === '/metrics') {
    return 'no-cache, no-store, must-revalidate';
  }
  if (pathname.startsWith('/api/')) {
    return 'no-store';
  }

  const isStaticAsset = /\.(?:css|js|mjs|png|jpe?g|webp|svg|gif|ico|woff2?|ttf|otf|map)$/i.test(
    pathname
  );
  if (isStaticAsset) {
    const isHashed = /[.-][a-f0-9]{8,}\./i.test(pathname);
    return isHashed
      ? 'public, max-age=31536000, immutable'
      : 'public, max-age=86400, must-revalidate';
  }

  if (pathname.endsWith('.pdf') || pathname.endsWith('.docx')) {
    return 'public, max-age=86400, must-revalidate';
  }

  return 'public, max-age=0, must-revalidate';
}

function applyResponseHeaders(response, pathname, requestContext = {}) {
  const headers = new Headers(response.headers);
  headers.set('Cache-Control', getCacheControlForPath(pathname));
  const varyValues = ['Accept-Encoding'];
  if (requestContext.varyAcceptLanguage) {
    varyValues.push('Accept-Language');
  }
  headers.set('Vary', mergeVaryHeader(headers.get('Vary'), varyValues));

  if (requestContext.language) {
    headers.set('X-Detected-Language', requestContext.language);
    headers.set('X-Language-Source', requestContext.source || 'default');
  }

  if (!headers.has('Last-Modified')) {
    headers.set('Last-Modified', LAST_MODIFIED);
  }

  if (!headers.has('ETag')) {
    const weakTag = pathname.replace(/[^a-z0-9/_-]/gi, '').replace(/\//g, '_') || 'root';
    headers.set('ETag', `W/"${weakTag}-2026-02-15"`);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

async function createSingleWorkerProfileSyncRequest(request) {
  const body = await request
    .clone()
    .json()
    .catch(() => ({}));

  const normalizedPlatforms =
    Array.isArray(body.platforms) && body.platforms.length > 0
      ? body.platforms
      : ['wanted', 'jobkorea'];

  const payload = {
    ...body,
    platforms: normalizedPlatforms,
  };

  const targetUrl = new URL(request.url);
  targetUrl.pathname = '/api/automation/profile-sync';

  const headers = new Headers(request.headers);
  headers.set('Content-Type', 'application/json');

  return new Request(targetUrl.toString(), {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
}

function createSingleWorkerProfileSyncStatusRequest(request, syncId) {
  const targetUrl = new URL(request.url);
  targetUrl.pathname = `/api/automation/profile-sync/${syncId}`;

  return new Request(targetUrl.toString(), {
    method: 'GET',
    headers: new Headers(request.headers),
  });
}

function isSingleWorkerProfileSyncTrigger(pathname, method) {
  return pathname === SINGLE_WORKER_PROFILE_SYNC_PATH && method === 'POST';
}

function getSingleWorkerProfileSyncStatusId(pathname, method) {
  if (method !== 'GET') {
    return null;
  }

  const match = pathname.match(SINGLE_WORKER_PROFILE_SYNC_STATUS_PATTERN);
  return match ? match[1] : null;
}

export {
  DEFAULT_LANGUAGE,
  JOB_ROUTE_PREFIX,
  LAST_MODIFIED,
  LOCALE_ROUTES,
  SITEMAP_ETAG,
  SITEMAP_XML,
  applyResponseHeaders,
  createSingleWorkerProfileSyncRequest,
  createSingleWorkerProfileSyncStatusRequest,
  detectRequestLanguage,
  getPortfolioTargetPath,
  getSingleWorkerProfileSyncStatusId,
  isHtmlResponse,
  isSingleWorkerProfileSyncTrigger,
  localizeHtmlResponse,
};
