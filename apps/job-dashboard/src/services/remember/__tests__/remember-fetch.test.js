import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { rememberFetch } from '../remember-fetch.js';

function fakePage({ status = 200, body = '{"code":"ok"}', cookies = [] } = {}) {
  const calls = { setCookie: [], goto: [], addScriptTag: [], closed: false };
  return {
    calls,
    async setCookie(...items) {
      calls.setCookie.push(...items);
    },
    async goto(url, options) {
      calls.goto.push({ url, options });
    },
    async addScriptTag({ content }) {
      calls.addScriptTag.push(content);
    },
    async waitForSelector() {},
    async $eval() {
      return JSON.stringify({ status, body, headers: [['content-type', 'application/json']] });
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

  it('runs the login request from its own origin and rebuilds the response', async () => {
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
    const script = page.calls.addScriptTag[0];
    assert.match(script, /Token token=t/);
    assert.match(script, /"email":"a"/);
    assert.doesNotMatch(script, /User-Agent|should-be-dropped/);

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
    assert.match(
      page.calls.addScriptTag[0],
      /https:\/\/open-profile-api\.rememberapp\.co\.kr\/v2\/open_profiles\/me/
    );
  });
});
