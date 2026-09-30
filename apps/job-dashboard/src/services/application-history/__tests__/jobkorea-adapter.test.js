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

describe('fetchJobKoreaHistory timeout diagnostics', () => {
  it('names the allowed requests a timed-out applied-list navigation was waiting for', async () => {
    const env = await sessionEnv(createSqliteD1(), ['jobkorea']);
    const handlers = {};
    const request = (url, type) => ({
      url: () => url,
      resourceType: () => type,
      abort: async () => {},
      continue: async () => {},
    });
    const page = {
      setRequestInterception: async () => {},
      setCookie: async () => {},
      on: (event, handler) => void (handlers[event] ??= []).push(handler),
      goto: async () => {
        const document = request(`${JOBKOREA_APPLY_LIST_URL}?Page=1`, 'document');
        const tracker = request('https://www.google-analytics.com/collect', 'xhr');
        for (const r of [document, tracker]) handlers.request.forEach((handle) => handle(r));
        throw new Error('Navigation timeout of 45000 ms exceeded');
      },
      content: async () => EXPIRED_HTML,
      url: () => JOBKOREA_APPLY_LIST_URL,
      close: async () => {},
    };

    await assert.rejects(
      fetchJobKoreaHistory(env, {
        withBrowserSession: async (_env, run) => run({ newPage: async () => page }),
      }),
      {
        message:
          'Navigation timeout of 45000 ms exceeded; pending: document www.jobkorea.co.kr/User/ApplyMng',
      }
    );
  });
});

describe('fetchJobKoreaHistory stalled page', () => {
  it(
    'stops waiting for a hung content read and page close, then reports the timeout',
    { timeout: 2000 },
    async () => {
      const env = await sessionEnv(createSqliteD1(), ['jobkorea']);
      const handlers = {};
      const hang = () => new Promise(() => {});
      const page = {
        setRequestInterception: async () => {},
        setCookie: async () => {},
        on: (event, handler) => void (handlers[event] ??= []).push(handler),
        goto: async () => {
          const document = {
            url: () => JOBKOREA_APPLY_LIST_URL,
            resourceType: () => 'document',
            abort: async () => {},
            continue: async () => {},
          };
          handlers.request.forEach((handle) => handle(document));
          throw new Error('Navigation timeout of 45000 ms exceeded');
        },
        content: hang,
        url: () => JOBKOREA_APPLY_LIST_URL,
        close: hang,
      };

      await assert.rejects(
        fetchJobKoreaHistory(env, {
          withBrowserSession: async (_env, run) => run({ newPage: async () => page }),
          settleMs: 5,
        }),
        {
          message:
            'Navigation timeout of 45000 ms exceeded; pending: document www.jobkorea.co.kr/User/ApplyMng',
        }
      );
    }
  );
});

describe('fetchJobKoreaHistory unreadable page after a navigation', () => {
  it('bounds the HTML read after a navigation that succeeded', { timeout: 2000 }, async () => {
    const env = await sessionEnv(createSqliteD1(), ['jobkorea']);
    const page = {
      setRequestInterception: async () => {},
      setCookie: async () => {},
      on: () => {},
      goto: async () => {},
      content: () => new Promise(() => {}),
      url: () => JOBKOREA_APPLY_LIST_URL,
      close: async () => {},
    };

    await assert.rejects(
      fetchJobKoreaHistory(env, {
        withBrowserSession: async (_env, run) => run({ newPage: async () => page }),
        settleMs: 5,
      }),
      {
        message: `Navigation timeout: ${JOBKOREA_APPLY_LIST_URL} loaded but its HTML was not readable; pending: none`,
      }
    );
  });
});

describe('fetchJobKoreaHistory overall deadline', () => {
  it(
    'answers with its own TIMEOUT when the browser work outlives the deadline',
    { timeout: 2000 },
    async () => {
      const env = await sessionEnv(createSqliteD1(), ['jobkorea']);

      await assert.rejects(
        fetchJobKoreaHistory(env, {
          withBrowserSession: async () => new Promise(() => {}),
          deadlineMs: 5,
        }),
        { code: 'TIMEOUT', message: 'JobKorea history fetch gave up after 5 ms; pending: none' }
      );
    }
  );
});
