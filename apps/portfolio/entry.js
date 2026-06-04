import portfolioWorker from './worker.js';
// Single-worker consolidation per ADR 0009: import the job-dashboard worker in-process
// instead of via Service Binding. This is the one sanctioned cross-app import.
// eslint-disable-next-line no-restricted-imports
import jobWorker, {
  JobCrawlingWorkflow,
  ApplicationWorkflow,
  ResumeSyncWorkflow,
  DailyReportWorkflow,
  HealthCheckWorkflow,
  BackupWorkflow,
  CleanupWorkflow,
  BrowserSessionDO,
} from '../job-dashboard/src/index.js';
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
import { logResponse, logError } from '@resume/shared/es-client';

// Re-export Workflow + Durable Object classes so wrangler can register them in the merged worker.
export {
  JobCrawlingWorkflow,
  ApplicationWorkflow,
  ResumeSyncWorkflow,
  DailyReportWorkflow,
  HealthCheckWorkflow,
  BackupWorkflow,
  CleanupWorkflow,
  BrowserSessionDO,
};

async function fetchJobHandlerResponse(request, env, ctx, pathname) {
  // Job dashboard runs in-process (merged worker — no Service Binding needed).
  // The job worker's internal router strips the /job prefix itself.
  const response = await jobWorker.fetch(request, env, ctx);
  return applyResponseHeaders(response, pathname);
}

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
        // Root '/' is always the Korean canonical page. Language is selected
        // explicitly via /en/ and /ja/, never by Accept-Language negotiation,
        // so '/' stays a stable, cacheable canonical URL (no per-user 302).
        const effectiveLanguage =
          url.pathname === '/' ? DEFAULT_LANGUAGE : languageContext.language;
        const effectiveSource =
          url.pathname === '/' ? 'default' : languageContext.source;

        const targetPath = getPortfolioTargetPath(url.pathname, effectiveLanguage);
        const targetUrl = new URL(request.url);
        targetUrl.pathname = targetPath;

        const localizedRequest = new Request(targetUrl.toString(), request);
        localizedRequest.headers.set('X-Detected-Language', effectiveLanguage);
        localizedRequest.headers.set('X-Language-Source', effectiveSource);

        let portfolioResponse = await portfolioWorker.fetch(localizedRequest, env, ctx);
        if (isHtmlResponse(portfolioResponse)) {
          portfolioResponse = await localizeHtmlResponse(portfolioResponse, effectiveLanguage);
        }

        response = applyResponseHeaders(portfolioResponse, url.pathname, {
          language: effectiveLanguage,
          source: effectiveSource,
          varyAcceptLanguage: false,
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
        logError(
          env,
          error instanceof Error ? error : new Error(String(error?.message || error)),
          {
            url: { path: url.pathname },
          },
          {
            job: 'resume-worker-entry',
            index: env?.ELASTICSEARCH_INDEX || 'resume-logs-worker',
          }
        )
      );
      response = new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    ctx.waitUntil(
      logResponse(env, request, response, {
        startTime,
        job: 'resume-worker-entry',
        index: env?.ELASTICSEARCH_INDEX || 'resume-logs-worker',
      })
    );
    return response;
  },

  // Queue handler - acknowledges all messages (no-op for portfolio worker)
  // Queue handler — delegate to job worker (it handles crawl-tasks + notifications queues).
  async queue(batch, env, ctx) {
    return jobWorker.queue(batch, env, ctx);
  },
};
