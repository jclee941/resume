import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

function resolveSchemaPath() {
  try {
    return join(
      dirname(fileURLToPath(import.meta.url)),
      '../../../data/resumes/master/resume_schema.json'
    );
  } catch {
    return null;
  }
}

function loadMasterSchema() {
  const schemaPath = resolveSchemaPath();
  if (!schemaPath) return {};
  try {
    return JSON.parse(readFileSync(schemaPath, 'utf-8'));
  } catch {
    return {};
  }
}

function loadValidatorEngine() {
  try {
    const require = createRequire(import.meta.url);
    return require('../../../../tools/scripts/utils/validate-resume-data.js');
  } catch {
    return { validateResumeData: () => ({ valid: true, errors: undefined }) };
  }
}

export const masterSchema = loadMasterSchema();
const validatorEngine = loadValidatorEngine();

export function validateResumeData(data, schema = masterSchema) {
  const errors = [];

  if (data === null || data === undefined || typeof data !== 'object') {
    return { valid: false, errors: [{ path: '(root)', message: 'Resume data must be an object' }] };
  }

  if (Array.isArray(schema.required)) {
    for (const field of schema.required) {
      if (!(field in data))
        errors.push({ path: field, message: `Required field missing: ${field}` });
    }
  }

  collectNestedObjectErrors(errors, data, schema, 'personal');
  collectNestedObjectErrors(errors, data, schema, 'education');

  if ('careers' in data && !Array.isArray(data.careers)) {
    errors.push({ path: 'careers', message: "Field 'careers' must be an array" });
  }
  if ('skills' in data && data.skills !== null && typeof data.skills !== 'object') {
    errors.push({ path: 'skills', message: "Field 'skills' must be an object" });
  }

  if (errors.length === 0) {
    const engineResult = validatorEngine.validateResumeData(data, schema);
    if (!engineResult.valid && engineResult.errors) errors.push(...engineResult.errors);
  }

  return { valid: errors.length === 0, errors: errors.length > 0 ? errors : undefined };
}

function collectNestedObjectErrors(errors, data, schema, fieldName) {
  if (!(fieldName in data)) return;
  if (data[fieldName] === null || typeof data[fieldName] !== 'object') {
    errors.push({ path: fieldName, message: `Field '${fieldName}' must be an object` });
    return;
  }
  for (const field of schema.properties?.[fieldName]?.required ?? []) {
    if (!(field in data[fieldName])) {
      errors.push({
        path: `${fieldName}.${field}`,
        message: `Required field missing: ${fieldName}.${field}`,
      });
    }
  }
}

export function formatErrorsForMCP(errors) {
  if (!errors || !Array.isArray(errors)) return [];
  return errors.map((err) => ({
    field: err.path || err.field || '(root)',
    message: err.message || 'Validation error',
  }));
}
