import config from '../config/index.js';

export default async function dashboardRoutes(fastify) {
  // Cloudflare Analytics
  fastify.get('/cf/stats', async (request, reply) => {
    // Only logged in users (or admin session)
    const sessionId = request.cookies?.session_id;
    if (!sessionId || !fastify.sessions.has(sessionId)) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const { accountId: _accountId, apiKey: _apiKey } = config.cloudflare;
    // ... Implement CF logic here or import from lib
    // For now, returning mock/empty or implementing the graphql call
    return { stats: [] };
  });

  // System Status
  fastify.get('/status', async () => {
    return {
      aiStatus: 'operational',
      crawlerStatus: 'operational',
      dbStatus: 'connected',
      automationStatus: 'idle',
      timestamp: new Date().toISOString(),
    };
  });

  // Web Vitals Receiver
  fastify.post('/vitals', async (request, _reply) => {
    const vitals = request.body;
    // Log to Loki or store
    request.log.info({ vitals }, 'Web Vitals received');
    return { status: 'ok' };
  });

  // Unified Profile (aggregated from all platforms)
  fastify.get('/profile/unified', async (request, reply) => {
    const profileAggregator = fastify.profileAggregator;

    if (!profileAggregator) {
      return reply.status(503).send({
        success: false,
        error: 'Profile aggregator not available',
      });
    }

    try {
      const profile = await profileAggregator.fetchUnifiedProfile();
      return { success: true, profile };
    } catch (err) {
      request.log.error(err, 'Failed to fetch unified profile');
      return reply.status(500).send({ success: false, error: err.message });
    }
  });
}
