import { D1Client } from '../../shared/clients/d1/index.js';

const d1Client = new D1Client();

/**
 * @param {import('fastify').FastifyInstance} fastify
 */
export default async function d1Routes(fastify) {
  fastify.get('/stats', async () => {
    const stats = await d1Client.getStats();
    return { success: true, ...stats };
  });

  fastify.get(
    '/applications',
    /**
     * @param {import('fastify').FastifyRequest<{ Querystring: { status?: string; platform?: string; limit?: string } }>} request
     */
    async (request) => {
      const { status, platform, limit = 100 } = request.query;
      const applications = await d1Client.getApplications({
        status,
        platform,
        limit: parseInt(String(limit)),
      });
      return { success: true, applications };
    }
  );

  fastify.post(
    '/applications',
    /**
     * @param {import('fastify').FastifyRequest<{ Body: import('../../shared/clients/d1/index.js').D1ApplicationInput }>} request
     * @param {import('fastify').FastifyReply} reply
     */
    async (request, reply) => {
      const result = await d1Client.addApplication(request.body);
      return reply.status(201).send(result);
    }
  );

  fastify.put(
    '/applications/:id/status',
    /**
     * @param {import('fastify').FastifyRequest<{ Params: { id: string }; Body: { status: string } }>} request
     */
    async (request) => {
      const { id } = request.params;
      const { status } = request.body;
      const result = await d1Client.updateStatus(id, status);
      return result;
    }
  );

  fastify.get('/automation-runs', async () => {
    const runs = await d1Client.getAutomationRuns();
    return { success: true, runs };
  });
}
