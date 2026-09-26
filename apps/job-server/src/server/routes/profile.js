/**
 * @typedef {{
 *   fetchUnifiedProfile(): Promise<unknown>;
 * }} ProfileAggregator
 *
 * @typedef {{
 *   getStatus(): unknown;
 *   save(platform: string, session: Record<string, unknown>): void;
 *   clear(platform: string): void;
 * }} SessionStore
 *
 * @typedef {import('fastify').FastifyInstance & {
 *   profileAggregator: ProfileAggregator;
 *   sessionStore: SessionStore;
 * }} ProfileFastifyInstance
 *
 * @typedef {{
 *   platform?: string;
 *   cookies?: string | Array<{ name: string; value: string }>;
 *   email?: string;
 * }} AuthSetBody
 */

/**
 * @param {ProfileFastifyInstance} fastify
 */
export default async function profileRoutes(fastify) {
  const { profileAggregator, sessionStore } = fastify;

  fastify.get(
    '/profile/unified',
    /**
     * @param {import('fastify').FastifyRequest} _request
     * @param {import('fastify').FastifyReply} _reply
     */
    async (_request, _reply) => {
      const profile = await profileAggregator.fetchUnifiedProfile();
      return { success: true, profile };
    }
  );

  fastify.get(
    '/auth/status',
    /**
     * @param {import('fastify').FastifyRequest} _request
     * @param {import('fastify').FastifyReply} _reply
     */
    async (_request, _reply) => {
      const status = sessionStore.getStatus();
      return { success: true, status };
    }
  );

  fastify.post(
    '/auth/set',
    /**
     * @param {import('fastify').FastifyRequest<{ Body: AuthSetBody }>} request
     * @param {import('fastify').FastifyReply} reply
     */
    async (request, reply) => {
      const { platform, cookies, email } = request.body;

      if (!platform || !cookies) {
        return reply.code(400).send({ error: 'Platform and cookies required' });
      }

      const cookieString =
        typeof cookies === 'string'
          ? cookies
          : Array.isArray(cookies)
            ? cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join('; ')
            : String(cookies);
      const cookieCount = Array.isArray(cookies)
        ? cookies.length
        : cookieString.split(';').filter(Boolean).length;

      sessionStore.save(platform, {
        cookies,
        cookieString,
        cookieCount,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        email,
      });
      return { success: true, message: `Auth saved for ${platform}` };
    }
  );

  fastify.delete(
    '/auth/:platform',
    /**
     * @param {import('fastify').FastifyRequest<{ Params: { platform: string } }>} request
     * @param {import('fastify').FastifyReply} _reply
     */
    async (request, _reply) => {
      const { platform } = request.params;
      sessionStore.clear(platform);
      return { success: true, message: `Logged out from ${platform}` };
    }
  );
}
