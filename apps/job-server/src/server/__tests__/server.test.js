import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { OAuth2Client } from 'google-auth-library';
import config from '../config/index.js';
import { buildServer } from '../index.js';

describe('Server Integration Tests', () => {
  let server;
  let originalEncryptionKey;

  before(async () => {
    originalEncryptionKey = process.env.SESSION_ENCRYPTION_KEY;
    process.env.SESSION_ENCRYPTION_KEY = '0'.repeat(64);
    server = await buildServer();
    server.post('/api/auth-state-probe', async () => ({ accepted: true }));
  });

  after(async () => {
    await server.close();
    if (originalEncryptionKey === undefined) {
      delete process.env.SESSION_ENCRYPTION_KEY;
    } else {
      process.env.SESSION_ENCRYPTION_KEY = originalEncryptionKey;
    }
  });

  describe('Health Endpoints', () => {
    it('GET /health returns status ok', async () => {
      const response = await server.inject({ method: 'GET', url: '/health' });
      assert.strictEqual(response.statusCode, 200);
      const body = JSON.parse(response.body);
      assert.strictEqual(body.status, 'ok');
      assert.ok(body.version);
    });

    it('GET /api/health returns status ok', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/health',
      });
      assert.strictEqual(response.statusCode, 200);
      const body = JSON.parse(response.body);
      assert.strictEqual(body.status, 'ok');
    });

    it('GET /api/status returns server status', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/status',
      });
      assert.strictEqual(response.statusCode, 200);
      const body = JSON.parse(response.body);
      assert.strictEqual(body.aiStatus, 'operational');
      assert.strictEqual(body.dbStatus, 'connected');
    });
  });

  describe('Auth Endpoints', () => {
    it('POST /api/auth/google rejects missing credential', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/auth/google',
        payload: {},
      });
      assert.strictEqual(response.statusCode, 400);
    });

    it('POST /api/auth/google rejects invalid JWT format', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/auth/google',
        payload: { credential: 'invalid.token' },
      });
      assert.strictEqual(response.statusCode, 401);
    });

    it('POST /api/auth/google rejects forged token (unverified signature)', async () => {
      const forgedPayload = Buffer.from(
        JSON.stringify({ email: 'admin@example.com', iss: 'fake' })
      ).toString('base64');
      const forgedToken = `header.${forgedPayload}.signature`;

      const response = await server.inject({
        method: 'POST',
        url: '/api/auth/google',
        payload: { credential: forgedToken },
      });
      assert.strictEqual(response.statusCode, 401);
    });
  });

  describe('Shared Auth State', () => {
    it('exposes auth service without duplicate auth-store decorators', () => {
      assert.equal(server.hasDecorator('authService'), true);
      assert.equal(server.hasDecorator('sessions'), true);
      assert.equal(server.hasDecorator('csrfTokens'), true);
      assert.equal(server.hasDecorator('authSessions'), false);
    });

    it('accepts a service-created session and CSRF token in middleware', async (t) => {
      // Given
      t.mock.method(OAuth2Client.prototype, 'verifyIdToken', async () => ({
        getPayload: () => ({ email: config.adminEmail }),
      }));
      const auth = await server.authService.verifyGoogleCredential('valid-test-token');

      // When
      const response = await server.inject({
        method: 'POST',
        url: '/api/auth-state-probe',
        cookies: { session_id: auth.sessionId },
        headers: { 'x-csrf-token': auth.csrfToken },
      });

      // Then
      const csrfEntry = server.csrfTokens.get(auth.sessionId);
      assert.strictEqual(server.sessions.has(auth.sessionId), true);
      assert.strictEqual(typeof csrfEntry.createdAt, 'number');
      assert.deepStrictEqual(csrfEntry, {
        token: auth.csrfToken,
        createdAt: csrfEntry.createdAt,
      });
      assert.strictEqual(response.statusCode, 200);
      assert.deepStrictEqual(JSON.parse(response.body), { accepted: true });
    });
  });

  describe('Protected Endpoints', () => {
    it('GET /api/applications requires authentication', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/applications',
      });
      assert.strictEqual(response.statusCode, 401);
    });

    it('POST /api/applications requires CSRF token', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/applications',
        cookies: { session_id: 'fake-session' },
        payload: { test: true },
      });
      assert.ok([401, 403].includes(response.statusCode));
    });
  });

  describe('Rate Limiting', () => {
    it('enforces rate limits on repeated requests', async () => {
      const results = [];
      for (let i = 0; i < 110; i++) {
        const response = await server.inject({ method: 'GET', url: '/health' });
        results.push(response.statusCode);
      }
      assert.ok(results.includes(429));
    });
  });
});
