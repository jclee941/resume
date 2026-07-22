import { jsonResponse } from '../middleware/cors.js';
import { getConfig, saveConfig } from '../services/config.js';
import { runBrowserSmoke } from '../handlers/browser/smoke.js';
import { refreshWantedSession } from '../handlers/wanted/mint-session.js';
import { enqueueTask } from '../queues/queue-enqueuer.js';
import {
  getQueueCapability,
  parseQueueRequest,
  QUEUE_NAME,
} from '../queues/queue-request.js';

export function registerAdminRoutes(router, ctx) {
  const { env, diagnostics, log } = ctx;

  router.get('/api/diagnostics/bindings', (req) => diagnostics.checkBindings(req));

  // CF-native: live validation harness for the Wave 2 Browser Rendering broker.
  // Optional ?url= lets an admin probe a real target (e.g. JobKorea/Wanted) to
  // observe live page state (content / login / captcha / blocked) before Wave 3.
  router.get('/api/browser/smoke', async (req) => {
    const target = new URL(req.url).searchParams.get('url');
    const result = await runBrowserSmoke(env, target ? { url: target } : {});
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
      log.error('Queue enqueue failed', { error: err.message });
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
}
