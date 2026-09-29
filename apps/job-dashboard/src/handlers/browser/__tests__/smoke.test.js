import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { encrypt } from '@resume/shared/crypto';
import { runBrowserSmoke, classifyPage, smokeCookiesFor } from '../smoke.js';

const env = { BROWSER_SESSION: {}, MYBROWSER: {} };

function fakePage({
  title = 'Example Domain',
  finalUrl = 'https://example.com',
  text = 'hello',
} = {}) {
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
    assert.equal(
      classifyPage('https://jobkorea.co.kr', 'JobKorea', '보안문자를 입력하세요'),
      'captcha'
    );
    assert.equal(classifyPage('https://x', 'Access Denied', 'unusual traffic detected'), 'blocked');
    assert.equal(classifyPage('https://x/login', 'Sign in', 'please log in'), 'login');
    assert.equal(classifyPage('https://x', 'Jobs', 'a list of postings'), 'content');
  });
});

describe('runBrowserSmoke', () => {
  it('reports ok with title, finalUrl, pageKind on success and closes the page', async () => {
    const { page, calls } = fakePage({
      title: 'Example Domain',
      finalUrl: 'https://example.com',
      text: 'ok',
    });
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
    const { page } = fakePage({
      title: 'JobKorea',
      finalUrl: 'https://www.jobkorea.co.kr/login',
      text: '자동입력 방지 문자',
    });
    const withBrowserSession = async (_env, fn) => fn({ newPage: async () => page });

    const result = await runBrowserSmoke(env, {
      withBrowserSession,
      url: 'https://www.jobkorea.co.kr',
    });

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

describe('runBrowserSmoke with a replayed session', () => {
  it('sets the cookies before navigating and lists scripts and photo images', async () => {
    const order = [];
    const resources = {
      scripts: ['www.jobkorea.co.kr/Scripts/User/Resume/edit.js'],
      photoImages: [{ className: 'photo', src: 'file2.jobkorea.co.kr/Net/UserPhoto/1.jpg' }],
    };
    const evaluations = ['text', [], resources];
    const page = {
      setCookie: async (...cookies) => order.push(['setCookie', cookies.length]),
      goto: async (url) => order.push(['goto', url]),
      url: () => 'https://www.jobkorea.co.kr/User/Resume/View?rNo=1',
      title: async () => 'Resume',
      evaluate: async () => evaluations.shift(),
      close: async () => {},
    };
    const cookies = [{ name: 'A', value: '1', domain: '.jobkorea.co.kr', path: '/' }];

    const result = await runBrowserSmoke(env, {
      withBrowserSession: async (_env, fn) => fn({ newPage: async () => page }),
      url: 'https://www.jobkorea.co.kr/User/Resume/View?rNo=1',
      cookies,
    });

    assert.deepEqual(order, [
      ['setCookie', 1],
      ['goto', 'https://www.jobkorea.co.kr/User/Resume/View?rNo=1'],
    ]);
    assert.deepEqual(result.scripts, resources.scripts);
    assert.deepEqual(result.photoImages, resources.photoImages);
  });
});

describe('smokeCookiesFor', () => {
  const ENCRYPTION_KEY = btoa('0123456789abcdef0123456789abcdef');

  async function sessionEnv(cookie) {
    const stored = cookie ? await encrypt(cookie, { ENCRYPTION_KEY }) : null;
    return {
      ENCRYPTION_KEY,
      SESSIONS: { get: async (key) => (key === 'auth:jobkorea' ? stored : null) },
    };
  }

  it('replays the JobKorea session only on jobkorea.co.kr', async () => {
    const env = await sessionEnv('ACNT=1; SES=2');

    const ok = await smokeCookiesFor(
      env,
      'jobkorea',
      'https://www.jobkorea.co.kr/User/Resume/Edit?RNo=1'
    );
    const foreign = await smokeCookiesFor(env, 'jobkorea', 'https://example.com/?jobkorea.co.kr');
    const unknown = await smokeCookiesFor(env, 'wanted', 'https://www.wanted.co.kr/');

    assert.equal(ok.ok, true);
    assert.deepEqual(
      ok.cookies.map((cookie) => [cookie.name, cookie.domain]),
      [
        ['ACNT', '.jobkorea.co.kr'],
        ['SES', '.jobkorea.co.kr'],
      ]
    );
    assert.deepEqual([foreign.ok, foreign.status], [false, 400]);
    assert.deepEqual([unknown.ok, unknown.status], [false, 400]);
  });

  it('reports a missing KV session', async () => {
    const result = await smokeCookiesFor(
      await sessionEnv(null),
      'jobkorea',
      'https://www.jobkorea.co.kr/'
    );
    assert.deepEqual([result.ok, result.status], [false, 404]);
  });
});
