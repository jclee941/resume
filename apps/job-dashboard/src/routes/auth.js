import { jsonResponse } from '../middleware/cors.js';
import {
  verifySecret,
  createAuthCookie,
  clearAuthCookie,
  mintSessionToken,
} from '../services/auth.js';

/**
 * @typedef {import('../router.js').RouterRequest} RoutedRequest
 *
 * @typedef {{
 *   get(path: string, handler: (req: RoutedRequest) => Promise<Response> | Response): void;
 *   post(path: string, handler: (req: RoutedRequest) => Promise<Response> | Response): void;
 *   delete(path: string, handler: (req: RoutedRequest) => Promise<Response> | Response): void;
 * }} AuthRouter
 *
 * @typedef {{
 *   env: { ADMIN_TOKEN?: string; [key: string]: unknown };
 *   auth: import('../handlers/auth.js').AuthHandler;
 * }} AuthContext
 */

/**
 * @param {AuthRouter} router
 * @param {AuthContext} ctx
 */
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
      // P1-5 fix: do NOT echo the long-lived ADMIN_TOKEN back into a cookie.
      // Mint a short-lived (4h) HMAC-signed session token that is bound to
      // its own expiry and cannot be replayed once it expires — even if
      // ADMIN_TOKEN itself isn't rotated. Cookie max-age aligned to TTL.
      const sessionToken = await mintSessionToken(env);
      const response = jsonResponse({ success: true });
      response.headers.set('Set-Cookie', createAuthCookie(sessionToken, 4 * 60 * 60));
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
