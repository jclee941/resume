import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { rememberFetch } from '../remember-fetch.js';

function fakePage({ status = 200, body = '{"code":"ok"}', cookies = [] } = {}) {
  const calls = { setCookie: [], goto: [], evaluate: [], closed: false };
  return {
    calls,
    async setRequestInterception() {},
    on() {},
    mainFrame() {
      return null;
    },
    async setCookie(...items) {
      calls.setCookie.push(...items);
    },
    async goto(url, options) {
      calls.goto.push({ url, options });
    },
    async evaluate(fn, url, init) {
      calls.evaluate.push({ url, init });
      return { status, body, headers: [['content-type', 'application/json']] };
    },
    async cookies() {
      return cookies;
    },
    async close() {
      calls.closed = true;
    },
  };
}

function fakeBrowserSession(page) {
  return async (_env, fn) => fn({ newPage: async () => page });
}

describe('rememberFetch', () => {
  it('is the global fetch when no browser is bound', () => {
    assert.equal(rememberFetch(undefined), fetch);
    assert.equal(rememberFetch({}), fetch);
    assert.equal(rememberFetch({ BROWSER_SESSION: {} }), fetch);
  });

  it('replays the request from a browser page and rebuilds the response', async () => {
    const page = fakePage({
      status: 200,
      body: '{"code":"ok"}',
      cookies: [
        { name: 'remember_shared_data', value: 'enc' },
        { name: 'other', value: '1' },
      ],
    });
    const fetchImpl = rememberFetch(
      { MYBROWSER: {}, BROWSER_SESSION: {} },
      { withBrowserSession: fakeBrowserSession(page) }
    );

    const response = await fetchImpl('https://rememberapp.co.kr/auths/login', {
      method: 'POST',
      headers: {
        Authorization: 'Token token=t',
        'Content-Type': 'application/json',
        'User-Agent': 'should-be-dropped',
        Cookie: '_remember_device_id=dev-1',
      },
      body: '{"email":"a"}',
    });

    assert.deepEqual(page.calls.setCookie, [
      { name: '_remember_device_id', value: 'dev-1', url: 'https://rememberapp.co.kr' },
    ]);
    assert.equal(page.calls.goto[0].url, 'https://rememberapp.co.kr/');
    const evaluated = page.calls.evaluate[0];
    assert.equal(evaluated.url, 'https://rememberapp.co.kr/auths/login');
    assert.equal(evaluated.init.method, 'POST');
    assert.equal(evaluated.init.body, '{"email":"a"}');
    assert.deepEqual(evaluated.init.headers, {
      Authorization: 'Token token=t',
      'Content-Type': 'application/json',
    });

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { code: 'ok' });
    assert.deepEqual(response.headers.getSetCookie(), ['remember_shared_data=enc', 'other=1']);
    assert.equal(page.calls.closed, true);
  });

  it('runs API-host calls from the career app origin, not the API origin', async () => {
    const page = fakePage();
    const fetchImpl = rememberFetch(
      { MYBROWSER: {}, BROWSER_SESSION: {} },
      { withBrowserSession: fakeBrowserSession(page) }
    );

    await fetchImpl('https://open-profile-api.rememberapp.co.kr/v2/open_profiles/me', {
      headers: { Authorization: 'Token token=t' },
    });

    assert.equal(page.calls.goto[0].url, 'https://career.rememberapp.co.kr/');
    assert.equal(
      page.calls.evaluate[0].url,
      'https://open-profile-api.rememberapp.co.kr/v2/open_profiles/me'
    );
  });
});
