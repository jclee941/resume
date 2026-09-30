import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { JOBKOREA_APPLY_LIST_URL, fetchJobKoreaHistory } from '../jobkorea-adapter.js';
import { applyListHtml, createSqliteD1, fakeBrowser, sessionEnv } from './history-test-kit.js';

const ROW = { company: 'Acme Robotics', no: 40000001, title: 'Platform Engineer' };
const LIST_PAGES = { [JOBKOREA_APPLY_LIST_URL]: applyListHtml({ rows: [ROW] }) };
const TIMEOUT = () => new Error('Navigation timeout of 45000 ms exceeded');

/** puppeteer HTTPRequest stand-in; `fail` makes abort/continue throw sync or reject async. */
function fakeRequest(url, resourceType, { fail } = {}) {
  const outcome = [];
  const act = (name) => () => {
    outcome.push(name);
    if (fail === 'sync') throw new Error('Request is already handled!');
    if (fail === 'async') return Promise.reject(new Error('Request is already handled!'));
    return Promise.resolve();
  };
  return {
    outcome,
    url: () => url,
    resourceType: () => resourceType,
    abort: act('abort'),
    continue: act('continue'),
  };
}

async function requestHandler() {
  const env = await sessionEnv(createSqliteD1(), ['jobkorea']);
  const browser = fakeBrowser(LIST_PAGES);
  await fetchJobKoreaHistory(env, { withBrowserSession: browser.withBrowserSession });
  assert.equal(browser.requestHandlers.length, 1);
  return { handler: browser.requestHandlers[0], browser };
}

describe('fetchJobKoreaHistory request interception', () => {
  it('enables interception before the first navigation with a 45 s attempt timeout', async () => {
    const { browser } = await requestHandler();
    assert.deepEqual(browser.calls, ['intercept:true', 'goto']);
    assert.equal(browser.gotoOptions[0].timeout, 45_000);
  });

  it('aborts third-party hosts and heavy resource types', async () => {
    const { handler } = await requestHandler();
    const blocked = [
      fakeRequest('https://www.google-analytics.com/collect', 'xhr'),
      fakeRequest('https://ad.example.net/tag.js', 'script'),
      fakeRequest('https://evil-jobkorea.co.kr/x.js', 'script'),
      fakeRequest('https://jobkorea.co.kr.evil.example/x.js', 'script'),
      fakeRequest('not a url', 'script'),
      fakeRequest('https://www.jobkorea.co.kr/logo.png', 'image'),
      fakeRequest('https://i.jobkorea.co.kr/clip.mp4', 'media'),
      fakeRequest('https://i.jobkorea.co.kr/font.woff2', 'font'),
      fakeRequest('https://i.jobkorea.co.kr/site.css', 'stylesheet'),
    ];
    for (const request of blocked) await handler(request);
    assert.deepEqual(
      blocked.map((request) => request.outcome),
      blocked.map(() => ['abort'])
    );
  });

  it('continues same-site documents, scripts and data requests', async () => {
    const { handler } = await requestHandler();
    const allowed = [
      fakeRequest('https://www.jobkorea.co.kr/User/ApplyMng', 'document'),
      fakeRequest('https://jobkorea.co.kr/User/ApplyMng?Page=2', 'document'),
      fakeRequest('https://i.jobkorea.co.kr/app.js', 'script'),
      fakeRequest('https://www.jobkorea.co.kr/api/x', 'xhr'),
      fakeRequest('https://www.jobkorea.co.kr/api/y', 'fetch'),
    ];
    for (const request of allowed) await handler(request);
    assert.deepEqual(
      allowed.map((request) => request.outcome),
      allowed.map(() => ['continue'])
    );
  });

  it('swallows abort and continue failures instead of throwing out of the handler', async () => {
    const { handler } = await requestHandler();
    for (const fail of ['sync', 'async']) {
      const aborted = fakeRequest('https://ad.example.net/t.js', 'script', { fail });
      const continued = fakeRequest('https://www.jobkorea.co.kr/', 'document', { fail });
      const broken = { url: () => Promise.reject(new Error('boom')).catch(() => 'x'), abort() {} };
      await assert.doesNotReject(async () => handler(aborted));
      await assert.doesNotReject(async () => handler(continued));
      await assert.doesNotReject(async () => handler({ ...broken, resourceType: () => 'script' }));
      await assert.doesNotReject(async () => handler({}));
      assert.deepEqual(aborted.outcome, ['abort']);
      assert.deepEqual(continued.outcome, ['continue']);
    }
    // let any rejected abort/continue promise settle; an unhandled rejection would fail the run
    await new Promise((resolve) => setImmediate(resolve));
  });
});

describe('fetchJobKoreaHistory tolerant navigation', () => {
  it('accepts an applied-list document when goto times out, without retrying', async () => {
    const env = await sessionEnv(createSqliteD1(), ['jobkorea']);
    const browser = fakeBrowser(LIST_PAGES, { gotoFailures: [TIMEOUT()], partialLoad: true });

    const records = await fetchJobKoreaHistory(env, {
      withBrowserSession: browser.withBrowserSession,
    });

    assert.deepEqual(
      records.map((record) => record.jobId),
      ['jobkorea-40000001']
    );
    assert.deepEqual(browser.visited, [JOBKOREA_APPLY_LIST_URL]);
  });

  it('retries once when the timed-out document is not the list, then throws the timeout', async () => {
    const env = await sessionEnv(createSqliteD1(), ['jobkorea']);
    const browser = fakeBrowser({}, { gotoFailures: [TIMEOUT(), TIMEOUT()], partialLoad: true });

    await assert.rejects(
      fetchJobKoreaHistory(env, { withBrowserSession: browser.withBrowserSession }),
      /timeout/i
    );
    assert.deepEqual(browser.visited, [JOBKOREA_APPLY_LIST_URL, JOBKOREA_APPLY_LIST_URL]);
  });

  it('does not treat a non-timeout navigation error as a loaded list', async () => {
    const env = await sessionEnv(createSqliteD1(), ['jobkorea']);
    const browser = fakeBrowser(LIST_PAGES, {
      gotoFailures: [new Error('net::ERR_FAILED')],
      partialLoad: true,
    });
    await assert.rejects(
      fetchJobKoreaHistory(env, { withBrowserSession: browser.withBrowserSession }),
      /ERR_FAILED/
    );
    assert.equal(browser.visited.length, 1);
  });
});
