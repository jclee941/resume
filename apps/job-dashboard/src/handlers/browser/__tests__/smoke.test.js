import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { runBrowserSmoke } from '../smoke.js';

const env = { BROWSER_SESSION: {}, MYBROWSER: {} };

function fakePage(title) {
  const calls = { closed: false, gotoUrl: null };
  return {
    calls,
    page: {
      goto: async (url) => {
        calls.gotoUrl = url;
      },
      title: async () => title,
      close: async () => {
        calls.closed = true;
      },
    },
  };
}

describe('runBrowserSmoke', () => {
  it('reports ok with the page title on success and closes the page', async () => {
    const { page, calls } = fakePage('Example Domain');
    let clock = 100;
    const withBrowserSession = async (_env, fn) => fn({ newPage: async () => page });

    const result = await runBrowserSmoke(env, {
      withBrowserSession,
      url: 'https://example.com',
      now: () => (clock += 5),
    });

    assert.equal(result.ok, true);
    assert.equal(result.title, 'Example Domain');
    assert.equal(result.url, 'https://example.com');
    assert.equal(calls.gotoUrl, 'https://example.com');
    assert.equal(calls.closed, true);
    assert.equal(typeof result.elapsedMs, 'number');
  });

  it('returns ok:false with error + code when acquisition fails (never throws)', async () => {
    const withBrowserSession = async () => {
      const err = new Error('Browser Rendering capacity reached');
      err.code = 'NO_CAPACITY';
      throw err;
    };

    const result = await runBrowserSmoke(env, { withBrowserSession });

    assert.equal(result.ok, false);
    assert.equal(result.error, 'Browser Rendering capacity reached');
    assert.equal(result.code, 'NO_CAPACITY');
    assert.equal(typeof result.elapsedMs, 'number');
  });

  it('closes the page even when navigation throws', async () => {
    const { page, calls } = fakePage('unused');
    page.goto = async () => {
      throw new Error('nav failed');
    };
    const withBrowserSession = async (_env, fn) => fn({ newPage: async () => page });

    const result = await runBrowserSmoke(env, { withBrowserSession });

    assert.equal(result.ok, false);
    assert.equal(result.error, 'nav failed');
    assert.equal(calls.closed, true);
  });
});
