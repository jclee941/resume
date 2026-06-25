export default async function applicationsRoutes(fastify) {
  fastify.get('/', async (request) => {
    const result = fastify.applicationService.list(request.query);
    return {
      applications: result.applications,
      total: result.total,
      limit: result.limit,
      offset: result.offset,
    };
  });

  fastify.get('/:id', async (request, reply) => {
    const result = fastify.applicationService.get(request.params.id);
    if (!result.success) {
      return reply.status(result.statusCode).send({ error: result.error });
    }
    return result.application;
  });

  fastify.post('/', async (request, reply) => {
    const { job, options } = request.body || {};
    const result = fastify.applicationService.create(job, options);
    return reply.status(result.statusCode).send({
      success: result.success,
      id: result.application?.id,
      ...result.application,
    });
  });

  fastify.put('/:id', async (request, reply) => {
    const result = fastify.applicationService.update(request.params.id, request.body || {});
    if (!result.success) {
      return reply.status(result.statusCode).send({ error: result.error });
    }
    return { success: true, application: result.application };
  });

  fastify.put('/:id/status', async (request) => {
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
        .catch((e) => {
          fastify.log.error('Failed to trigger automation webhook:', e);
        });
    }

    return result;
  });

  fastify.delete('/:id', async (request) => {
    return fastify.applicationService.delete(request.params.id);
  });
}
