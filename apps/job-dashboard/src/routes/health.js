import { jsonResponse } from '../middleware/cors.js';

/**
 * @typedef {{
 *   prepare(query: string): {
 *     first(): Promise<{ count?: number } | null>;
 *   };
 * }} HealthDb
 *
 * @typedef {{
 *   JOB_DB?: HealthDb;
 *   NOTIFICATION_QUEUE?: unknown;
 *   RATE_LIMIT_KV?: unknown;
 *   TELEGRAM_BOT_TOKEN?: string;
 *   TELEGRAM_CHAT_ID?: string;
 *   [key: string]: unknown;
 * }} HealthEnv
 *
 * @typedef {{
 *   get(path: string, handler: (req: Request) => Promise<Response> | Response): void;
 * }} HealthRouter
 *
 * @typedef {{
 *   env: HealthEnv;
 * }} HealthContext
 */

/**
 * @param {HealthRouter} router
 * @param {HealthContext} ctx
 */
export function registerHealthRoutes(router, ctx) {
  const { env } = ctx;

  router.get('/health', async () => {
    /** @type {{ status: string; timestamp: string; version: string; database?: string }} */
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '2.0.0',
    };
    try {
      if (env.JOB_DB) {
        await env.JOB_DB.prepare('SELECT 1').first();
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
    /** @type {{ status: string; timestamp: string; version: string; database?: string }} */
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '2.0.0',
    };
    try {
      if (env.JOB_DB) {
        await env.JOB_DB.prepare('SELECT 1').first();
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
    /** @type {{ status: string; timestamp: string; version: string; applications?: number | string }} */
    const status = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '2.0.0',
    };
    if (env.JOB_DB) {
      try {
        const result = await env.JOB_DB.prepare(
          'SELECT COUNT(*) as count FROM applications'
        ).first();
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

/**
 * @param {HealthEnv} env
 * @returns {Promise<{ name: string; healthy: boolean; message: string }>}
 */
async function checkQueueHealth(env) {
  try {
    const queue = env.NOTIFICATION_QUEUE;
    return {
      name: 'queue',
      healthy: !!queue,
      message: queue ? 'Queue binding active' : 'Queue not configured',
    };
  } catch (error) {
    return {
      name: 'queue',
      healthy: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * @param {HealthEnv} env
 * @returns {Promise<{ name: string; healthy: boolean; message: string }>}
 */
async function checkRateLimiterHealth(env) {
  try {
    const kv = env.RATE_LIMIT_KV;
    return {
      name: 'rateLimiter',
      healthy: !!kv,
      message: kv ? 'KV store accessible' : 'KV not configured',
    };
  } catch (error) {
    return {
      name: 'rateLimiter',
      healthy: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * @param {HealthEnv} env
 * @returns {Promise<{ name: string; healthy: boolean; message: string }>}
 */
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
    return {
      name: 'telegramAPI',
      healthy: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}
