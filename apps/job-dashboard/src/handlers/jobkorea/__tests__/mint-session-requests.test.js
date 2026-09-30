import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';

import { mintJobKoreaSession } from '../mint-session.js';

const CREDS = { JOBKOREA_USERNAME: 'someone@example.com', JOBKOREA_PASSWORD: 'super-secret' };

/** puppeteer HTTPRequest stand-in that records whether it was aborted or continued. */
function fakeRequest(url, resourceType) {
  const request = {
    outcome: [],
    url: () => url,
    resourceType: () => resourceType,
    abort: async () => {
      request.outcome.push('abort');
    },
    continue: async () => {
      request.outcome.push('continue');
    },
  };
  return request;
}

/** Logged-in fake page that records interception setup order relative to goto. */
function createFakePage(events) {
  const requestHandlers = [];
  const input = { click: async () => {}, type: async () => {} };
  return {
    requestHandlers,
    setRequestInterception: mock.fn(async (enabled) => {
      events.push(`interception:${enabled}`);
    }),
    on: mock.fn((name, handler) => {
      if (name === 'request') requestHandlers.push(handler);
    }),
    goto: mock.fn(async () => {
      events.push('goto');
    }),
    $: mock.fn(async () => input),
    $$: mock.fn(async () => [{ evaluate: async () => true, click: async () => {} }]),
    evaluate: mock.fn(async () => true),
    waitForNavigation: mock.fn(async () => {}),
    cookies: mock.fn(async () => [
      { name: 'PLAY_SESSION', value: 'sess-abc', domain: '.jobkorea.co.kr' },
    ]),
    close: mock.fn(async () => {}),
    url: () => 'https://www.jobkorea.co.kr/Login/Login_Tot.asp',
    title: mock.fn(async () => 'JobKorea Login'),
  };
}

async function mintWithFakePage() {
  const events = [];
  const page = createFakePage(events);
  await mintJobKoreaSession(CREDS, {
    withBrowserSession: async (_env, fn) => fn({ newPage: async () => page }),
  });
  assert.equal(page.requestHandlers.length, 1);
  return { page, events, handler: page.requestHandlers[0] };
}

describe('mintJobKoreaSession request interception', () => {
  it('enables request interception before the first navigation', async () => {
    const { events } = await mintWithFakePage();

    assert.ok(events.includes('interception:true'));
    assert.ok(events.indexOf('interception:true') < events.indexOf('goto'));
  });

  it('aborts third-party script and xhr requests', async () => {
    const { handler } = await mintWithFakePage();
    const blocked = [
      fakeRequest('https://teralog.techhub.co.kr/t.js', 'script'),
      fakeRequest('https://www.googletagmanager.com/gtm.js?id=GTM-X', 'script'),
      fakeRequest('https://dynamic.criteo.com/js/ld/ld.js', 'script'),
      fakeRequest('https://www.google-analytics.com/collect', 'xhr'),
      fakeRequest('not a url', 'script'),
    ];

    for (const request of blocked) await handler(request);

    assert.deepEqual(
      blocked.map((request) => request.outcome),
      blocked.map(() => ['abort'])
    );
  });

  it('continues a jobkorea.co.kr stylesheet and document', async () => {
    const { handler } = await mintWithFakePage();
    const allowed = [
      fakeRequest('https://www.jobkorea.co.kr/Login/Login_Tot.asp', 'document'),
      fakeRequest('https://www.jobkorea.co.kr/css/login.css', 'stylesheet'),
    ];

    for (const request of allowed) await handler(request);

    assert.deepEqual(
      allowed.map((request) => request.outcome),
      allowed.map(() => ['continue'])
    );
  });

  it('aborts jobkorea.co.kr images and fonts', async () => {
    const { handler } = await mintWithFakePage();
    const blocked = [
      fakeRequest('https://www.jobkorea.co.kr/img/logo.png', 'image'),
      fakeRequest('https://i.jobkorea.co.kr/fonts/main.woff2', 'font'),
    ];

    for (const request of blocked) await handler(request);

    assert.deepEqual(
      blocked.map((request) => request.outcome),
      blocked.map(() => ['abort'])
    );
  });
});
