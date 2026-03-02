import { SessionManager } from '../../shared/services/session/index.js';

export default async function profileRoutes(fastify) {
  const { profileAggregator } = fastify;

  fastify.get('/profile/unified', async (_request, _reply) => {
    const profile = await profileAggregator.fetchUnifiedProfile();
    return { success: true, profile };
  });

  fastify.get('/auth/status', async (_request, _reply) => {
    const status = SessionManager.getStatus();
    return { success: true, status };
  });

  fastify.post('/auth/set', async (request, reply) => {
    const { platform, cookies, email } = request.body;

    if (!platform || !cookies) {
      return reply.code(400).send({ error: 'Platform and cookies required' });
    }

    SessionManager.save(platform, { cookies, email });
    return { success: true, message: `Auth saved for ${platform}` };
  });

  fastify.delete('/auth/:platform', async (request, _reply) => {
    const { platform } = request.params;
    SessionManager.clear(platform);
    return { success: true, message: `Logged out from ${platform}` };
  });
}
