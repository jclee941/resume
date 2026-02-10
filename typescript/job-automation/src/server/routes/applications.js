import { getApplicationService } from '../../shared/services/applications/application-service.js';

const appService = getApplicationService();

export default async function applicationsRoutes(fastify) {
  fastify.get('/', async (request) => {
    const result = appService.list(request.query);
    return {
      applications: result.applications,
      total: result.total,
      limit: result.limit,
      offset: result.offset,
    };
  });

  fastify.get('/:id', async (request, reply) => {
    const result = appService.get(request.params.id);
    if (!result.success) {
      return reply.status(result.statusCode).send({ error: result.error });
    }
    return result.application;
  });

  fastify.post('/', async (request, reply) => {
    const { job, options } = request.body || {};
    const result = appService.create(job, options);
    return reply.status(result.statusCode).send({
      success: result.success,
      id: result.application?.id,
      ...result.application,
    });
  });

  fastify.put('/:id', async (request, reply) => {
    const result = appService.update(request.params.id, request.body || {});
    if (!result.success) {
      return reply.status(result.statusCode).send({ error: result.error });
    }
    return { success: true, application: result.application };
  });

  fastify.put('/:id/status', async (request) => {
    const { status, note, notifyN8n } = request.body || {};
    const result = appService.updateStatus(request.params.id, status, note);

    if (result.success && notifyN8n !== false) {
      fastify
        .triggerN8nWebhook?.('status-change', {
          applicationId: request.params.id,
          newStatus: status,
          note,
          application: result.application,
        })
        .catch(() => {});
    }

    return result;
  });

  fastify.delete('/:id', async (request) => {
    return appService.delete(request.params.id);
  });
}
