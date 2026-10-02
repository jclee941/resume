import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { writePlatformSession } from '../../platform-session.js';
import { syncRememberFromSsot } from '../remember.js';

const ENCRYPTION_KEY = btoa('0123456789abcdef0123456789abcdef');

function createEnv(kv = new Map()) {
  return {
    REMEMBER_EMAIL: 'me@example.com',
    REMEMBER_PASSWORD: 'secret',
    REMEMBER_DEVICE_ID: 'device-1',
    ENCRYPTION_KEY,
    SESSIONS: {
      get: async (key) => kv.get(key) ?? null,
      put: async (key, value) => void kv.set(key, value),
    },
  };
}

const ssot = { careers: [{ company: '에이', period: '2025.03 ~ 2026.02', role: 'SRE' }] };

function profileFetch(puts) {
  return async (url, init = {}) => {
    if (String(url).endsWith('/v2/open_profiles/me')) {
      return Response.json({
        code: 'ok',
        data: {
          open_profile: {
            id: 7,
            careers_attributes: [
              { id: 1, company: '비', joined_date: '2026-06-01', present: true, main: true },
            ],
          },
        },
      });
    }
    if (init.method === 'PUT') {
      puts.push(JSON.parse(init.body).open_profile);
      return Response.json({ code: 'ok', data: {} });
    }
    throw new Error(`unexpected request ${url}`);
  };
}

describe('syncRememberFromSsot', () => {
  it('moves the main flag before it removes the career the SSoT does not list', async () => {
    const env = createEnv();
    await writePlatformSession(env, 'remember', 'token-1', 60);
    const puts = [];

    const result = await syncRememberFromSsot(env, ssot, {
      dryRun: false,
      fetchImpl: profileFetch(puts),
    });

    assert.equal(result.success, true);
    assert.deepEqual(
      puts.map((body) =>
        body.careers_attributes.map((career) => [
          career.id,
          career.company,
          career.main,
          career._destroy,
        ])
      ),
      [[[undefined, '에이', true, undefined]], [[1, undefined, undefined, true]]]
    );
  });

  it('saves nothing on a dry run', async () => {
    const env = createEnv();
    await writePlatformSession(env, 'remember', 'token-1', 60);
    const puts = [];

    const result = await syncRememberFromSsot(env, ssot, {
      dryRun: true,
      fetchImpl: profileFetch(puts),
    });

    assert.deepEqual(result.changes, { careers_attributes: 2 });
    assert.equal(puts.length, 0);
  });
});
