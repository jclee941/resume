// Regression test for P1-5 wiring (Oracle re-verification round 2).
// Asserts that POST /api/auth/login mints a fresh HMAC session token via
// mintSessionToken() and writes it into the adminToken cookie — NOT the
// raw env.ADMIN_TOKEN bearer.

describe('/api/auth/login cookie content (P1-5 wiring)', () => {
  let auth;
  let registerAuthRoutes;

  beforeAll(async () => {
    auth = await import('../../../apps/job-dashboard/src/services/auth.js');
    ({ registerAuthRoutes } = await import(
      '../../../apps/job-dashboard/src/routes/auth.js'
    ));
  });

  function makeRouter() {
    const handlers = new Map();
    return {
      get(path, fn) { handlers.set(`GET ${path}`, fn); },
      post(path, fn) { handlers.set(`POST ${path}`, fn); },
      delete(path, fn) { handlers.set(`DELETE ${path}`, fn); },
      _resolve(method, path) { return handlers.get(`${method} ${path}`); },
    };
  }

  test('login does NOT echo raw ADMIN_TOKEN into cookie', async () => {
    const env = { ADMIN_TOKEN: 'super-long-secret-admin-token-bearer-2026' };
    const router = makeRouter();
    registerAuthRoutes(router, { env, auth: {} });

    const handler = router._resolve('POST', '/api/auth/login');
    expect(typeof handler).toBe('function');

    const request = new Request('https://example.com/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: env.ADMIN_TOKEN }),
    });

    const response = await handler(request);
    expect(response.status).toBe(200);

    const setCookie = response.headers.get('Set-Cookie') || '';
    expect(setCookie).toContain('adminToken=');

    // Extract cookie value
    const m = setCookie.match(/adminToken=([^;]+);/);
    expect(m).not.toBeNull();
    const cookieValue = m[1];

    // CRITICAL: cookie value must NOT equal the raw ADMIN_TOKEN
    expect(cookieValue).not.toBe(env.ADMIN_TOKEN);

    // It MUST be a 3-part HMAC session token: ${exp}.${nonce}.${sig}
    expect(cookieValue.split('.')).toHaveLength(3);

    // It MUST verify under the same env
    const verifyResult = await auth.verifySessionToken(cookieValue, env);
    expect(verifyResult.ok).toBe(true);
    expect(typeof verifyResult.exp).toBe('number');
    // 4h TTL ± clock drift
    expect(verifyResult.exp - Date.now()).toBeGreaterThan(3.9 * 60 * 60 * 1000);
    expect(verifyResult.exp - Date.now()).toBeLessThanOrEqual(4 * 60 * 60 * 1000 + 1000);
  });

  test('login rejects wrong token with 401', async () => {
    const env = { ADMIN_TOKEN: 'right-token' };
    const router = makeRouter();
    registerAuthRoutes(router, { env, auth: {} });

    const handler = router._resolve('POST', '/api/auth/login');
    const request = new Request('https://example.com/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'wrong-token' }),
    });

    const response = await handler(request);
    expect(response.status).toBe(401);
  });

  test('cookie is HttpOnly + Secure + SameSite=Strict + Max-Age=14400', async () => {
    const env = { ADMIN_TOKEN: 'admin-token-value' };
    const router = makeRouter();
    registerAuthRoutes(router, { env, auth: {} });

    const handler = router._resolve('POST', '/api/auth/login');
    const request = new Request('https://example.com/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: env.ADMIN_TOKEN }),
    });

    const response = await handler(request);
    const setCookie = response.headers.get('Set-Cookie') || '';
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('Secure');
    expect(setCookie).toContain('SameSite=Strict');
    expect(setCookie).toContain('Max-Age=14400'); // 4 hours
  });
});
