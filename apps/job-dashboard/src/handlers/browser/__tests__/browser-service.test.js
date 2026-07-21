import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';

import { withBrowserSession } from '../browser-service.js';

function createFakeStub({ acquireBody, releaseBody } = {}) {
  const calls = [];
  const stub = {
    calls,
    async fetch(url, init) {
      calls.push({ url, init });
      if (String(url).endsWith('/acquire')) {
        return {
          async json() {
            return acquireBody ?? { sessionId: 'session-1', reused: false };
          },
        };
      }
      if (String(url).endsWith('/release')) {
        return {
          async json() {
            return releaseBody ?? { released: true };
          },
        };
      }
      throw new Error(`unexpected fetch: ${url}`);
    },
  };
  return stub;
}

function createFakeEnv(stub) {
  return {
    BROWSER_SESSION: {
      idFromName: (name) => `id:${name}`,
      get: mock.fn(() => stub),
    },
    MYBROWSER: 'my-browser-binding',
  };
}

describe('withBrowserSession', () => {
  it('connects, runs fn, disconnects, and releases on success', async () => {
    const stub = createFakeStub({ acquireBody: { sessionId: 'session-1', reused: true } });
    const env = createFakeEnv(stub);

    const disconnect = mock.fn(async () => {});
    const fakeBrowser = { disconnect };
    const connect = mock.fn(async (endpoint, sessionId) => {
      assert.equal(endpoint, 'my-browser-binding');
      assert.equal(sessionId, 'session-1');
      return fakeBrowser;
    });

    const fn = mock.fn(async (browser) => {
      assert.equal(browser, fakeBrowser);
      return 'fn-result';
    });

    const result = await withBrowserSession(env, fn, { puppeteer: { connect } });

    assert.equal(result, 'fn-result');
    assert.equal(connect.mock.calls.length, 1);
    assert.equal(fn.mock.calls.length, 1);
    assert.equal(disconnect.mock.calls.length, 1);

    assert.equal(stub.calls.length, 2);
    assert.match(stub.calls[0].url, /\/acquire$/);
    assert.match(stub.calls[1].url, /\/release$/);
    assert.deepEqual(JSON.parse(stub.calls[1].init.body), { sessionId: 'session-1' });
  });

  it('disconnects and releases even when fn throws, and rethrows the error', async () => {
    const stub = createFakeStub({ acquireBody: { sessionId: 'session-2' } });
    const env = createFakeEnv(stub);

    const disconnect = mock.fn(async () => {});
    const connect = mock.fn(async () => ({ disconnect }));
    const fn = mock.fn(async () => {
      throw new Error('boom');
    });

    await assert.rejects(
      () => withBrowserSession(env, fn, { puppeteer: { connect } }),
      /boom/
    );

    assert.equal(disconnect.mock.calls.length, 1);
    assert.equal(stub.calls.length, 2);
    assert.match(stub.calls[1].url, /\/release$/);
  });

  it('propagates the error (and code) when acquire fails to return a sessionId', async () => {
    const stub = createFakeStub({ acquireBody: { error: 'Browser Rendering capacity reached', code: 'NO_CAPACITY' } });
    const env = createFakeEnv(stub);

    const connect = mock.fn(async () => ({ disconnect: async () => {} }));
    const fn = mock.fn(async () => 'unreachable');

    await assert.rejects(
      () => withBrowserSession(env, fn, { puppeteer: { connect } }),
      (err) => {
        assert.equal(err.code, 'NO_CAPACITY');
        assert.match(err.message, /capacity reached/);
        return true;
      }
    );

    assert.equal(connect.mock.calls.length, 0);
    assert.equal(fn.mock.calls.length, 0);
    // acquire happened but release should not be attempted (no sessionId to release).
    assert.equal(stub.calls.length, 1);
  });

  it('best-effort swallows a release failure without masking fn result', async () => {
    const stub = createFakeStub({ acquireBody: { sessionId: 'session-3' } });
    stub.fetch = mock.fn(async (url) => {
      if (String(url).endsWith('/acquire')) {
        return { async json() { return { sessionId: 'session-3' }; } };
      }
      throw new Error('release network failure');
    });
    const env = createFakeEnv(stub);

    const connect = mock.fn(async () => ({ disconnect: async () => {} }));
    const fn = mock.fn(async () => 'ok-despite-release-failure');

    const result = await withBrowserSession(env, fn, { puppeteer: { connect } });
    assert.equal(result, 'ok-despite-release-failure');
  });

  it('uses idFromName("global") by default and a custom name when provided', async () => {
    const stub = createFakeStub();
    const env = createFakeEnv(stub);
    const connect = mock.fn(async () => ({ disconnect: async () => {} }));

    await withBrowserSession(env, async () => {}, { puppeteer: { connect } });
    assert.equal(env.BROWSER_SESSION.get.mock.calls[0].arguments[0], 'id:global');

    await withBrowserSession(env, async () => {}, { puppeteer: { connect }, name: 'crawler-pool' });
    assert.equal(env.BROWSER_SESSION.get.mock.calls[1].arguments[0], 'id:crawler-pool');
  });
});
