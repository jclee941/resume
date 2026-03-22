import { Router } from './router.js';
import { ApplicationsHandler } from './handlers/applications.js';
import { StatsHandler } from './handlers/stats.js';
import { AuthHandler } from './handlers/auth.js';
import { WebhookHandler } from './handlers/webhooks.js';
import { AutoApplyHandler } from './handlers/auto-apply.js';
import { DiagnosticsHandler } from './handlers/diagnostics.js';
import { ResumeMasterHandler } from './handlers/resume-master-handler.js';
import { jsonResponse, addCorsHeaders } from './middleware/cors.js';
import Logger, { RequestContext } from '@resume/shared/logger';
import { HttpError, normalizeError } from '@resume/shared/errors';
import {
  requiresAuth,
  requiresWebhookSignature,
  verifyAdminAuth,
  verifyWebhookSignature,
} from './services/auth.js';
import { checkRateLimit, addRateLimitHeaders } from './middleware/rate-limit.js';
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
  BackupWorkflow,
  CleanupWorkflow,
} from './workflows/index.js';
import { BrowserSessionDO } from './durable-objects/browser-session-do.js';
import { QueueConsumer } from './queue-consumer.js';

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

export default {
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

    const router = new Router();
    const logger = Logger.create(env, { service: 'job-worker' });
    const reqCtx = RequestContext.fromRequest(request, url);
    const log = logger.withRequest(reqCtx);
    const respond = (response) => {
      ctx.waitUntil(log.logResponse(response));
      return response;
    };

    ctx.waitUntil(log.logRequest(request, url));

    if (request.method === 'OPTIONS') {
      return respond(addCorsHeaders(new Response(null, { status: 204 }), request, env));
    }

    const rateResult = await checkRateLimit(request, url.pathname, env);
    if (!rateResult.ok) {
      return respond(
        addCorsHeaders(
          addRateLimitHeaders(
            jsonResponse({ error: rateResult.error }, rateResult.status),
            rateResult.headers
          ),
          request,
          env
        )
      );
    }

    if (requiresAuth(url.pathname)) {
      const authResult = verifyAdminAuth(request, env);
      if (!authResult.ok) {
        return respond(
          addCorsHeaders(jsonResponse({ error: authResult.error }, authResult.status), request, env)
        );
      }
    }

    if (requiresWebhookSignature(url.pathname)) {
      const sigResult = await verifyWebhookSignature(request, env);
      if (!sigResult.ok) {
        return respond(
          addCorsHeaders(jsonResponse({ error: sigResult.error }, sigResult.status), request, env)
        );
      }
    }

    const skipCsrf =
      url.pathname.startsWith('/api/webhooks/') ||
      url.pathname.startsWith('/api/auto-apply/') ||
      url.pathname === '/api/auth/sync';
    if (!skipCsrf) {
      const csrfResult = validateCsrf(request);
      if (!csrfResult.ok) {
        return respond(
          addCorsHeaders(jsonResponse({ error: csrfResult.error }, csrfResult.status), request, env)
        );
      }
    }

    const apps = new ApplicationsHandler(env.DB);
    const stats = new StatsHandler(env.DB);
    const auth = new AuthHandler(env.DB, env.SESSIONS, env);
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

    try {
      const response = await router.handle(request, url, log);
      if (response) {
        const withCsrf = addCsrfCookie(response, request);
        return respond(
          addRateLimitHeaders(addCorsHeaders(withCsrf, request, env), rateResult.headers)
        );
      }

      // Static fallback: serve dashboard for non-API routes
      if (!url.pathname.startsWith('/api/')) {
        const staticResponse = serveStatic(url.pathname);
        const withCsrf = addCsrfCookie(staticResponse, request);
        return respond(addCorsHeaders(withCsrf, request, env));
      }

      // API route not found
      return respond(addCorsHeaders(jsonResponse({ error: 'Not found' }, 404), request, env));
    } catch (err) {
      const error = normalizeError(err, { path: url.pathname, method: request.method });
      ctx.waitUntil(log.error('Unhandled worker error', error));

      if (error instanceof HttpError) {
        return respond(addCorsHeaders(error.toResponse(), request, env));
      }
      return respond(
        addCorsHeaders(jsonResponse({ error: 'Internal server error' }, 500), request, env)
      );
    }
  },

  async queue(batch, env, ctx) {
    const logger = Logger.create(env, { service: 'job-worker' });
    const consumer = new QueueConsumer(env, logger);
    await consumer.processBatch(batch, ctx);
  },
};
