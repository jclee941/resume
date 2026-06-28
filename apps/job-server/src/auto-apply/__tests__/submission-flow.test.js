import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { createSubmittedResult } from '../auto-applier-pipeline/submission-flow.js';

describe('auto-applier submission flow', () => {
  it('counts already-applied submissions as skipped instead of applied', () => {
    const result = createSubmittedResult(
      'wanted_365134',
      { id: 'app_1' },
      { success: true, applied: false, status: 'already_applied' },
      { submit: true }
    );

    assert.equal(result.success, true);
    assert.equal(result.applied, false);
    assert.equal(result.status, 'already_applied');
  });
});
