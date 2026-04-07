import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { CloakBrowser } from '../browser/cloak-browser.js';

function createFetchMock(responses) {
  const calls = [];
  const fetchImpl = async (_url, options) => {
    const body = JSON.parse(options.body);
    calls.push(body);
    const next = responses.shift();
    if (!next) {
      throw new Error(`Unexpected action: ${body.action}`);
    }

    return {
      ok: next.ok ?? true,
      status: next.status ?? 200,
      json: async () => next.body,
    };
  };

  return { fetchImpl, calls };
}

describe('CloakBrowser', () => {
  it('launches with stealth enabled', async () => {
    const ensuredDirs = [];
    const { fetchImpl, calls } = createFetchMock([
      {
        body: {
          sessionId: 'session-1',
          backend: 'docker-stealthy-auto-browse',
          stealthEnabled: true,
        },
      },
    ]);

    const browser = new CloakBrowser({
      fetchImpl,
      ensureProfileDir: (dir) => ensuredDirs.push(dir),
    });

    const launched = await browser.launch({
      proxy: 'socks5://kr-residential-proxy',
      profileDir: '/tmp/cloak-profile',
    });

    assert.equal(launched.stealthEnabled, true);
    assert.equal(launched.backend, 'docker-stealthy-auto-browse');
    assert.deepEqual(ensuredDirs, ['/tmp/cloak-profile']);
    assert.deepEqual(calls[0], {
      action: 'launch',
      options: {
        proxy: 'socks5://kr-residential-proxy',
        geoip: true,
        humanize: true,
        timezone: 'Asia/Seoul',
        locale: 'ko-KR',
        profileDir: '/tmp/cloak-profile',
        stealth: true,
        persistentProfile: true,
      },
    });
  });

  it('keeps navigator.webdriver undefined', async () => {
    const { fetchImpl } = createFetchMock([
      {
        body: { sessionId: 'session-2', stealthEnabled: true },
      },
      {
        body: { value: undefined },
      },
    ]);

    const browser = new CloakBrowser({ fetchImpl, ensureProfileDir: () => {} });
    const launched = await browser.launch();

    assert.equal(await launched.evaluate('navigator.webdriver'), undefined);
  });

  it('exports cookies from the remote browser session', async () => {
    const cookies = [{ name: 'sid', value: 'abc', domain: '.wanted.co.kr', path: '/' }];
    const { fetchImpl } = createFetchMock([
      {
        body: { sessionId: 'session-3', stealthEnabled: true },
      },
      {
        body: { cookies },
      },
    ]);

    const browser = new CloakBrowser({ fetchImpl, ensureProfileDir: () => {} });
    await browser.launch({ profileDir: '/tmp/persistent-wanted' });

    assert.deepEqual(await browser.getCookies(), cookies);
  });

  it('closes cleanly', async () => {
    const { fetchImpl, calls } = createFetchMock([
      {
        body: { sessionId: 'session-4', stealthEnabled: true },
      },
      {
        body: { ok: true },
      },
    ]);

    const browser = new CloakBrowser({ fetchImpl, ensureProfileDir: () => {} });
    await browser.launch();
    await browser.close();

    assert.equal(calls[1].action, 'close');
    assert.equal(browser.sessionId, null);
    assert.equal(browser.browser, null);
  });
});
