const fs = require('fs');
const path = require('path');
const {
  INVALID_RESUME_BAD_CAREER,
  INVALID_RESUME_BAD_PHONE,
  INVALID_RESUME_MISSING_REQUIRED,
  INVALID_RESUME_WRONG_TYPES,
  VALID_RESUME_DATA,
} = require('./resume-sync-validation-fixtures.js');

const PROJECT_ROOT = path.join(__dirname, '../../');

describe('Resume Sync Validation', () => {
  const importValidation = () => import('@resume/shared/validation');

  test('imports validation adapter successfully', async () => {
    const validation = await importValidation();
    expect(typeof validation.masterSchema).toBe('object');
    expect(typeof validation.validateResumeData).toBe('function');
    expect(typeof validation.formatErrorsForMCP).toBe('function');
  });

  test('loads master schema with required properties', async () => {
    const { masterSchema } = await importValidation();
    expect(masterSchema.type).toBe('object');
    expect(typeof masterSchema.properties).toBe('object');
    expect(Array.isArray(masterSchema.required)).toBe(true);
  });

  test('validates correct resume data', async () => {
    const { masterSchema, validateResumeData } = await importValidation();
    const validation = validateResumeData(VALID_RESUME_DATA, masterSchema);
    expect(validation.valid).toBe(true);
    expect(validation.errors).toBeUndefined();
  });

  test('rejects resume missing required fields', async () => {
    const { masterSchema, validateResumeData } = await importValidation();
    const validation = validateResumeData(INVALID_RESUME_MISSING_REQUIRED, masterSchema);
    expect(validation.valid).toBe(false);
    expect(validation.errors.length).toBeGreaterThan(0);
  });

  test('rejects resume with wrong types', async () => {
    const { masterSchema, validateResumeData } = await importValidation();
    const validation = validateResumeData(INVALID_RESUME_WRONG_TYPES, masterSchema);
    expect(validation.valid).toBe(false);
    expect(validation.errors.length).toBeGreaterThan(0);
  });

  test('rejects invalid phone format', async () => {
    const { masterSchema, validateResumeData } = await importValidation();
    const validation = validateResumeData(INVALID_RESUME_BAD_PHONE, masterSchema);
    expect(validation.valid).toBe(false);
    expect(validation.errors.some((error) => error.path === 'personal.phone')).toBe(true);
  });

  test('rejects career items missing required fields', async () => {
    const { masterSchema, validateResumeData } = await importValidation();
    const validation = validateResumeData(INVALID_RESUME_BAD_CAREER, masterSchema);
    expect(validation.valid).toBe(false);
    expect(validation.errors.some((error) => error.path.includes('careers[0]'))).toBe(true);
  });

  test('formats validation errors for MCP responses', async () => {
    const { validateResumeData, formatErrorsForMCP, masterSchema } = await importValidation();
    const validation = validateResumeData(INVALID_RESUME_MISSING_REQUIRED, masterSchema);
    const formatted = formatErrorsForMCP(validation.errors);
    expect(Array.isArray(formatted)).toBe(true);
    expect(formatted.length).toBeGreaterThan(0);
    expect(typeof formatted[0].message).toBe('string');
  });

  test('returns all structured validation diagnostics through MCP', async () => {
    const { validateResumeData, formatErrorsForMCP, masterSchema } = await importValidation();
    const sourceFile = 'fixtures/malformed-resume.json';
    const malformedResume = {
      ...VALID_RESUME_DATA,
      personal: { ...VALID_RESUME_DATA.personal, phone: 'bad-phone' },
      education: { ...VALID_RESUME_DATA.education, status: 'unknown-status' },
      careers: [{ ...VALID_RESUME_DATA.careers[0], period: 42 }],
    };

    const validation = validateResumeData(malformedResume, masterSchema, sourceFile);
    const formatted = formatErrorsForMCP(validation.errors);

    expect(validation.valid).toBe(false);
    expect(formatted).toHaveLength(3);
    expect(formatted).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'personal.phone',
          sourceFile,
          jsonPointer: '/personal/phone',
          expectedFormat: 'Phone number in XXX-XXXX-XXXX format',
          type: 'pattern',
          code: 'pattern',
        }),
        expect.objectContaining({
          field: 'education.status',
          sourceFile,
          jsonPointer: '/education/status',
          allowed: expect.arrayContaining(['Graduated']),
          type: 'enum',
          code: 'enum',
        }),
        expect.objectContaining({
          field: 'careers[0].period',
          sourceFile,
          jsonPointer: '/careers/0/period',
          arrayIndex: 0,
          expected: "'string'",
          type: 'type',
          code: 'invalid-type',
        }),
      ])
    );
    expect(formatted.every((error) => !Object.hasOwn(error, 'rawInput'))).toBe(true);
    expect(formatted.every((error) => !Object.hasOwn(error, 'value'))).toBe(true);
  });

  test('returns empty MCP error array for valid data', async () => {
    const { validateResumeData, formatErrorsForMCP, masterSchema } = await importValidation();
    const validation = validateResumeData(VALID_RESUME_DATA, masterSchema);
    expect(formatErrorsForMCP(validation.errors)).toEqual([]);
  });

  test('imports resume sync tool successfully', async () => {
    const resumeSync = await import(
      path.join(PROJECT_ROOT, 'apps/job-server/src/tools/resume-sync.js')
    );
    expect(typeof resumeSync.resumeSyncTool).toBe('object');
    expect(typeof resumeSync.resumeSyncTool.execute).toBe('function');
    expect(resumeSync.resumeSyncTool.name).toBe('wanted_resume_sync');
  });

  test('base command imports validation adapter', () => {
    const content = readProjectFile('apps/job-server/src/tools/commands/base-command.js');
    expect(content.includes("from '@resume/shared/validation'")).toBe(true);
    expect(content.includes('validateResumeData')).toBe(true);
    expect(content.includes('formatErrorsForMCP')).toBe(true);
    expect(content.includes('validateLocalData')).toBe(true);
  });

  test('import and sync commands extend base command', () => {
    const importCommand = readProjectFile('apps/job-server/src/tools/commands/import-command.js');
    const syncCommand = readProjectFile('apps/job-server/src/tools/commands/sync-command.js');
    expect(
      importCommand.includes('extends BaseCommand') || importCommand.includes('BaseCommand')
    ).toBe(true);
    expect(syncCommand.includes('extends BaseCommand') || syncCommand.includes('BaseCommand')).toBe(
      true
    );
  });

  test('builds MCP-compliant validation error response', async () => {
    const { validateResumeData, formatErrorsForMCP, masterSchema } = await importValidation();
    const validation = validateResumeData(INVALID_RESUME_MISSING_REQUIRED, masterSchema);
    const errorResponse = {
      success: false,
      error: 'Cannot import: Local file violates schema',
      errors: formatErrorsForMCP(validation.errors),
      hint: 'Fix your JSON file and try again',
    };
    expect(errorResponse.success).toBe(false);
    expect(typeof errorResponse.error).toBe('string');
    expect(Array.isArray(errorResponse.errors)).toBe(true);
    expect(errorResponse.errors.length).toBeGreaterThan(0);
    expect(typeof errorResponse.hint).toBe('string');
  });
});

function readProjectFile(relativePath) {
  return fs.readFileSync(path.join(PROJECT_ROOT, relativePath), 'utf-8');
}
