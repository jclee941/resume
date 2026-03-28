import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { masterSchema, validateResumeData, formatErrorsForMCP } from '../index.js';

describe('masterSchema', () => {
  it('is an object with properties', () => {
    assert.ok(masterSchema);
    assert.strictEqual(typeof masterSchema, 'object');
    assert.ok(masterSchema.properties);
  });

  it('has required array', () => {
    assert.ok(Array.isArray(masterSchema.required));
    assert.ok(masterSchema.required.includes('personal'));
    assert.ok(masterSchema.required.includes('education'));
    assert.ok(masterSchema.required.includes('summary'));
    assert.ok(masterSchema.required.includes('current'));
    assert.ok(masterSchema.required.includes('careers'));
    assert.ok(masterSchema.required.includes('skills'));
  });
});

describe('validateResumeData', () => {
  it('null data returns valid:false with (root) path', () => {
    const result = validateResumeData(null, masterSchema);
    assert.strictEqual(result.valid, false);
    assert.ok(result.errors);
    const rootError = result.errors.find((e) => e.path === '(root)');
    assert.ok(rootError);
  });

  it('undefined data returns valid:false with (root) path', () => {
    const result = validateResumeData(undefined, masterSchema);
    assert.strictEqual(result.valid, false);
    assert.ok(result.errors);
    const rootError = result.errors.find((e) => e.path === '(root)');
    assert.ok(rootError);
  });

  it('non-object string returns valid:false', () => {
    const result = validateResumeData('not an object', masterSchema);
    assert.strictEqual(result.valid, false);
  });

  it('non-object number returns valid:false', () => {
    const result = validateResumeData(42, masterSchema);
    assert.strictEqual(result.valid, false);
  });

  it('empty object with schema requiring fields returns errors', () => {
    const result = validateResumeData({}, masterSchema);
    assert.strictEqual(result.valid, false);
    assert.ok(result.errors);
    const paths = result.errors.map((e) => e.path);
    assert.ok(paths.includes('personal'));
    assert.ok(paths.includes('education'));
    assert.ok(paths.includes('summary'));
    assert.ok(paths.includes('current'));
    assert.ok(paths.includes('careers'));
    assert.ok(paths.includes('skills'));
  });

  it('valid data with all required fields returns valid:true', () => {
    const validData = {
      personal: { name: 'Test', email: 'test@test.com', phone: '010-1234-5678' },
      education: { school: 'Test', major: 'CS' },
      summary: { totalExperience: '5 years', expertise: ['JavaScript'] },
      current: { company: 'Test Co', position: 'Developer' },
      careers: [{ company: 'Test Co', period: '2020.01 ~ 2023.01', role: 'Dev' }],
      skills: { languages: [{ name: 'JavaScript', level: 'expert' }] },
    };
    const result = validateResumeData(validData, masterSchema);
    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.errors, undefined);
  });

  it('personal as non-object returns error', () => {
    const data = {
      personal: 'not an object',
      education: { school: 'Test', major: 'CS' },
      summary: { totalExperience: '5 years', expertise: ['JS'] },
      current: {},
      careers: [],
      skills: {},
    };
    const result = validateResumeData(data, masterSchema);
    assert.strictEqual(result.valid, false);
    const personalError = result.errors.find((e) => e.path === 'personal');
    assert.ok(personalError);
    assert.strictEqual(personalError.message, "Field 'personal' must be an object");
  });

  it('personal missing required nested fields returns errors', () => {
    const data = {
      personal: { name: 'Test' },
      education: { school: 'Test', major: 'CS' },
      summary: { totalExperience: '5 years', expertise: ['JS'] },
      current: {},
      careers: [],
      skills: {},
    };
    const result = validateResumeData(data, masterSchema);
    assert.strictEqual(result.valid, false);
    const emailError = result.errors.find((e) => e.path === 'personal.email');
    assert.ok(emailError);
    const phoneError = result.errors.find((e) => e.path === 'personal.phone');
    assert.ok(phoneError);
  });

  it('education as non-object returns error', () => {
    const data = {
      personal: { name: 'Test', email: 'test@test.com', phone: '010-1234-5678' },
      education: 123,
      summary: { totalExperience: '5 years', expertise: ['JS'] },
      current: {},
      careers: [],
      skills: {},
    };
    const result = validateResumeData(data, masterSchema);
    assert.strictEqual(result.valid, false);
    const eduError = result.errors.find((e) => e.path === 'education');
    assert.ok(eduError);
    assert.strictEqual(eduError.message, "Field 'education' must be an object");
  });

  it('education missing required nested fields returns errors', () => {
    const data = {
      personal: { name: 'Test', email: 'test@test.com', phone: '010-1234-5678' },
      education: { school: 'Test University' },
      summary: { totalExperience: '5 years', expertise: ['JS'] },
      current: {},
      careers: [],
      skills: {},
    };
    const result = validateResumeData(data, masterSchema);
    assert.strictEqual(result.valid, false);
    const majorError = result.errors.find((e) => e.path === 'education.major');
    assert.ok(majorError);
  });

  it('careers as non-array returns error', () => {
    const data = {
      personal: { name: 'Test', email: 'test@test.com', phone: '010-1234-5678' },
      education: { school: 'Test', major: 'CS' },
      summary: { totalExperience: '5 years', expertise: ['JS'] },
      current: {},
      careers: 'not an array',
      skills: {},
    };
    const result = validateResumeData(data, masterSchema);
    assert.strictEqual(result.valid, false);
    const careersError = result.errors.find((e) => e.path === 'careers');
    assert.ok(careersError);
    assert.strictEqual(careersError.message, "Field 'careers' must be an array");
  });

  it('skills as non-array returns error', () => {
    const data = {
      personal: { name: 'Test', email: 'test@test.com', phone: '010-1234-5678' },
      education: { school: 'Test', major: 'CS' },
      summary: { totalExperience: '5 years', expertise: ['JS'] },
      current: {},
      careers: [],
      skills: 'not an object or array',
    };
    const result = validateResumeData(data, masterSchema);
    assert.strictEqual(result.valid, false);
  });

  it('careers as array passes array check', () => {
    const data = {
      personal: { name: 'Test', email: 'test@test.com', phone: '010-1234-5678' },
      education: { school: 'Test', major: 'CS' },
      summary: { totalExperience: '5 years', expertise: ['JS'] },
      current: {},
      careers: [{ company: 'Test Co', period: '2020.01 ~ 2023.01', role: 'Dev' }],
      skills: {},
    };
    const result = validateResumeData(data, masterSchema);
    const careersError = result.errors?.find((e) => e.path === 'careers');
    assert.strictEqual(careersError, undefined);
  });
});

describe('formatErrorsForMCP', () => {
  it('null returns empty array', () => {
    assert.deepStrictEqual(formatErrorsForMCP(null), []);
  });

  it('undefined returns empty array', () => {
    assert.deepStrictEqual(formatErrorsForMCP(undefined), []);
  });

  it('non-array string returns empty array', () => {
    assert.deepStrictEqual(formatErrorsForMCP('not an array'), []);
  });

  it('non-array number returns empty array', () => {
    assert.deepStrictEqual(formatErrorsForMCP(42), []);
  });

  it('maps {path, message} to {field, message}', () => {
    const errors = [{ path: 'personal.name', message: 'Required field missing' }];
    const result = formatErrorsForMCP(errors);
    assert.deepStrictEqual(result, [{ field: 'personal.name', message: 'Required field missing' }]);
  });

  it('uses field fallback if no path', () => {
    const errors = [{ field: 'email', message: 'Invalid email' }];
    const result = formatErrorsForMCP(errors);
    assert.deepStrictEqual(result, [{ field: 'email', message: 'Invalid email' }]);
  });

  it('defaults (root) for field and Validation error for message', () => {
    const errors = [{}];
    const result = formatErrorsForMCP(errors);
    assert.deepStrictEqual(result, [{ field: '(root)', message: 'Validation error' }]);
  });
});
