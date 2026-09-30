import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';

import { mintJobKoreaSession } from '../mint-session.js';

const CREDS = { JOBKOREA_USERNAME: 'someone@example.com', JOBKOREA_PASSWORD: 'super-secret' };

/** puppeteer HTTPRequest stand-in. */
const request = (url, resourceType) => ({
  url: () => url,
  resourceType: () => resourceType,
  abort: async () => {},
  continue: async () => {},
});

/** Login page whose navigation starts a document and a script, finishes only the document, then times out. */
function stallingPage() {
  const handlers = {};
  const page = {
    setRequestInterception: mock.fn(async () => {}),
    on: (event, handler) => {
      (handlers[event] ??= []).push(handler);
    },
    goto: mock.fn(async () => {
      const document = request('https://www.jobkorea.co.kr/Login/Login_Tot.asp?re=1', 'document');
      const script = request('https://www.jobkorea.co.kr/js/slow.js?v=9', 'script');
      const tracker = request('https://www.google-analytics.com/collect', 'xhr');
      for (const r of [document, script, tracker]) handlers.request.forEach((h) => h(r));
      handlers.requestfinished.forEach((h) => h(document));
      throw new Error('Navigation timeout of 30000 ms exceeded');
    }),
    close: mock.fn(async () => {}),
  };
  return page;
}

describe('mintJobKoreaSession login page timeout diagnostics', () => {
  it('names the still-pending allowed requests without query strings', async () => {
    const page = stallingPage();
    const browser = {
      createBrowserContext: async () => ({ newPage: async () => page, close: async () => {} }),
    };

    await assert.rejects(
      mintJobKoreaSession(CREDS, { withBrowserSession: async (_env, fn) => fn(browser) }),
      (error) => {
        assert.equal(
          error.message,
          'Navigation timeout of 30000 ms exceeded; pending: script www.jobkorea.co.kr/js/slow.js'
        );
        return true;
      }
    );
  });
});
