import {describe, it, before, after} from 'node:test';
import assert from 'node:assert';
import {buildServer} from '../index.js';

describe('Server Integration Tests', () => {
  let server;

  before(async () => {
    server = await buildServer();
  });

  after(async () => {
    await server.close();
  });

  describe('Health Endpoints', () => {
    it('GET /health returns status ok', async () => {
      const response = await server.inject({method: 'GET', url: '/health'});
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
        payload: {credential: 'invalid.token'},
      });
      assert.strictEqual(response.statusCode, 401);
    });

    it('POST /api/auth/google rejects forged token (unverified signature)', async () => {
      const forgedPayload = Buffer.from(
        JSON.stringify({email: 'admin@example.com', iss: 'fake'})
      ).toString('base64');
      const forgedToken = `header.${forgedPayload}.signature`;

      const response = await server.inject({
        method: 'POST',
        url: '/api/auth/google',
        payload: {credential: forgedToken},
      });
      assert.strictEqual(response.statusCode, 401);
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
        cookies: {session_id: 'fake-session'},
        payload: {test: true},
      });
      assert.ok([401, 403].includes(response.statusCode));
    });
  });

  describe('Slack Endpoints', () => {
    it('POST /api/slack/interactions rejects invalid signature', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/slack/interactions',
        headers: {
          'x-slack-request-timestamp': String(Math.floor(Date.now() / 1000)),
          'x-slack-signature': 'v0=invalid',
        },
        payload: {type: 'block_actions'},
      });
      assert.strictEqual(response.statusCode, 401);
    });

    it('POST /api/slack/interactions rejects expired timestamp', async () => {
      const expiredTimestamp = String(Math.floor(Date.now() / 1000) - 600);
      const response = await server.inject({
        method: 'POST',
        url: '/api/slack/interactions',
        headers: {
          'x-slack-request-timestamp': expiredTimestamp,
          'x-slack-signature': 'v0=somesig',
        },
        payload: {type: 'block_actions'},
      });
      assert.strictEqual(response.statusCode, 401);
    });
  });

  describe('Rate Limiting', () => {
    it('enforces rate limits on repeated requests', async () => {
      const results = [];
      for (let i = 0; i < 110; i++) {
        const response = await server.inject({method: 'GET', url: '/health'});
        results.push(response.statusCode);
      }
      assert.ok(results.includes(429));
    });
  });
});
