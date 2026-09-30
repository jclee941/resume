import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { JOBKOREA_APPLY_LIST_URL, fetchJobKoreaHistory } from '../jobkorea-adapter.js';
import {
  EXPIRED_HTML,
  applyListHtml,
  createSqliteD1,
  fakeBrowser,
  sessionEnv,
} from './history-test-kit.js';

const ROW = { company: 'Acme Robotics', no: 40000001, title: 'Platform Engineer' };

describe('fetchJobKoreaHistory', () => {
  it('replays the KV cookies, loads only the applied list and parses it', async () => {
    const env = await sessionEnv(createSqliteD1(), ['jobkorea']);
    const browser = fakeBrowser({ [JOBKOREA_APPLY_LIST_URL]: applyListHtml({ rows: [ROW] }) });

    const records = await fetchJobKoreaHistory(env, {
      withBrowserSession: browser.withBrowserSession,
    });

    assert.deepEqual(
      records.map((record) => record.jobId),
      ['jobkorea-40000001']
    );
    assert.deepEqual(browser.visited, [JOBKOREA_APPLY_LIST_URL]);
    assert.deepEqual(browser.cookies, [
      { name: 'session', value: 'fake', domain: '.jobkorea.co.kr', path: '/' },
    ]);
  });

  it('follows same-site pager links and ignores off-site ones', async () => {
    const env = await sessionEnv(createSqliteD1(), ['jobkorea']);
    const second = 'https://www.jobkorea.co.kr/User/ApplyMng?Page=2';
    const pager = '<a href="/User/ApplyMng?Page=2">2</a><a href="https://evil.example/x">3</a>';
    const browser = fakeBrowser({
      [JOBKOREA_APPLY_LIST_URL]: applyListHtml({ rows: [ROW], pager }),
      [second]: applyListHtml({ rows: [{ ...ROW, no: 40000002 }] }),
    });

    const records = await fetchJobKoreaHistory(env, {
      withBrowserSession: browser.withBrowserSession,
    });

    assert.deepEqual(records.map((record) => record.jobId).sort(), [
      'jobkorea-40000001',
      'jobkorea-40000002',
    ]);
    assert.deepEqual(browser.visited, [JOBKOREA_APPLY_LIST_URL, second]);
  });

  it('retries a timed-out navigation once and surfaces any other navigation error', async () => {
    const env = await sessionEnv(createSqliteD1(), ['jobkorea']);
    const pages = { [JOBKOREA_APPLY_LIST_URL]: applyListHtml({ rows: [ROW] }) };
    const flaky = fakeBrowser(pages, {
      gotoFailures: [new Error('Navigation timeout of 30000 ms exceeded')],
    });

    const records = await fetchJobKoreaHistory(env, {
      withBrowserSession: flaky.withBrowserSession,
    });
    assert.equal(records.length, 1);
    assert.deepEqual(flaky.visited, [JOBKOREA_APPLY_LIST_URL, JOBKOREA_APPLY_LIST_URL]);

    const broken = fakeBrowser(pages, { gotoFailures: [new Error('net::ERR_FAILED')] });
    await assert.rejects(
      fetchJobKoreaHistory(env, { withBrowserSession: broken.withBrowserSession }),
      /ERR_FAILED/
    );
    assert.equal(broken.visited.length, 1);

    const stuck = fakeBrowser(pages, {
      gotoFailures: [new Error('Navigation timeout'), new Error('Navigation timeout')],
    });
    await assert.rejects(
      fetchJobKoreaHistory(env, { withBrowserSession: stuck.withBrowserSession }),
      /timeout/i
    );
    assert.equal(stuck.visited.length, 2);
  });

  it('fails with SESSION_EXPIRED when JobKorea serves something other than the list', async () => {
    const env = await sessionEnv(createSqliteD1(), ['jobkorea']);
    const browser = fakeBrowser({ [JOBKOREA_APPLY_LIST_URL]: EXPIRED_HTML });
    await assert.rejects(
      fetchJobKoreaHistory(env, { withBrowserSession: browser.withBrowserSession }),
      { code: 'SESSION_EXPIRED' }
    );
  });

  it('fails with SESSION_MISSING without opening a browser when KV holds no session', async () => {
    const env = await sessionEnv(createSqliteD1());
    const browser = fakeBrowser({});
    await assert.rejects(
      fetchJobKoreaHistory(env, { withBrowserSession: browser.withBrowserSession }),
      { code: 'SESSION_MISSING' }
    );
    assert.equal(browser.opened(), 0);
  });
});
