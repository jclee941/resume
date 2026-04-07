import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import fastifyCookie from '@fastify/cookie';

import authPlugin from '../../server/plugins/auth.js';
import errorHandler from '../../server/middleware/error-handler.js';
import sessionBrokerRoutes from '../server/session-broker-routes.js';

function createSessionBrokerServiceStub() {
  const calls = {
    getSessionStatus: [],
    renewSession: [],
    validateEncryptedSession: [],
    getHealth: 0,
  };

  return {
    calls,
    getSessionStatus(platform) {
      calls.getSessionStatus.push(platform);
      return {
        valid: true,
        expiresAt: '2030-01-01T00:00:00.000Z',
        renewedAt: '2029-12-31T00:00:00.000Z',
      };
    },
    async renewSession(platform) {
      calls.renewSession.push(platform);
      return {
        success: true,
        session: {
          valid: true,
          expiresAt: '2030-01-01T00:00:00.000Z',
          renewedAt: '2029-12-31T00:00:00.000Z',
        },
      };
    },
    validateEncryptedSession(platform, encryptedSession) {
      calls.validateEncryptedSession.push({ platform, encryptedSession });
      return {
        valid: true,
        decrypted: {
          platform,
          encryptedSession,
        },
      };
    },
    getHealth() {
      calls.getHealth += 1;
      return {
        status: 'healthy',
        platforms: {
          wanted: {
            valid: true,
            expiringSoon: false,
            expiresAt: '2030-01-01T00:00:00.000Z',
            renewedAt: '2029-12-31T00:00:00.000Z',
            reason: null,
          },
        },
      };
    },
  };
}

async function buildApp(sessionBrokerService) {
  const app = Fastify({ logger: false });

  app.setErrorHandler(errorHandler);
  app.decorate('sessionBrokerService', sessionBrokerService);
  await app.register(fastifyCookie);
  await app.register(authPlugin);
  await app.register(sessionBrokerRoutes, { prefix: '/api/session' });
  await app.ready();

  return app;
}

describe('session-broker routes', () => {
  const originalAdminToken = process.env.ADMIN_TOKEN;
  const originalEncryptionKey = process.env.SESSION_ENCRYPTION_KEY;
  const validToken = 'test-token';

  beforeEach(() => {
    process.env.ADMIN_TOKEN = validToken;
    process.env.SESSION_ENCRYPTION_KEY =
      '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  });

  afterEach(() => {
    if (typeof originalAdminToken === 'string') {
      process.env.ADMIN_TOKEN = originalAdminToken;
    } else {
      delete process.env.ADMIN_TOKEN;
    }

    if (typeof originalEncryptionKey === 'string') {
      process.env.SESSION_ENCRYPTION_KEY = originalEncryptionKey;
    } else {
      delete process.env.SESSION_ENCRYPTION_KEY;
    }
  });

  it('GET status returns session validity', async () => {
    const service = createSessionBrokerServiceStub();
    const app = await buildApp(service);

    const response = await app.inject({
      method: 'GET',
      url: '/api/session/wanted/status',
      headers: { authorization: `Bearer ${validToken}` },
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), {
      valid: true,
      expiresAt: '2030-01-01T00:00:00.000Z',
      renewedAt: '2029-12-31T00:00:00.000Z',
    });
    assert.deepEqual(service.calls.getSessionStatus, ['wanted']);

    await app.close();
  });

  it('POST renew triggers session renewal', async () => {
    const service = createSessionBrokerServiceStub();
    const app = await buildApp(service);

    const response = await app.inject({
      method: 'POST',
      url: '/api/session/wanted/renew',
      headers: { authorization: `Bearer ${validToken}` },
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), {
      success: true,
      session: {
        valid: true,
        expiresAt: '2030-01-01T00:00:00.000Z',
        renewedAt: '2029-12-31T00:00:00.000Z',
      },
    });
    assert.deepEqual(service.calls.renewSession, ['wanted']);

    await app.close();
  });

  it('POST validate checks encrypted session', async () => {
    const service = createSessionBrokerServiceStub();
    const app = await buildApp(service);

    const response = await app.inject({
      method: 'POST',
      url: '/api/session/wanted/validate',
      headers: {
        authorization: `Bearer ${validToken}`,
        'content-type': 'application/json',
      },
      payload: { encryptedSession: 'encrypted-value' },
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), {
      valid: true,
      decrypted: {
        platform: 'wanted',
        encryptedSession: 'encrypted-value',
      },
    });
    assert.deepEqual(service.calls.validateEncryptedSession, [
      { platform: 'wanted', encryptedSession: 'encrypted-value' },
    ]);

    await app.close();
  });

  it('GET health returns service status', async () => {
    const service = createSessionBrokerServiceStub();
    const app = await buildApp(service);

    const response = await app.inject({
      method: 'GET',
      url: '/api/session/health',
      headers: { authorization: `Bearer ${validToken}` },
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), {
      status: 'healthy',
      platforms: {
        wanted: {
          valid: true,
          expiringSoon: false,
          expiresAt: '2030-01-01T00:00:00.000Z',
          renewedAt: '2029-12-31T00:00:00.000Z',
          reason: null,
        },
      },
    });
    assert.equal(service.calls.getHealth, 1);

    await app.close();
  });

  it('authentication rejected without valid token', async () => {
    const service = createSessionBrokerServiceStub();
    const app = await buildApp(service);

    const response = await app.inject({
      method: 'GET',
      url: '/api/session/wanted/status',
    });

    assert.equal(response.statusCode, 401);
    assert.deepEqual(response.json(), { error: 'Unauthorized' });

    await app.close();
  });
});
