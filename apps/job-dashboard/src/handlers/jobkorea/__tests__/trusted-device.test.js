import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';

import { decrypt } from '@resume/shared/crypto';

import { injectTrustedDevice, rememberTrustedDevice } from '../trusted-device.js';

const ENCRYPTION_KEY = btoa('0123456789abcdef0123456789abcdef');
const NOW = Date.UTC(2026, 10, 16, 9, 0, 0);
const NOW_S = NOW / 1000;
const DAY_S = 24 * 60 * 60;

function cookie(name, value, expires = -1, domain = '.jobkorea.co.kr') {
  return { name, value, domain, path: '/', expires, httpOnly: true, secure: true, size: 1 };
}

function memoryKv() {
  const store = new Map();
  return {
    store,
    get: mock.fn(async (key) => store.get(key)?.value ?? null),
    put: mock.fn(async (key, value, options) => {
      store.set(key, { value, options });
    }),
  };
}

describe('rememberTrustedDevice', () => {
  it('stores the persistent JobKorea cookies encrypted, kept as long as the latest one', async () => {
    const env = { ENCRYPTION_KEY, SESSIONS: memoryKv() };
    const before = [cookie('ASP.NET_SessionId', 's1'), cookie('C%5FUSER', 'u1', NOW_S + DAY_S)];
    const after = [
      cookie('ASP.NET_SessionId', 's1'),
      cookie('C%5FUSER', 'u2', NOW_S + DAY_S),
      cookie('TFA_TRUST', 't1', NOW_S + 30 * DAY_S),
      cookie('tracker', 'x', NOW_S + 400 * DAY_S, '.example.com'),
    ];

    const changed = await rememberTrustedDevice(env, { before, after }, () => NOW);

    assert.deepEqual(changed, ['C%5FUSER', 'TFA_TRUST']);
    const { value, options } = env.SESSIONS.store.get('auth:jobkorea-trust');
    assert.doesNotMatch(value, /t1/);
    const stored = JSON.parse(await decrypt(value, { ENCRYPTION_KEY }));
    assert.deepEqual(
      stored.map(({ name }) => name),
      ['C%5FUSER', 'TFA_TRUST']
    );
    assert.equal(options.expirationTtl, 30 * DAY_S);
    assert.deepEqual(options.metadata.changedCookies, ['C%5FUSER', 'TFA_TRUST']);
  });

  it('caps the stored trust at 90 days', async () => {
    const env = { ENCRYPTION_KEY, SESSIONS: memoryKv() };
    const after = [cookie('TFA_TRUST', 't1', NOW_S + 365 * DAY_S)];

    await rememberTrustedDevice(env, { before: [], after }, () => NOW);

    assert.equal(env.SESSIONS.store.get('auth:jobkorea-trust').options.expirationTtl, 90 * DAY_S);
  });
});

describe('injectTrustedDevice', () => {
  it('sets the stored, unexpired trust cookies on the page', async () => {
    const env = { ENCRYPTION_KEY, SESSIONS: memoryKv() };
    const after = [cookie('TFA_TRUST', 't1', NOW_S + 30 * DAY_S)];
    await rememberTrustedDevice(env, { before: [], after }, () => NOW);
    const page = { setCookie: mock.fn(async () => {}) };

    assert.equal(await injectTrustedDevice(page, env, () => NOW + DAY_S * 1000), true);
    assert.deepEqual(page.setCookie.mock.calls[0].arguments, [
      {
        name: 'TFA_TRUST',
        value: 't1',
        domain: '.jobkorea.co.kr',
        path: '/',
        expires: NOW_S + 30 * DAY_S,
        httpOnly: true,
        secure: true,
      },
    ]);
    assert.equal(await injectTrustedDevice(page, env, () => NOW + 31 * DAY_S * 1000), false);
  });

  it('sets nothing when no trust is stored', async () => {
    const page = { setCookie: mock.fn(async () => {}) };
    assert.equal(await injectTrustedDevice(page, { ENCRYPTION_KEY, SESSIONS: memoryKv() }), false);
    assert.equal(page.setCookie.mock.callCount(), 0);
  });
});
