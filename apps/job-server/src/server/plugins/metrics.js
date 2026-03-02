import fp from 'fastify-plugin';
import client from 'prom-client';

async function metricsPlugin(fastify) {
  const register = new client.Registry();

  client.collectDefaultMetrics({ register });

  const httpRequestDuration = new client.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
    registers: [register],
  });

  const httpRequestTotal = new client.Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code'],
    registers: [register],
  });

  const activeConnections = new client.Gauge({
    name: 'http_active_connections',
    help: 'Number of active HTTP connections',
    registers: [register],
  });

  const applicationCount = new client.Gauge({
    name: 'job_applications_total',
    help: 'Total number of job applications',
    labelNames: ['status'],
    registers: [register],
  });

  fastify.decorate('metrics', {
    register,
    httpRequestDuration,
    httpRequestTotal,
    activeConnections,
    applicationCount,
  });

  fastify.addHook('onRequest', async () => {
    activeConnections.inc();
  });

  fastify.addHook('onResponse', async (request, reply) => {
    activeConnections.dec();

    const route = request.routeOptions?.url || request.url.split('?')[0];
    const labels = {
      method: request.method,
      route,
      status_code: reply.statusCode,
    };

    httpRequestTotal.inc(labels);
    httpRequestDuration.observe(labels, reply.elapsedTime / 1000);
  });

  fastify.get('/metrics', {
    config: { public: true },
    schema: {
      hide: true,
      response: {
        200: { type: 'string' },
      },
    },
    handler: async (_request, reply) => {
      if (fastify.appManager) {
        const stats = fastify.appManager.getStats?.() || {};
        const statusCounts = stats.byStatus || {};
        for (const [status, count] of Object.entries(statusCounts)) {
          applicationCount.set({ status }, count);
        }
      }

      reply.header('Content-Type', register.contentType);
      return register.metrics();
    },
  });
}

export default fp(metricsPlugin, { name: 'metrics' });
