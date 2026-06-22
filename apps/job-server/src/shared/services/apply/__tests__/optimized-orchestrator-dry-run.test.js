import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';

import { applyToJobsWithStrategy } from '../optimized-orchestrator/execution.js';

describe('OptimizedApplyOrchestrator dry-run behavior', () => {
  it('does not count optimized dry-run plans as applied submissions', async () => {
    const stats = { applied: 0, skipped: 0, failed: 0, endTime: null };
    const result = await applyToJobsWithStrategy({
      appManager: { listApplications: mock.fn(() => []) },
      applySingleJob: mock.fn(async () => ({ success: true })),
      config: {
        maxDailyApplications: 10,
        parallelApply: false,
        useBrowserPool: false,
      },
      dryRun: true,
      jobs: [
        { id: 'wanted_1', company: 'A', source: 'wanted' },
        { id: 'wanted_2', company: 'B', source: 'wanted' },
      ],
      logger: { info: mock.fn(), error: mock.fn(), log: mock.fn() },
      metrics: {
        mark: mock.fn(),
        measure: mock.fn(),
      },
      stats,
    });

    assert.equal(result.applied, 0);
    assert.equal(result.failed, 0);
    assert.equal(result.skipped, 2);
    assert.equal(result.results.length, 2);
    assert.equal(result.results.every((entry) => entry.dryRun === true), true);
    assert.equal(result.results.every((entry) => entry.skipped === true), true);
    assert.equal(stats.applied, 0);
  });
});
