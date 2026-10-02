import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';

import { mintJobKoreaSession } from '../mint-session.js';

const CREDS = { JOBKOREA_USERNAME: 'someone@example.com', JOBKOREA_PASSWORD: 'super-secret' };
const input = () => ({ click: mock.fn(async () => {}), type: mock.fn(async () => {}) });

/** Fake page; `form` decides whether the login inputs exist (a logged-in browser has none). */
function fakePage({ form }) {
  const inputs = form
    ? {
        'input[name="M_ID"]': input(),
        'input[name="M_PWD"]': input(),
        '#IP_ONOFF': { evaluate: async () => {} },
      }
    : {};
  return {
    setRequestInterception: mock.fn(async () => {}),
    on: mock.fn(),
    goto: mock.fn(async () => {}),
    $: mock.fn(async (selector) => inputs[selector] ?? null),
    $$: mock.fn(async () => [
      { evaluate: mock.fn(async () => true), click: mock.fn(async () => {}) },
    ]),
    evaluate: mock.fn(async () => true),
    waitForNavigation: mock.fn(async () => {}),
    cookies: mock.fn(async () => [
      { name: 'PLAY_SESSION', value: 'fresh', domain: '.jobkorea.co.kr' },
    ]),
    close: mock.fn(async () => {}),
    url: () => 'https://www.jobkorea.co.kr/Login/Login_Tot.asp',
    title: mock.fn(async () => 'JobKorea Login'),
  };
}

describe('mintJobKoreaSession browser context', () => {
  it('logs in inside a fresh context even when the pooled default context is already logged in', async () => {
    const pooledPage = fakePage({ form: false });
    const freshPage = fakePage({ form: true });
    const context = { newPage: mock.fn(async () => freshPage), close: mock.fn(async () => {}) };
    const browser = {
      newPage: mock.fn(async () => pooledPage),
      createBrowserContext: mock.fn(async () => context),
    };

    const cookie = await mintJobKoreaSession(CREDS, {
      withBrowserSession: async (_env, fn) => fn(browser),
    });

    assert.equal(cookie, 'PLAY_SESSION=fresh');
    assert.equal(browser.newPage.mock.callCount(), 0);
    assert.equal(browser.createBrowserContext.mock.callCount(), 1);
    assert.equal(freshPage.goto.mock.callCount(), 1);
    assert.equal(context.close.mock.callCount(), 1);
  });

  it('closes the fresh context when the login fails', async () => {
    const context = {
      newPage: mock.fn(async () => fakePage({ form: false })),
      close: mock.fn(async () => {}),
    };
    const browser = { createBrowserContext: mock.fn(async () => context) };

    await assert.rejects(
      mintJobKoreaSession(CREDS, { withBrowserSession: async (_env, fn) => fn(browser) }),
      /email input not found/
    );
    assert.equal(context.close.mock.callCount(), 1);
  });
});

describe('mintJobKoreaSession context cleanup', () => {
  it('closes the fresh context when opening its page fails', async () => {
    const context = {
      newPage: mock.fn(async () => {
        throw new Error('Target closed');
      }),
      close: mock.fn(async () => {}),
    };
    const browser = { createBrowserContext: mock.fn(async () => context) };

    await assert.rejects(
      mintJobKoreaSession(CREDS, { withBrowserSession: async (_env, fn) => fn(browser) }),
      /Target closed/
    );
    assert.equal(context.close.mock.callCount(), 1);
  });

  it('stops waiting for a hung page and context close', { timeout: 2000 }, async () => {
    const hang = () => new Promise(() => {});
    const page = { ...fakePage({ form: false }), close: mock.fn(hang) };
    const context = { newPage: mock.fn(async () => page), close: mock.fn(hang) };
    const browser = { createBrowserContext: mock.fn(async () => context) };

    await assert.rejects(
      mintJobKoreaSession(CREDS, {
        withBrowserSession: async (_env, fn) => fn(browser),
        cleanupMs: 5,
      }),
      /email input not found/
    );
    assert.equal(page.close.mock.callCount(), 1);
    assert.equal(context.close.mock.callCount(), 1);
  });
});
