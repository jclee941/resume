import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import JobKoreaCrawler from '../jobkorea-crawler.js';

describe('JobKoreaCrawler.getProfile — structured stub (audit Issue D)', () => {
  it('returns AUTH_REQUIRED when no cookies set', async () => {
    const crawler = new JobKoreaCrawler();
    const result = await crawler.getProfile();
    assert.equal(result.success, false);
    assert.equal(result.source, 'jobkorea');
    assert.equal(result.status, 'AUTH_REQUIRED');
    assert.equal(result.error, 'Authentication required');
  });

  it('returns NOT_IMPLEMENTED with structured payload when authenticated', async () => {
    const crawler = new JobKoreaCrawler({ cookies: 'session=abc123' });
    const result = await crawler.getProfile();
    assert.equal(result.success, false);
    assert.equal(result.source, 'jobkorea');
    assert.equal(result.status, 'NOT_IMPLEMENTED');
    assert.equal(result.profile, null);
    assert.ok(
      typeof result.reason === 'string' && result.reason.length > 0,
      'reason must be a non-empty string'
    );
    assert.ok(
      Array.isArray(result.recommendedFlow) && result.recommendedFlow.length >= 4,
      'recommendedFlow must list the implementation steps (>=4 items)'
    );
  });

  it('does not throw — never crashes the ProfileAggregator', async () => {
    const crawler = new JobKoreaCrawler({ cookies: 'session=xyz' });
    await assert.doesNotReject(() => crawler.getProfile());
  });
});
