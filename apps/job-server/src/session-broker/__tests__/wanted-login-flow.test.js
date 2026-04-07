import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { WantedLoginFlow } from '../browser/wanted-login-flow.js';
import { WANTED_LOGIN_ERRORS } from '../browser/wanted-login-flow-helpers.js';

function createBrowserHarness({ states = [], cookies = [], gotoErrors = [] } = {}) {
  const gotoCalls = [];
  const evaluateCalls = [];
  let closed = 0;
  const page = {
    async goto(url) {
      gotoCalls.push(url);
      const nextError = gotoErrors.shift();
      if (nextError) throw nextError;
      return { ok: true };
    },
    async evaluate(expression) {
      evaluateCalls.push(expression);
      const next = states.shift();
      if (next instanceof Error) throw next;
      return typeof next === 'function' ? next(expression) : next;
    },
    async getCookies() {
      return cookies;
    },
    async close() {
      closed += 1;
    },
  };

  return {
    page,
    gotoCalls,
    evaluateCalls,
    get closed() {
      return closed;
    },
  };
}

function createValidationResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return body;
    },
  };
}

describe('WantedLoginFlow', () => {
  it('returns cookies immediately when already logged in', async () => {
    const cookies = [{ name: 'ONEID', value: 'token', domain: '.wanted.co.kr', path: '/' }];
    const browser = createBrowserHarness({
      states: [{ loggedIn: true, captcha: false, waf: false, loginForm: false }],
      cookies,
    });
    const sessionManager = {
      saveCalls: [],
      save(platform, data) {
        this.saveCalls.push({ platform, data });
      },
    };

    const result = await new WantedLoginFlow({
      env: {
        WANTED_EMAIL: 'user@example.com',
        WANTED_PASSWORD: 'secret',
        SESSION_ENCRYPTION_KEY: 'a'.repeat(64),
      },
      browserFactory: () => ({ launch: async () => browser.page }),
      fetchImpl: async () =>
        createValidationResponse({ id: 1, email: 'user@example.com', name: 'User' }),
      sessionManager,
      sleep: async () => {},
      random: () => 0,
    }).execute();

    assert.equal(result.authenticated, true);
    assert.equal(result.cookieCount, 1);
    assert.equal(browser.gotoCalls[0], 'https://www.wanted.co.kr/');
    assert.equal(browser.gotoCalls.includes('https://www.wanted.co.kr/login'), false);
    assert.equal(sessionManager.saveCalls.length, 1);
    assert.equal(sessionManager.saveCalls[0].platform, 'wanted');
    assert.equal(browser.closed, 1);
  });

  it('fills credentials during login flow', async () => {
    const cookies = [
      { name: 'wanted_access_token', value: 'token', domain: '.wanted.co.kr', path: '/' },
    ];
    const browser = createBrowserHarness({
      states: [
        { loggedIn: false, captcha: false, waf: false, loginForm: false },
        { loggedIn: false, captcha: false, waf: false, loginForm: true },
        (expression) => {
          assert.match(expression, /login@example.com/);
          assert.match(expression, /pw-1234/);
          return { emailFilled: true, passwordFilled: true, submitted: true };
        },
        { loggedIn: true, captcha: false, waf: false, loginForm: false },
      ],
      cookies,
    });

    const result = await new WantedLoginFlow({
      env: { WANTED_EMAIL: 'login@example.com', WANTED_PASSWORD: 'pw-1234' },
      encryptionService: { encrypt: () => 'encrypted-session' },
      browserFactory: () => ({ launch: async () => browser.page }),
      fetchImpl: async () =>
        createValidationResponse({ id: 2, email: 'login@example.com', name: 'Login User' }),
      sessionManager: { save() {} },
      sleep: async () => {},
      random: () => 0,
    }).execute();

    assert.equal(result.email, 'login@example.com');
    assert.equal(result.encryptedSession, 'encrypted-session');
    assert.deepEqual(browser.gotoCalls, [
      'https://www.wanted.co.kr/',
      'https://www.wanted.co.kr/login',
    ]);
    assert.equal(browser.evaluateCalls.length, 4);
  });

  it('raises a specific error when CAPTCHA is detected', async () => {
    const browser = createBrowserHarness({
      states: [
        { loggedIn: false, captcha: false, waf: false, loginForm: false },
        { loggedIn: false, captcha: true, waf: false, loginForm: true },
      ],
    });

    await assert.rejects(
      () =>
        new WantedLoginFlow({
          env: { WANTED_EMAIL: 'user@example.com', WANTED_PASSWORD: 'secret' },
          browserFactory: () => ({ launch: async () => browser.page }),
          fetchImpl: async () => createValidationResponse({}),
          sessionManager: { save() {} },
          sleep: async () => {},
          random: () => 0,
        }).execute(),
      (error) => error.code === WANTED_LOGIN_ERRORS.CAPTCHA_DETECTED
    );
  });

  it('retries when CloudFront challenge is detected', async () => {
    const firstBrowser = createBrowserHarness({
      states: [{ loggedIn: false, captcha: false, waf: true, loginForm: false }],
    });
    const secondBrowser = createBrowserHarness({
      states: [{ loggedIn: true, captcha: false, waf: false, loginForm: false }],
      cookies: [{ name: 'ONEID', value: 'token-2', domain: '.wanted.co.kr', path: '/' }],
    });
    const browsers = [firstBrowser, secondBrowser];
    const delays = [];

    const result = await new WantedLoginFlow({
      env: { WANTED_EMAIL: 'user@example.com', WANTED_PASSWORD: 'secret' },
      browserFactory: () => ({ launch: async () => browsers.shift().page }),
      fetchImpl: async () =>
        createValidationResponse({ id: 3, email: 'user@example.com', name: 'Retry User' }),
      sessionManager: { save() {} },
      sleep: async (ms) => delays.push(ms),
      random: () => 0,
    }).execute();

    assert.equal(result.authenticated, true);
    assert.equal(delays[0], 300);
    assert.equal(delays[1], 1000);
    assert.equal(firstBrowser.closed, 1);
    assert.equal(secondBrowser.closed, 1);
  });
});
