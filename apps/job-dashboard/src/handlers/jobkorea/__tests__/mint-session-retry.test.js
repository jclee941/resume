import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';

import { refreshJobKoreaSession } from '../mint-session.js';

const ENV = {
  JOBKOREA_USERNAME: 'someone@example.com',
  JOBKOREA_PASSWORD: 'super-secret',
  ENCRYPTION_KEY: btoa('0123456789abcdef0123456789abcdef'),
};
const TIMEOUT = () => new Error('Navigation timeout of 30000 ms exceeded');
const input = () => ({ click: mock.fn(async () => {}), type: mock.fn(async () => {}) });

/** One logged-out login page per browser borrow; `gotoError` makes its first navigation throw. */
function loginPage(gotoError) {
  const inputs = { 'input[name="M_ID"]': input(), 'input[name="M_PWD"]': input() };
  return {
    setRequestInterception: mock.fn(async () => {}),
    on: mock.fn(),
    goto: mock.fn(async () => {
      if (gotoError) throw gotoError;
    }),
    $: mock.fn(async (selector) => inputs[selector] ?? null),
    $$: mock.fn(async () => [
      { evaluate: mock.fn(async () => true), click: mock.fn(async () => {}) },
    ]),
    evaluate: mock.fn(async () => true),
    waitForNavigation: mock.fn(async () => {}),
    cookies: mock.fn(async () => [
      { name: 'PLAY_SESSION', value: 'sess', domain: '.jobkorea.co.kr' },
    ]),
    close: mock.fn(async () => {}),
    url: () => 'https://www.jobkorea.co.kr/Login/Login_Tot.asp',
    title: mock.fn(async () => 'JobKorea Login'),
  };
}

/** Each borrow gets the next scripted navigation outcome (an Error or undefined for success). */
function borrows(outcomes) {
  const queue = [...outcomes];
  return mock.fn(async (_env, fn) => {
    const page = loginPage(queue.shift());
    return fn({
      createBrowserContext: async () => ({ newPage: async () => page, close: async () => {} }),
    });
  });
}

describe('refreshJobKoreaSession login page timeout retry', () => {
  it('retries once when the login page navigation times out, then stores the session', async () => {
    const env = { ...ENV, SESSIONS: { put: mock.fn(async () => {}) } };
    const withBrowserSession = borrows([TIMEOUT(), undefined]);

    const result = await refreshJobKoreaSession(env, { withBrowserSession });

    assert.equal(result.ok, true);
    assert.equal(result.attempts, 2);
    assert.equal(withBrowserSession.mock.callCount(), 2);
    assert.equal(env.SESSIONS.put.mock.callCount(), 1);
  });

  it('does not retry a failure after the login page loaded', async () => {
    const env = { ...ENV, SESSIONS: { put: mock.fn(async () => {}) } };
    const withBrowserSession = borrows([new Error('JobKorea email input not found')]);

    const result = await refreshJobKoreaSession(env, { withBrowserSession });

    assert.deepEqual(result, { ok: false, error: 'JobKorea email input not found' });
    assert.equal(withBrowserSession.mock.callCount(), 1);
  });

  it('reports the timeout after the retry also times out, without writing KV', async () => {
    const env = { ...ENV, SESSIONS: { put: mock.fn(async () => {}) } };
    const withBrowserSession = borrows([TIMEOUT(), TIMEOUT()]);

    const result = await refreshJobKoreaSession(env, { withBrowserSession });

    assert.deepEqual(result, {
      ok: false,
      error: 'Navigation timeout of 30000 ms exceeded; pending: none',
    });
    assert.equal(withBrowserSession.mock.callCount(), 2);
    assert.equal(env.SESSIONS.put.mock.callCount(), 0);
  });
});
