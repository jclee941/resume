import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';

import { decrypt, encrypt } from '@resume/shared/crypto';

import { mintJobKoreaSession } from '../mint-session.js';
import { JOBKOREA_2FA_CODE_KEY } from '../two-factor-code.js';

const ENCRYPTION_KEY = btoa('0123456789abcdef0123456789abcdef');
const LOGIN_URL = 'https://www.jobkorea.co.kr/Login/Login_Tot.asp';
const CHALLENGE_URL = 'https://www.jobkorea.co.kr/user/TwoFactorAuth/Index?token=t';
const MY_PAGE_URL = 'https://www.jobkorea.co.kr/user/mypage';
const TRUST_EXPIRES = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
const SESSION = {
  name: 'C%5FUSER',
  value: 'u1',
  domain: '.jobkorea.co.kr',
  path: '/',
  expires: -1,
};
const TRUST = { ...SESSION, name: 'TFA_TRUST', value: 't1', expires: TRUST_EXPIRES };

function memoryKv() {
  const store = new Map();
  return {
    store,
    get: mock.fn(async (key) => store.get(key) ?? null),
    put: mock.fn(async (key, value) => {
      store.set(key, value);
    }),
  };
}

function env(kv) {
  return {
    JOBKOREA_USERNAME: 'someone@example.com',
    JOBKOREA_PASSWORD: 'super-secret',
    ENCRYPTION_KEY,
    JOB_DB: {},
    SESSIONS: kv,
  };
}

// Login page that JobKorea answers with the two-factor challenge; the emailed code lands in KV when
// it is sent, and confirming the completion dialog moves on to My Page.
function challengedLoginPage(kv) {
  let url = LOGIN_URL;
  let verified = false;
  const pending = [];
  const answer = (path) => {
    const response = {
      url: () => `https://www.jobkorea.co.kr/user${path}`,
      request: () => ({ method: () => 'POST' }),
      json: async () => ({ code: 'OK' }),
    };
    pending.find(({ predicate }) => predicate(response))?.resolve(response);
  };
  const field = () => ({ click: mock.fn(async () => {}), type: mock.fn(async () => {}) });
  const fields = { 'input[name="M_ID"]': field(), 'input[name="M_PWD"]': field() };
  return {
    setCookie: mock.fn(async () => {}),
    on: mock.fn(),
    setRequestInterception: mock.fn(async () => {}),
    goto: mock.fn(async () => {}),
    $: mock.fn(async (selector) => fields[selector] ?? null),
    $$: mock.fn(async () => [
      { evaluate: async () => true, click: async () => void (url = CHALLENGE_URL) },
    ]),
    url: () => url,
    waitForResponse: (predicate) => new Promise((resolve) => pending.push({ predicate, resolve })),
    click: mock.fn(async (selector) => {
      if (selector === '#tfaBtnSend') {
        kv.store.set(
          JOBKOREA_2FA_CODE_KEY,
          JSON.stringify({ code: '482913', receivedAt: Date.now() })
        );
        answer('/TwoFactorAuth/Send');
      } else if (selector === '#tfaBtnSubmit') {
        verified = true;
        answer('/TwoFactorAuth/Verify');
      } else if (selector === '#tfaDialogOk' && verified) {
        url = MY_PAGE_URL;
      }
    }),
    waitForSelector: async () => {},
    type: mock.fn(async () => {}),
    waitForNavigation: async () => {},
    evaluate: mock.fn(async () => url === MY_PAGE_URL),
    cookies: mock.fn(async () => (verified ? [SESSION, TRUST] : [SESSION])),
    title: async () => 'JobKorea',
    close: async () => {},
  };
}

function withPage(page) {
  return async (_env, fn) =>
    fn({
      createBrowserContext: async () => ({ newPage: async () => page, close: async () => {} }),
    });
}

const twoFactor = { codeWait: { timeoutMs: 0, sleep: async () => {} }, notify: async () => {} };

describe('mintJobKoreaSession two-factor challenge', () => {
  it('clears the challenge with the emailed code and stores the device trust', async () => {
    const kv = memoryKv();
    const page = challengedLoginPage(kv);

    const cookie = await mintJobKoreaSession(env(kv), {
      withBrowserSession: withPage(page),
      twoFactor,
    });

    assert.equal(cookie, 'C%5FUSER=u1; TFA_TRUST=t1');
    assert.deepEqual(page.type.mock.calls[0].arguments, ['#tfaCertNum', '482913']);
    const trust = JSON.parse(
      await decrypt(kv.store.get('auth:jobkorea-trust'), { ENCRYPTION_KEY })
    );
    assert.deepEqual(
      trust.map(({ name }) => name),
      ['TFA_TRUST']
    );
  });

  it('sets the stored trust cookies before the login page opens', async () => {
    const kv = memoryKv();
    kv.store.set('auth:jobkorea-trust', await encrypt(JSON.stringify([TRUST]), { ENCRYPTION_KEY }));
    const page = challengedLoginPage(kv);
    const order = [];
    page.setCookie = mock.fn(async () => order.push('setCookie'));
    page.goto = mock.fn(async () => order.push('goto'));

    await mintJobKoreaSession(env(kv), { withBrowserSession: withPage(page), twoFactor });

    assert.deepEqual(order.slice(0, 2), ['setCookie', 'goto']);
    assert.equal(page.setCookie.mock.calls[0].arguments[0].name, 'TFA_TRUST');
  });
});
