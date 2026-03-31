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

  router.get('/api/health/notifications', async () => {
    const checks = await Promise.all([
      checkQueueHealth(env),
      checkRateLimiterHealth(env),
      checkTelegramAPI(env),
    ]);

    const health = {
      status: checks.every((c) => c.healthy) ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      checks: Object.fromEntries(checks.map((c) => [c.name, c])),
    };

    const statusCode = health.status === 'healthy' ? 200 : 503;
    return jsonResponse(health, statusCode);
  });
}

async function checkQueueHealth(env) {
  try {
    const queue = env.NOTIFICATION_QUEUE;
    return {
      name: 'queue',
      healthy: !!queue,
      message: queue ? 'Queue binding active' : 'Queue not configured',
    };
  } catch (error) {
    return { name: 'queue', healthy: false, message: error.message };
  }
}

async function checkRateLimiterHealth(env) {
  try {
    const kv = env.RATE_LIMIT_KV;
    return {
      name: 'rateLimiter',
      healthy: !!kv,
      message: kv ? 'KV store accessible' : 'KV not configured',
    };
  } catch (error) {
    return { name: 'rateLimiter', healthy: false, message: error.message };
  }
}

async function checkTelegramAPI(env) {
  try {
    const hasToken = !!env.TELEGRAM_BOT_TOKEN;
    const hasChatId = !!env.TELEGRAM_CHAT_ID;
    return {
      name: 'telegramAPI',
      healthy: hasToken && hasChatId,
      message: hasToken && hasChatId ? 'Credentials configured' : 'Missing configuration',
    };
  } catch (error) {
    return { name: 'telegramAPI', healthy: false, message: error.message };
  }
}
