import { jsonResponse } from '../middleware/cors.js';
import { getConfig, saveConfig } from '../services/config.js';
import { runBrowserSmoke, smokeCookiesFor } from '../handlers/browser/smoke.js';
import { refreshWantedSession } from '../handlers/wanted/mint-session.js';
import { refreshJobKoreaSession } from '../handlers/jobkorea/mint-session.js';
import { enqueueTask } from '../queues/queue-enqueuer.js';
import { getQueueCapability, parseQueueRequest, QUEUE_NAME } from '../queues/queue-request.js';

/**
 * @typedef {import('../router.js').RouteHandler} RouteHandler
 *
 * @typedef {Parameters<typeof runBrowserSmoke>[0]
 *   & Parameters<typeof smokeCookiesFor>[0]
 *   & Parameters<typeof refreshWantedSession>[0]
 *   & Parameters<typeof refreshJobKoreaSession>[0]
 *   & Parameters<typeof enqueueTask>[0]
 *   & NonNullable<Parameters<typeof getQueueCapability>[0]>
 *   & { JOB_DB: Parameters<typeof getConfig>[0] }} AdminEnv
 *
 * @typedef {{
 *   get(path: string, handler: RouteHandler): void;
 *   post(path: string, handler: RouteHandler): void;
 *   put(path: string, handler: RouteHandler): void;
 * }} AdminRouter
 *
 * @typedef {{
 *   env: AdminEnv;
 *   diagnostics: { checkBindings(req: Request): Promise<Response> | Response };
 *   log: { error(message: string, error: unknown): unknown };
 * }} AdminContext
 */

/**
 * @param {AdminRouter} router
 * @param {AdminContext} ctx
 */
export function registerAdminRoutes(router, ctx) {
  const { env, diagnostics, log } = ctx;

  router.get('/api/diagnostics/bindings', (req) => diagnostics.checkBindings(req));

  // CF-native: live validation harness for the Wave 2 Browser Rendering broker.
  // Optional ?url= lets an admin probe a real target (e.g. JobKorea/Wanted) to
  // observe live page state (content / login / captcha / blocked) before Wave 3.
  // ?session=jobkorea replays the stored KV session, only on that platform's host.
  router.get('/api/browser/smoke', async (req) => {
    const params = new URL(req.url).searchParams;
    const target = params.get('url');
    const session = params.get('session');
    /** @type {NonNullable<Parameters<typeof runBrowserSmoke>[1]>} */
    const opts = target ? { url: target } : {};
    if (params.get('screenshot') === '1') opts.screenshot = true;
    if (session) {
      const replay = await smokeCookiesFor(env, session, target || '');
      if (!replay.ok) return jsonResponse({ ok: false, error: replay.error }, replay.status);
      opts.cookies = replay.cookies;
    }
    const result = await runBrowserSmoke(env, opts);
    return jsonResponse(result, result.ok ? 200 : 502);
  });

  router.get('/api/config', () => getConfig(env.JOB_DB));
  router.put('/api/config', (req) => saveConfig(req, env.JOB_DB));

  router.post('/api/queue/enqueue', async (req) => {
    const parsed = await parseQueueRequest(req);
    if (!parsed.ok) {
      return jsonResponse({ error: parsed.error }, 400);
    }

    const capability = getQueueCapability(env);
    if (!capability.available) {
      return jsonResponse(
        { error: 'Queue unavailable', status: 'disabled', available: false, queue: QUEUE_NAME },
        503
      );
    }

    try {
      const { type, payload, priority, delaySeconds } = parsed.value;
      await enqueueTask(env, { type, payload, priority }, { delaySeconds });

      return jsonResponse(
        {
          success: true,
          status: 'accepted',
          queue: QUEUE_NAME,
          type,
          priority,
          delaySeconds,
        },
        202
      );
    } catch (err) {
      log.error('Queue enqueue failed', {
        error: err instanceof Error ? err.message : String(err),
      });
      return jsonResponse({ error: 'Failed to enqueue task' }, 500);
    }
  });

  router.get('/api/queue/status', async () => {
    const capability = getQueueCapability(env);
    return jsonResponse(capability, capability.available ? 200 : 503);
  });

  // Mint a fresh Wanted OneID session cookie and store it in KV as
  // `auth:wanted` (Wave 1 root-unblocker for the Wanted sync/crawl paths).
  router.post('/api/wanted/refresh-session', async () => {
    const r = await refreshWantedSession(env);
    return jsonResponse(r, r.ok ? 200 : 502);
  });

  // Mint a fresh JobKorea session cookie (email/password login through Browser
  // Rendering) and store it in KV as `auth:jobkorea` (Wave 3 port of
  // apps/job-server/scripts/jobkorea-session); a CAPTCHA challenge fails the mint.
  router.post('/api/jobkorea/refresh-session', async () => {
    const r = await refreshJobKoreaSession(env);
    return jsonResponse(r, r.ok ? 200 : 502);
  });
}
