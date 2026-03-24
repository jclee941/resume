import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  API_CONTRACTS,
  COMMON_STATUSES,
  validateResponse,
  AUTH_STRATEGY,
  createAuthMiddleware,
  SESSION_CONFIG,
} from '../index.js';

describe('barrel re-exports from api', () => {
  it('re-exports API_CONTRACTS', () => {
    assert.ok(API_CONTRACTS);
    assert.strictEqual(API_CONTRACTS.health.path, '/api/health');
  });

  it('re-exports COMMON_STATUSES', () => {
    assert.ok(COMMON_STATUSES);
    assert.ok(Array.isArray(COMMON_STATUSES.APPLICATION));
  });

  it('re-exports validateResponse', () => {
    assert.strictEqual(typeof validateResponse, 'function');
  });
});

describe('barrel re-exports from auth', () => {
  it('re-exports AUTH_STRATEGY', () => {
    assert.ok(AUTH_STRATEGY);
    assert.ok(AUTH_STRATEGY.production);
    assert.ok(AUTH_STRATEGY.development);
  });

  it('re-exports createAuthMiddleware', () => {
    assert.strictEqual(typeof createAuthMiddleware, 'function');
  });
});

describe('SESSION_CONFIG', () => {
  it('TTL_MS equals 86400000 (24 hours)', () => {
    assert.strictEqual(SESSION_CONFIG.TTL_MS, 86400000);
  });

  it('PLATFORMS is array of 5 platforms', () => {
    assert.ok(Array.isArray(SESSION_CONFIG.PLATFORMS));
    assert.strictEqual(SESSION_CONFIG.PLATFORMS.length, 5);
    assert.deepStrictEqual(SESSION_CONFIG.PLATFORMS, [
      'wanted',
      'saramin',
      'jobkorea',
      'remember',
      'linkedin',
    ]);
  });
});
