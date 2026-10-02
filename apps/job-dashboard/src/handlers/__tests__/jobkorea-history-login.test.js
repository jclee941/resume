import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  AFTER_LOGIN_BUDGET_MS,
  fetchJobKoreaHistoryAfterLogin,
} from '../applications/jobkorea-history-login.js';
import { HistorySyncError } from '../../services/application-history/history-types.js';

const RECORDS = [{ source: 'jobkorea', jobId: 'jobkorea-1' }];
const NO_KV = {
  SESSIONS: {
    get: async () => assert.fail('the stored session is not read'),
    put: async () => assert.fail('the login is not stored'),
  },
};

function harness({ minted = 'minted=a', mintError, loginMs = 0 } = {}) {
  let now = 1_000;
  const browser = { name: 'borrowed' };
  const steps = [];
  let borrowed = 0;
  const withBrowserSession = async (_env, fn) => {
    borrowed += 1;
    return fn(browser);
  };
  const mint = async (_env, opts) =>
    opts.withBrowserSession({}, async (given) => {
      steps.push({ name: 'login', given, opts });
      now += loginMs;
      if (mintError) throw mintError;
      return minted;
    });
  const fetchHistory = async (_env, opts) =>
    opts.withBrowserSession({}, async (given) => {
      steps.push({ name: 'read', given, opts });
      return RECORDS;
    });
  const clock = () => now;
  return {
    browser,
    steps,
    clock,
    borrowed: () => borrowed,
    deps: { withBrowserSession, clock, mint, fetchHistory },
  };
}

describe('fetchJobKoreaHistoryAfterLogin', () => {
  it('logs in and reads the applied list with that login in the one browser it borrowed', async () => {
    const h = harness();

    const records = await fetchJobKoreaHistoryAfterLogin(NO_KV, h.deps);

    assert.deepEqual(records, RECORDS);
    assert.equal(h.borrowed(), 1);
    assert.deepEqual(
      h.steps.map(({ name }) => name),
      ['login', 'read']
    );
    assert.ok(h.steps.every(({ given }) => given === h.browser));
    assert.equal(h.steps[1].opts.session, 'minted=a');
  });

  it('keeps each read on its own login when two syncs overlap', async () => {
    const reads = [];
    let releaseFirst = () => {};
    const firstLoginDone = new Promise((resolve) => {
      releaseFirst = resolve;
    });
    const deps = (name, minted, loggedIn) => ({
      withBrowserSession: async (_env, fn) => fn({ name }),
      clock: () => 0,
      mint: async () => {
        await loggedIn;
        return minted;
      },
      fetchHistory: async (_env, opts) => {
        reads.push([name, opts.session]);
        return [];
      },
    });

    const first = fetchJobKoreaHistoryAfterLogin(NO_KV, deps('first', 'cookie=1', firstLoginDone));
    await fetchJobKoreaHistoryAfterLogin(NO_KV, deps('second', 'cookie=2', Promise.resolve()));
    releaseFirst();
    await first;

    assert.deepEqual(reads, [
      ['second', 'cookie=2'],
      ['first', 'cookie=1'],
    ]);
  });

  it('gives the read only the budget the login left', async () => {
    const h = harness({ loginMs: 30_000 });

    await fetchJobKoreaHistoryAfterLogin(NO_KV, h.deps);

    const read = h.steps[1];
    assert.equal(read.opts.deadlineMs, AFTER_LOGIN_BUDGET_MS - 30_000);
    assert.equal(read.opts.clock, h.clock);
  });

  it('stops with TIMEOUT and does not read when the login used the whole budget', async () => {
    const h = harness({ loginMs: AFTER_LOGIN_BUDGET_MS });

    await assert.rejects(
      () => fetchJobKoreaHistoryAfterLogin(NO_KV, h.deps),
      (error) => error instanceof HistorySyncError && error.code === 'TIMEOUT'
    );
    assert.deepEqual(
      h.steps.map(({ name }) => name),
      ['login']
    );
  });

  it('reports a failed login as a platform error and does not read', async () => {
    const h = harness({ mintError: new Error('JobKorea presented a CAPTCHA') });

    await assert.rejects(
      () => fetchJobKoreaHistoryAfterLogin(NO_KV, h.deps),
      (error) =>
        error instanceof HistorySyncError &&
        error.code === 'UPSTREAM_ERROR' &&
        /CAPTCHA/.test(error.message)
    );
    assert.deepEqual(
      h.steps.map(({ name }) => name),
      ['login']
    );
  });
});
