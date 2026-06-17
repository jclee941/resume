import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { ApplyOrchestrator, UnifiedApplySystem } from '../index.js';

describe('apply-orchestrator-loads characterization', () => {
  it('loads and constructs apply orchestration services', async () => {
    const crawler = {
      search: mock.fn(async () => []),
    };
    const applier = {
      applyToJob: mock.fn(async () => ({ success: true })),
    };
    const appManager = {
      listApplications: mock.fn(() => []),
    };

    const orchestrator = new ApplyOrchestrator(crawler, applier, appManager, {
      enabledPlatforms: ['wanted'],
    });
    const system = new UnifiedApplySystem({
      crawler,
      applier,
      appManager,
      config: { enabledPlatforms: ['wanted'] },
    });

    assert.equal(typeof orchestrator.searchJobs, 'function');
    assert.equal(typeof orchestrator.applyToJobs, 'function');
    assert.equal(typeof system.run, 'function');

    const jobs = await orchestrator.searchJobs(['sre']);
    assert.deepEqual(jobs, []);
    assert.equal(crawler.search.mock.calls.length, 1);
  });
});
