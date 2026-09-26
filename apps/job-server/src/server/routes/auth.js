import config from '../config/index.js';

/**
 * @typedef {{
 *   verifyGoogleCredential(credential?: string): Promise<{ success: boolean; statusCode: number; error?: string; sessionId?: string; email?: string; csrfToken?: string }>;
 *   getSessionTTLSeconds(): number;
 *   getAuthStatus(): unknown;
 *   savePlatformAuth(platform?: string, cookies?: unknown, email?: string): { success: boolean; statusCode: number; error?: string };
 *   clearPlatformAuth(platform: string): unknown;
 *   logout(sessionId?: string): unknown;
 *   renewSession(platform: string): Promise<{ success: boolean; error?: string; expiresAt?: string }>;
 * }} AuthService
 */

/**
 * @typedef {import('fastify').FastifyInstance & {
 *   authService: AuthService;
 * }} AuthFastifyInstance
 */

/**
 * @typedef {import('fastify').FastifyReply & {
 *   setCookie(name: string, value?: string, options?: unknown): CookieReply;
 *   clearCookie(name: string, options?: unknown): CookieReply;
 * }} CookieReply
 */

/**
 * @typedef {import('fastify').FastifyRequest & {
 *   cookies?: Record<string, string | undefined>;
 * }} CookieRequest
 */

/**
 * @param {AuthFastifyInstance} fastify
 */
export default async function authRoutes(fastify) {
  const authService = fastify.authService;

  fastify.post('/google', {
    config: { public: true },
    /**
     * @param {import('fastify').FastifyRequest<{ Body: { credential?: string } }>} request
     * @param {import('fastify').FastifyReply} reply
     */
    handler: async (request, reply) => {
      const { credential } = request.body || {};
      const result = await authService.verifyGoogleCredential(credential);

      if (!result.success) {
        return reply.status(result.statusCode).send({ error: result.error });
      }

      /** @type {CookieReply} */ (reply).setCookie('session_id', result.sessionId, {
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

  fastify.post(
    '/set',
    /**
     * @param {import('fastify').FastifyRequest<{ Body: { platform?: string; cookies?: unknown; email?: string } }>} request
     * @param {import('fastify').FastifyReply} reply
     */
    async (request, reply) => {
      const { platform, cookies, email } = request.body || {};
      const result = authService.savePlatformAuth(platform, cookies, email);

      if (!result.success) {
        return reply.status(result.statusCode).send({ error: result.error });
      }
      return result;
    }
  );

  fastify.delete(
    '/:platform',
    /**
     * @param {import('fastify').FastifyRequest<{ Params: { platform: string } }>} request
     */
    async (request) => {
      return authService.clearPlatformAuth(request.params.platform);
    }
  );

  fastify.post(
    '/logout',
    /**
     * @param {import('fastify').FastifyRequest} request
     * @param {import('fastify').FastifyReply} reply
     */
    async (request, reply) => {
      const sessionId = /** @type {CookieRequest} */ (request).cookies?.session_id;
      const result = authService.logout(sessionId);
      /** @type {CookieReply} */ (reply).clearCookie('session_id', { path: '/' });
      return result;
    }
  );

  // Session renewal endpoint for automation
  fastify.post('/renew', {
    config: { public: false },
    /**
     * @param {import('fastify').FastifyRequest<{ Body: { platform?: string } }>} request
     * @param {import('fastify').FastifyReply} reply
     */
    handler: async (request, reply) => {
      const { platform = 'wanted' } = request.body || {};

      try {
        const result = await authService.renewSession(platform);

        if (!result.success) {
          return reply.status(400).send({
            success: false,
            error: result.error,
            message: 'Session renewal failed. Manual login required.',
          });
        }

        return {
          success: true,
          platform,
          message: 'Session renewed successfully',
          expiresAt: result.expiresAt,
        };
      } catch (error) {
        return reply.status(500).send({
          success: false,
          error: error instanceof Error ? error.message : String(error),
          message: 'Session renewal error',
        });
      }
    },
  });
}
