import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { masterSchema, validateResumeData, formatErrorsForMCP } from '../index.js';

describe('shared validation', () => {
  it('loads canonical master schema', () => {
    assert.ok(masterSchema.properties);
    assert.ok(masterSchema.required.includes('personal'));
  });

  it('rejects non-object resume roots with MCP-compatible errors', () => {
    const result = validateResumeData(null, masterSchema);
    assert.strictEqual(result.valid, false);
    assert.deepStrictEqual(formatErrorsForMCP(result.errors), [
      { field: '(root)', message: 'Resume data must be an object' },
    ]);
  });

  it('delegates valid resume data to canonical engine', () => {
    const validData = {
      personal: { name: 'Test', email: 'test@test.com', phone: '010-1234-5678' },
      education: { school: 'Test', major: 'CS' },
      summary: { totalExperience: '5 years', expertise: ['JavaScript'] },
      current: { company: 'Test Co', position: 'Developer' },
      careers: [{ company: 'Test Co', period: '2020.01 ~ 2023.01', role: 'Dev' }],
      skills: { languages: [{ name: 'JavaScript', level: 'expert' }] },
    };

    assert.deepStrictEqual(validateResumeData(validData, masterSchema), { valid: true, errors: undefined });
  });
});
