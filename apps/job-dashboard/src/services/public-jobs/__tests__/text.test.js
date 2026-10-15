import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { fetchText } from '../text.js';

describe('public-jobs fetchText', () => {
  it('retries a timed-out request once and returns the second answer', async () => {
    let calls = 0;
    const fetcher = async () => {
      calls += 1;
      if (calls === 1)
        throw new DOMException('The operation was aborted due to timeout', 'TimeoutError');
      return new Response('ok');
    };
    assert.equal(await fetchText(fetcher, 'https://job.cleaneye.go.kr/list'), 'ok');
    assert.equal(calls, 2);
  });

  it('retries a 5xx once and reports the host when it fails again', async () => {
    let calls = 0;
    const fetcher = async () => {
      calls += 1;
      return new Response('busy', { status: 503 });
    };
    await assert.rejects(
      fetchText(fetcher, 'https://job.alio.go.kr/recruit.do', { ing: '2' }),
      /job\.alio\.go\.kr answered 503/
    );
    assert.equal(calls, 2);
  });

  it('does not retry a 404', async () => {
    let calls = 0;
    const fetcher = async () => {
      calls += 1;
      return new Response('missing', { status: 404 });
    };
    await assert.rejects(fetchText(fetcher, 'https://www.gojobs.go.kr/x'), /answered 404/);
    assert.equal(calls, 1);
  });
});
