import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import UnifiedJobCrawler from '../../../../crawlers/index.js';

function createNoopDeduplicator() {
  return {
    isDuplicate: () => false,
    markSeen: () => {},
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('UnifiedJobCrawler.search parallel keyword execution', { concurrency: 1 }, () => {
  let crawler;

  beforeEach(() => {
    mock.restoreAll();
    crawler = new UnifiedJobCrawler();
  });

  afterEach(() => {
    mock.restoreAll();
  });

  it('runs keyword searches in parallel by default', async () => {
    let inFlight = 0;
    let maxInFlight = 0;

    const rateLimiter = {
      acquire: mock.fn(async () => {}),
      recordResponse: mock.fn(() => {}),
    };

    mock.method(crawler, 'searchSource', async (_platform, { keyword }) => {
      inFlight++;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await sleep(25);
      inFlight--;
      return {
        success: true,
        jobs: [
          {
            url: `https://example.com/${keyword}`,
            title: keyword,
            position: keyword,
            company: 'Acme',
          },
        ],
      };
    });

    const jobs = await crawler.search('wanted', ['alpha', 'beta', 'gamma'], {
      rateLimiter,
      jobDeduplicator: createNoopDeduplicator(),
    });

    assert.equal(jobs.length, 3);
    assert.equal(maxInFlight >= 2, true);
  });

  it('respects maxConcurrency limit', async () => {
    let inFlight = 0;
    let maxInFlight = 0;

    const rateLimiter = {
      acquire: mock.fn(async () => {}),
      recordResponse: mock.fn(() => {}),
    };

    mock.method(crawler, 'searchSource', async (_platform, { keyword }) => {
      inFlight++;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await sleep(15);
      inFlight--;
      return {
        success: true,
        jobs: [
          {
            url: `https://example.com/${keyword}`,
            title: keyword,
            position: keyword,
            company: 'Acme',
          },
        ],
      };
    });

    const jobs = await crawler.search('wanted', ['one', 'two', 'three'], {
      maxConcurrency: 1,
      rateLimiter,
      jobDeduplicator: createNoopDeduplicator(),
    });

    assert.equal(jobs.length, 3);
    assert.equal(maxInFlight, 1);
  });

  it('isolates keyword failures with Promise.allSettled', async () => {
    const rateLimiter = {
      acquire: mock.fn(async () => {}),
      recordResponse: mock.fn(() => {}),
    };

    const errorLog = mock.method(console, 'error', () => {});

    mock.method(crawler, 'searchSource', async (_platform, { keyword }) => {
      if (keyword === 'broken') {
        throw new Error('forced failure');
      }
      return {
        success: true,
        jobs: [
          {
            url: `https://example.com/${keyword}`,
            title: keyword,
            position: keyword,
            company: 'Acme',
          },
        ],
      };
    });

    const jobs = await crawler.search('wanted', ['ok-1', 'broken', 'ok-2'], {
      maxConcurrency: 2,
      rateLimiter,
      jobDeduplicator: createNoopDeduplicator(),
    });

    assert.equal(jobs.length, 2);
    assert.equal(errorLog.mock.calls.length >= 1, true);
  });

  it('deduplicates jobs across keyword results via job deduplicator', async () => {
    const seen = new Set();
    const deduplicator = {
      isDuplicate: mock.fn((job) => {
        const key = `${job.url}|${job.title}|${job.company}`;
        return seen.has(key);
      }),
      markSeen: mock.fn((job) => {
        const key = `${job.url}|${job.title}|${job.company}`;
        seen.add(key);
      }),
    };

    const rateLimiter = {
      acquire: mock.fn(async () => {}),
      recordResponse: mock.fn(() => {}),
    };

    mock.method(crawler, 'searchSource', async () => ({
      success: true,
      jobs: [
        {
          url: 'https://example.com/dup-job',
          title: 'Platform Engineer',
          company: 'Acme',
        },
      ],
    }));

    const jobs = await crawler.search('wanted', ['keyword-1', 'keyword-2'], {
      maxConcurrency: 2,
      rateLimiter,
      jobDeduplicator: deduplicator,
    });

    assert.equal(jobs.length, 1);
    assert.equal(deduplicator.isDuplicate.mock.calls.length, 2);
    assert.equal(deduplicator.markSeen.mock.calls.length, 1);
  });

  it('integrates with rate limiter for each keyword search', async () => {
    const rateLimiter = {
      acquire: mock.fn(async () => {}),
      recordResponse: mock.fn(() => {}),
    };

    mock.method(crawler, 'searchSource', async (_platform, { keyword }) => ({
      success: true,
      jobs: [
        {
          url: `https://example.com/${keyword}`,
          title: keyword,
          position: keyword,
          company: 'Acme',
        },
      ],
    }));

    const jobs = await crawler.search('wanted', ['a', 'b', 'c'], {
      maxConcurrency: 2,
      rateLimiter,
      jobDeduplicator: createNoopDeduplicator(),
    });

    assert.equal(jobs.length, 3);
    assert.equal(rateLimiter.acquire.mock.calls.length, 3);
    assert.equal(rateLimiter.recordResponse.mock.calls.length, 3);
    for (const call of rateLimiter.acquire.mock.calls) {
      assert.equal(call.arguments[0], 'wanted');
    }
  });
});
