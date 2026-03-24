import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { API_CONTRACTS, COMMON_STATUSES, validateResponse } from '../api.js';

describe('API_CONTRACTS', () => {
  it('health has correct structure', () => {
    assert.strictEqual(API_CONTRACTS.health.path, '/api/health');
    assert.strictEqual(API_CONTRACTS.health.method, 'GET');
    assert.strictEqual(API_CONTRACTS.health.auth, false);
    assert.deepStrictEqual(API_CONTRACTS.health.response, {
      status: 'string',
      timestamp: 'string',
      version: 'string',
    });
  });

  it('status has correct structure', () => {
    assert.strictEqual(API_CONTRACTS.status.path, '/api/status');
    assert.strictEqual(API_CONTRACTS.status.method, 'GET');
    assert.strictEqual(API_CONTRACTS.status.auth, false);
  });

  it('stats has correct structure', () => {
    assert.strictEqual(API_CONTRACTS.stats.path, '/api/stats');
    assert.strictEqual(API_CONTRACTS.stats.method, 'GET');
    assert.strictEqual(API_CONTRACTS.stats.auth, true);
  });

  describe('applications CRUD', () => {
    it('list has correct structure', () => {
      assert.strictEqual(API_CONTRACTS.applications.list.path, '/api/applications');
      assert.strictEqual(API_CONTRACTS.applications.list.method, 'GET');
      assert.strictEqual(API_CONTRACTS.applications.list.auth, true);
      assert.deepStrictEqual(API_CONTRACTS.applications.list.query, {
        status: 'string?',
        platform: 'string?',
        limit: 'number?',
        offset: 'number?',
      });
    });

    it('create has correct structure', () => {
      assert.strictEqual(API_CONTRACTS.applications.create.path, '/api/applications');
      assert.strictEqual(API_CONTRACTS.applications.create.method, 'POST');
      assert.strictEqual(API_CONTRACTS.applications.create.auth, true);
      assert.deepStrictEqual(API_CONTRACTS.applications.create.body, {
        company: 'string',
        position: 'string',
        platform: 'string',
        status: 'string?',
        url: 'string?',
      });
    });

    it('update has correct structure', () => {
      assert.strictEqual(API_CONTRACTS.applications.update.path, '/api/applications/:id');
      assert.strictEqual(API_CONTRACTS.applications.update.method, 'PUT');
      assert.strictEqual(API_CONTRACTS.applications.update.auth, true);
    });

    it('delete has correct structure', () => {
      assert.strictEqual(API_CONTRACTS.applications.delete.path, '/api/applications/:id');
      assert.strictEqual(API_CONTRACTS.applications.delete.method, 'DELETE');
      assert.strictEqual(API_CONTRACTS.applications.delete.auth, true);
    });
  });

  describe('auth endpoints', () => {
    it('status endpoint', () => {
      assert.strictEqual(API_CONTRACTS.auth.status.path, '/api/auth/status');
      assert.strictEqual(API_CONTRACTS.auth.status.method, 'GET');
      assert.strictEqual(API_CONTRACTS.auth.status.auth, false);
    });

    it('google endpoint', () => {
      assert.strictEqual(API_CONTRACTS.auth.google.path, '/api/auth/google');
      assert.strictEqual(API_CONTRACTS.auth.google.method, 'POST');
      assert.strictEqual(API_CONTRACTS.auth.google.auth, false);
    });

    it('set endpoint', () => {
      assert.strictEqual(API_CONTRACTS.auth.set.path, '/api/auth/set');
      assert.strictEqual(API_CONTRACTS.auth.set.method, 'POST');
      assert.strictEqual(API_CONTRACTS.auth.set.auth, true);
    });

    it('logout endpoint', () => {
      assert.strictEqual(API_CONTRACTS.auth.logout.path, '/api/auth/:platform');
      assert.strictEqual(API_CONTRACTS.auth.logout.method, 'DELETE');
      assert.strictEqual(API_CONTRACTS.auth.logout.auth, true);
    });
  });

  describe('ai endpoints', () => {
    it('match endpoint', () => {
      assert.strictEqual(API_CONTRACTS.ai.match.path, '/api/ai/match');
      assert.strictEqual(API_CONTRACTS.ai.match.method, 'POST');
      assert.strictEqual(API_CONTRACTS.ai.match.auth, true);
    });

    it('runSystem endpoint', () => {
      assert.strictEqual(API_CONTRACTS.ai.runSystem.path, '/api/ai/run-system');
      assert.strictEqual(API_CONTRACTS.ai.runSystem.method, 'POST');
      assert.strictEqual(API_CONTRACTS.ai.runSystem.auth, true);
    });
  });

  it('cf stats endpoint', () => {
    assert.strictEqual(API_CONTRACTS.cf.stats.path, '/api/cf/stats');
    assert.strictEqual(API_CONTRACTS.cf.stats.method, 'GET');
    assert.strictEqual(API_CONTRACTS.cf.stats.auth, true);
  });

  it('profile unified endpoint', () => {
    assert.strictEqual(API_CONTRACTS.profile.unified.path, '/api/profile/unified');
    assert.strictEqual(API_CONTRACTS.profile.unified.method, 'GET');
    assert.strictEqual(API_CONTRACTS.profile.unified.auth, true);
  });
});

describe('COMMON_STATUSES', () => {
  it('APPLICATION has exactly 6 elements', () => {
    assert.strictEqual(COMMON_STATUSES.APPLICATION.length, 6);
    assert.deepStrictEqual(COMMON_STATUSES.APPLICATION, [
      'applied',
      'screening',
      'interview',
      'offer',
      'rejected',
      'withdrawn',
    ]);
  });

  it('PLATFORM has exactly 6 elements', () => {
    assert.strictEqual(COMMON_STATUSES.PLATFORM.length, 6);
    assert.deepStrictEqual(COMMON_STATUSES.PLATFORM, [
      'wanted',
      'jobkorea',
      'saramin',
      'linkedin',
      'remember',
      'manual',
    ]);
  });
});

describe('validateResponse', () => {
  it('valid response returns valid:true and empty errors', () => {
    const contract = { response: { status: 'string', timestamp: 'string' } };
    const response = { status: 'ok', timestamp: '123' };
    const result = validateResponse(contract, response);
    assert.strictEqual(result.valid, true);
    assert.deepStrictEqual(result.errors, []);
  });

  it('missing fields returns valid:false with errors', () => {
    const contract = { response: { status: 'string', timestamp: 'string' } };
    const response = { status: 'ok' };
    const result = validateResponse(contract, response);
    assert.strictEqual(result.valid, false);
    assert.strictEqual(result.errors.length, 1);
    assert.strictEqual(result.errors[0], 'Missing field: timestamp');
  });

  it('extra fields still valid', () => {
    const contract = { response: { status: 'string' } };
    const response = { status: 'ok', extra: 'field', another: 123 };
    const result = validateResponse(contract, response);
    assert.strictEqual(result.valid, true);
  });

  it('empty response fails', () => {
    const contract = { response: { status: 'string', timestamp: 'string' } };
    const response = {};
    const result = validateResponse(contract, response);
    assert.strictEqual(result.valid, false);
    assert.strictEqual(result.errors.length, 2);
  });
});
