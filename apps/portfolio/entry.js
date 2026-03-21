import portfolioWorker from './worker.js';
import jobHandler, {
  JobCrawlingWorkflow,
  ApplicationWorkflow,
  ResumeSyncWorkflow,
  DailyReportWorkflow,
  HealthCheckWorkflow,
  BackupWorkflow,
  CleanupWorkflow,
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

  async queue(batch, env, ctx) {
    return jobHandler.queue(batch, env, ctx);
  },
};
