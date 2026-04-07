import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import SessionBrokerService, { SESSION_STATES } from '../services/session-broker-service.js';

class FakeEncryptionService {
  encrypt(data) {
    return JSON.stringify(data);
  }

  decrypt(data) {
    return JSON.parse(data);
  }
}

function createService({
  now = 1_700_000_000_000,
  sessionStore = new Map(),
  loginFlowFactories = {},
  browserFactory,
  platforms = ['wanted'],
  retryAttempts = 3,
} = {}) {
  const stateStore = new Map();
  const clock = { now };
  const browserClosures = [];

  const service = new SessionBrokerService({
    encryptionService: new FakeEncryptionService(),
    sessionStore,
    stateStore,
    platforms,
    retryAttempts,
    retryDelayMs: 1,
    ttlThreshold: 0.8,
    now: () => clock.now,
    sleep: async () => {},
    browserFactory:
      browserFactory ||
      (() => {
        const browser = {
          async launch() {
            return {
              async goto() {},
              async getCookies() {
                return [];
              },
            };
          },
          async close() {
            browserClosures.push('closed');
          },
        };
        return browser;
      }),
    loginFlowFactories,
  });

  return { service, stateStore, sessionStore, clock, browserClosures };
}

function storeSession(sessionStore, session) {
  sessionStore.set(session.platform, JSON.stringify(session));
}

describe('SessionBrokerService', () => {
  it('returns valid status for a healthy session', async () => {
    const { service, sessionStore, stateStore } = createService();
    storeSession(sessionStore, {
      platform: 'wanted',
      renewedAt: '2024-01-01T00:00:00.000Z',
      expiresAt: '2024-01-02T00:00:00.000Z',
      cookieString: 'sid=valid',
    });

    const result = await service.checkSession('wanted');

    assert.deepEqual(result, {
      valid: true,
      expiresAt: '2024-01-02T00:00:00.000Z',
      renewedAt: '2024-01-01T00:00:00.000Z',
    });
    assert.equal(stateStore.get('wanted').state, SESSION_STATES.VALID);
  });

  it('triggers renewal when the session is nearing expiry', async () => {
    const sessionStore = new Map();
    const renewedSession = {
      cookies: [{ name: 'sid', value: 'renewed' }],
      renewedAt: '2024-01-01T21:00:00.000Z',
      expiresAt: '2024-01-02T21:00:00.000Z',
    };
    let renewalCalls = 0;

    storeSession(sessionStore, {
      platform: 'wanted',
      renewedAt: '2024-01-01T00:00:00.000Z',
      expiresAt: '2024-01-02T00:00:00.000Z',
      cookieString: 'sid=stale',
    });

    const { service, stateStore } = createService({
      now: Date.parse('2024-01-01T20:00:00.000Z'),
      sessionStore,
      loginFlowFactories: {
        wanted: () => ({
          async renew() {
            renewalCalls += 1;
            return renewedSession;
          },
        }),
      },
    });

    const result = await service.getValidSession('wanted');

    assert.equal(result.valid, true);
    assert.equal(result.session.cookieString, 'sid=renewed');
    assert.equal(renewalCalls, 1);
    assert.equal(stateStore.get('wanted').state, SESSION_STATES.VALID);
  });

  it('triggers renewal when the session is expired', async () => {
    const sessionStore = new Map();
    let renewalCalls = 0;

    storeSession(sessionStore, {
      platform: 'wanted',
      renewedAt: '2024-01-01T00:00:00.000Z',
      expiresAt: '2024-01-01T06:00:00.000Z',
      cookieString: 'sid=expired',
    });

    const { service } = createService({
      now: Date.parse('2024-01-01T07:00:00.000Z'),
      sessionStore,
      loginFlowFactories: {
        wanted: () => ({
          async renew() {
            renewalCalls += 1;
            return {
              renewedAt: '2024-01-01T07:00:00.000Z',
              expiresAt: '2024-01-02T07:00:00.000Z',
              cookieString: 'sid=fresh',
            };
          },
        }),
      },
    });

    const result = await service.getValidSession('wanted');

    assert.equal(result.valid, true);
    assert.equal(result.session.cookieString, 'sid=fresh');
    assert.equal(renewalCalls, 1);
  });

  it('returns an error when renewal fails after retries', async () => {
    const sessionStore = new Map();
    let attempts = 0;

    storeSession(sessionStore, {
      platform: 'wanted',
      renewedAt: '2024-01-01T00:00:00.000Z',
      expiresAt: '2024-01-01T06:00:00.000Z',
      cookieString: 'sid=expired',
    });

    const { service, stateStore } = createService({
      now: Date.parse('2024-01-01T07:00:00.000Z'),
      sessionStore,
      retryAttempts: 2,
      loginFlowFactories: {
        wanted: () => ({
          async renew() {
            attempts += 1;
            throw new Error('automation failed');
          },
        }),
      },
    });

    const result = await service.getValidSession('wanted');

    assert.deepEqual(result, { valid: false, error: 'automation failed' });
    assert.equal(attempts, 2);
    assert.equal(stateStore.get('wanted').state, SESSION_STATES.EXPIRED);
  });

  it('returns platform status in health checks', async () => {
    const sessionStore = new Map();

    storeSession(sessionStore, {
      platform: 'wanted',
      renewedAt: '2024-01-01T00:00:00.000Z',
      expiresAt: '2024-01-02T00:00:00.000Z',
      cookieString: 'sid=valid',
    });

    const { service } = createService({
      now: Date.parse('2024-01-01T12:00:00.000Z'),
      sessionStore,
      platforms: ['wanted', 'linkedin'],
    });

    const result = await service.healthCheck();

    assert.equal(result.status, 'degraded');
    assert.deepEqual(result.platforms.wanted, {
      state: SESSION_STATES.VALID,
      valid: true,
      expiresAt: '2024-01-02T00:00:00.000Z',
      renewedAt: '2024-01-01T00:00:00.000Z',
      lastError: null,
    });
    assert.deepEqual(result.platforms.linkedin, {
      state: SESSION_STATES.EXPIRED,
      valid: false,
      expiresAt: null,
      renewedAt: null,
      lastError: 'No stored session',
    });
  });
});
