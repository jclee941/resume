import { jsonResponse } from '../middleware/cors.js';

export function registerHealthRoutes(router, ctx) {
  const { env } = ctx;

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
}
