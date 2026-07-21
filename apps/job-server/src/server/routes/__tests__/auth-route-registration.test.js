import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import Fastify from 'fastify';

import { generateCsrfToken } from '../../../shared/services/auth/auth-service/token-store.js';
import authRoutes from '../auth.js';

describe('auth route registration characterization', () => {
  it('rejects duplicate logout registration in the isolated broken fixture', async () => {
    // Given
    const fastify = Fastify({ logger: false });
    const duplicateLogoutFixture = async (instance) => {
      instance.post('/logout', async () => ({ success: true }));
      instance.post('/logout', async () => ({ success: true }));
    };

    // When
    const registration = fastify
      .register(duplicateLogoutFixture, { prefix: '/api/auth' })
      .ready();

    // Then
    await assert.rejects(registration, {
      code: 'FST_ERR_DUPLICATED_ROUTE',
    });
    await fastify.close();
  });

  it('returns a CSRF token string from the existing service API', () => {
    // Given
    const store = { sessions: new Map(), csrfTokens: new Map() };

    // When
    const csrfToken = generateCsrfToken(store, 'session-id');

    // Then
    assert.equal(typeof csrfToken, 'string');
    assert.equal(csrfToken.length, 64);
  });

  it('registers exactly one production logout route', async () => {
    // Given
    const fastify = Fastify({ logger: false });
    fastify.decorate('authService', {});

    // When
    await fastify.register(authRoutes, { prefix: '/api/auth' }).ready();

    // Then
    const logoutRoutes = fastify
      .printRoutes({ commonPrefix: false })
      .split('\n')
      .filter((line) => line.includes('/api/auth/logout'));
    assert.equal(logoutRoutes.length, 1);
    await fastify.close();
  });
});
