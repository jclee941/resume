import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

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
