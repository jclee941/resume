export const AUTH_STRATEGY = {
  production: {
    runtime: 'cloudflare-worker',
    method: 'bearer-token',
    header: 'Authorization',
    format: 'Bearer {ADMIN_TOKEN}',
    storage: 'env.ADMIN_TOKEN',
    webhook: {
      method: 'hmac-sha256',
      header: 'x-webhook-signature',
      replayProtection: 'NONCE_KV',
    },
  },

  development: {
    runtime: 'fastify',
    method: 'bearer-token',
    header: 'Authorization',
    format: 'Bearer {ADMIN_TOKEN}',
    storage: 'process.env.ADMIN_TOKEN',
    fallback: {
      method: 'cookie-session',
      cookie: 'session_id',
      csrf: 'x-csrf-token',
    },
  },

  public: ['/api/health', '/api/status', '/api/auth/status'],

  admin: [
    '/api/applications',
    '/api/stats',
    '/api/config',

    '/api/slack/notify',
    '/api/automation',
    '/api/report',
  ],
};

export function createAuthMiddleware(env) {
  const adminToken = env?.ADMIN_TOKEN || process.env.ADMIN_TOKEN;

  return function verifyAuth(request) {
    const authHeader =
      request.headers.get?.('authorization') || request.headers?.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      return { authenticated: false, error: 'Missing Bearer token' };
    }

    const token = authHeader.slice(7);
    const valid = timingSafeEqual(token, adminToken);

    return { authenticated: valid, error: valid ? null : 'Invalid token' };
  };
}

function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
