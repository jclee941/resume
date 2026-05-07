'use strict';

/**
 * Generate health check route.
 * Lines 669-712 of original template.
 * @param {Object} opts
 * @param {string} opts.version - Build-time VERSION
 * @param {string} opts.deployedAt - Build-time deployedAt
 */
function generateHealthRoute(opts) {
  return `
      if (url.pathname === '/health') {
        const uptime = Math.floor((Date.now() - metrics.worker_start_time) / 1000);

        const bindings = { d1: { healthy: false }, kv: { healthy: false } };
        try {
          const d1Start = Date.now();
          await env.DB.prepare('SELECT 1 AS ok').first();
          bindings.d1 = { healthy: true, latency_ms: Date.now() - d1Start };
        } catch (e) {
          bindings.d1 = { healthy: false, error: e.message };
        }
        try {
          const kvStart = Date.now();
          await env.SESSIONS.put('_health_check', Date.now().toString());
          await env.SESSIONS.get('_health_check');
          bindings.kv = { healthy: true, latency_ms: Date.now() - kvStart };
        } catch (e) {
          bindings.kv = { healthy: false, error: e.message };
        }

        const allHealthy = bindings.d1.healthy && bindings.kv.healthy;
        const health = {
          status: allHealthy ? 'healthy' : 'degraded',
          version: '${opts.version}',
          deployed_at: '${opts.deployedAt}',
          uptime_seconds: uptime,
          bindings,
          metrics: {
            requests_total: metrics.requests_total,
            requests_success: metrics.requests_success,
            requests_error: metrics.requests_error,
            vitals_received: metrics.vitals_received
          }
        };

        metrics.requests_success++;
        return new Response(JSON.stringify(health, null, 2), {
          headers: {
            ...applyNonceToHeaders(SECURITY_HEADERS, ""),
            ...rateLimitHeaders,
            'Content-Type': 'application/json',
            ...CACHE_POLICIES.api
          }
        });
      }`;
}

module.exports = { generateHealthRoute };
