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

const SITEMAP_XML = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://resume.jclee.me/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://resume.jclee.me/job/dashboard</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
</urlset>`;

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
        return new Response(SITEMAP_XML, {
          headers: {
            'Content-Type': 'application/xml; charset=UTF-8',
            'Cache-Control': 'public, max-age=3600',
          },
        });
      }

      if (url.pathname.startsWith('/job')) {
        return jobHandler.fetch(request, env, ctx);
      }

      return portfolioWorker.fetch(request, env, ctx);
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
