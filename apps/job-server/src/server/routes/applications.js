/**
 * @typedef {{
 *   list(query: unknown): { applications: unknown[]; total: number; limit?: number; offset?: number };
 *   get(id: string): { success: boolean; statusCode: number; error?: string; application?: unknown };
 *   create(job: unknown, options?: unknown): { success: boolean; statusCode: number; application?: { id?: string; [key: string]: unknown } };
 *   update(id: string, body: unknown): { success: boolean; statusCode: number; error?: string; application?: unknown };
 *   updateStatus(id: string, status?: string, note?: string): { success: boolean; application?: unknown; [key: string]: unknown };
 *   delete(id: string): unknown;
 * }} ApplicationService
 */

/**
 * @typedef {import('fastify').FastifyInstance & {
 *   applicationService: ApplicationService;
 *   triggerAutomationWebhook?: (event: string, payload: unknown) => Promise<unknown>;
 *   log: { error: (msg: string, ...args: unknown[]) => void; [key: string]: unknown };
 * }} ApplicationsFastifyInstance
 */

/**
 * @param {ApplicationsFastifyInstance} fastify
 */
export default async function applicationsRoutes(fastify) {
  fastify.get(
    '/',
    /** @param {import('fastify').FastifyRequest} request */
    async (request) => {
      const result = fastify.applicationService.list(request.query);
      return {
        applications: result.applications,
        total: result.total,
        limit: result.limit,
        offset: result.offset,
      };
    }
  );

  fastify.get(
    '/:id',
    /**
     * @param {import('fastify').FastifyRequest<{ Params: { id: string } }>} request
     * @param {import('fastify').FastifyReply} reply
     */
    async (request, reply) => {
      const result = fastify.applicationService.get(request.params.id);
      if (!result.success) {
        return reply.status(result.statusCode).send({ error: result.error });
      }
      return result.application;
    }
  );

  fastify.post(
    '/',
    /**
     * @param {import('fastify').FastifyRequest<{ Body: { job?: unknown; options?: unknown } }>} request
     * @param {import('fastify').FastifyReply} reply
     */
    async (request, reply) => {
      const { job, options } = request.body || {};
      const result = fastify.applicationService.create(job, options);
      return reply.status(result.statusCode).send({
        success: result.success,
        id: result.application?.id,
        ...result.application,
      });
    }
  );

  fastify.put(
    '/:id',
    /**
     * @param {import('fastify').FastifyRequest<{ Params: { id: string }, Body: unknown }>} request
     * @param {import('fastify').FastifyReply} reply
     */
    async (request, reply) => {
      const result = fastify.applicationService.update(request.params.id, request.body || {});
      if (!result.success) {
        return reply.status(result.statusCode).send({ error: result.error });
      }
      return { success: true, application: result.application };
    }
  );

  fastify.put(
    '/:id/status',
    /**
     * @param {import('fastify').FastifyRequest<{ Params: { id: string }, Body: { status?: string; note?: string; notifyAutomation?: boolean } }>} request
     */
    async (request) => {
      const { status, note, notifyAutomation } = request.body || {};
      const result = fastify.applicationService.updateStatus(request.params.id, status, note);

      if (result.success && notifyAutomation !== false) {
        fastify
          .triggerAutomationWebhook?.('status-change', {
            applicationId: request.params.id,
            newStatus: status,
            note,
            application: result.application,
          })
          .catch(
            /** @param {unknown} e */
            (e) => {
              fastify.log.error('Failed to trigger automation webhook:', e);
            }
          );
      }

      return result;
    }
  );

  fastify.delete(
    '/:id',
    /**
     * @param {import('fastify').FastifyRequest<{ Params: { id: string } }>} request
     */
    async (request) => {
      return fastify.applicationService.delete(request.params.id);
    }
  );
}
