import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';

import { JOBKOREA_LOGIN_URL, mintJobKoreaSession } from '../mint-session.js';

const CREDS = { JOBKOREA_USERNAME: 'someone@example.com', JOBKOREA_PASSWORD: 'super-secret' };
const TIMEOUT = () => new Error('Navigation timeout of 45000 ms exceeded');
const input = () => ({ click: mock.fn(async () => {}), type: mock.fn(async () => {}) });

/**
 * Fake login page: `gotoOutcomes` are consumed per goto call (an Error is thrown, anything else
 * resolves); the login form is in the DOM once `formAfter` goto calls have been made.
 */
function fakePage({ gotoOutcomes = [], formAfter = 1 } = {}) {
  const outcomes = [...gotoOutcomes];
  const form = { 'input[name="M_ID"]': input(), 'input[name="M_PWD"]': input() };
  const page = {
    gotoCalls: 0,
    goto: mock.fn(async () => {
      page.gotoCalls += 1;
      const outcome = outcomes.shift();
      if (outcome instanceof Error) throw outcome;
    }),
    $: mock.fn(async (selector) => (page.gotoCalls >= formAfter ? (form[selector] ?? null) : null)),
    $$: mock.fn(async () => [
      { evaluate: mock.fn(async () => true), click: mock.fn(async () => {}) },
    ]),
    evaluate: mock.fn(async () => true),
    waitForNavigation: mock.fn(async () => {}),
    cookies: mock.fn(async () => [
      { name: 'PLAY_SESSION', value: 'sess', domain: '.jobkorea.co.kr' },
    ]),
    close: mock.fn(async () => {}),
    url: () => JOBKOREA_LOGIN_URL,
    title: mock.fn(async () => 'JobKorea Login'),
  };
  return page;
}

const session = (page) => ({
  withBrowserSession: async (_env, run) => run({ newPage: async () => page }),
});

describe('mintJobKoreaSession login navigation', () => {
  it('uses a 45 s navigation timeout', async () => {
    const page = fakePage();
    await mintJobKoreaSession(CREDS, session(page));
    assert.equal(page.goto.mock.calls[0].arguments[1].timeout, 45_000);
  });

  it('logs in on a timed-out navigation whose document already has the login form', async () => {
    const page = fakePage({ gotoOutcomes: [TIMEOUT()], formAfter: 1 });
    assert.equal(await mintJobKoreaSession(CREDS, session(page)), 'PLAY_SESSION=sess');
    assert.equal(page.goto.mock.callCount(), 1);
  });

  it('retries once when the timed-out document has no login form yet', async () => {
    const page = fakePage({ gotoOutcomes: [TIMEOUT(), undefined], formAfter: 2 });
    assert.equal(await mintJobKoreaSession(CREDS, session(page)), 'PLAY_SESSION=sess');
    assert.equal(page.goto.mock.callCount(), 2);
  });

  it('reports the timeout after the retry also times out without a form', async () => {
    const page = fakePage({ gotoOutcomes: [TIMEOUT(), TIMEOUT()], formAfter: 99 });
    await assert.rejects(mintJobKoreaSession(CREDS, session(page)), /timeout/i);
    assert.equal(page.goto.mock.callCount(), 2);
  });

  it('does not treat a non-timeout navigation error as a loaded page', async () => {
    const page = fakePage({ gotoOutcomes: [new Error('net::ERR_FAILED')], formAfter: 1 });
    await assert.rejects(mintJobKoreaSession(CREDS, session(page)), /ERR_FAILED/);
    assert.equal(page.goto.mock.callCount(), 1);
  });
});
