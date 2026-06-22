import { beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';

import { UnifiedApplySystem } from '../index.js';

describe('UnifiedApplySystem behavior', () => {
  let crawler;
  let applier;
  let appManager;
  let notifier;

  beforeEach(() => {
    mock.method(console, 'log', () => {});
    mock.method(console, 'error', () => {});
    crawler = {
      search: mock.fn(async () => [
        { company: 'Toss', position: 'DevOps', matchScore: 80, source: 'wanted' },
        { company: 'Kakao', position: 'Backend', matchScore: 70, source: 'wanted' },
      ]),
    };
    applier = {
      apply: mock.fn(async () => ({ success: true })),
    };
    appManager = {
      listApplications: mock.fn(() => []),
      addApplication: mock.fn(),
    };
    notifier = {
      notifyAutoApplyResult: mock.fn(async () => {}),
      notifySearchResults: mock.fn(async () => {}),
    };
  });

  it('runs the pipeline and handles notification options', async () => {
    const system = new UnifiedApplySystem({
      crawler,
      applier,
      appManager,
      notifier,
      config: { minMatchScore: 60 },
    });

    const result = await system.run({ keywords: ['devops'], dryRun: true });

    assert.equal(result.success, true);
    assert.equal(result.dryRun, true);
    assert.equal(result.phases.search.found, 2);
    assert.ok(result.phases.filter);
    assert.ok(result.phases.apply);
    assert.ok(result.timestamp);
    assert.equal(notifier.notifyAutoApplyResult.mock.calls.length, 1);

    await system.run({ keywords: ['devops'], notify: false, dryRun: true });
    assert.equal(notifier.notifyAutoApplyResult.mock.calls.length, 1);

    notifier.notifyAutoApplyResult = mock.fn(async () => {
      throw new Error('Slack down');
    });
    assert.equal((await system.run({ keywords: ['devops'], notify: true })).success, true);
  });

  it('supports searchOnly, config copies, updateConfig, stats, and reset', async () => {
    const system = new UnifiedApplySystem({
      crawler,
      applier,
      appManager,
      notifier,
      config: { keywords: ['default-keyword'], minMatchScore: 60 },
    });

    const searchResult = await system.searchOnly(['devops'], { notify: true });
    assert.ok(Array.isArray(searchResult.jobs));
    assert.equal(searchResult.stats.searched, 2);
    assert.equal(applier.apply.mock.calls.length, 0);
    assert.equal(notifier.notifySearchResults.mock.calls[0].arguments[1], 'devops');

    await system.searchOnly(undefined, { notify: false });
    assert.equal(crawler.search.mock.calls.length, 2);

    const config = system.config;
    config.maxDailyApplications = 999;
    assert.notEqual(system.config.maxDailyApplications, 999);

    system.updateConfig({ minMatchScore: 80, reviewThreshold: 80 });
    assert.ok((await system.searchOnly(['devops'])).jobs.every((job) => job.matchScore >= 80));

    await system.run({ keywords: ['devops'], dryRun: true });
    assert.equal(system.getStats().searched, 2);
    system.reset();
    assert.equal(system.getStats().searched, 0);
  });

  it('applies fallback zeros when apply result omits counters', async () => {
    const cappedSystem = new UnifiedApplySystem({
      crawler,
      applier,
      appManager: { listApplications: mock.fn(() => Array(20).fill({ status: 'applied' })) },
      config: { maxDailyApplications: 20, reviewThreshold: 0 },
    });

    const result = await cappedSystem.run({ keywords: ['devops'], dryRun: false, notify: false });

    assert.equal(result.phases.apply.attempted, 0);
    assert.equal(result.phases.apply.succeeded, 0);
    assert.equal(result.phases.apply.failed, 0);
    assert.equal(result.phases.apply.skipped, 2);
  });
});
