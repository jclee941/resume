import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { withBrowserSession } from '../../browser-session.js';
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

describe('fetchJobKoreaHistory deadline including the session read', () => {
  it('counts a stalled KV session read against the deadline', { timeout: 2000 }, async () => {
    const env = { SESSIONS: { get: () => new Promise(() => {}) }, ENCRYPTION_KEY: 'unused' };

    await assert.rejects(
      fetchJobKoreaHistory(env, {
        withBrowserSession: async () => assert.fail('no browser before the session is read'),
        deadlineMs: 5,
      }),
      { code: 'TIMEOUT', message: 'JobKorea history fetch gave up after 5 ms; pending: none' }
    );
  });
});

describe('fetchJobKoreaHistory work after its deadline', () => {
  it('starts no browser work when the session read ends after the deadline', async () => {
    const env = await sessionEnv(createSqliteD1(), ['jobkorea']);
    let now = 0;
    const clock = () => now;
    const readsDone = { get: env.SESSIONS.get };
    env.SESSIONS.get = async (key) => {
      const value = await readsDone.get(key);
      now = 1000;
      return value;
    };

    await assert.rejects(
      fetchJobKoreaHistory(env, {
        withBrowserSession: async () => assert.fail('no browser after the deadline'),
        deadlineMs: 100,
        clock,
      }),
      { code: 'TIMEOUT', message: 'JobKorea history window closed before the browser was acquired' }
    );
  });

  it('opens no page when the browser arrives after the deadline', async () => {
    const env = await sessionEnv(createSqliteD1(), ['jobkorea']);
    let now = 0;

    await assert.rejects(
      fetchJobKoreaHistory(env, {
        withBrowserSession: async (_env, run) => {
          now = 1000;
          return run({ newPage: async () => assert.fail('no page after the deadline') });
        },
        deadlineMs: 100,
        clock: () => now,
      }),
      { code: 'TIMEOUT', message: 'JobKorea history window closed before the page was opened' }
    );
  });

  it('hands a pooled browser acquired after the deadline back unconnected', async () => {
    const env = await sessionEnv(createSqliteD1(), ['jobkorea']);
    let now = 0;
    const pool = [];
    env.BROWSER_SESSION = {
      idFromName: (name) => name,
      get: () => ({
        fetch: async (url) => {
          const path = new URL(url).pathname;
          pool.push(path);
          if (path === '/acquire') now = 1000; // the pool answers after the deadline
          const body =
            path === '/acquire' ? { sessionId: 'late', reused: true } : { released: true };
          return { json: async () => body };
        },
      }),
    };
    const connect = async () => assert.fail('no connection after the deadline');

    await assert.rejects(
      fetchJobKoreaHistory(env, {
        withBrowserSession: (browserEnv, fn, opts) =>
          withBrowserSession(browserEnv, fn, { ...opts, puppeteer: { connect } }),
        deadlineMs: 100,
        clock: () => now,
      }),
      { code: 'TIMEOUT', message: 'JobKorea history window closed before the browser connected' }
    );
    assert.deepEqual(pool, ['/acquire', '/release']);
  });
});

describe('fetchJobKoreaHistory checks its deadline after every awaited step', () => {
  const healthyHtml = applyListHtml({ rows: [ROW] });
  function steppingPage(onStep) {
    const calls = [];
    const page = {
      setRequestInterception: async () => {
        calls.push('intercept');
        onStep('intercept');
      },
      on: () => {},
      setCookie: async () => {
        calls.push('cookie');
        onStep('cookie');
      },
      goto: async () => {
        calls.push('goto');
        onStep('goto');
      },
      content: async () => {
        calls.push('content');
        return healthyHtml;
      },
      url: () => JOBKOREA_APPLY_LIST_URL,
      close: async () => {},
    };
    return { page, calls };
  }
  async function run(onStep, { newPageStep = false } = {}) {
    const env = await sessionEnv(createSqliteD1(), ['jobkorea']);
    let now = 0;
    const clock = () => now;
    const advance = () => {
      now = 1000;
    };
    const { page, calls } = steppingPage((step) => onStep(step, advance));
    const result = fetchJobKoreaHistory(env, {
      withBrowserSession: async (_env, fn) =>
        fn({
          newPage: async () => {
            if (newPageStep) advance();
            return page;
          },
        }),
      deadlineMs: 500,
      settleMs: 5,
      clock,
    });
    return { result, calls };
  }

  it('sets nothing up when newPage returns after the deadline', async () => {
    const { result, calls } = await run(() => {}, { newPageStep: true });
    await assert.rejects(result, {
      code: 'TIMEOUT',
      message: 'JobKorea history window closed before the page was set up',
    });
    assert.deepEqual(calls, []);
  });

  it('sets no cookies when interception is enabled after the deadline', async () => {
    const { result, calls } = await run((step, advance) => step === 'intercept' && advance());
    await assert.rejects(result, {
      code: 'TIMEOUT',
      message: 'JobKorea history window closed before the session cookies were set',
    });
    assert.deepEqual(calls, ['intercept']);
  });

  it('reads no HTML when the navigation returns after the deadline', async () => {
    const { result, calls } = await run((step, advance) => step === 'goto' && advance());
    await assert.rejects(result, {
      code: 'TIMEOUT',
      message: 'JobKorea history window closed before the applied-list HTML was read',
    });
    assert.deepEqual(calls, ['intercept', 'cookie', 'goto']);
  });
});

describe('fetchJobKoreaHistory with an injected clock', () => {
  it('loads a healthy applied list under a constant injected clock', async () => {
    const env = await sessionEnv(createSqliteD1(), ['jobkorea']);
    const browser = fakeBrowser({ [JOBKOREA_APPLY_LIST_URL]: applyListHtml({ rows: [ROW] }) });

    const records = await fetchJobKoreaHistory(env, {
      withBrowserSession: browser.withBrowserSession,
      clock: () => 0,
    });

    assert.deepEqual(
      records.map((record) => record.jobId),
      ['jobkorea-40000001']
    );
    assert.deepEqual(browser.visited, [JOBKOREA_APPLY_LIST_URL]);
  });

  it('starts no navigation once the injected clock reaches the attempt deadline', async () => {
    const env = await sessionEnv(createSqliteD1(), ['jobkorea']);
    let now = 0;
    const visited = [];
    const page = {
      setRequestInterception: async () => {},
      on: () => {},
      setCookie: async () => {
        now = 100_000;
      },
      goto: async (url) => void visited.push(url),
      content: async () => '',
      url: () => JOBKOREA_APPLY_LIST_URL,
      close: async () => {},
    };

    await assert.rejects(
      fetchJobKoreaHistory(env, {
        withBrowserSession: async (_env, fn) => fn({ newPage: async () => page }),
        clock: () => now,
      }),
      { code: 'TIMEOUT', message: 'JobKorea sync budget exhausted' }
    );
    assert.deepEqual(visited, []);
  });
});
