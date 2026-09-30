import { Router } from './router.js';
import { ApplicationsHandler } from './handlers/applications/index.js';
import { StatsHandler } from './handlers/stats.js';
import { AuthHandler } from './handlers/auth.js';
import { WebhookHandler } from './handlers/webhooks.js';
import { AutoApplyHandler } from './handlers/auto-apply/handler.js';
import cronRouter from './handlers/scheduled/cron-router.js';
import { DiagnosticsHandler } from './handlers/diagnostics.js';
import { ResumeMasterHandler } from './handlers/resume-master-handler.js';
import { jsonResponse, addCorsHeaders } from './middleware/cors.js';
import Logger, { RequestContext } from '@resume/shared/logger';
import { HttpError, normalizeError } from '@resume/shared/errors';
import {
  addRateLimitHeaders,
  checkKvSlidingWindowRateLimit as checkRateLimit,
} from '@resume/shared/rate-limit';
import {
  requiresAuth,
  requiresWebhookSignature,
  verifyAdminAuth,
  verifyWebhookSignature,
} from './services/auth.js';
import { validateCsrf, addCsrfCookie } from './middleware/csrf.js';
import { serveStatic } from './views/dashboard.js';
import {
  registerHealthRoutes,
  registerAuthRoutes,
  registerApplicationsRoutes,
  registerStatsRoutes,
  registerAutomationRoutes,
  registerWorkflowRoutes,
  registerAdminRoutes,
} from './routes/index.js';
import {
  JobCrawlingWorkflow,
  ApplicationWorkflow,
  ResumeSyncWorkflow,
  DailyReportWorkflow,
  HealthCheckWorkflow,
  CleanupWorkflow,
} from './workflows/index.js';
import { BrowserSessionDO } from './durable-objects/browser-session-do.js';
import { QueueConsumer } from './queues/queue-consumer.js';
import { handleMcpRequest } from './mcp/handler.js';

export {
  JobCrawlingWorkflow,
  ApplicationWorkflow,
  ResumeSyncWorkflow,
  DailyReportWorkflow,
  HealthCheckWorkflow,
  CleanupWorkflow,
  BrowserSessionDO,
};

export default /** @satisfies {import('./worker-env.js').DashboardWorker} */ ({
  async fetch(request, env, ctx) {
    const originalUrl = new URL(request.url);

    // Strip /job prefix when served from resume.jclee.me/job/*
    let pathname = originalUrl.pathname;
    if (pathname.startsWith('/job')) {
      pathname = pathname.slice(4) || '/';
    }

    // Create normalized URL for routing
    const url = new URL(originalUrl);
    url.pathname = pathname;
    const isMcp = pathname === '/mcp';
    // /mcp serves non-browser MCP clients: its responses carry no CORS headers.
    const cors = (/** @type {Response} */ response) =>
      isMcp ? response : addCorsHeaders(response, request, env);

    const router = new Router();
    const logger = Logger.create(env, { service: 'job-worker' });
    const reqCtx = RequestContext.fromRequest(request, url);
    const log = logger.withRequest(reqCtx);
    const respond = (/** @type {Response} */ response) => {
      ctx.waitUntil(log.logResponse(response));
      return response;
    };

    ctx.waitUntil(log.logRequest(request, url));

    if (request.method === 'OPTIONS' && !isMcp) {
      return respond(cors(new Response(null, { status: 204 })));
    }

    const rateResult = await checkRateLimit(request, url.pathname, env);
    if (!rateResult.ok) {
      return respond(
        cors(
          addRateLimitHeaders(
            jsonResponse({ error: rateResult.error }, rateResult.status),
            rateResult.headers
          )
        )
      );
    }

    if (requiresAuth(url.pathname)) {
      const authResult = await verifyAdminAuth(request, env);
      if (!authResult.ok) {
        const authBody =
          url.pathname === '/api/queue/enqueue' && authResult.status === 503
            ? { error: 'Authentication unavailable', status: 'disabled', available: false }
            : { error: authResult.error };
        return respond(cors(jsonResponse(authBody, authResult.status)));
      }
    }

    if (requiresWebhookSignature(url.pathname)) {
      const sigResult = await verifyWebhookSignature(request, env);
      if (!sigResult.ok) {
        return respond(cors(jsonResponse({ error: sigResult.error }, sigResult.status)));
      }
    }

    // CSRF gate. Webhooks use HMAC signature (validated above); /mcp only accepts an
    // Authorization: Bearer admin token (cookies are ignored, so nothing rides on a browser
    // session); every other state-changing endpoint - including /api/auto-apply/run -
    // requires X-CSRF-Token.
    const skipCsrf = url.pathname.startsWith('/api/webhooks/') || isMcp;
    if (!skipCsrf) {
      const csrfResult = validateCsrf(request);
      if (!csrfResult.ok) {
        return respond(cors(jsonResponse({ error: csrfResult.error }, csrfResult.status)));
      }
    }

    const auth = new AuthHandler(env);
    const apps = new ApplicationsHandler(env.JOB_DB, auth);
    const stats = new StatsHandler(env.JOB_DB);
    const webhooks = new WebhookHandler(env, auth);
    const autoApply = new AutoApplyHandler(env);
    const diagnostics = new DiagnosticsHandler(env);
    const resumeMaster = new ResumeMasterHandler(env, auth);
    const routeCtx = {
      env,
      apps,
      stats,
      auth,
      webhooks,
      autoApply,
      diagnostics,
      resumeMaster,
      log,
    };
    registerHealthRoutes(router, routeCtx);
    registerAuthRoutes(router, routeCtx);
    registerApplicationsRoutes(router, routeCtx);
    registerStatsRoutes(router, routeCtx);
    registerAutomationRoutes(router, routeCtx);
    registerWorkflowRoutes(router, routeCtx);
    registerAdminRoutes(router, routeCtx);

    if (isMcp) {
      const mcp = await handleMcpRequest(request, env, { router, log });
      return respond(addRateLimitHeaders(mcp, rateResult.headers));
    }

    try {
      const response = await router.handle(request, url, log);
      if (response) {
        const withCsrf = addCsrfCookie(response, request);
        return respond(addRateLimitHeaders(cors(withCsrf), rateResult.headers));
      }

      // Static fallback: serve dashboard for non-API routes
      if (!url.pathname.startsWith('/api/')) {
        const staticResponse = await serveStatic(url.pathname);
        const withCsrf = addCsrfCookie(staticResponse, request);
        return respond(cors(withCsrf));
      }

      // API route not found
      return respond(cors(jsonResponse({ error: 'Not found' }, 404)));
    } catch (err) {
      const error = normalizeError(err, { path: url.pathname, method: request.method });
      ctx.waitUntil(log.error('Unhandled worker error', error));

      if (error instanceof HttpError) {
        return respond(cors(error.toResponse()));
      }
      return respond(cors(jsonResponse({ error: 'Internal server error' }, 500)));
    }
  },

  async queue(batch, env, ctx) {
    const logger = Logger.create(env, { service: 'job-worker' });
    const consumer = new QueueConsumer(env, logger);
    await consumer.processBatch(batch, ctx);
  },

  async scheduled(controller, env, ctx) {
    await cronRouter.scheduled(controller, env, ctx);
  },
});
