import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { AUTH_STRATEGY, createAuthMiddleware } from '../auth.js';

describe('AUTH_STRATEGY', () => {
  it('production has correct structure', () => {
    assert.strictEqual(AUTH_STRATEGY.production.runtime, 'cloudflare-worker');
    assert.strictEqual(AUTH_STRATEGY.production.method, 'bearer-token');
    assert.strictEqual(AUTH_STRATEGY.production.header, 'Authorization');
    assert.strictEqual(AUTH_STRATEGY.production.format, 'Bearer {ADMIN_TOKEN}');
    assert.strictEqual(AUTH_STRATEGY.production.storage, 'env.ADMIN_TOKEN');
    assert.deepStrictEqual(AUTH_STRATEGY.production.webhook, {
      method: 'hmac-sha256',
      header: 'x-webhook-signature',
      replayProtection: 'NONCE_KV',
    });
  });

  it('development has correct structure', () => {
    assert.strictEqual(AUTH_STRATEGY.development.runtime, 'fastify');
    assert.strictEqual(AUTH_STRATEGY.development.method, 'bearer-token');
    assert.strictEqual(AUTH_STRATEGY.development.header, 'Authorization');
    assert.strictEqual(AUTH_STRATEGY.development.format, 'Bearer {ADMIN_TOKEN}');
    assert.strictEqual(AUTH_STRATEGY.development.storage, 'process.env.ADMIN_TOKEN');
    assert.deepStrictEqual(AUTH_STRATEGY.development.fallback, {
      method: 'cookie-session',
      cookie: 'session_id',
      csrf: 'x-csrf-token',
    });
  });

  it('public is array of public paths', () => {
    assert.ok(Array.isArray(AUTH_STRATEGY.public));
    assert.ok(AUTH_STRATEGY.public.includes('/api/health'));
    assert.ok(AUTH_STRATEGY.public.includes('/api/status'));
    assert.ok(AUTH_STRATEGY.public.includes('/api/auth/status'));
  });

  it('admin is array of admin paths', () => {
    assert.ok(Array.isArray(AUTH_STRATEGY.admin));
    assert.ok(AUTH_STRATEGY.admin.includes('/api/applications'));
    assert.ok(AUTH_STRATEGY.admin.includes('/api/stats'));
    assert.ok(AUTH_STRATEGY.admin.includes('/api/config'));
  });
});

describe('createAuthMiddleware', () => {
  it('returns a function', () => {
    const middleware = createAuthMiddleware({ ADMIN_TOKEN: 'test-token' });
    assert.strictEqual(typeof middleware, 'function');
  });

  describe('verifyAuth with CF Workers style headers', () => {
    it('valid Bearer token returns authenticated:true', () => {
      const middleware = createAuthMiddleware({ ADMIN_TOKEN: 'my-secret-token' });
      const request = {
        headers: {
          get: (name) => {
            if (name === 'authorization') return 'Bearer my-secret-token';
            return null;
          },
        },
      };
      const result = middleware(request);
      assert.strictEqual(result.authenticated, true);
      assert.strictEqual(result.error, null);
    });

    it('missing Authorization header returns authenticated:false', () => {
      const middleware = createAuthMiddleware({ ADMIN_TOKEN: 'my-secret-token' });
      const request = {
        headers: {
          get: (name) => {
            if (name === 'authorization') return null;
            return null;
          },
        },
      };
      const result = middleware(request);
      assert.strictEqual(result.authenticated, false);
      assert.strictEqual(result.error, 'Missing Bearer token');
    });

    it('wrong token returns authenticated:false', () => {
      const middleware = createAuthMiddleware({ ADMIN_TOKEN: 'my-secret-token' });
      const request = {
        headers: {
          get: (name) => {
            if (name === 'authorization') return 'Bearer wrong-token';
            return null;
          },
        },
      };
      const result = middleware(request);
      assert.strictEqual(result.authenticated, false);
      assert.strictEqual(result.error, 'Invalid token');
    });

    it('Basic auth (not Bearer) returns Missing Bearer token', () => {
      const middleware = createAuthMiddleware({ ADMIN_TOKEN: 'my-secret-token' });
      const request = {
        headers: {
          get: (name) => {
            if (name === 'authorization') return 'Basic abc123';
            return null;
          },
        },
      };
      const result = middleware(request);
      assert.strictEqual(result.authenticated, false);
      assert.strictEqual(result.error, 'Missing Bearer token');
    });

    it('empty string after Bearer returns authenticated:false', () => {
      const middleware = createAuthMiddleware({ ADMIN_TOKEN: 'my-secret-token' });
      const request = {
        headers: {
          get: (name) => {
            if (name === 'authorization') return 'Bearer ';
            return null;
          },
        },
      };
      const result = middleware(request);
      assert.strictEqual(result.authenticated, false);
    });
  });

  describe('verifyAuth with Node/Fastify style headers', () => {
    it('valid Bearer token returns authenticated:true', () => {
      const middleware = createAuthMiddleware({ ADMIN_TOKEN: 'my-secret-token' });
      const request = {
        headers: {
          authorization: 'Bearer my-secret-token',
        },
      };
      const result = middleware(request);
      assert.strictEqual(result.authenticated, true);
      assert.strictEqual(result.error, null);
    });

    it('wrong token returns authenticated:false', () => {
      const middleware = createAuthMiddleware({ ADMIN_TOKEN: 'my-secret-token' });
      const request = {
        headers: {
          authorization: 'Bearer wrong-token',
        },
      };
      const result = middleware(request);
      assert.strictEqual(result.authenticated, false);
      assert.strictEqual(result.error, 'Invalid token');
    });

    it('headers.get undefined falls back to headers.authorization', () => {
      const middleware = createAuthMiddleware({ ADMIN_TOKEN: 'fallback-token' });
      const request = {
        headers: {
          get: undefined,
          authorization: 'Bearer fallback-token',
        },
      };
      const result = middleware(request);
      assert.strictEqual(result.authenticated, true);
    });

    it('headers without get method uses authorization property', () => {
      const middleware = createAuthMiddleware({ ADMIN_TOKEN: 'no-get-token' });
      const request = {
        headers: {
          authorization: 'Bearer no-get-token',
        },
      };
      const result = middleware(request);
      assert.strictEqual(result.authenticated, true);
    });
  });

  describe('timingSafeEqual indirectly tested', () => {
    it('different length token fails', () => {
      const middleware = createAuthMiddleware({ ADMIN_TOKEN: 'short' });
      const request = {
        headers: {
          authorization: 'Bearer this-token-is-much-longer',
        },
      };
      const result = middleware(request);
      assert.strictEqual(result.authenticated, false);
    });

    it('same token passes', () => {
      const middleware = createAuthMiddleware({ ADMIN_TOKEN: 'exact-token-123' });
      const request = {
        headers: {
          authorization: 'Bearer exact-token-123',
        },
      };
      const result = middleware(request);
      assert.strictEqual(result.authenticated, true);
    });

    it('undefined adminToken returns false', () => {
      const middleware = createAuthMiddleware({});
      const request = {
        headers: {
          authorization: 'Bearer some-token',
        },
      };
      const result = middleware(request);
      assert.strictEqual(result.authenticated, false);
    });
  });
});
