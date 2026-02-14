import portfolioWorker from './worker.js';
import jobHandler, {
  JobCrawlingWorkflow,
  ApplicationWorkflow,
  ResumeSyncWorkflow,
  DailyReportWorkflow,
  HealthCheckWorkflow,
  BackupWorkflow,
  CleanupWorkflow,
} from '../job-automation/workers/src/index.js';

/**
 * Lightweight ES error logger for entry-level errors.
 * Avoids CommonJS/ESM mismatch with es-logger.js.
 * @param {object} env - Worker env bindings
 * @param {string} message - Error message
 * @param {object} [meta] - Additional metadata
 */
async function logEntryError(env, message, meta = {}) {
  try {
    const esUrl = env?.ELASTICSEARCH_URL;
    const apiKey = env?.ELASTICSEARCH_API_KEY;
    const index = env?.ELASTICSEARCH_INDEX || 'logs-resume-worker';
    if (!esUrl || !apiKey) return;

    const doc = {
      '@timestamp': new Date().toISOString(),
      message,
      log: { level: 'error' },
      service: { name: 'resume-worker-entry' },
      ecs: { version: '8.11' },
      ...meta,
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    await fetch(`${esUrl}/${index}/_doc`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `ApiKey ${apiKey}`,
      },
      body: JSON.stringify(doc),
    });

    clearTimeout(timeoutId);
  } catch {
    // Best-effort: if ES is down, console.error is our only fallback
  }
}

const LAST_MODIFIED = 'Sun, 15 Feb 2026 00:00:00 GMT';
const SITEMAP_ETAG = 'W/"resume-sitemap-2026-02-15"';

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
    <loc>https://resume.jclee.me/healthz</loc>
    <lastmod>2026-02-15</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.3</priority>
  </url>
</urlset>`;

function getCacheControlForPath(pathname) {
  if (pathname === '/healthz' || pathname === '/metrics') {
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

function applyResponseHeaders(response, pathname) {
  const headers = new Headers(response.headers);
  headers.set('Cache-Control', getCacheControlForPath(pathname));
  headers.set('Vary', 'Accept-Encoding');

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

export {
  JobCrawlingWorkflow,
  ApplicationWorkflow,
  ResumeSyncWorkflow,
  DailyReportWorkflow,
  HealthCheckWorkflow,
  BackupWorkflow,
  CleanupWorkflow,
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    try {
      if (url.pathname === '/sitemap.xml') {
        if (request.headers.get('if-none-match') === SITEMAP_ETAG) {
          return new Response(null, {
            status: 304,
            headers: {
              ETag: SITEMAP_ETAG,
              'Last-Modified': LAST_MODIFIED,
              'Cache-Control': 'public, max-age=86400, must-revalidate',
              Vary: 'Accept-Encoding',
            },
          });
        }
        return new Response(SITEMAP_XML, {
          headers: {
            'Content-Type': 'application/xml; charset=UTF-8',
            ETag: SITEMAP_ETAG,
            'Last-Modified': LAST_MODIFIED,
            'Cache-Control': 'public, max-age=86400, must-revalidate',
            Vary: 'Accept-Encoding',
          },
        });
      }

      if (url.pathname.startsWith('/job')) {
        const response = await jobHandler.fetch(request, env, ctx);
        return applyResponseHeaders(response, url.pathname);
      }

      const response = await portfolioWorker.fetch(request, env, ctx);
      return applyResponseHeaders(response, url.pathname);
    } catch (error) {
      console.error('[entry] Unhandled error:', error?.message || error);
      ctx.waitUntil(
        logEntryError(env, `[entry] Unhandled: ${error?.message || error}`, {
          error: { message: error?.message, stack: error?.stack },
          url: { path: url.pathname },
          http: { request: { method: request.method } },
        })
      );
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  },

  async scheduled(event, env, ctx) {
    try {
      return jobHandler.scheduled(event, env, ctx);
    } catch (error) {
      console.error('[entry] Scheduled handler error:', error?.message || error);
      ctx.waitUntil(
        logEntryError(env, `[entry] Scheduled error: ${error?.message || error}`, {
          error: { message: error?.message, stack: error?.stack },
          event: { cron: event?.cron },
        })
      );
    }
  },
};
