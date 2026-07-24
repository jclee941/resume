import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatErrorsForMCP, validateResumeData } from '../index.js';

describe('resume validation loading', () => {
  it('fails closed when the canonical schema is unavailable', () => {
    const sourceFile = 'fixtures/resume-with-unavailable-schema.json';

    const result = validateResumeData({ arbitrary: 'data' }, {}, sourceFile);

    assert.strictEqual(result.valid, false);
    assert.deepStrictEqual(formatErrorsForMCP(result.errors), [
      {
        path: '(schema)',
        message: 'Canonical resume schema is unavailable',
        sourceFile,
        jsonPointer: '',
        arrayIndex: null,
        expected: 'a usable JSON schema',
        expectedFormat: null,
        allowed: null,
        type: 'schema',
        code: 'schema-unavailable',
        field: '(schema)',
      },
    ]);
  });
});
