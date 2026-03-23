import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { ApplyOrchestrator } from '../orchestrator.js';

describe('ApplyOrchestrator branch coverage', () => {
  let crawler;
  let applier;
  let appManager;
  let logger;

  beforeEach(() => {
    crawler = {
      search: mock.fn(async () => []),
    };
    applier = {
      initBrowser: mock.fn(async () => {}),
      applyToJob: mock.fn(async () => ({ success: true })),
      closeBrowser: mock.fn(async () => {}),
    };
    appManager = {
      listApplications: mock.fn(() => []),
    };
    logger = {
      log: mock.fn(),
      error: mock.fn(),
    };
  });

  it('searchJobs sequential mode continues when one platform throws', async () => {
    crawler.search = mock.fn(async (platform) => {
      if (platform === 'wanted') {
        throw new Error('wanted fail');
      }
      return [{ company: 'Ok', position: 'DevOps', source: platform }];
    });

    const orchestrator = new ApplyOrchestrator(crawler, applier, appManager, {
      logger,
      parallelSearch: false,
      enabledPlatforms: ['wanted', 'saramin'],
    });

    const jobs = await orchestrator.searchJobs(['devops']);

    assert.equal(crawler.search.mock.calls.length, 2);
    assert.equal(jobs.length, 1);
    assert.equal(jobs[0].source, 'saramin');
    assert.equal(logger.error.mock.calls.length, 1);
    assert.match(logger.error.mock.calls[0].arguments[0], /Failed to search platform wanted/);
  });

  it('applyToJobs returns browser init error when initBrowser throws', async () => {
    applier.initBrowser = mock.fn(async () => {
      throw new Error('browser boot failed');
    });

    const orchestrator = new ApplyOrchestrator(crawler, applier, appManager, {
      logger,
      delayBetweenApplies: 0,
      maxDailyApplications: 5,
    });

    const jobs = [{ company: 'A', position: 'DevOps', source: 'wanted' }];
    const result = await orchestrator.applyToJobs(jobs, false);

    assert.equal(result.applied, 0);
    assert.equal(result.failed, 1);
    assert.equal(result.error, 'Browser init failed: browser boot failed');
    assert.equal(applier.applyToJob.mock.calls.length, 0);
  });

  it('applyToJobs dryRun=false handles success, failure result, and exception', async () => {
    const jobs = [
      { company: 'Good', position: 'DevOps', source: 'wanted', sourceUrl: 'https://a' },
      { company: 'Bad', position: 'Backend', source: 'wanted', sourceUrl: 'https://b' },
      { company: 'Boom', position: 'SRE', source: 'wanted', sourceUrl: 'https://c' },
    ];

    let call = 0;
    applier.applyToJob = mock.fn(async () => {
      call += 1;
      if (call === 1) return { success: true, message: 'ok' };
      if (call === 2) return { success: false, error: 'rejected' };
      throw new Error('unexpected crash');
    });

    const orchestrator = new ApplyOrchestrator(crawler, applier, appManager, {
      logger,
      delayBetweenApplies: 0,
      maxDailyApplications: 10,
    });

    const result = await orchestrator.applyToJobs(jobs, false);

    assert.equal(applier.initBrowser.mock.calls.length, 1);
    assert.equal(applier.closeBrowser.mock.calls.length, 1);
    assert.equal(result.applied, 1);
    assert.equal(result.failed, 2);
    assert.equal(result.results.length, 3);
    assert.equal(logger.error.mock.calls.length >= 2, true);
    assert.ok(result.results.some((r) => r.job.company === 'Bad' && r.success === false));
    assert.ok(result.results.some((r) => r.job.company === 'Boom' && r.success === false));

    const stats = orchestrator.getStats();
    assert.equal(stats.applied, 1);
    assert.equal(stats.failed, 2);
    assert.equal(stats.skipped, 0);
  });

  it('logs closeBrowser error in finally block', async () => {
    applier.closeBrowser = mock.fn(async () => {
      throw new Error('close failed');
    });

    const orchestrator = new ApplyOrchestrator(crawler, applier, appManager, {
      logger,
      delayBetweenApplies: 0,
    });

    const result = await orchestrator.applyToJobs(
      [{ company: 'CloseTest', position: 'DevOps', source: 'wanted', sourceUrl: 'https://x' }],
      false
    );

    assert.equal(result.applied, 1);
    assert.equal(applier.closeBrowser.mock.calls.length, 1);
    assert.equal(logger.error.mock.calls.length >= 1, true);
    const hasCloseErrorLog = logger.error.mock.calls.some(
      (entry) => entry.arguments[0] === 'Failed to close browser:'
    );
    assert.equal(hasCloseErrorLog, true);
  });

  it('returns daily limit reached when remaining is zero', async () => {
    appManager.listApplications = mock.fn(() => Array(2).fill({ status: 'applied' }));

    const orchestrator = new ApplyOrchestrator(crawler, applier, appManager, {
      logger,
      maxDailyApplications: 2,
    });

    const result = await orchestrator.applyToJobs(
      [
        { company: 'A', position: 'DevOps', source: 'wanted' },
        { company: 'B', position: 'Backend', source: 'wanted' },
      ],
      false
    );

    assert.equal(result.reason, 'Daily limit reached');
    assert.equal(result.skipped, 2);
    assert.equal(result.results.length, 0);
  });

  it('supports getStats, reset, and updateConfig', async () => {
    crawler.search = mock.fn(async () => [{ company: 'A', position: 'DevOps', source: 'wanted' }]);

    const orchestrator = new ApplyOrchestrator(crawler, applier, appManager, {
      logger,
      enabledPlatforms: ['wanted'],
      maxDailyApplications: 1,
      delayBetweenApplies: 0,
    });

    await orchestrator.searchJobs(['devops']);
    let stats = orchestrator.getStats();
    assert.equal(stats.searched, 1);
    assert.equal(stats.duration, null);

    orchestrator.updateConfig({ maxDailyApplications: 3, enabledPlatforms: ['wanted', 'saramin'] });

    await orchestrator.searchJobs(['platform-check']);
    assert.equal(crawler.search.mock.calls.length >= 3, true);

    await orchestrator.applyToJobs([{ company: 'A', position: 'DevOps', source: 'wanted' }], true);
    stats = orchestrator.getStats();
    assert.equal(stats.applied >= 1, true);

    orchestrator.reset();
    stats = orchestrator.getStats();
    assert.equal(stats.searched, 0);
    assert.equal(stats.applied, 0);
    assert.equal(stats.failed, 0);
    assert.equal(stats.startTime, null);
  });

  it('uses title fallback in logs and works without appManager', async () => {
    const noAppManagerOrchestrator = new ApplyOrchestrator(crawler, applier, null, {
      logger,
      delayBetweenApplies: 0,
      maxDailyApplications: 3,
    });

    let call = 0;
    applier.applyToJob = mock.fn(async () => {
      call += 1;
      if (call === 1) return { success: true };
      if (call === 2) return { success: false, error: 'apply failed' };
      throw new Error('apply exception');
    });

    await noAppManagerOrchestrator.applyToJobs(
      [
        { title: 'Title Success', source: 'wanted', sourceUrl: 'https://s' },
        { title: 'Title Fail', source: 'wanted', sourceUrl: 'https://f' },
        { title: 'Title Exception', source: 'wanted', sourceUrl: 'https://e' },
      ],
      false
    );

    const logMessages = logger.log.mock.calls.map((entry) => entry.arguments[0]);
    const errorMessages = logger.error.mock.calls.map((entry) => entry.arguments[0]);

    assert.ok(logMessages.some((msg) => msg.includes('Title Success')));
    assert.ok(errorMessages.some((msg) => msg.includes('Title Fail')));
    assert.ok(errorMessages.some((msg) => msg.includes('Title Exception')));
  });
});
