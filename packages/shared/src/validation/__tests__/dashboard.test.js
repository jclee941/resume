import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateApplicationCreate,
  validateApplicationUpdate,
  validateStatusUpdate,
} from '../index.js';

const statuses =
  'pending, saved, applied, viewed, in_progress, interview, offer, rejected, withdrawn, expired';

describe('dashboard validation compatibility', () => {
  it('preserves create validation messages', () => {
    const result = validateApplicationCreate({ job: { sourceUrl: 'ftp://bad', matchScore: 101 } });
    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.includes('position/title is required and must be a string'));
    assert.ok(result.errors.includes('company is required and must be a string'));
    assert.ok(result.errors.includes('sourceUrl must be a valid URL'));
    assert.ok(result.errors.includes('matchScore must be a number between 0 and 100'));
  });

  it('preserves update validation messages and allows empty updates', () => {
    assert.deepStrictEqual(validateApplicationUpdate({}), { valid: true, data: {} });

    const result = validateApplicationUpdate({ notes: 1, priority: 'urgent', resumeId: 7 });
    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.includes('notes must be a string'));
    assert.ok(result.errors.includes('priority must be one of: low, medium, high'));
    assert.ok(result.errors.includes('resumeId must be a string'));
  });

  it('preserves status validation messages', () => {
    assert.deepStrictEqual(validateStatusUpdate({ status: 'applied', note: 'ok' }), {
      valid: true,
      data: { status: 'applied', note: 'ok' },
    });

    const result = validateStatusUpdate({ status: 'unknown', note: 1 });
    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.includes(`status must be one of: ${statuses}`));
    assert.ok(result.errors.includes('note must be a string'));
  });
});
