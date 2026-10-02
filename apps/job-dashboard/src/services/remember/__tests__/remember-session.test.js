import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { writePlatformSession } from '../../platform-session.js';
import { RememberApiError } from '../remember-api.js';
import { mintRememberToken, withRememberToken } from '../remember-session.js';

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

function createLoginFetch({ code = 'ok', calls = [] } = {}) {
  return async (url, init) => {
    calls.push({ url: String(url), init });
    if (String(url).endsWith('/auths/login')) {
      return new Response(JSON.stringify({ code, message: code === 'ok' ? null : 'bad' }), {
        status: 200,
        headers: [
          ['content-type', 'application/json'],
          ['set-cookie', 'remember_shared_data=enc%3D; Domain=.rememberapp.co.kr; Path=/'],
        ],
      });
    }
    if (String(url).endsWith('/shared_data/decrypt')) {
      return Response.json({ data: { token: 'token-from-login' }, meta: {} });
    }
    throw new Error(`unexpected request ${url}`);
  };
}

describe('mintRememberToken', () => {
  it('logs in with the device cookie and decrypts the shared data cookie into a token', async () => {
    const calls = [];

    const token = await mintRememberToken(createEnv(), { fetchImpl: createLoginFetch({ calls }) });

    assert.equal(token, 'token-from-login');
    assert.equal(calls[0].init.headers.Cookie, '_remember_device_id=device-1');
    assert.deepEqual(JSON.parse(calls[0].init.body), {
      email: 'me@example.com',
      password: 'secret',
    });
    assert.deepEqual(JSON.parse(calls[1].init.body), { encrypted_data: 'enc=' });
  });

  it('reports the login error code instead of decrypting anything', async () => {
    const calls = [];

    await assert.rejects(
      mintRememberToken(createEnv(), {
        fetchImpl: createLoginFetch({ code: 'invalid_params', calls }),
      }),
      /invalid_params/
    );
    assert.equal(calls.length, 1);
  });
});

describe('withRememberToken', () => {
  it('logs in again when Remember rejects the stored token', async () => {
    const env = createEnv();
    await writePlatformSession(env, 'remember', 'stale-token', 60);
    const seen = [];

    const result = await withRememberToken(
      env,
      async (token) => {
        seen.push(token);
        if (token === 'stale-token') throw new RememberApiError('expired', 401, null);
        return 'done';
      },
      { fetchImpl: createLoginFetch() }
    );

    assert.equal(result, 'done');
    assert.deepEqual(seen, ['stale-token', 'token-from-login']);
  });
});
