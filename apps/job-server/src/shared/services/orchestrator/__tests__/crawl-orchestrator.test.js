import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { CrawlOrchestrator, SUPPORTED_PLATFORMS, DEFAULT_OPTIONS } from '../crawl-orchestrator.js';
import UnifiedJobCrawler from '../../../../crawlers/index.js';

describe('CrawlOrchestrator', { concurrency: 1 }, () => {
  let orchestrator;

  beforeEach(() => {
    mock.restoreAll();
    orchestrator = new CrawlOrchestrator();
  });

  afterEach(async () => {
    await orchestrator.shutdown(50);
    mock.restoreAll();
  });

  it('exports defaults and supported platforms', () => {
    assert.ok(Array.isArray(SUPPORTED_PLATFORMS));
    assert.ok(SUPPORTED_PLATFORMS.includes('wanted'));
    assert.equal(typeof DEFAULT_OPTIONS.maxBrowsers, 'number');
    assert.equal(typeof DEFAULT_OPTIONS.concurrency, 'number');
  });

  it('validates platform lists and emits warnings for unknown entries', () => {
    const warnings = [];
    orchestrator.on('warning', (payload) => warnings.push(payload));

    assert.throws(() => orchestrator._validatePlatforms([]), /At least one platform/);
    assert.throws(
      () => orchestrator._validatePlatforms(['unknown1', 'unknown2']),
      /No valid platforms provided/
    );

    const valid = orchestrator._validatePlatforms(['Wanted', 'unknown']);
    assert.deepEqual(valid, ['wanted']);
    assert.equal(warnings.length, 2);
    assert.match(warnings[0].message, /Unknown platforms ignored/);
  });

  it('ensures browser pool lazily and keeps singleton', async () => {
    assert.equal(orchestrator._browserPool, null);

    orchestrator._ensureBrowserPool({
      ...DEFAULT_OPTIONS,
      maxBrowsers: 1,
      minBrowsers: 0,
      acquireTimeoutMs: 10,
      idleTimeoutMs: 10,
      maxBrowserAge: 10,
    });

    const firstPool = orchestrator._browserPool;
    orchestrator._ensureBrowserPool(DEFAULT_OPTIONS);

    assert.strictEqual(orchestrator._browserPool, firstPool);

    const ctx = await orchestrator._createBrowserContext();
    assert.deepEqual(ctx, { browser: null, page: null, closed: false });
    await orchestrator._destroyBrowserContext(ctx);
    assert.equal(ctx.closed, true);
  });

  it('executes crawl success path and aggregates jobs', async () => {
    mock.method(orchestrator.rateLimiter, 'acquire', async () => {});
    mock.method(orchestrator.rateLimiter, 'recordResponse', () => {});
    mock.method(orchestrator, '_executePlatformCrawl', async (platform) => [
      { company: 'Acme', title: 'Engineer', platform },
      { company: 'Acme', title: 'Engineer', platform },
    ]);

    const result = await orchestrator.crawl(
      ['wanted', 'saramin'],
      { keywords: 'dev', limit: 2 },
      {}
    );

    assert.equal(result.totalJobs, 1);
    assert.equal(result.hasErrors, false);
    assert.equal(Object.keys(result.platforms).length, 2);
    assert.equal(result.platforms.wanted.status, 'success');
    assert.equal(result.platforms.saramin.jobCount, 2);
  });

  it('honors external abort signal during crawl setup', async () => {
    const external = new AbortController();
    mock.method(orchestrator, '_executeWithConcurrency', async () => {
      await Promise.resolve();
      assert.equal(orchestrator._abortController.signal.aborted, true);
      return new Map();
    });

    const run = orchestrator.crawl(['wanted'], { keywords: 'dev' }, { signal: external.signal });
    external.abort();
    const result = await run;

    assert.equal(result.totalJobs, 0);
    assert.equal(result.hasErrors, false);
  });

  it('throws on crawl after shutdown', async () => {
    await orchestrator.shutdown(20);
    await assert.rejects(() => orchestrator.crawl(['wanted'], { keywords: 'dev' }), /shut down/);
  });

  it('supports cancel and shutdown', async () => {
    orchestrator._abortController = new AbortController();
    orchestrator.cancel();
    assert.equal(orchestrator._abortController.signal.aborted, true);

    const fakePool = { drain: mock.fn(async () => {}) };
    const destroy = mock.fn(() => {});
    orchestrator._browserPool = fakePool;
    orchestrator.progressTracker = { destroy };

    await orchestrator.shutdown(10);

    assert.equal(fakePool.drain.mock.calls.length, 1);
    assert.equal(destroy.mock.calls.length, 1);
    assert.equal(orchestrator._browserPool, null);
  });

  it('returns metrics with and without browser pool', () => {
    const beforePool = orchestrator.getMetrics();
    assert.equal(beforePool.browserPool, null);

    orchestrator._browserPool = {
      drain: async () => {},
      getMetrics: () => ({
        size: 1,
        idle: 1,
        inUse: 0,
        waiting: 0,
        totalCreated: 1,
        totalDestroyed: 0,
      }),
    };

    const afterPool = orchestrator.getMetrics();
    assert.equal(afterPool.browserPool.size, 1);
    assert.equal(typeof afterPool.progress.totalTasks, 'number');
  });

  it('executes worker concurrency loop and collects per-platform results', async () => {
    orchestrator._abortController = new AbortController();
    const tasks = new Map([
      ['wanted', 'task-1'],
      ['saramin', 'task-2'],
      ['jobkorea', 'task-3'],
    ]);

    mock.method(orchestrator, '_crawlPlatform', async (platform) => ({
      platform,
      status: 'success',
      jobs: [{ company: platform, title: 'Engineer' }],
      error: null,
      durationMs: 1,
    }));

    const results = await orchestrator._executeWithConcurrency(
      ['wanted', 'saramin', 'jobkorea'],
      { keywords: 'dev' },
      tasks,
      { ...DEFAULT_OPTIONS, concurrency: 2 }
    );

    assert.equal(results.size, 3);
    assert.equal(results.get('wanted').status, 'success');
  });

  it('stops worker loop when already aborted', async () => {
    orchestrator._abortController = new AbortController();
    orchestrator._abortController.abort();
    const crawlCalls = [];
    mock.method(orchestrator, '_crawlPlatform', async (platform) => {
      crawlCalls.push(platform);
      return {
        platform,
        status: 'success',
        jobs: [],
        error: null,
        durationMs: 0,
      };
    });

    const results = await orchestrator._executeWithConcurrency(
      ['wanted', 'saramin'],
      { keywords: 'dev' },
      new Map([
        ['wanted', 'task-1'],
        ['saramin', 'task-2'],
      ]),
      { ...DEFAULT_OPTIONS, concurrency: 2 }
    );

    assert.equal(results.size, 0);
    assert.equal(crawlCalls.length, 0);
  });

  it('handles _crawlPlatform cancelled and error branches', async () => {
    const taskCancelled = orchestrator.progressTracker.addTask('wanted', 'search');
    orchestrator._abortController = new AbortController();
    orchestrator._abortController.abort();

    const cancelled = await orchestrator._crawlPlatform(
      'wanted',
      { keywords: 'dev' },
      taskCancelled,
      DEFAULT_OPTIONS
    );
    assert.equal(cancelled.status, 'cancelled');

    const taskError = orchestrator.progressTracker.addTask('saramin', 'search');
    orchestrator._abortController = new AbortController();
    mock.method(orchestrator.rateLimiter, 'acquire', async () => {});
    mock.method(orchestrator, '_executePlatformCrawl', async () => {
      const error = new Error('blocked');
      error.statusCode = 429;
      error.retryAfter = 2;
      throw error;
    });

    const errored = await orchestrator._crawlPlatform(
      'saramin',
      { keywords: 'dev' },
      taskError,
      DEFAULT_OPTIONS
    );
    assert.equal(errored.status, 'error');
    assert.equal(errored.error.code, 429);
    assert.equal(orchestrator.progressTracker.getTask(taskError).status, 'failed');
  });

  it('mocks dynamic crawler import path through UnifiedJobCrawler prototype', async () => {
    mock.method(UnifiedJobCrawler.prototype, 'search', async (_platform, _keywords, options) => [
      { company: 'Acme', title: 'One', options },
    ]);

    const jobs = await orchestrator._executePlatformCrawl('wanted', {
      keywords: 'dev',
      location: 'seoul',
      experience: 5,
      limit: 3,
      extra: { remote: true },
    });

    assert.equal(jobs.length, 1);
    assert.equal(jobs[0].company, 'Acme');
    assert.deepEqual(jobs[0].options, {
      location: 'seoul',
      experience: 5,
      limit: 3,
      remote: true,
    });
  });

  it('returns empty list when dynamic crawler returns null', async () => {
    mock.method(UnifiedJobCrawler.prototype, 'search', async () => null);
    const jobs = await orchestrator._executePlatformCrawl('wanted', {
      keywords: 'dev',
    });
    assert.deepEqual(jobs, []);
  });

  it('maps error status from status field fallback', async () => {
    const taskError = orchestrator.progressTracker.addTask('wanted', 'search');
    orchestrator._abortController = new AbortController();
    mock.method(orchestrator.rateLimiter, 'acquire', async () => {});
    mock.method(orchestrator, '_executePlatformCrawl', async () => {
      const error = new Error('gateway');
      error.status = 502;
      throw error;
    });

    const errored = await orchestrator._crawlPlatform(
      'wanted',
      { keywords: 'dev' },
      taskError,
      DEFAULT_OPTIONS
    );
    assert.equal(errored.error.code, 502);
  });

  it('aggregates results with and without deduplication', () => {
    const map = new Map([
      [
        'wanted',
        {
          status: 'success',
          jobs: [
            { company: 'Acme', title: 'Engineer' },
            { company: 'Acme', title: 'Engineer' },
          ],
          error: null,
          durationMs: 5,
        },
      ],
      [
        'saramin',
        {
          status: 'error',
          jobs: [],
          error: { message: 'boom', code: 500 },
          durationMs: 7,
        },
      ],
    ]);

    const deduped = orchestrator._aggregateResults(map, { deduplicate: true });
    const raw = orchestrator._aggregateResults(map, { deduplicate: false });

    assert.equal(deduped.jobs.length, 1);
    assert.equal(raw.jobs.length, 2);
    assert.equal(deduped.errors.length, 1);
    assert.equal(deduped.hasErrors, true);
    assert.equal(deduped.platforms.saramin.status, 'error');
  });

  it('deduplicates using title when position is missing', () => {
    const map = new Map([
      [
        'wanted',
        {
          status: 'success',
          jobs: [
            { company: 'Acme', title: 'Platform Engineer' },
            { company: 'Acme', title: 'Platform Engineer' },
          ],
          error: null,
          durationMs: 3,
        },
      ],
    ]);

    const deduped = orchestrator._aggregateResults(map, { deduplicate: true });

    assert.equal(deduped.jobs.length, 1);
    assert.equal(deduped.jobs[0].title, 'Platform Engineer');
  });
});
