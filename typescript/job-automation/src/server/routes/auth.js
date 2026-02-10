import { getAuthService } from '../../shared/services/auth/auth-service.js';
import config from '../config/index.js';

export default async function authRoutes(fastify) {
  const authService = getAuthService(
    {
      googleClientId: config.googleClientId,
      adminEmail: config.adminEmail,
      sessionTTL: config.sessionTTL,
    },
    {
      sessions: fastify.sessions,
      csrfTokens: fastify.csrfTokens,
    }
  );

  fastify.post('/google', {
    config: { public: true },
    handler: async (request, reply) => {
      const { credential } = request.body || {};
      const result = await authService.verifyGoogleCredential(credential);

      if (!result.success) {
        return reply.status(result.statusCode).send({ error: result.error });
      }

      reply.setCookie('session_id', result.sessionId, {
        httpOnly: true,
        secure: config.nodeEnv === 'production',
        sameSite: 'strict',
        maxAge: authService.getSessionTTLSeconds(),
        path: '/',
      });

      return {
        success: true,
        email: result.email,
        csrfToken: result.csrfToken,
      };
    },
  });

  fastify.get('/status', async () => {
    return authService.getAuthStatus();
  });

  fastify.post('/set', async (request, reply) => {
    const { platform, cookies, email } = request.body || {};
    const result = authService.savePlatformAuth(platform, cookies, email);

    if (!result.success) {
      return reply.status(result.statusCode).send({ error: result.error });
    }
    return result;
  });

  fastify.delete('/:platform', async (request) => {
    return authService.clearPlatformAuth(request.params.platform);
  });

  fastify.post('/logout', async (request, reply) => {
    const sessionId = request.cookies?.session_id;
    const result = authService.logout(sessionId);
    reply.clearCookie('session_id', { path: '/' });
    return result;
  });
}
