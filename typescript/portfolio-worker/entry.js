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
import {
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
} from './lib/entry-router-utils.js';

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
    const cfId = env?.CF_ACCESS_CLIENT_ID;
    const cfSecret = env?.CF_ACCESS_CLIENT_SECRET;
    const apiKey = env?.ELASTICSEARCH_API_KEY;
    const index = env?.ELASTICSEARCH_INDEX || 'resume-logs-worker';
    const hasAuth = Boolean(apiKey);
    if (!esUrl || !hasAuth) return;

    const doc = {
      '@timestamp': new Date().toISOString(),
      message,
      level: 'error',
      service: 'resume-worker-entry',
      ...meta,
    };

    const headers = { 'Content-Type': 'application/json' };
    if (cfId) headers['CF-Access-Client-Id'] = cfId;
    if (cfSecret) headers['CF-Access-Client-Secret'] = cfSecret;
    if (apiKey) headers['Authorization'] = `ApiKey ${apiKey}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    try {
      await fetch(`${esUrl}/${index}/_doc`, {
        method: 'POST',
        signal: controller.signal,
        headers,
        body: JSON.stringify(doc),
      });
    } finally {
      clearTimeout(timeoutId);
    }
  } catch {
    // Best-effort: if ES is down, console.error is our only fallback
  }
}

async function fetchJobHandlerResponse(request, env, ctx, pathname) {
  const response = await jobHandler.fetch(request, env, ctx);
  return applyResponseHeaders(response, pathname);
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
    const languageContext = detectRequestLanguage(request, url.pathname);

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

      if (isSingleWorkerProfileSyncTrigger(url.pathname, request.method)) {
        const syncRequest = await createSingleWorkerProfileSyncRequest(request);
        return fetchJobHandlerResponse(syncRequest, env, ctx, url.pathname);
      }

      const profileSyncStatusId = getSingleWorkerProfileSyncStatusId(url.pathname, request.method);
      if (profileSyncStatusId) {
        const statusRequest = createSingleWorkerProfileSyncStatusRequest(
          request,
          profileSyncStatusId
        );
        return fetchJobHandlerResponse(statusRequest, env, ctx, url.pathname);
      }

      if (url.pathname.startsWith(JOB_ROUTE_PREFIX)) {
        return fetchJobHandlerResponse(request, env, ctx, url.pathname);
      }

      if (LOCALE_ROUTES.has(url.pathname)) {
        const targetPath = getPortfolioTargetPath(url.pathname, languageContext.language);
        const targetUrl = new URL(request.url);
        targetUrl.pathname = targetPath;

        const localizedRequest = new Request(targetUrl.toString(), request);
        localizedRequest.headers.set('X-Detected-Language', languageContext.language);
        localizedRequest.headers.set('X-Language-Source', languageContext.source);

        let response = await portfolioWorker.fetch(localizedRequest, env, ctx);
        if (isHtmlResponse(response)) {
          response = await localizeHtmlResponse(response, languageContext.language);
        }

        return applyResponseHeaders(response, url.pathname, {
          language: languageContext.language,
          source: languageContext.source,
          varyAcceptLanguage: url.pathname === '/' && languageContext.source === 'accept-language',
        });
      }

      const response = await portfolioWorker.fetch(request, env, ctx);
      return applyResponseHeaders(response, url.pathname, {
        language: languageContext.language || DEFAULT_LANGUAGE,
        source: languageContext.source,
      });
    } catch (error) {
      console.error('[entry] Unhandled error:', error?.message || error);
      ctx.waitUntil(
        logEntryError(env, `[entry] Unhandled: ${error?.message || error}`, {
          route: url.pathname,
          errorMessage: error?.message,
          errorStack: error?.stack,
        })
      );
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  },
};
