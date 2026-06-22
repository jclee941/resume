import { beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';

import { ApplyOrchestrator } from '../index.js';

describe('ApplyOrchestrator basics', () => {
  let crawler;
  let applier;
  let appManager;

  beforeEach(() => {
    mock.method(console, 'log', () => {});
    mock.method(console, 'error', () => {});
    crawler = {
      search: mock.fn(async () => [{ company: 'Test', position: 'DevOps', source: 'wanted' }]),
    };
    applier = {
      applyToJob: mock.fn(async () => ({ success: true })),
    };
    appManager = {
      listApplications: mock.fn(() => []),
      addApplication: mock.fn(),
    };
  });

  it('searches across enabled platforms and handles search failures', async () => {
    const orchestrator = new ApplyOrchestrator(crawler, applier, appManager, {
      enabledPlatforms: ['wanted', 'saramin'],
      foreignAtsRegistry: { supports: () => false },
    });

    const jobs = await orchestrator.searchJobs(['devops']);

    assert.equal(crawler.search.mock.calls.length, 2);
    assert.equal(jobs.length, 2);

    crawler.search = mock.fn(async () => {
      throw new Error('Network error');
    });
    const failingOrchestrator = new ApplyOrchestrator(crawler, applier, appManager, {
      parallelSearch: false,
    });

    assert.equal((await failingOrchestrator.searchJobs(['devops'])).length, 0);
  });

  it('applies only outside dry-run and handles failure paths', async () => {
    const orchestrator = new ApplyOrchestrator(crawler, applier, appManager, {
      delayBetweenApplies: 0,
    });

    const dryRunResult = await orchestrator.applyToJobs(
      [{ company: 'Test', position: 'DevOps' }],
      true
    );
    assert.equal(dryRunResult.applied, 0);
    assert.equal(dryRunResult.results[0].dryRun, true);
    assert.equal(applier.applyToJob.mock.calls.length, 0);

    const realResult = await orchestrator.applyToJobs(
      [{ company: 'Test', position: 'DevOps' }],
      false
    );
    assert.equal(realResult.applied, 1);
    assert.equal(applier.applyToJob.mock.calls.length, 1);

    applier.applyToJob = mock.fn(async () => {
      throw new Error('Apply failed');
    });
    const failedResult = await orchestrator.applyToJobs(
      [{ company: 'Test', position: 'DevOps' }],
      false
    );
    assert.equal(failedResult.failed, 1);
    assert.ok(failedResult.results[0].error);
  });

  it('respects daily application limit and resets stats', async () => {
    appManager.listApplications = mock.fn(() => Array(20).fill({ status: 'applied' }));
    const orchestrator = new ApplyOrchestrator(crawler, applier, appManager, {
      maxDailyApplications: 20,
    });

    const result = await orchestrator.applyToJobs([{ company: 'Test', position: 'DevOps' }], false);
    assert.equal(result.skipped, 1);
    assert.equal(result.reason, 'Daily limit reached');

    await orchestrator.searchJobs(['devops']);
    assert.ok(orchestrator.getStats().startTime !== null);
    orchestrator.reset();
    assert.equal(orchestrator.getStats().startTime, null);
  });
});
