import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';

import { encrypt } from '@resume/shared/crypto';
import {
  decryptPlatformSession,
  platformSessionKey,
  readPlatformSession,
  writePlatformSession,
} from '../platform-session.js';

const ENCRYPTION_KEY = btoa('0123456789abcdef0123456789abcdef');

function createKv(initial = {}) {
  const store = new Map(Object.entries(initial));
  return {
    store,
    get: mock.fn(async (key) => store.get(key) ?? null),
    put: mock.fn(async (key, value) => {
      store.set(key, value);
    }),
  };
}

describe('platform session storage', () => {
  it('stores only ciphertext under auth:<platform> with the given TTL', async () => {
    const SESSIONS = createKv();
    const env = { ENCRYPTION_KEY, SESSIONS };

    await writePlatformSession(env, 'wanted', 'WWW_ONEID_ACCESS_TOKEN=abc', 3600);

    const [key, stored, options] = SESSIONS.put.mock.calls[0].arguments;
    assert.equal(key, platformSessionKey('wanted'));
    assert.equal(key, 'auth:wanted');
    assert.doesNotMatch(stored, /WWW_ONEID_ACCESS_TOKEN/);
    assert.deepEqual(options, { expirationTtl: 3600 });
    assert.equal(await readPlatformSession(env, 'wanted'), 'WWW_ONEID_ACCESS_TOKEN=abc');
  });

  it('returns null when no session is stored', async () => {
    const env = { ENCRYPTION_KEY, SESSIONS: createKv() };
    assert.equal(await readPlatformSession(env, 'jobkorea'), null);
    assert.equal(await readPlatformSession({}, 'jobkorea'), null);
  });

  it('treats legacy plaintext and foreign-key ciphertext as absent', async (t) => {
    const warn = t.mock.method(console, 'warn', () => {});
    const otherKey = btoa('fedcba9876543210fedcba9876543210');
    const foreign = await encrypt('WWW_ONEID_ACCESS_TOKEN=other', { ENCRYPTION_KEY: otherKey });
    const env = {
      ENCRYPTION_KEY,
      SESSIONS: createKv({
        'auth:wanted': 'WWW_ONEID_ACCESS_TOKEN=plaintext',
        'auth:jobkorea': foreign,
      }),
    };

    assert.equal(await readPlatformSession(env, 'wanted'), null);
    assert.equal(await readPlatformSession(env, 'jobkorea'), null);
    assert.equal(warn.mock.callCount(), 2);
    const warnings = warn.mock.calls.map((call) => call.arguments.join(' ')).join('\n');
    assert.match(warnings, /auth:wanted/);
    assert.doesNotMatch(warnings, /plaintext|WWW_ONEID/);
  });

  it('decrypts values handed over by callers that already read KV', async () => {
    const stored = await encrypt('{"cookies":"a=b"}', { ENCRYPTION_KEY });
    assert.equal(await decryptPlatformSession(stored, { ENCRYPTION_KEY }), '{"cookies":"a=b"}');
    assert.equal(await decryptPlatformSession(undefined, { ENCRYPTION_KEY }), null);
  });
});
