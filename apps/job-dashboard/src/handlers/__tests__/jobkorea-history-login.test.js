import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  AFTER_LOGIN_BUDGET_MS,
  fetchJobKoreaHistoryAfterLogin,
} from '../applications/jobkorea-history-login.js';
import { HistorySyncError } from '../../services/application-history/history-types.js';

const RECORDS = [{ source: 'jobkorea', jobId: 'jobkorea-1' }];

function harness({ refreshed = { ok: true }, loginMs = 0 } = {}) {
  let now = 1_000;
  const browser = { name: 'borrowed' };
  const steps = [];
  let borrowed = 0;
  const withBrowserSession = async (_env, fn) => {
    borrowed += 1;
    return fn(browser);
  };
  const step =
    (name, result, tookMs = 0) =>
    async (_env, opts) =>
      opts.withBrowserSession({}, async (given) => {
        steps.push({ name, given, opts });
        now += tookMs;
        return result;
      });
  const clock = () => now;
  return {
    browser,
    steps,
    clock,
    borrowed: () => borrowed,
    deps: {
      withBrowserSession,
      clock,
      refresh: step('login', refreshed, loginMs),
      fetchHistory: step('read', RECORDS),
    },
  };
}

describe('fetchJobKoreaHistoryAfterLogin', () => {
  it('logs in and then reads the applied list in the one browser it borrowed', async () => {
    const h = harness();

    const records = await fetchJobKoreaHistoryAfterLogin({}, h.deps);

    assert.deepEqual(records, RECORDS);
    assert.equal(h.borrowed(), 1);
    assert.deepEqual(
      h.steps.map(({ name }) => name),
      ['login', 'read']
    );
    assert.ok(h.steps.every(({ given }) => given === h.browser));
  });

  it('makes one login attempt and gives the read only the budget the login left', async () => {
    const h = harness({ loginMs: 30_000 });

    await fetchJobKoreaHistoryAfterLogin({}, h.deps);

    const [login, read] = h.steps;
    assert.equal(login.opts.attempts, 1);
    assert.equal(read.opts.deadlineMs, AFTER_LOGIN_BUDGET_MS - 30_000);
    assert.equal(read.opts.clock, h.clock);
  });

  it('stops with TIMEOUT and does not read when the login used the whole budget', async () => {
    const h = harness({ loginMs: AFTER_LOGIN_BUDGET_MS });

    await assert.rejects(
      () => fetchJobKoreaHistoryAfterLogin({}, h.deps),
      (error) => error instanceof HistorySyncError && error.code === 'TIMEOUT'
    );
    assert.deepEqual(
      h.steps.map(({ name }) => name),
      ['login']
    );
  });

  it('reports a failed login as a platform error and does not read', async () => {
    const h = harness({ refreshed: { ok: false, error: 'JobKorea presented a CAPTCHA' } });

    await assert.rejects(
      () => fetchJobKoreaHistoryAfterLogin({}, h.deps),
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
