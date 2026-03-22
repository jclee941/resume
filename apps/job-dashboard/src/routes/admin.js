import { jsonResponse } from '../middleware/cors.js';
import { getConfig, saveConfig } from '../services/config.js';
import { enqueueTask, MESSAGE_TYPES, PRIORITY } from '../queue-consumer.js';

export function registerAdminRoutes(router, ctx) {
  const { env, diagnostics, log } = ctx;

  router.get('/api/diagnostics/bindings', (req) => diagnostics.checkBindings(req));

  router.get('/api/config', () => getConfig(env.DB));
  router.put('/api/config', (req) => saveConfig(req, env.DB));

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
}
