import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';

import { ApplyOrchestrator } from '../orchestrator.js';
import { UnifiedApplySystem } from '../unified-apply-system.js';

function createApplier() {
  return {
    initBrowser: mock.fn(async () => {}),
    applyToJob: mock.fn(async () => ({ success: true })),
    closeBrowser: mock.fn(async () => {}),
  };
}

describe('dry-run apply summaries', () => {
  it('plans dry-run jobs without submitting or counting them as applied', async () => {
    const applier = createApplier();
    const orchestrator = new ApplyOrchestrator(
      { search: mock.fn(async () => []) },
      applier,
      { listApplications: mock.fn(() => []) },
      { maxDailyApplications: 5 }
    );

    const result = await orchestrator.applyToJobs(
      [
        { company: 'PlanA', position: 'DevOps', source: 'wanted' },
        { company: 'PlanB', position: 'SRE', source: 'wanted' },
      ],
      true
    );

    assert.equal(result.applied, 0);
    assert.equal(result.failed, 0);
    assert.equal(result.skipped, 2);
    assert.equal(applier.initBrowser.mock.calls.length, 0);
    assert.equal(applier.applyToJob.mock.calls.length, 0);
    assert.equal(applier.closeBrowser.mock.calls.length, 0);
    assert.ok(result.results.every((entry) => entry.dryRun === true && entry.skipped === true));
    assert.equal(orchestrator.getStats().applied, 0);
  });

  it('reports zero succeeded applications in unified dry-run summaries', async () => {
    const system = new UnifiedApplySystem({
      crawler: {
        search: mock.fn(async () => [
          { company: 'Toss', position: 'DevOps', matchScore: 80, source: 'wanted' },
        ]),
      },
      applier: createApplier(),
      appManager: { listApplications: mock.fn(() => []) },
      config: { reviewThreshold: 0, autoApplyThreshold: 0, minMatchScore: 0 },
    });

    const result = await system.run({ keywords: ['devops'], dryRun: true, notify: false });

    assert.equal(result.dryRun, true);
    assert.equal(result.phases.apply.attempted, 1);
    assert.equal(result.phases.apply.succeeded, 0);
    assert.equal(result.phases.apply.skipped, 1);
  });
});
