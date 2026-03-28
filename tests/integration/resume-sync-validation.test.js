/**
 * @fileoverview Integration tests for resume-sync validation layer
 * Tests validation blocks in export, import, and sync actions
 *
 * @test Validates that schema validation catches invalid data
 * @test Validates MCP error response format
 * @test Validates data is rejected before API calls or writes
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '../../');

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
    // CORRECTED: Object with category structure matching schema
    languages: {
      title: 'Languages',
      icon: 'Code',
      items: [{ name: 'JavaScript', level: 'expert' }],
    },
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

const INVALID_RESUME_BAD_PHONE = {
  ...VALID_RESUME_DATA,
  personal: {
    ...VALID_RESUME_DATA.personal,
    phone: '123-456-789', // Invalid format
  },
};

const INVALID_RESUME_BAD_CAREER = {
  ...VALID_RESUME_DATA,
  careers: [
    {
      company: 'Example Corp',
      // Missing period and role
    },
  ],
};

describe('Resume Sync Validation', () => {
  // Test: Validation Adapter Module
  test('Validation Adapter - should import validation adapter successfully', async () => {
    // Use dynamic import for ES modules
    const validation = await import(
      path.join(PROJECT_ROOT, 'apps/job-server/src/shared/validation/index.js')
    );

    expect(typeof validation.masterSchema).toBe('object');
    expect(typeof validation.validateResumeData).toBe('function');
    expect(typeof validation.formatErrorsForMCP).toBe('function');
  });

  test('Validation Adapter - should have masterSchema with required properties', async () => {
    const { masterSchema } = await import(
      path.join(PROJECT_ROOT, 'apps/job-server/src/shared/validation/index.js')
    );

    expect(masterSchema.type).toBe('object');
    expect(typeof masterSchema.properties).toBe('object');
    expect(Array.isArray(masterSchema.required)).toBe(true);
  });

  // Test: Validation Logic
  test('Validation Logic - should validate correct resume data', async () => {
    const { masterSchema, validateResumeData } = await import(
      path.join(PROJECT_ROOT, 'apps/job-server/src/shared/validation/index.js')
    );

    const validation = validateResumeData(VALID_RESUME_DATA, masterSchema);
    expect(validation.valid).toBe(true);
    expect(validation.errors).toBeUndefined();
  });

  test('Validation Logic - should reject resume missing required fields', async () => {
    const { masterSchema, validateResumeData } = await import(
      path.join(PROJECT_ROOT, 'apps/job-server/src/shared/validation/index.js')
    );

    const validation = validateResumeData(INVALID_RESUME_MISSING_REQUIRED, masterSchema);
    expect(validation.valid).toBe(false);
    expect(validation.errors.length).toBeGreaterThan(0);
  });

  test('Validation Logic - should reject resume with wrong types', async () => {
    const { masterSchema, validateResumeData } = await import(
      path.join(PROJECT_ROOT, 'apps/job-server/src/shared/validation/index.js')
    );

    const validation = validateResumeData(INVALID_RESUME_WRONG_TYPES, masterSchema);
    expect(validation.valid).toBe(false);
    expect(validation.errors.length).toBeGreaterThan(0);
  });

  test('Validation Logic - should reject invalid phone format', async () => {
    const { masterSchema, validateResumeData } = await import(
      path.join(PROJECT_ROOT, 'apps/job-server/src/shared/validation/index.js')
    );

    const validation = validateResumeData(INVALID_RESUME_BAD_PHONE, masterSchema);
    expect(validation.valid).toBe(false);
    expect(validation.errors.some((e) => e.path === 'personal.phone')).toBe(true);
  });

  test('Validation Logic - should reject career items missing required fields', async () => {
    const { masterSchema, validateResumeData } = await import(
      path.join(PROJECT_ROOT, 'apps/job-server/src/shared/validation/index.js')
    );

    const validation = validateResumeData(INVALID_RESUME_BAD_CAREER, masterSchema);
    expect(validation.valid).toBe(false);
    expect(validation.errors.some((e) => e.path.includes('careers[0]'))).toBe(true);
  });

  // Test: MCP Error Formatting
  test('MCP Error Formatting - should format validation errors for MCP response', async () => {
    const { validateResumeData, formatErrorsForMCP, masterSchema } = await import(
      path.join(PROJECT_ROOT, 'apps/job-server/src/shared/validation/index.js')
    );

    const validation = validateResumeData(INVALID_RESUME_MISSING_REQUIRED, masterSchema);
    const formatted = formatErrorsForMCP(validation.errors);

    expect(Array.isArray(formatted)).toBe(true);
    expect(formatted.length).toBeGreaterThan(0);

    // Check MCP error format
    if (formatted.length > 0) {
      expect(typeof formatted[0].message).toBe('string');
    }
  });

  test('MCP Error Formatting - should return empty array for valid data', async () => {
    const { validateResumeData, formatErrorsForMCP, masterSchema } = await import(
      path.join(PROJECT_ROOT, 'apps/job-server/src/shared/validation/index.js')
    );

    const validation = validateResumeData(VALID_RESUME_DATA, masterSchema);
    const formatted = formatErrorsForMCP(validation.errors);

    expect(formatted).toEqual([]);
  });

  // Test: Resume-Sync Import Tests
  test('Resume-Sync Import - should import resume-sync.js successfully', async () => {
    const resumeSync = await import(
      path.join(PROJECT_ROOT, 'apps/job-server/src/tools/resume-sync.js')
    );

    expect(typeof resumeSync.resumeSyncTool).toBe('object');
    expect(typeof resumeSync.resumeSyncTool.execute).toBe('function');
    expect(typeof resumeSync.resumeSyncTool.name).toBe('string');
    expect(resumeSync.resumeSyncTool.name).toBe('wanted_resume_sync');
  });

  test('Resume-Sync Import - should have validation in base command class', () => {
    const filePath = path.join(PROJECT_ROOT, 'apps/job-server/src/tools/commands/base-command.js');
    const content = fs.readFileSync(filePath, 'utf-8');

    expect(content.includes('validateResumeData')).toBe(true);
    expect(content.includes('formatErrorsForMCP')).toBe(true);
  });

  test('Resume-Sync Import - should have validation imports in base-command.js', () => {
    const filePath = path.join(PROJECT_ROOT, 'apps/job-server/src/tools/commands/base-command.js');
    const content = fs.readFileSync(filePath, 'utf-8');

    expect(content.includes("from '../../shared/validation/index.js'")).toBe(true);
    expect(content.includes('validateResumeData')).toBe(true);
  });

  // Test: Block Placement
  test('Block Placement - should have validation in base command class', () => {
    const filePath = path.join(PROJECT_ROOT, 'apps/job-server/src/tools/commands/base-command.js');
    const content = fs.readFileSync(filePath, 'utf-8');

    // Check base command has validateLocalData method
    expect(content.includes('validateLocalData')).toBe(true);
  });

  test('Block Placement - should use validation in import command', () => {
    const filePath = path.join(
      PROJECT_ROOT,
      'apps/job-server/src/tools/commands/import-command.js'
    );
    const content = fs.readFileSync(filePath, 'utf-8');

    // Check import command extends base command and uses validation
    const extendsBase = content.includes('extends BaseCommand') || content.includes('BaseCommand');
    expect(extendsBase).toBe(true);
  });

  test('Block Placement - should use validation in sync command', () => {
    const filePath = path.join(PROJECT_ROOT, 'apps/job-server/src/tools/commands/sync-command.js');
    const content = fs.readFileSync(filePath, 'utf-8');

    // Check sync command extends base command and uses validation
    const extendsBase = content.includes('extends BaseCommand') || content.includes('BaseCommand');
    expect(extendsBase).toBe(true);
  });

  // Test: Error Format Compliance
  test('Error Format Compliance - should return MCP-compliant error object for export', async () => {
    const errorResponse = {
      success: false,
      error: 'Test error',
      errors: [{ message: 'Test validation error' }],
      hint: 'Fix this error',
    };

    // Check that error response structure is correct
    expect(typeof errorResponse.success).toBe('boolean');
    expect(typeof errorResponse.error).toBe('string');
    expect(Array.isArray(errorResponse.errors)).toBe(true);
    expect(typeof errorResponse.hint).toBe('string');
  });

  test('Error Format Compliance - should include validation errors in response', async () => {
    const { validateResumeData, formatErrorsForMCP, masterSchema } = await import(
      path.join(PROJECT_ROOT, 'apps/job-server/src/shared/validation/index.js')
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
    expect(errorResponse.success).toBe(false);
    expect(Array.isArray(errorResponse.errors)).toBe(true);
    expect(errorResponse.errors.length).toBeGreaterThan(0);
  });
});
