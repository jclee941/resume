import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { REMEMBER_BROWSER_FETCH_FAILED, rememberFetch } from '../remember-fetch.js';

const ENV = {
  REMEMBER_BROWSER_ACCOUNT_ID: 'acct-1',
  REMEMBER_BROWSER_API_TOKEN: 'tok-1',
};

function markerOf(payload) {
  return payload.waitForSelector.selector.slice(1);
}

function renderedPage(marker, result) {
  const b64 = Buffer.from(JSON.stringify(result), 'utf8').toString('base64');
  return `<html><body><div id="${marker}" style="display:none">${b64}</div></body></html>`;
}

function apiFetchReturning(result, calls) {
  return async (url, init) => {
    const payload = JSON.parse(init.body);
    calls.push({ url: String(url), init, payload });
    return Response.json({ success: true, result: renderedPage(markerOf(payload), result) });
  };
}

describe('rememberFetch', () => {
  it('is the global fetch when the browser account/token are not set', () => {
    assert.equal(rememberFetch(undefined), fetch);
    assert.equal(rememberFetch({ REMEMBER_BROWSER_ACCOUNT_ID: 'a' }), fetch);
    assert.equal(rememberFetch({ REMEMBER_BROWSER_API_TOKEN: 't' }), fetch);
  });

  it('replays the login from its own origin and rebuilds the response', async () => {
    const calls = [];
    const apiFetch = apiFetchReturning(
      { status: 200, body: '{"code":"ok"}', headers: [['content-type', 'application/json']] },
      calls
    );
    const fetchImpl = rememberFetch(ENV, { apiFetch });

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

    assert.equal(
      calls[0].url,
      'https://api.cloudflare.com/client/v4/accounts/acct-1/browser-rendering/content'
    );
    assert.equal(calls[0].init.headers.Authorization, 'Bearer tok-1');
    assert.equal(calls[0].payload.url, 'https://rememberapp.co.kr/robots.txt');
    assert.deepEqual(calls[0].payload.cookies, [
      { name: '_remember_device_id', value: 'dev-1', domain: '.rememberapp.co.kr', path: '/' },
    ]);
    const script = calls[0].payload.addScriptTag[0].content;
    assert.match(script, /rememberapp\.co\.kr\/auths\/login/);
    assert.match(script, /Token token=t/);
    assert.doesNotMatch(script, /User-Agent|should-be-dropped/);

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { code: 'ok' });
  });

  it('runs API-host calls from the career app origin with no cookies', async () => {
    const calls = [];
    const apiFetch = apiFetchReturning({ status: 200, body: '{"code":"ok"}', headers: [] }, calls);
    const fetchImpl = rememberFetch(ENV, { apiFetch });

    await fetchImpl('https://open-profile-api.rememberapp.co.kr/v2/open_profiles/me', {
      headers: { Authorization: 'Token token=t' },
    });

    assert.equal(calls[0].payload.url, 'https://career.rememberapp.co.kr/robots.txt');
    assert.equal(calls[0].payload.cookies, undefined);
    assert.match(
      calls[0].payload.addScriptTag[0].content,
      /open-profile-api\.rememberapp\.co\.kr\/v2\/open_profiles\/me/
    );
  });

  it('throws when the Browser Rendering request fails', async () => {
    const apiFetch = async () =>
      Response.json({ success: false, errors: [{ message: 'bad' }] }, { status: 403 });
    const fetchImpl = rememberFetch(ENV, { apiFetch });

    await assert.rejects(
      fetchImpl('https://rememberapp.co.kr/auths/login', { method: 'POST' }),
      /Browser Rendering request failed \(403\)/
    );
  });

  it('marks a failed in-page fetch as retryable', async () => {
    const apiFetch = apiFetchReturning({ error: 'Failed to fetch' }, []);
    const fetchImpl = rememberFetch(ENV, { apiFetch });

    await assert.rejects(fetchImpl('https://career-api.rememberapp.co.kr/job_postings/search'), {
      code: REMEMBER_BROWSER_FETCH_FAILED,
      message: /Failed to fetch/,
    });
  });
});
