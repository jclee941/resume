import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { countApplyResults } from '../orchestrator-results.js';

describe('orchestrator result counting', () => {
  it('counts already-applied successful outcomes as skipped', () => {
    const summary = countApplyResults(
      [
        { success: true, applied: false, skipped: true, status: 'already_applied' },
        { success: true, applicationId: 'app-1' },
        { success: false, error: 'boom' },
      ],
      2
    );

    assert.deepEqual(summary, {
      applied: 1,
      failed: 1,
      skipped: 3,
    });
  });

  it('does not double-count failed applied-false outcomes as skipped', () => {
    const summary = countApplyResults([{ success: false, applied: false, error: 'boom' }], 0);

    assert.deepEqual(summary, {
      applied: 0,
      failed: 1,
      skipped: 0,
    });
  });
});
