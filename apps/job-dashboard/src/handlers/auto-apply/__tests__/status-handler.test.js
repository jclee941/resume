import assert from 'node:assert/strict';
import { describe, it, test } from 'node:test';

import { encrypt } from '@resume/shared/crypto';

import { getAutoApplyStatus } from '../status-handler.js';

const ENCRYPTION_KEY = btoa('0123456789abcdef0123456789abcdef');

async function createEnv(sessions = {}) {
  const store = new Map();
  for (const [platform, cookie] of Object.entries(sessions)) {
    store.set(`auth:${platform}`, await encrypt(cookie, { ENCRYPTION_KEY }));
  }
  return { ENCRYPTION_KEY, SESSIONS: { get: async (key) => store.get(key) ?? null } };
}

describe('getAutoApplyStatus', () => {
  it('derives authenticated from the KV session of each platform', async () => {
    const env = await createEnv({ wanted: 'wanted-cookie' });
    const { platforms } = await (await getAutoApplyStatus(env)).json();
    assert.equal(platforms.wanted.authenticated, true);
    assert.equal(platforms.jobkorea.authenticated, false);
    assert.equal(platforms.linkedin.authenticated, false);
    assert.equal(platforms.remember.authenticated, false);
  });

  it('reports a JobKorea session as authenticated once it is stored', async () => {
    const env = await createEnv({ jobkorea: 'PLAY_SESSION=abc' });
    const { platforms } = await (await getAutoApplyStatus(env)).json();
    assert.equal(platforms.jobkorea.authenticated, true);
    assert.equal(platforms.wanted.authenticated, false);
  });

  it('reports saramin as disabled even when a session is stored', async () => {
    const env = await createEnv({ saramin: 'stale-cookie' });
    const body = await (await getAutoApplyStatus(env)).json();
    assert.equal(body.platforms.saramin.authenticated, false);
    assert.equal(body.platforms.saramin.disabled, true);
    assert.deepEqual(body.disabledPlatforms, ['saramin']);
    assert.equal(body.platforms.wanted.disabled, undefined);
  });

  it('keeps the existing response fields', async () => {
    const body = await (await getAutoApplyStatus(await createEnv())).json();
    for (const field of ['enabled', 'supportedPlatforms', 'todayApplications', 'remaining']) {
      assert.ok(field in body, field);
    }
    assert.equal(body.platforms.wanted.mode, 'direct');
  });
});

function database(failure) {
  return {
    prepare(sql) {
      return {
        bind() {
          return {
            async all() {
              if (failure === 'config') throw new Error('D1 unavailable');
              return {
                results: [
                  { key: 'auto_apply_enabled', value: 'true' },
                  { key: 'max_daily_applications', value: '30' },
                  { key: 'min_match_score', value: '60' },
                ],
              };
            },
            async first() {
              if (
                failure === 'counts' ||
                (failure === 'platform-count' && sql.includes('source =')) ||
                (failure === 'approvals' &&
                  (sql.includes('approval_requests') || sql.includes('status IN')))
              ) {
                throw new Error('D1 unavailable');
              }
              if (failure === 'legacy-approvals' && sql.includes('approval_requests')) {
                throw new Error('no such table: approval_requests');
              }
              return { count: sql.includes('status IN') ? 2 : 7 };
            },
          };
        },
      };
    },
  };
}

test('status reports stored configuration and application counts', async () => {
  const response = await getAutoApplyStatus({ JOB_DB: database() });
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.enabled, true);
  assert.equal(body.todayApplications, 7);
  assert.equal(body.remaining, 23);
  assert.equal(body.minMatchScore, 60);
  assert.equal(body.pendingApprovals, 2);
});

for (const failure of ['config', 'counts', 'platform-count', 'approvals']) {
  test(`status reports unavailable storage when ${failure} reads fail`, async () => {
    const response = await getAutoApplyStatus({ JOB_DB: database(failure) });
    const body = await response.json();
    assert.equal(response.status, 503);
    assert.equal(body.code, 'AUTOMATION_STATUS_UNAVAILABLE');
    assert.equal('enabled' in body, false);
    assert.equal(JSON.stringify(body).includes('D1 unavailable'), false);
  });
}

test('status keeps disabled defaults when the database binding is absent', async () => {
  const response = await getAutoApplyStatus({});
  assert.equal(response.status, 200);
  assert.equal((await response.json()).enabled, false);
});

test('status preserves legacy pending-approval counting', async () => {
  const response = await getAutoApplyStatus({ JOB_DB: database('legacy-approvals') });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).pendingApprovals, 2);
});
