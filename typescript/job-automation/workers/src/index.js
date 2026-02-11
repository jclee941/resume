import { Router } from './router.js';
import { ApplicationsHandler } from './handlers/applications.js';
import { StatsHandler } from './handlers/stats.js';
import { AuthHandler } from './handlers/auth.js';
import { WebhookHandler } from './handlers/webhooks.js';
import { AutoApplyHandler } from './handlers/auto-apply.js';
import { jsonResponse, addCorsHeaders } from './middleware/cors.js';
import Logger, { RequestContext } from '../../src/shared/logger/index.js';
import { HttpError, normalizeError } from '../../src/shared/errors/index.js';
import {
  requiresAuth,
  requiresWebhookSignature,
  verifyAdminAuth,
  verifyWebhookSignature,
  verifySecret,
  createAuthCookie,
  clearAuthCookie,
} from './services/auth.js';
import { checkRateLimit, addRateLimitHeaders } from './middleware/rate-limit.js';
import { validateCsrf, addCsrfCookie } from './middleware/csrf.js';
import { getConfig, saveConfig } from './services/config.js';
import { serveStatic } from './views/dashboard.js';
import { sendSlackMessage } from './services/slack.js';
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
import { QueueConsumer, enqueueTask, MESSAGE_TYPES, PRIORITY } from './queue-consumer.js';

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

    ctx.waitUntil(log.logRequest(request, url));

    const origin = request.headers.get('Origin') || '';

    if (request.method === 'OPTIONS') {
      return addCorsHeaders(new Response(null, { status: 204 }), origin);
    }

    const rateResult = await checkRateLimit(request, url.pathname, env);
    if (!rateResult.ok) {
      return addCorsHeaders(
        addRateLimitHeaders(
          jsonResponse({ error: rateResult.error }, rateResult.status),
          rateResult.headers
        ),
        origin
      );
    }

    if (requiresAuth(url.pathname)) {
      const authResult = verifyAdminAuth(request, env);
      if (!authResult.ok) {
        return addCorsHeaders(jsonResponse({ error: authResult.error }, authResult.status), origin);
      }
    }

    if (requiresWebhookSignature(url.pathname)) {
      const sigResult = await verifyWebhookSignature(request, env);
      if (!sigResult.ok) {
        return addCorsHeaders(jsonResponse({ error: sigResult.error }, sigResult.status), origin);
      }
    }

    // Skip CSRF for webhook routes, server-to-server sync, and auto-apply (cron/API)
    const skipCsrf =
      url.pathname.startsWith('/api/webhooks/') ||
      url.pathname.startsWith('/api/auto-apply/') ||
      url.pathname === '/api/auth/sync';
    if (!skipCsrf) {
      const csrfResult = validateCsrf(request);
      if (!csrfResult.ok) {
        return addCorsHeaders(jsonResponse({ error: csrfResult.error }, csrfResult.status), origin);
      }
    }

    const apps = new ApplicationsHandler(env.DB);
    const stats = new StatsHandler(env.DB);
    const auth = new AuthHandler(env.DB, env.SESSIONS, env);
    const webhooks = new WebhookHandler(env, auth);
    const autoApply = new AutoApplyHandler(env);

    // Health endpoint at root (for portfolio status checks with CORS)
    router.get('/health', async () => {
      const health = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '2.0.0',
      };
      try {
        if (env.DB) {
          await env.DB.prepare('SELECT 1').first();
          health.database = 'connected';
        } else {
          health.database = 'not configured';
        }
      } catch {
        health.status = 'degraded';
        health.database = 'error';
      }
      return jsonResponse(health);
    });

    router.get('/api/health', async () => {
      const health = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '2.0.0',
      };
      try {
        if (env.DB) {
          await env.DB.prepare('SELECT 1').first();
          health.database = 'connected';
        } else {
          health.database = 'not configured';
        }
      } catch {
        health.status = 'degraded';
        health.database = 'error';
      }
      return jsonResponse(health);
    });

    router.get('/api/status', async () => {
      const status = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '2.0.0',
      };
      if (env.DB) {
        try {
          const result = await env.DB.prepare('SELECT COUNT(*) as count FROM applications').first();
          status.applications = result?.count ?? 0;
        } catch {
          status.applications = 'error';
        }
      }
      return jsonResponse(status);
    });

    router.get('/api/stats', (req) => stats.getStats(req));
    router.get('/api/stats/weekly', (req) => stats.getWeeklyStats(req));

    router.get('/api/auth/status', (req) => auth.getStatus(req));
    router.post('/api/auth/set', (req) => auth.setAuth(req));
    router.post('/api/auth/sync', (req) => auth.syncFromScript(req));
    router.delete('/api/auth/:platform', (req) => auth.clearAuth(req));
    router.get('/api/auth/profile', (req) => auth.getProfile(req));

    router.post('/api/auth/login', async (req) => {
      try {
        const body = await req.json();
        const { token } = body;
        if (!verifySecret(token || null, env.ADMIN_TOKEN)) {
          return jsonResponse({ error: 'Invalid token' }, 401);
        }
        const response = jsonResponse({ success: true });
        response.headers.set('Set-Cookie', createAuthCookie(token));
        return response;
      } catch {
        return jsonResponse({ error: 'Invalid request' }, 400);
      }
    });

    router.post('/api/auth/logout', async () => {
      const response = jsonResponse({ success: true });
      response.headers.set('Set-Cookie', clearAuthCookie());
      return response;
    });

    router.get('/api/applications', (req) => apps.list(req));
    router.post('/api/applications', (req) => apps.create(req));
    router.get('/api/applications/:id', (req) => apps.get(req));
    router.put('/api/applications/:id', (req) => apps.update(req));
    router.delete('/api/applications/:id', (req) => apps.delete(req));
    router.put('/api/applications/:id/status', (req) => apps.updateStatus(req));

    router.get('/api/report', (req) => stats.getDailyReport(req));
    router.get('/api/report/weekly', (req) => stats.getWeeklyReport(req));

    router.post('/api/slack/notify', (req) => webhooks.notifySlack(req));
    router.post('/api/slack/interactions', (req) => webhooks.handleSlackInteraction(req));

    router.post('/api/automation/search', (req) => webhooks.triggerJobSearch(req));
    router.post('/api/automation/apply', (req) => webhooks.triggerAutoApply(req));
    router.post('/api/automation/report', (req) => webhooks.triggerDailyReport(req));
    router.post('/api/automation/resume', (req) => webhooks.triggerResumeSync(req));

    router.get('/api/auto-apply/status', (req) => autoApply.status(req));
    router.post('/api/auto-apply/run', (req) => autoApply.run(req));
    router.put('/api/auto-apply/config', (req) => autoApply.configure(req));

    // Profile sync endpoints
    router.post('/api/automation/profile-sync', (req) => webhooks.triggerProfileSync(req));
    router.get('/api/automation/profile-sync/:syncId', (req) => webhooks.getProfileSyncStatus(req));
    router.post('/api/automation/profile-sync/callback', (req) =>
      webhooks.updateProfileSyncStatus(req)
    );

    // Test endpoints for Chaos API integration
    router.get('/api/test/chaos-resumes', (req) => webhooks.testChaosResumes(req));

    router.get('/api/config', () => getConfig(env.DB));
    router.put('/api/config', (req) => saveConfig(req, env.DB));

    router.post('/api/cleanup', (req) => apps.cleanupExpired(req));

    router.post('/api/queue/enqueue', async (req) => {
      try {
        const body = await req.json();
        const { type, payload, priority, delaySeconds } = body;

        if (!type || !payload) {
          return jsonResponse({ error: 'Missing required fields: type, payload' }, 400);
        }

        const validTypes = Object.values(MESSAGE_TYPES);
        if (!validTypes.includes(type)) {
          return jsonResponse(
            { error: `Invalid type. Must be one of: ${validTypes.join(', ')}` },
            400
          );
        }

        await enqueueTask(
          env,
          { type, payload, priority: priority || PRIORITY.BACKGROUND },
          { delaySeconds: delaySeconds || 0 }
        );

        return jsonResponse({ success: true, type, priority: priority || PRIORITY.BACKGROUND });
      } catch (err) {
        log.error('Queue enqueue failed', { error: err.message });
        return jsonResponse({ error: 'Failed to enqueue task' }, 500);
      }
    });

    router.get('/api/queue/status', async () => {
      return jsonResponse({
        status: 'ok',
        queue: 'crawl-tasks',
        types: Object.values(MESSAGE_TYPES),
        priorities: Object.values(PRIORITY),
      });
    });

    router.post('/api/workflows/job-crawling', async (req) => {
      const body = await req.json().catch(() => ({}));
      const instance = await env.JOB_CRAWLING_WORKFLOW.create({ params: body });
      return jsonResponse({ instanceId: instance.id, status: 'started' });
    });

    router.post('/api/workflows/application', async (req) => {
      const body = await req.json().catch(() => ({}));
      const instance = await env.APPLICATION_WORKFLOW.create({ params: body });
      return jsonResponse({ instanceId: instance.id, status: 'started' });
    });

    router.post('/api/workflows/resume-sync', async (req) => {
      const body = await req.json().catch(() => ({}));
      const instance = await env.RESUME_SYNC_WORKFLOW.create({ params: body });
      return jsonResponse({ instanceId: instance.id, status: 'started' });
    });

    router.post('/api/workflows/daily-report', async (req) => {
      const body = await req.json().catch(() => ({}));
      const instance = await env.DAILY_REPORT_WORKFLOW.create({ params: body });
      return jsonResponse({ instanceId: instance.id, status: 'started' });
    });

    router.get('/api/workflows/:workflowType/:instanceId', async (req) => {
      const { workflowType, instanceId } = req.params;
      const workflowBindings = {
        'job-crawling': env.JOB_CRAWLING_WORKFLOW,
        application: env.APPLICATION_WORKFLOW,
        'resume-sync': env.RESUME_SYNC_WORKFLOW,
        'daily-report': env.DAILY_REPORT_WORKFLOW,
      };

      const workflow = workflowBindings[workflowType];
      if (!workflow) {
        return jsonResponse({ error: 'Unknown workflow type' }, 404);
      }

      const instance = await workflow.get(instanceId);
      const status = await instance.status();
      return jsonResponse({ instanceId, status: status.status, output: status.output });
    });

    router.post('/api/workflows/application/:instanceId/approve', async (req) => {
      const { instanceId } = req.params;
      await env.SESSIONS.put(
        `workflow:application:${instanceId}:approval`,
        JSON.stringify({ approved: true, at: new Date().toISOString() }),
        { expirationTtl: 86400 }
      );
      return jsonResponse({ success: true, approved: true });
    });

    router.post('/api/workflows/application/:instanceId/reject', async (req) => {
      const { instanceId } = req.params;
      await env.SESSIONS.put(
        `workflow:application:${instanceId}:approval`,
        JSON.stringify({ approved: false, at: new Date().toISOString() }),
        { expirationTtl: 86400 }
      );
      return jsonResponse({ success: true, approved: false });
    });

    try {
      const response = await router.handle(request, url, log);
      if (response) {
        const withCsrf = addCsrfCookie(response, request);
        return addRateLimitHeaders(addCorsHeaders(withCsrf, origin), rateResult.headers);
      }

      // Static fallback: serve dashboard for non-API routes
      if (!url.pathname.startsWith('/api/')) {
        const staticResponse = serveStatic(url.pathname);
        const withCsrf = addCsrfCookie(staticResponse, request);
        return addCorsHeaders(withCsrf, origin);
      }

      // API route not found
      return addCorsHeaders(jsonResponse({ error: 'Not found' }, 404), origin);
    } catch (err) {
      const error = normalizeError(err, { path: url.pathname, method: request.method });
      ctx.waitUntil(log.error('Unhandled worker error', error));

      if (error instanceof HttpError) {
        return addCorsHeaders(error.toResponse(), origin);
      }
      return addCorsHeaders(jsonResponse({ error: 'Internal server error' }, 500), origin);
    }
  },

  async scheduled(event, env, ctx) {
    const logger = Logger.create(env, { service: 'job-worker' });
    logger.info(`Cron triggered: ${event.cron}`, { trigger: 'cron', cron: event.cron });

    const isJobSearchCron = event.cron === '0 0 * * 1-5';
    const isDailyReportCron = event.cron === '0 9 * * *';

    try {
      if (isJobSearchCron) {
        const instance = await env.JOB_CRAWLING_WORKFLOW.create({
          params: {
            platforms: ['wanted', 'linkedin', 'remember'],
            dryRun: false,
          },
        });
        logger.info(`Job crawling workflow started: ${instance.id}`);
      } else if (isDailyReportCron) {
        const instance = await env.DAILY_REPORT_WORKFLOW.create({
          params: { type: 'daily' },
        });
        logger.info(`Daily report workflow started: ${instance.id}`);
      }
    } catch (err) {
      const error = normalizeError(err, { trigger: 'cron', cron: event.cron });
      ctx.waitUntil(logger.error('Cron execution failed', error));

      await sendSlackMessage(env, {
        text: `❌ Cron Error: ${event.cron}\n\`\`\`${error.message}\`\`\``,
      });
    }
  },

  async queue(batch, env, ctx) {
    const logger = Logger.create(env, { service: 'job-worker' });
    const consumer = new QueueConsumer(env, logger);
    await consumer.processBatch(batch, ctx);
  },
};
