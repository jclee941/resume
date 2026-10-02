import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { fetchJobKoreaHistoryAfterLogin } from '../applications/jobkorea-history-login.js';
import { HistorySyncError } from '../../services/application-history/history-types.js';

const RECORDS = [{ source: 'jobkorea', jobId: 'jobkorea-1' }];

function harness({ refreshed = { ok: true } } = {}) {
  const browser = { name: 'borrowed' };
  const steps = [];
  let borrowed = 0;
  const withBrowserSession = async (_env, fn) => {
    borrowed += 1;
    return fn(browser);
  };
  const step = (name, result) => async (_env, opts) =>
    opts.withBrowserSession({}, async (given) => {
      steps.push([name, given]);
      return result;
    });
  return {
    browser,
    steps,
    borrowed: () => borrowed,
    deps: {
      withBrowserSession,
      refresh: step('login', refreshed),
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
      h.steps.map(([name]) => name),
      ['login', 'read']
    );
    assert.ok(h.steps.every(([, given]) => given === h.browser));
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
      h.steps.map(([name]) => name),
      ['login']
    );
  });
});
