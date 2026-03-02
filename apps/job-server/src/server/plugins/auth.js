import fp from 'fastify-plugin';
import { randomBytes, createHmac, timingSafeEqual } from 'crypto';
import config from '../config/index.js';
import { createAuthMiddleware } from '../../shared/contracts/auth.js';

const sessions = new Map();
const csrfTokens = new Map();

const PUBLIC_PATHS = [
  '/api/health',
  '/api/status',
  '/api/auth/google',
  '/api/slack/interactions',
];
const CSRF_EXEMPT_PATHS = ['/api/auth/google', '/api/slack/interactions'];
const STATE_CHANGING_METHODS = ['POST', 'PUT', 'DELETE', 'PATCH'];

async function authPlugin(fastify) {
  const verifyBearer = createAuthMiddleware({
    ADMIN_TOKEN: config.adminToken || process.env.ADMIN_TOKEN,
  });

  fastify.decorate('sessions', sessions);
  fastify.decorate('csrfTokens', csrfTokens);

  fastify.decorate('createSession', (email) => {
    const sessionId = randomBytes(32).toString('hex');
    sessions.set(sessionId, {
      email,
      createdAt: Date.now(),
      expiresAt: Date.now() + config.sessionTTL,
    });
    return sessionId;
  });

  fastify.decorate('generateCsrfToken', (sessionId) => {
    const token = randomBytes(32).toString('hex');
    csrfTokens.set(sessionId, { token, createdAt: Date.now() });
    return token;
  });

  // HMAC-SHA256 signature verification for Slack webhook security
  fastify.decorate('verifySlackSignature', (timestamp, body, signature) => {
    if (!config.slackSigningSecret) {
      fastify.log.warn('SLACK_SIGNING_SECRET not set - rejecting request');
      return false;
    }
    if (!timestamp || !signature) return false;
    if (Math.abs(Date.now() / 1000 - parseInt(timestamp)) > 300) return false;

    const sigBasestring = `v0:${timestamp}:${body}`;
    const mySignature = `v0=${createHmac('sha256', config.slackSigningSecret)
      .update(sigBasestring)
      .digest('hex')}`;

    try {
      return timingSafeEqual(Buffer.from(mySignature), Buffer.from(signature));
    } catch {
      return false;
    }
  });

  fastify.decorate('isAuthenticated', (request) => {
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
  });

  fastify.decorate('getCurrentUser', (request) => {
    const sessionId = request.cookies?.session_id;
    if (!sessionId) return null;
    return sessions.get(sessionId) || null;
  });

  fastify.decorate('verifyCsrfToken', (request) => {
    const sessionId = request.cookies?.session_id;
    if (!sessionId) return false;

    const stored = csrfTokens.get(sessionId);
    if (!stored) return false;

    return stored.token === request.headers['x-csrf-token'];
  });

  fastify.addHook('preHandler', async (request, reply) => {
    const path = request.url.split('?')[0];
    const method = request.method;

    if (PUBLIC_PATHS.some((p) => path === p || path.startsWith(`${p  }/`)))
      return;
    if (!path.startsWith('/api/')) return;

    if (!fastify.isAuthenticated(request)) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    // Skip CSRF check for Bearer auth
    if (request.authMethod === 'bearer') return;

    const isCsrfExempt = CSRF_EXEMPT_PATHS.some(
      (p) => path === p || path.startsWith(`${p  }/`),
    );
    if (
      STATE_CHANGING_METHODS.includes(method) &&
      !isCsrfExempt &&
      !fastify.verifyCsrfToken(request)
    ) {
      return reply.status(403).send({ error: 'Invalid CSRF token' });
    }
  });
}

export default fp(authPlugin, { name: 'auth' });
