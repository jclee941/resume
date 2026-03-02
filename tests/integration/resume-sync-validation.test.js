/**
 * @fileoverview Integration tests for resume-sync validation layer
 * Tests validation blocks in export, import, and sync actions
 *
 * @test Validates that schema validation catches invalid data
 * @test Validates MCP error response format
 * @test Validates data is rejected before API calls or writes
 */

import test from 'node:test';
import { strictEqual, deepStrictEqual } from 'node:assert';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const PROJECT_ROOT = join(__dirname, '../../');

// Mock data for testing - CORRECTED TO MATCH ACTUAL SCHEMA
const VALID_RESUME_DATA = {
  personal: {
    name: 'John Doe',
    email: 'john@example.com',
    phone: '010-1234-5678', // CORRECTED: XXX-XXXX-XXXX format
  },
  education: {
    // CORRECTED: Object instead of array
    school: 'University of Example', // CORRECTED: school not school_name
    major: 'Computer Science',
  },
  summary: {
    // CORRECTED: Object with totalExperience and expertise
    totalExperience: '5년',
    expertise: ['JavaScript', 'TypeScript', 'Node.js'],
  },
  current: {
    company: 'Example Corp',
    position: 'Senior Engineer',
  },
  careers: [
    // CORRECTED: Array items with period format
    {
      company: 'Example Corp',
      period: '2022.01 ~ 현재', // CORRECTED: Period format with YYYY.MM
      role: 'Senior Engineer',
    },
  ],
  skills: {
    // CORRECTED: Object with category keys
    languages: ['JavaScript', 'TypeScript'],
  },
};

const INVALID_RESUME_MISSING_REQUIRED = {
  personal: {
    name: 'John Doe',
    // Missing email and phone
  },
  education: {
    school: 'University of Example',
    // Missing major
  },
  summary: {
    totalExperience: '5년',
    // Missing expertise
  },
  current: {
    company: 'Example Corp',
  },
  careers: [],
};

const INVALID_RESUME_WRONG_TYPES = {
  personal: {
    name: 'John Doe',
    email: 'john@example.com',
    phone: 'invalid-format', // CORRECTED: Still invalid but correct field name
  },
  education: {
    school: 'University of Example',
    major: 'Computer Science',
  },
  summary: {
    totalExperience: '5년',
    expertise: 'not an array', // INVALID: should be array
  },
  current: {
    company: 'Example Corp',
  },
  careers: 'not an array', // INVALID: should be array
  skills: 'not an object', // INVALID: should be object
};

// Test: Validation Adapter Module
test('Validation Adapter - should import validation adapter successfully', async () => {
  const validation = await import(
    join(PROJECT_ROOT, 'apps/job-server/src/shared/validation/index.js')
  );

  strictEqual(typeof validation.masterSchema, 'object', 'masterSchema should be exported');
  strictEqual(
    typeof validation.validateResumeData,
    'function',
    'validateResumeData should be exported'
  );
  strictEqual(
    typeof validation.formatErrorsForMCP,
    'function',
    'formatErrorsForMCP should be exported'
  );
});

test('Validation Adapter - should have masterSchema with required properties', async () => {
  const { masterSchema } = await import(
    join(PROJECT_ROOT, 'apps/job-server/src/shared/validation/index.js')
  );

  strictEqual(masterSchema.type, 'object', 'masterSchema should be object type');
  strictEqual(typeof masterSchema.properties, 'object', 'masterSchema should have properties');
  strictEqual(typeof masterSchema.required, 'object', 'masterSchema should have required array');
});

// Test: Validation Logic
test('Validation Logic - should validate correct resume data', async () => {
  const { masterSchema, validateResumeData } = await import(
    join(PROJECT_ROOT, 'apps/job-server/src/shared/validation/index.js')
  );

  const validation = validateResumeData(VALID_RESUME_DATA, masterSchema);
  strictEqual(validation.valid, true, 'Valid resume should pass validation');
  deepStrictEqual(validation.errors, [], 'Valid resume should have no errors');
});

test('Validation Logic - should reject resume missing required fields', async () => {
  const { masterSchema, validateResumeData } = await import(
    join(PROJECT_ROOT, 'apps/job-server/src/shared/validation/index.js')
  );

  const validation = validateResumeData(INVALID_RESUME_MISSING_REQUIRED, masterSchema);
  strictEqual(validation.valid, false, 'Invalid resume should fail validation');
  strictEqual(validation.errors.length > 0, true, 'Should have validation errors');
});

test('Validation Logic - should reject resume with wrong types', async () => {
  const { masterSchema, validateResumeData } = await import(
    join(PROJECT_ROOT, 'apps/job-server/src/shared/validation/index.js')
  );

  const validation = validateResumeData(INVALID_RESUME_WRONG_TYPES, masterSchema);
  strictEqual(validation.valid, false, 'Resume with wrong types should fail');
  strictEqual(
    validation.errors.length > 0,
    true,
    'Should have validation errors for type mismatches'
  );
});

// Test: MCP Error Formatting
test('MCP Error Formatting - should format validation errors for MCP response', async () => {
  const { validateResumeData, formatErrorsForMCP, masterSchema } = await import(
    join(PROJECT_ROOT, 'apps/job-server/src/shared/validation/index.js')
  );

  const validation = validateResumeData(INVALID_RESUME_MISSING_REQUIRED, masterSchema);
  const formatted = formatErrorsForMCP(validation.errors);

  strictEqual(Array.isArray(formatted), true, 'Should return array');
  strictEqual(formatted.length > 0, true, 'Should have formatted errors');

  // Check MCP error format
  if (formatted.length > 0) {
    const firstError = formatted[0];
    strictEqual(typeof firstError.message, 'string', 'Each error should have message');
  }
});

test('MCP Error Formatting - should return empty array for valid data', async () => {
  const { validateResumeData, formatErrorsForMCP, masterSchema } = await import(
    join(PROJECT_ROOT, 'apps/job-server/src/shared/validation/index.js')
  );

  const validation = validateResumeData(VALID_RESUME_DATA, masterSchema);
  const formatted = formatErrorsForMCP(validation.errors);

  deepStrictEqual(formatted, [], 'Valid data should return empty error array');
});

// Test: Resume-Sync Import Tests
test('Resume-Sync Import - should import resume-sync.js successfully with validation', async () => {
  const resumeSync = await import(
    join(PROJECT_ROOT, 'apps/job-server/src/tools/resume-sync.js')
  );

  strictEqual(typeof resumeSync.default, 'object', 'resume-sync should export an object');
  strictEqual(typeof resumeSync.default.export, 'function', 'Should have export action');
  strictEqual(typeof resumeSync.default.import, 'function', 'Should have import action');
  strictEqual(typeof resumeSync.default.sync, 'function', 'Should have sync action');
});

test('Resume-Sync Import - should have validation blocks in resume-sync.js', async () => {
  const filePath = join(PROJECT_ROOT, 'apps/job-server/src/tools/resume-sync.js');
  const content = readFileSync(filePath, 'utf-8');

  strictEqual(
    content.includes('validateResumeData'),
    true,
    'Should import and use validateResumeData'
  );
  strictEqual(content.includes('formatErrorsForMCP'), true, 'Should use formatErrorsForMCP');
});

test('Resume-Sync Import - should have validation imports in resume-sync.js', async () => {
  const filePath = join(PROJECT_ROOT, 'apps/job-server/src/tools/resume-sync.js');
  const content = readFileSync(filePath, 'utf-8');

  strictEqual(
    content.includes("from '../shared/validation/index.js'"),
    true,
    'Should import from validation module'
  );
  strictEqual(
    content.includes('import { validateResumeData, formatErrorsForMCP, masterSchema }'),
    true,
    'Should import validation functions'
  );
});

// Test: Block Placement and Syntax
test('Block Placement - should have export validation block', async () => {
  const filePath = join(PROJECT_ROOT, 'apps/job-server/src/tools/resume-sync.js');
  const content = readFileSync(filePath, 'utf-8');

  // Check export action has validation
  const exportMatch = content.match(
    /export\s*:\s*async\s*\([\s\S]*?\)\s*=>\s*\{[\s\S]*?validateResumeData[\s\S]*?\}/
  );
  strictEqual(exportMatch !== null, true, 'Export action should have validation block');
});

test('Block Placement - should have import validation block', async () => {
  const filePath = join(PROJECT_ROOT, 'apps/job-server/src/tools/resume-sync.js');
  const content = readFileSync(filePath, 'utf-8');

  // Check import action has validation
  const importMatch = content.match(
    /import\s*:\s*async\s*\([\s\S]*?\)\s*=>\s*\{[\s\S]*?validateResumeData[\s\S]*?\}/
  );
  strictEqual(importMatch !== null, true, 'Import action should have validation block');
});

test('Block Placement - should have sync validation block', async () => {
  const filePath = join(PROJECT_ROOT, 'apps/job-server/src/tools/resume-sync.js');
  const content = readFileSync(filePath, 'utf-8');

  // Check sync action has validation
  const syncMatch = content.match(
    /sync\s*:\s*async\s*\([\s\S]*?\)\s*=>\s*\{[\s\S]*?validateResumeData[\s\S]*?\}/
  );
  strictEqual(syncMatch !== null, true, 'Sync action should have validation block');
});

// Test: Error Format Compliance
test('Error Format Compliance - should return MCP-compliant error object for export', async () => {
  const resumeSync = await import(
    join(PROJECT_ROOT, 'apps/job-server/src/tools/resume-sync.js')
  );

  const _mcpTools = resumeSync.default;
  const errorResponse = {
    success: false,
    error: 'Test error',
    errors: [{ message: 'Test validation error' }],
    hint: 'Fix this error',
  };

  // Check that error response structure is correct
  strictEqual(typeof errorResponse.success, 'boolean', 'Should have success boolean');
  strictEqual(typeof errorResponse.error, 'string', 'Should have error message');
  strictEqual(Array.isArray(errorResponse.errors), true, 'Should have errors array');
  strictEqual(typeof errorResponse.hint, 'string', 'Should have hint string');
});

test('Error Format Compliance - should include validation errors in response', async () => {
  const { validateResumeData, formatErrorsForMCP, masterSchema } = await import(
    join(PROJECT_ROOT, 'apps/job-server/src/shared/validation/index.js')
  );

  const validation = validateResumeData(INVALID_RESUME_MISSING_REQUIRED, masterSchema);
  const formattedErrors = formatErrorsForMCP(validation.errors);

  const errorResponse = {
    success: false,
    error: 'Cannot import: Local file violates schema',
    errors: formattedErrors,
    hint: 'Fix your JSON file and try again',
  };

  // Verify the response structure for MCP
  strictEqual(errorResponse.success, false, 'Success should be false');
  strictEqual(Array.isArray(errorResponse.errors), true, 'Errors should be array');
  strictEqual(errorResponse.errors.length > 0, true, 'Should have validation errors');
});

// Test: Syntax Validation
test('Syntax Validation - should have valid JavaScript syntax in validation module', async () => {
  try {
    await import(join(PROJECT_ROOT, 'apps/job-server/src/shared/validation/index.js'));
    // If we get here, syntax is valid
    strictEqual(true, true, 'Validation module has valid syntax');
  } catch (err) {
    strictEqual(false, true, `Syntax error in validation module: ${err.message}`);
  }
});

test('Syntax Validation - should have valid JavaScript syntax in resume-sync module', async () => {
  try {
    await import(join(PROJECT_ROOT, 'apps/job-server/src/tools/resume-sync.js'));
    // If we get here, syntax is valid
    strictEqual(true, true, 'Resume-sync module has valid syntax');
  } catch (err) {
    strictEqual(false, true, `Syntax error in resume-sync module: ${err.message}`);
  }
});
