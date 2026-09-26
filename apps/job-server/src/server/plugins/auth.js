import fp from 'fastify-plugin';
import { randomBytes } from 'crypto';
import config from '../config/index.js';
import { createAuthMiddleware } from '../../shared/contracts/auth.js';

/**
 * @typedef {{
 *   email: string;
 *   createdAt: number;
 *   expiresAt: number;
 * }} Session
 */

/**
 * @typedef {{
 *   token: string;
 *   createdAt: number;
 * }} CsrfToken
 */

/**
 * @typedef {import('fastify').FastifyRequest & {
 *   authMethod?: string;
 *   cookies?: Record<string, string | undefined>;
 * }} AuthRequest
 */

// Issue #16: closure-bound holders eliminate top-level mutable Map bindings.
// fastify.decorate exposes the holder.get() Map which retains live reference,
// so existing route handlers continue to work unchanged.
const _sessionsHolder = (() => {
  /** @type {Map<string, Session>} */
  let m = new Map();
  return {
    get: () => m,
    clear: () => {
      m = new Map();
    },
  };
})();
const _csrfTokensHolder = (() => {
  /** @type {Map<string, CsrfToken>} */
  let m = new Map();
  return {
    get: () => m,
    clear: () => {
      m = new Map();
    },
  };
})();
const sessions = _sessionsHolder.get();
const csrfTokens = _csrfTokensHolder.get();

const PUBLIC_PATHS = ['/api/health', '/api/status', '/api/auth/google'];
const CSRF_EXEMPT_PATHS = ['/api/auth/google'];
const STATE_CHANGING_METHODS = ['POST', 'PUT', 'DELETE', 'PATCH'];

/**
 * @typedef {import('fastify').FastifyInstance & {
 *   isAuthenticated(request: AuthRequest): boolean;
 *   verifyCsrfToken(request: AuthRequest): boolean;
 * }} AuthFastifyInstance
 */

/**
 * @param {import('fastify').FastifyInstance} fastify
 */
async function authPlugin(fastify) {
  const verifyBearer = createAuthMiddleware({
    ADMIN_TOKEN:
      /** @type {typeof config & { adminToken?: string }} */ (config).adminToken ||
      process.env.ADMIN_TOKEN,
  });

  fastify.decorate('sessions', sessions);
  fastify.decorate('csrfTokens', csrfTokens);

  fastify.decorate(
    'createSession',
    /**
     * @param {string} email
     * @returns {string}
     */
    (email) => {
      const sessionId = randomBytes(32).toString('hex');
      sessions.set(sessionId, {
        email,
        createdAt: Date.now(),
        expiresAt: Date.now() + config.sessionTTL,
      });
      return sessionId;
    }
  );

  fastify.decorate(
    'generateCsrfToken',
    /**
     * @param {string} sessionId
     * @returns {string}
     */
    (sessionId) => {
      const token = randomBytes(32).toString('hex');
      csrfTokens.set(sessionId, { token, createdAt: Date.now() });
      return token;
    }
  );

  fastify.decorate(
    'isAuthenticated',
    /**
     * @param {AuthRequest} request
     * @returns {boolean}
     */
    (request) => {
      // 1. Check Bearer Token (Stateless)
      const bearerAuth = verifyBearer(request);
      if (bearerAuth.authenticated) {
        request.authMethod = 'bearer';
        return true;
      }

      // 2. Check Cookie Session (Stateful)
      const sessionId = request.cookies?.session_id;
      if (!sessionId) return false;

      const session = sessions.get(sessionId);
      if (!session) return false;

      if (Date.now() > session.expiresAt) {
        sessions.delete(sessionId);
        csrfTokens.delete(sessionId);
        return false;
      }

      if (session.email === config.adminEmail) {
        request.authMethod = 'cookie';
        return true;
      }
      return false;
    }
  );

  fastify.decorate(
    'getCurrentUser',
    /**
     * @param {AuthRequest} request
     * @returns {Session | null}
     */
    (request) => {
      const sessionId = request.cookies?.session_id;
      if (!sessionId) return null;
      return sessions.get(sessionId) || null;
    }
  );

  fastify.decorate(
    'verifyCsrfToken',
    /**
     * @param {AuthRequest} request
     * @returns {boolean}
     */
    (request) => {
      const sessionId = request.cookies?.session_id;
      if (!sessionId) return false;

      const stored = csrfTokens.get(sessionId);
      if (!stored) return false;

      return stored.token === request.headers['x-csrf-token'];
    }
  );

  fastify.addHook(
    'preHandler',
    /**
     * @param {AuthRequest} request
     * @param {import('fastify').FastifyReply} reply
     */
    async (request, reply) => {
      const path = request.url.split('?')[0];
      const method = request.method;

      if (PUBLIC_PATHS.some((p) => path === p || path.startsWith(`${p}/`))) return;
      if (!path.startsWith('/api/')) return;

      if (!(/** @type {AuthFastifyInstance} */ (fastify).isAuthenticated(request))) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      // Skip CSRF check for Bearer auth
      if (request.authMethod === 'bearer') return;

      const isCsrfExempt = CSRF_EXEMPT_PATHS.some((p) => path === p || path.startsWith(`${p}/`));
      if (
        STATE_CHANGING_METHODS.includes(method) &&
        !isCsrfExempt &&
        !(/** @type {AuthFastifyInstance} */ (fastify).verifyCsrfToken(request))
      ) {
        return reply.status(403).send({ error: 'Invalid CSRF token' });
      }
    }
  );
}

export default fp(authPlugin, { name: 'auth' });
