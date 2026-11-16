import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import { RememberClient } from '../../remember-client.js';

const originalFetch = globalThis.fetch;
const env = {
  REMEMBER_BROWSER_ACCOUNT_ID: 'test-account',
  REMEMBER_BROWSER_API_TOKEN: 'test-browser-token',
};

describe('RememberClient search transport', () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  for (const keyword of ['정보보안', undefined]) {
    it(`returns browser-rendered postings for ${keyword ?? 'curated search'} when direct egress is blocked`, async () => {
      globalThis.fetch = async (url, init) => {
        if (!String(url).startsWith('https://api.cloudflare.com/')) {
          return new Response('Blocked', { status: 403 });
        }
        const payload = JSON.parse(init.body);
        const marker = payload.waitForSelector.selector.slice(1);
        const body = JSON.stringify({
          data: [{ id: 42, title: 'Security engineer', organization: { name: 'Example' } }],
        });
        const encoded = Buffer.from(JSON.stringify({ status: 200, body, headers: [] })).toString(
          'base64'
        );
        return Response.json({
          success: true,
          result: `<html><body><div id="${marker}">${encoded}</div></body></html>`,
        });
      };

      const result = await new RememberClient(env).searchJobs(keyword);

      assert.equal(result.success, true);
      assert.deepEqual(
        result.jobs.map(({ sourceId, source, position }) => ({ sourceId, source, position })),
        [{ sourceId: '42', source: 'remember', position: 'Security engineer' }]
      );
    });
  }
});
