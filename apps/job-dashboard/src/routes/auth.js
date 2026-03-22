import { jsonResponse } from '../middleware/cors.js';
import { verifySecret, createAuthCookie, clearAuthCookie } from '../services/auth.js';

export function registerAuthRoutes(router, ctx) {
  const { env, auth } = ctx;

  router.get('/api/auth/status', (req) => auth.getStatus(req));
  router.post('/api/auth/set', (req) => auth.setAuth(req));
  router.post('/api/auth/sync', (req) => auth.syncFromScript(req));
  router.delete('/api/auth/:platform', (req) => auth.clearAuth(req));
  router.get('/api/auth/profile', (req) => auth.getProfile(req));

  router.post('/api/auth/login', async (req) => {
    try {
      const body = await req.json();
      const { token } = body;
      if (!verifySecret(token || null, env.ADMIN_TOKEN)) {
        return jsonResponse({ error: 'Invalid token' }, 401);
      }
      const response = jsonResponse({ success: true });
      response.headers.set('Set-Cookie', createAuthCookie(token));
      return response;
    } catch {
      return jsonResponse({ error: 'Invalid request' }, 400);
    }
  });

  router.post('/api/auth/logout', async () => {
    const response = jsonResponse({ success: true });
    response.headers.set('Set-Cookie', clearAuthCookie());
    return response;
  });
}
