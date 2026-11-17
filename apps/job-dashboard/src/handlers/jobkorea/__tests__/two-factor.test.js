import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';

import { JOBKOREA_2FA_REQUIRED, resolveTwoFactor } from '../two-factor.js';
import { JOBKOREA_2FA_CODE_KEY, MAX_AUTOMATED_SENDS_PER_DAY } from '../two-factor-code.js';

const SENT_AT = Date.UTC(2026, 10, 16, 9, 0, 0);
const SEND_COUNT_KEY = 'jobkorea:2fa:sends:2026-11-16';

function memoryKv(entries = {}) {
  const store = new Map(Object.entries(entries));
  return {
    store,
    get: mock.fn(async (key) => store.get(key) ?? null),
    put: mock.fn(async (key, value) => {
      store.set(key, value);
    }),
  };
}

// A challenge page whose Send/Verify endpoints answer with the given codes. `onSend` runs when the
// code is sent, standing in for the mail arriving.
function challengePage({ sendAnswer = 'OK', verifyAnswer = 'OK', onSend = () => {} } = {}) {
  const clicks = [];
  const pending = [];
  const answers = { '/TwoFactorAuth/Send': sendAnswer, '/TwoFactorAuth/Verify': verifyAnswer };
  return {
    clicks,
    url: () => 'https://www.jobkorea.co.kr/user/TwoFactorAuth/Index?token=t',
    waitForResponse: mock.fn(
      (predicate) =>
        new Promise((resolve) => {
          pending.push({ predicate, resolve });
        })
    ),
    click: mock.fn(async (selector) => {
      clicks.push(selector);
      const path = {
        '#tfaBtnSend': '/TwoFactorAuth/Send',
        '#tfaBtnSubmit': '/TwoFactorAuth/Verify',
      }[selector];
      if (!path) return;
      if (path.endsWith('Send')) onSend();
      const response = {
        url: () => `https://www.jobkorea.co.kr/user${path}`,
        request: () => ({ method: () => 'POST' }),
        json: async () => ({ code: answers[path] }),
      };
      const waiter = pending.find(({ predicate }) => predicate(response));
      waiter?.resolve(response);
    }),
    waitForSelector: mock.fn(async () => {}),
    type: mock.fn(async () => {}),
    waitForNavigation: mock.fn(async () => {}),
  };
}

const codeArrives =
  (kv, code, receivedAt = SENT_AT + 20_000) =>
  () =>
    kv.store.set(JOBKOREA_2FA_CODE_KEY, JSON.stringify({ code, receivedAt }));

// Sleeping advances the clock, so the code wait runs its whole budget without real delays.
function tickingClock() {
  let now = SENT_AT;
  return {
    clock: () => now,
    codeWait: {
      intervalMs: 3_000,
      timeoutMs: 9_000,
      sleep: async (ms) => {
        now += ms;
      },
    },
  };
}

describe('resolveTwoFactor', () => {
  it('sends one email code, enters the code that arrives and confirms the completion dialog', async () => {
    const kv = memoryKv();
    const page = challengePage({ onSend: codeArrives(kv, '482913') });
    const notify = mock.fn(async () => {});

    await resolveTwoFactor(
      page,
      { SESSIONS: kv, JOB_DB: {} },
      {
        ...tickingClock(),
        notify,
      }
    );

    assert.deepEqual(page.clicks, [
      'input[name="method"][value="2"]',
      '#tfaBtnSend',
      '#tfaDialogOk',
      '#tfaBtnSubmit',
      '#tfaDialogOk',
    ]);
    assert.deepEqual(page.type.mock.calls[0].arguments, ['#tfaCertNum', '482913']);
    assert.equal(page.waitForNavigation.mock.callCount(), 1);
    assert.equal(kv.store.get(SEND_COUNT_KEY), '1');
    assert.equal(notify.mock.callCount(), 0);
  });

  it('fails with JOBKOREA_2FA_CODE_TIMEOUT and one Telegram note when no fresh code arrives', async () => {
    const kv = memoryKv();
    // A code from before this send must not be entered.
    const page = challengePage({ onSend: codeArrives(kv, '111111', SENT_AT - 60_000) });
    const notify = mock.fn(async () => {});

    await assert.rejects(
      () =>
        resolveTwoFactor(
          page,
          { SESSIONS: kv, JOB_DB: {} },
          {
            ...tickingClock(),
            notify,
          }
        ),
      (error) =>
        error.code === JOBKOREA_2FA_REQUIRED && error.reason === 'JOBKOREA_2FA_CODE_TIMEOUT'
    );
    assert.equal(page.type.mock.callCount(), 0);
    assert.equal(page.clicks.filter((selector) => selector === '#tfaBtnSend').length, 1);
    assert.equal(notify.mock.callCount(), 1);
    assert.match(notify.mock.calls[0].arguments[1], /JOBKOREA_2FA_CODE_TIMEOUT/);
  });

  it('fails with JOBKOREA_2FA_VERIFY_FAILED when JobKorea rejects the code', async () => {
    const kv = memoryKv();
    const page = challengePage({ verifyAnswer: 'EXPIRED', onSend: codeArrives(kv, '482913') });

    await assert.rejects(
      () =>
        resolveTwoFactor(
          page,
          { SESSIONS: kv, JOB_DB: {} },
          {
            ...tickingClock(),
            notify: async () => {},
          }
        ),
      (error) => error.reason === 'JOBKOREA_2FA_VERIFY_FAILED' && /EXPIRED/.test(error.message)
    );
    assert.equal(page.waitForNavigation.mock.callCount(), 0);
  });

  it('requests no code once the daily automated send budget is used up', async () => {
    const kv = memoryKv({ [SEND_COUNT_KEY]: String(MAX_AUTOMATED_SENDS_PER_DAY) });
    const page = challengePage({ onSend: codeArrives(kv, '482913') });

    await assert.rejects(
      () =>
        resolveTwoFactor(
          page,
          { SESSIONS: kv, JOB_DB: {} },
          {
            clock: () => SENT_AT,
            notify: async () => {},
          }
        ),
      (error) => error.reason === 'JOBKOREA_2FA_SEND_LIMIT'
    );
    assert.deepEqual(page.clicks, []);
  });
});
