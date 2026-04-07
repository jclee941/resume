import SessionBrokerService, {
  SUPPORTED_SESSION_BROKER_PLATFORMS,
} from '../services/session-broker-service.js';

const platformParamsSchema = {
  type: 'object',
  required: ['platform'],
  properties: {
    platform: {
      type: 'string',
      enum: SUPPORTED_SESSION_BROKER_PLATFORMS,
    },
  },
};

const validateBodySchema = {
  type: 'object',
  required: ['encryptedSession'],
  additionalProperties: false,
  properties: {
    encryptedSession: { type: 'string', minLength: 1 },
  },
};

function getSessionBrokerService(fastify) {
  return fastify.sessionBrokerService ?? new SessionBrokerService();
}

export default async function sessionBrokerRoutes(fastify) {
  const sessionBrokerService = getSessionBrokerService(fastify);

  fastify.get('/:platform/status', {
    schema: { params: platformParamsSchema },
    handler: async (request) => {
      return sessionBrokerService.getSessionStatus(request.params.platform);
    },
  });

  fastify.post('/:platform/renew', {
    schema: { params: platformParamsSchema },
    handler: async (request, reply) => {
      const result = await sessionBrokerService.renewSession(request.params.platform);
      if (!result.success) {
        return reply.status(400).send(result);
      }
      return result;
    },
  });

  fastify.post('/:platform/validate', {
    schema: {
      params: platformParamsSchema,
      body: validateBodySchema,
    },
    handler: async (request) => {
      return sessionBrokerService.validateEncryptedSession(
        request.params.platform,
        request.body.encryptedSession
      );
    },
  });

  fastify.get('/health', async () => {
    return sessionBrokerService.getHealth();
  });
}
