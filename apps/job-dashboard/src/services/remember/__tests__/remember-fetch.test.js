import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import { signHmacWebCrypto } from '@resume/shared/auth/hmac';
import { rememberFetch } from '../remember-fetch.js';

const originalFetch = globalThis.fetch;

describe('rememberFetch', () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('is the global fetch when no relay is configured', () => {
    assert.equal(rememberFetch(undefined), fetch);
    assert.equal(rememberFetch({ REMEMBER_PROXY_URL: 'https://relay' }), fetch);
    assert.equal(rememberFetch({ REMEMBER_PROXY_SECRET: 's' }), fetch);
  });

  it('tunnels the request through the signed relay and rebuilds the response', async () => {
    const calls = [];
    globalThis.fetch = async (url, init = {}) => {
      calls.push({ url: String(url), init });
      return Response.json({
        status: 200,
        headers: [
          ['content-type', 'application/json'],
          ['set-cookie', 'remember_shared_data=enc; Path=/'],
          ['set-cookie', 'other=1; Path=/'],
        ],
        body: '{"code":"ok"}',
      });
    };

    const relay = rememberFetch({
      REMEMBER_PROXY_URL: 'https://relay.example',
      REMEMBER_PROXY_SECRET: 'sek',
    });
    const response = await relay('https://career-api.rememberapp.co.kr/x', {
      method: 'POST',
      headers: { Authorization: 'Token token=t', 'Content-Type': 'application/json' },
      body: '{"a":1}',
    });

    assert.equal(calls[0].url, 'https://relay.example');
    assert.equal(calls[0].init.method, 'POST');
    const envelope = JSON.parse(calls[0].init.body);
    assert.deepEqual(envelope, {
      method: 'POST',
      url: 'https://career-api.rememberapp.co.kr/x',
      headers: [
        ['Authorization', 'Token token=t'],
        ['Content-Type', 'application/json'],
      ],
      body: '{"a":1}',
    });
    assert.equal(
      calls[0].init.headers['X-Relay-Signature'],
      await signHmacWebCrypto(calls[0].init.body, 'sek')
    );

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { code: 'ok' });
    assert.deepEqual(response.headers.getSetCookie(), [
      'remember_shared_data=enc; Path=/',
      'other=1; Path=/',
    ]);
  });

  it('throws when the relay itself fails', async () => {
    globalThis.fetch = async () => new Response('bad gateway', { status: 502 });
    const relay = rememberFetch({
      REMEMBER_PROXY_URL: 'https://relay.example',
      REMEMBER_PROXY_SECRET: 'sek',
    });

    await assert.rejects(relay('https://rememberapp.co.kr/'), /Remember relay answered 502/);
  });
});
