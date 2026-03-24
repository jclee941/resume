import assert from 'node:assert/strict';
import { describe, it, beforeEach, mock } from 'node:test';

import { OAuth2Client } from 'google-auth-library';
import { SessionManager } from '../../session/index.js';
import { AuthService } from '../auth-service.js';
import AuthServiceDefault from '../auth-service.js';

describe('AuthService', () => {
  beforeEach(() => {
    mock.restoreAll();
  });

  it('exports default class and uses constructor defaults', () => {
    const service = new AuthService({ googleClientId: 'gcid', adminEmail: 'admin@example.com' });
    assert.equal(AuthServiceDefault, AuthService);
    assert.equal(service.getSessionTTLSeconds(), 86400);
  });

  it('creates singleton with config then returns same instance without args', async () => {
    const unique = `${Date.now()}-${Math.random()}`;
    const module = await import(`../auth-service.js?singleton=${unique}`);
    const config = { googleClientId: 'gcid', adminEmail: 'admin@example.com' };
    const store = { sessions: new Map(), csrfTokens: new Map() };

    const created = module.getAuthService(config, store);
    const fetched = module.getAuthService();

    assert.ok(created instanceof module.AuthService);
    assert.strictEqual(fetched, created);
  });

  it('returns 400 when credential is missing', async () => {
    const service = new AuthService({ googleClientId: 'gcid', adminEmail: 'admin@example.com' });
    const result = await service.verifyGoogleCredential('');
    assert.deepEqual(result, {
      success: false,
      error: 'Missing credential',
      statusCode: 400,
    });
  });

  it('returns 401 when Google verification fails', async () => {
    const logger = { error: mock.fn() };
    mock.method(OAuth2Client.prototype, 'verifyIdToken', async () => {
      throw new Error('bad-token');
    });
    const service = new AuthService({
      googleClientId: 'gcid',
      adminEmail: 'admin@example.com',
      logger,
    });

    const result = await service.verifyGoogleCredential('bad');

    assert.equal(result.success, false);
    assert.equal(result.error, 'Invalid token');
    assert.equal(result.statusCode, 401);
    assert.equal(logger.error.mock.callCount(), 1);
  });

  it('returns 403 when payload is unauthorized or email is missing', async () => {
    mock.method(OAuth2Client.prototype, 'verifyIdToken', async () => ({
      getPayload: () => ({ email: 'other@example.com' }),
    }));
    const service = new AuthService({ googleClientId: 'gcid', adminEmail: 'admin@example.com' });

    const unauthorized = await service.verifyGoogleCredential('token-1');
    assert.deepEqual(unauthorized, { success: false, error: 'Access denied', statusCode: 403 });

    OAuth2Client.prototype.verifyIdToken.mock.mockImplementation(async () => ({
      getPayload: () => ({}),
    }));
    const missing = await service.verifyGoogleCredential('token-2');
    assert.deepEqual(missing, { success: false, error: 'Access denied', statusCode: 403 });
  });

  it('creates session and csrf token on successful verification', async () => {
    mock.method(OAuth2Client.prototype, 'verifyIdToken', async () => ({
      getPayload: () => ({ email: 'admin@example.com' }),
    }));
    const store = { sessions: new Map(), csrfTokens: new Map() };
    const service = new AuthService(
      {
        googleClientId: 'gcid',
        adminEmail: 'admin@example.com',
        sessionTTL: 2000,
      },
      store
    );

    const result = await service.verifyGoogleCredential('good');

    assert.equal(result.success, true);
    assert.equal(result.email, 'admin@example.com');
    assert.equal(typeof result.sessionId, 'string');
    assert.equal(typeof result.csrfToken, 'string');
    assert.equal(result.sessionId.length, 64);
    assert.equal(result.csrfToken.length, 64);
    assert.equal(store.sessions.has(result.sessionId), true);
    assert.equal(store.csrfTokens.get(result.sessionId), result.csrfToken);
    assert.equal(service.getSessionTTLSeconds(), 2);
  });

  it('returns auth status from SessionManager', () => {
    const statusMock = mock.method(SessionManager, 'getStatus', () => [
      { platform: 'wanted', authenticated: true },
      { platform: 'saramin', authenticated: false },
    ]);
    const service = new AuthService({ googleClientId: 'gcid', adminEmail: 'admin@example.com' });

    const result = service.getAuthStatus();

    assert.equal(result.success, true);
    assert.equal(result.status.length, 2);
    assert.equal(statusMock.mock.callCount(), 1);
  });

  it('validates savePlatformAuth params and normalizes cookie payload', () => {
    const saveMock = mock.method(SessionManager, 'save', () => true);
    const service = new AuthService({ googleClientId: 'gcid', adminEmail: 'admin@example.com' });

    assert.deepEqual(service.savePlatformAuth('', 'a=1'), {
      success: false,
      error: 'Platform and cookies required',
      statusCode: 400,
    });
    assert.deepEqual(service.savePlatformAuth('wanted', ''), {
      success: false,
      error: 'Platform and cookies required',
      statusCode: 400,
    });

    const resultArray = service.savePlatformAuth(
      'wanted',
      [
        { name: 'sid', value: 'abc' },
        { name: 'csrf', value: 'xyz' },
      ],
      'admin@example.com'
    );
    assert.equal(resultArray.success, true);
    assert.equal(saveMock.mock.calls[0].arguments[0], 'wanted');
    assert.equal(saveMock.mock.calls[0].arguments[1].cookieString, 'sid=abc; csrf=xyz');
    assert.equal(saveMock.mock.calls[0].arguments[1].cookieCount, 2);

    service.savePlatformAuth('saramin', 'a=1; b=2');
    assert.equal(saveMock.mock.calls[1].arguments[1].cookieCount, 2);

    service.savePlatformAuth('jobkorea', { toString: () => 'k=v' });
    assert.equal(saveMock.mock.calls[2].arguments[1].cookieString, 'k=v');
    assert.equal(saveMock.mock.calls[2].arguments[1].cookieCount, 1);
  });

  it('clears platform auth and logs out admin session', () => {
    const clearMock = mock.method(SessionManager, 'clear', () => true);
    const store = {
      sessions: new Map([['s1', { email: 'admin@example.com', expiresAt: Date.now() + 1000 }]]),
      csrfTokens: new Map([['s1', 'csrf-token']]),
    };
    const service = new AuthService(
      { googleClientId: 'gcid', adminEmail: 'admin@example.com' },
      store
    );

    assert.deepEqual(service.clearPlatformAuth('wanted'), {
      success: true,
      message: 'Logged out from wanted',
    });
    assert.equal(clearMock.mock.callCount(), 1);

    assert.deepEqual(service.logout('s1'), { success: true });
    assert.equal(store.sessions.has('s1'), false);
    assert.equal(store.csrfTokens.has('s1'), false);
    assert.deepEqual(service.logout(), { success: true });
  });

  it('validates sessions and removes expired entries', () => {
    const store = {
      sessions: new Map([
        ['valid', { email: 'admin@example.com', expiresAt: Date.now() + 10000 }],
        ['expired', { email: 'admin@example.com', expiresAt: Date.now() - 1 }],
      ]),
      csrfTokens: new Map(),
    };
    const service = new AuthService(
      { googleClientId: 'gcid', adminEmail: 'admin@example.com' },
      store
    );

    assert.equal(service.validateSession('missing'), false);
    assert.equal(service.validateSession('expired'), false);
    assert.equal(store.sessions.has('expired'), false);
    assert.equal(service.validateSession('valid'), true);
  });
});
