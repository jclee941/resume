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
    const [error] = formatErrorsForMCP(result.errors);
    assert.strictEqual(error.field, '(root)');
    assert.strictEqual(error.message, 'Resume data must be an object');
    assert.strictEqual(error.jsonPointer, '');
    assert.strictEqual(Object.hasOwn(error, 'rawInput'), false);
    assert.strictEqual(error.type, 'type');
    assert.strictEqual(error.code, 'invalid-type');
  });

  it('preserves structured diagnostics for nested array errors', () => {
    const schema = {
      type: 'object',
      required: ['careers'],
      properties: {
        careers: {
          type: 'array',
          items: {
            type: 'object',
            required: ['id', 'period', 'role'],
            properties: {
              id: {
                type: 'string',
                pattern: '^[a-z]+$',
                description: 'Career ID',
              },
              period: {
                type: 'string',
                pattern: '^\\d{4}\\.\\d{2}$',
                description: 'Career period',
              },
              role: { type: 'string', description: 'Career role' },
            },
          },
        },
      },
    };
    const data = { careers: [{ id: 'invalid id', period: 42 }] };

    const result = validateResumeData(data, schema, 'fixtures/invalid-resume.json');

    assert.strictEqual(result.valid, false);
    assert.strictEqual(result.errors.length, 3);
    assert.deepStrictEqual(
      result.errors.find((error) => error.path === 'careers[0].period'),
      {
        path: 'careers[0].period',
        message: "Expected 'string', got number",
        value: 42,
        sourceFile: 'fixtures/invalid-resume.json',
        jsonPointer: '/careers/0/period',
        arrayIndex: 0,
        rawInput: 42,
        expected: "'string'",
        expectedFormat: 'Career period',
        allowed: null,
        type: 'type',
        code: 'invalid-type',
      }
    );
    assert.ok(
      result.errors.every((error) =>
        [
          'sourceFile',
          'jsonPointer',
          'arrayIndex',
          'rawInput',
          'expected',
          'expectedFormat',
          'allowed',
          'type',
          'code',
          'message',
        ].every((field) => Object.hasOwn(error, field))
      )
    );
  });

  it('delegates valid resume data to canonical engine', () => {
    const validData = {
      personal: { name: 'Test', email: 'test@test.com', phone: '010-1234-5678' },
      education: { school: 'Test', major: 'CS' },
      summary: { totalExperience: '5 years', expertise: ['JavaScript'] },
      current: { company: 'Test Co', position: 'Developer' },
      careers: [
        { id: 'test-co-dev', company: 'Test Co', period: '2020.01 ~ 2023.01', role: 'Dev' },
      ],
      skills: { languages: [{ name: 'JavaScript', level: 'expert' }] },
    };

    assert.deepStrictEqual(validateResumeData(validData, masterSchema), {
      valid: true,
      errors: undefined,
    });
  });
});
