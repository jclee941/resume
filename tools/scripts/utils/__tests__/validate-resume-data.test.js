const { mkdtempSync, rmSync, writeFileSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const assert = require('node:assert/strict');
const { describe, it } = require('node:test');
const {
  formatErrors,
  validateResumeData,
  validateResumeDataFile,
} = require('../validate-resume-data.js');

describe('validate resume data file diagnostics', () => {
  it('fails closed when the parsed schema is unusable', () => {
    const directory = mkdtempSync(join(tmpdir(), 'resume-validator-'));
    const dataFile = join(directory, 'resume.json');
    const schemaFile = join(directory, 'resume-schema.json');
    writeFileSync(dataFile, JSON.stringify({ arbitrary: 'data' }));
    writeFileSync(schemaFile, '{}');

    try {
      const result = validateResumeDataFile(dataFile, schemaFile);
      const [error] = result.errors;

      assert.strictEqual(result.valid, false);
      assert.strictEqual(result.data, null);
      assert.strictEqual(error.path, '(schema)');
      assert.strictEqual(error.sourceFile, schemaFile);
      assert.strictEqual(Object.hasOwn(error, 'rawInput'), false);
      assert.strictEqual(error.expected, 'a usable JSON schema');
      assert.strictEqual(error.type, 'schema');
      assert.strictEqual(error.code, 'schema-unavailable');
      assert.doesNotMatch(formatErrors(result.errors), /Raw input:/);
    } finally {
      rmSync(directory, { force: true, recursive: true });
    }
  });

  it('keeps parse diagnostics structured at the local CLI boundary', () => {
    const directory = mkdtempSync(join(tmpdir(), 'resume-validator-'));
    const dataFile = join(directory, 'invalid-resume.json');
    const schemaFile = join(directory, 'resume-schema.json');
    const secret = 'redact-me-resume-token';
    const sourceFragment = 'redact-';
    writeFileSync(dataFile, secret);
    writeFileSync(schemaFile, JSON.stringify({ type: 'object' }));

    try {
      const result = validateResumeDataFile(dataFile, schemaFile);
      const [error] = result.errors;

      assert.strictEqual(result.valid, false);
      assert.strictEqual(error.sourceFile, dataFile);
      assert.strictEqual(error.jsonPointer, '');
      assert.strictEqual(error.type, 'parse_error');
      assert.strictEqual(error.code, 'parse-error');
      assert.strictEqual(Object.hasOwn(error, 'rawInput'), false);
      assert.doesNotMatch(error.message, new RegExp(sourceFragment));
      assert.doesNotMatch(formatErrors(result.errors), new RegExp(secret));
      assert.doesNotMatch(formatErrors(result.errors), new RegExp(sourceFragment));
      assert.doesNotMatch(formatErrors(result.errors), /Raw input:/);
    } finally {
      rmSync(directory, { force: true, recursive: true });
    }
  });

  it('keeps malformed schema content out of CLI diagnostics', () => {
    const directory = mkdtempSync(join(tmpdir(), 'resume-validator-'));
    const dataFile = join(directory, 'resume.json');
    const schemaFile = join(directory, 'invalid-schema.json');
    const secret = 'redact-me-schema-token';
    const sourceFragment = 'redact-';
    writeFileSync(dataFile, JSON.stringify({ name: 'Jaecheol' }));
    writeFileSync(schemaFile, secret);

    try {
      const result = validateResumeDataFile(dataFile, schemaFile);
      const [error] = result.errors;

      assert.strictEqual(result.valid, false);
      assert.strictEqual(error.sourceFile, schemaFile);
      assert.strictEqual(error.jsonPointer, '');
      assert.strictEqual(error.type, 'schema_parse_error');
      assert.strictEqual(error.code, 'schema-parse-error');
      assert.strictEqual(Object.hasOwn(error, 'rawInput'), false);
      assert.doesNotMatch(error.message, new RegExp(sourceFragment));
      assert.doesNotMatch(formatErrors(result.errors), new RegExp(secret));
      assert.doesNotMatch(formatErrors(result.errors), new RegExp(sourceFragment));
      assert.doesNotMatch(formatErrors(result.errors), /Raw input:/);
    } finally {
      rmSync(directory, { force: true, recursive: true });
    }
  });

  it('reports the constraint that actually failed when schemas declare multiple constraints', () => {
    const schema = {
      type: 'object',
      required: ['minimumValue', 'formatValue', 'minLengthValue'],
      properties: {
        minimumValue: { type: 'number', enum: [5, 10], minimum: 10 },
        formatValue: { type: 'string', pattern: '.*', format: 'email' },
        minLengthValue: { type: 'string', pattern: '.*', minLength: 4 },
      },
    };

    const result = validateResumeData(
      { minimumValue: 5, formatValue: 'not-an-email', minLengthValue: 'abc' },
      schema,
      'resume-fixture.json'
    );

    assert.strictEqual(result.valid, false);
    assert.deepStrictEqual(
      result.errors.map((error) => ({
        code: error.code,
        pointer: error.jsonPointer,
        type: error.type,
      })),
      [
        { code: 'minimum', pointer: '/minimumValue', type: 'minimum' },
        { code: 'format', pointer: '/formatValue', type: 'format' },
        { code: 'minLength', pointer: '/minLengthValue', type: 'minLength' },
      ]
    );
    assert.ok(result.errors.every((error) => error.sourceFile === 'resume-fixture.json'));
  });
});
