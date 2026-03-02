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
 * Build common ES auth headers for CF Access tunnel + ApiKey.
 * @param {object} env - Worker env bindings
 * @param {string} [contentType] - Content-Type header value
 * @returns {object} headers
 */
function buildEsHeaders(env, contentType = 'application/json') {
  const headers = { 'Content-Type': contentType };
  if (env?.CF_ACCESS_CLIENT_ID) headers['CF-Access-Client-Id'] = env.CF_ACCESS_CLIENT_ID;
  if (env?.CF_ACCESS_CLIENT_SECRET)
    headers['CF-Access-Client-Secret'] = env.CF_ACCESS_CLIENT_SECRET;
  if (env?.ELASTICSEARCH_API_KEY) headers['Authorization'] = `ApiKey ${env.ELASTICSEARCH_API_KEY}`;
  return headers;
}

/**
 * Post a single doc to Elasticsearch. Best-effort, 3s timeout.
 * @param {object} env - Worker env bindings
 * @param {object} doc - Document body
 */
async function postToEs(env, doc) {
  const esUrl = env?.ELASTICSEARCH_URL;
  const apiKey = env?.ELASTICSEARCH_API_KEY;
  const index = env?.ELASTICSEARCH_INDEX || 'resume-logs-worker';
  if (!esUrl || !apiKey) return;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3000);
  try {
    await fetch(`${esUrl}/${index}/_doc`, {
      method: 'POST',
      signal: controller.signal,
      headers: buildEsHeaders(env),
      body: JSON.stringify(doc),
    });
  } catch { /* silent */ } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Log entry-level errors to Elasticsearch.
 * @param {object} env - Worker env bindings
 * @param {string} message - Error message
 * @param {object} [meta] - Additional metadata
 */
async function logEntryError(env, message, meta = {}) {
  try {
    await postToEs(env, {
      '@timestamp': new Date().toISOString(),
      message,
      level: 'error',
      service: { name: 'resume-worker-entry' },
      ...meta,
    });
  } catch {
    // Best-effort: console.error is our only fallback
  }
}

/**
 * Log every request/response to Elasticsearch.
 * Non-blocking — call via ctx.waitUntil().
 * @param {object} env - Worker env bindings
 * @param {Request} request - Incoming request
 * @param {Response} response - Outgoing response
 * @param {string} pathname - URL pathname
 * @param {number} startTime - Date.now() at request start
 */
async function logRequest(env, request, response, pathname, startTime) {
  try {
    const duration = Date.now() - startTime;
    const status = response?.status || 0;
    const method = request?.method || 'UNKNOWN';
    const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';

    await postToEs(env, {
      '@timestamp': new Date().toISOString(),
      message: `${method} ${pathname} ${status} ${duration}ms`,
      level,
      service: { name: 'resume-worker-entry' },
      http: {
        request: { method },
        response: { status_code: status },
      },
      url: { path: pathname },
      duration,
      user_agent: { original: request?.headers?.get?.('user-agent') || '' },
    });
  } catch {
    // Best-effort
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
    const startTime = Date.now();
    const url = new URL(request.url);
    const languageContext = detectRequestLanguage(request, url.pathname);
    const profileSyncStatusId = getSingleWorkerProfileSyncStatusId(url.pathname, request.method);
    let response;

    try {
      if (url.pathname === '/sitemap.xml') {
        if (request.headers.get('if-none-match') === SITEMAP_ETAG) {
          response = new Response(null, {
            status: 304,
            headers: {
              ETag: SITEMAP_ETAG,
              'Last-Modified': LAST_MODIFIED,
              'Cache-Control': 'public, max-age=86400, must-revalidate',
              Vary: 'Accept-Encoding',
            },
          });
        } else {
          response = new Response(SITEMAP_XML, {
            headers: {
              'Content-Type': 'application/xml; charset=UTF-8',
              ETag: SITEMAP_ETAG,
              'Last-Modified': LAST_MODIFIED,
              'Cache-Control': 'public, max-age=86400, must-revalidate',
              Vary: 'Accept-Encoding',
            },
          });
        }
      } else if (isSingleWorkerProfileSyncTrigger(url.pathname, request.method)) {
        const syncRequest = await createSingleWorkerProfileSyncRequest(request);
        response = await fetchJobHandlerResponse(syncRequest, env, ctx, url.pathname);
      } else if (profileSyncStatusId) {
        const statusRequest = createSingleWorkerProfileSyncStatusRequest(
          request,
          profileSyncStatusId
        );
        response = await fetchJobHandlerResponse(statusRequest, env, ctx, url.pathname);
      } else if (url.pathname.startsWith(JOB_ROUTE_PREFIX)) {
        response = await fetchJobHandlerResponse(request, env, ctx, url.pathname);
      } else if (LOCALE_ROUTES.has(url.pathname)) {
        const targetPath = getPortfolioTargetPath(url.pathname, languageContext.language);
        const targetUrl = new URL(request.url);
        targetUrl.pathname = targetPath;

        const localizedRequest = new Request(targetUrl.toString(), request);
        localizedRequest.headers.set('X-Detected-Language', languageContext.language);
        localizedRequest.headers.set('X-Language-Source', languageContext.source);

        let portfolioResponse = await portfolioWorker.fetch(localizedRequest, env, ctx);
        if (isHtmlResponse(portfolioResponse)) {
          portfolioResponse = await localizeHtmlResponse(
            portfolioResponse,
            languageContext.language
          );
        }

        response = applyResponseHeaders(portfolioResponse, url.pathname, {
          language: languageContext.language,
          source: languageContext.source,
          varyAcceptLanguage: url.pathname === '/' && languageContext.source === 'accept-language',
        });
      } else {
        const portfolioResponse = await portfolioWorker.fetch(request, env, ctx);
        response = applyResponseHeaders(portfolioResponse, url.pathname, {
          language: languageContext.language || DEFAULT_LANGUAGE,
          source: languageContext.source,
        });
      }
    } catch (error) {
      console.error('[entry] Unhandled error:', error?.message || error);
      ctx.waitUntil(
        logEntryError(env, `[entry] Unhandled: ${error?.message || error}`, {
          route: url.pathname,
          errorMessage: error?.message,
          errorStack: error?.stack,
        })
      );
      response = new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    ctx.waitUntil(logRequest(env, request, response, url.pathname, startTime));
    return response;
  },
};
