import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { runBrowserSmoke, classifyPage } from '../smoke.js';

const env = { BROWSER_SESSION: {}, MYBROWSER: {} };

function fakePage({ title = 'Example Domain', finalUrl = 'https://example.com', text = 'hello' } = {}) {
  const calls = { closed: false, gotoUrl: null };
  return {
    calls,
    page: {
      goto: async (url) => {
        calls.gotoUrl = url;
      },
      url: () => finalUrl,
      title: async () => title,
      evaluate: async () => text,
      close: async () => {
        calls.closed = true;
      },
    },
  };
}

describe('classifyPage', () => {
  it('detects captcha, blocked, login, content', () => {
    assert.equal(classifyPage('https://jobkorea.co.kr', 'JobKorea', '보안문자를 입력하세요'), 'captcha');
    assert.equal(classifyPage('https://x', 'Access Denied', 'unusual traffic detected'), 'blocked');
    assert.equal(classifyPage('https://x/login', 'Sign in', 'please log in'), 'login');
    assert.equal(classifyPage('https://x', 'Jobs', 'a list of postings'), 'content');
  });
});

describe('runBrowserSmoke', () => {
  it('reports ok with title, finalUrl, pageKind on success and closes the page', async () => {
    const { page, calls } = fakePage({ title: 'Example Domain', finalUrl: 'https://example.com', text: 'ok' });
    let clock = 100;
    const withBrowserSession = async (_env, fn) => fn({ newPage: async () => page });

    const result = await runBrowserSmoke(env, {
      withBrowserSession,
      url: 'https://example.com',
      now: () => (clock += 5),
    });

    assert.equal(result.ok, true);
    assert.equal(result.title, 'Example Domain');
    assert.equal(result.finalUrl, 'https://example.com');
    assert.equal(result.pageKind, 'content');
    assert.equal(calls.gotoUrl, 'https://example.com');
    assert.equal(calls.closed, true);
    assert.equal(typeof result.elapsedMs, 'number');
  });

  it('classifies a captcha page from its text', async () => {
    const { page } = fakePage({ title: 'JobKorea', finalUrl: 'https://www.jobkorea.co.kr/login', text: '자동입력 방지 문자' });
    const withBrowserSession = async (_env, fn) => fn({ newPage: async () => page });

    const result = await runBrowserSmoke(env, { withBrowserSession, url: 'https://www.jobkorea.co.kr' });

    assert.equal(result.ok, true);
    assert.equal(result.pageKind, 'captcha');
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
  });

  it('closes the page even when navigation throws', async () => {
    const { page, calls } = fakePage();
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
