import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import {
  dashboardApplicationCreateSchema,
  dashboardApplicationUpdateSchema,
  dashboardStatusUpdateSchema,
} from '@resume/schemas';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const validatorEngine = require('../../../../tools/scripts/utils/validate-resume-data.js');

const SCHEMA_PATH = join(__dirname, '../../../data/resumes/master/resume_schema.json');

export const masterSchema = JSON.parse(readFileSync(SCHEMA_PATH, 'utf-8'));

function zodIssuesToMessages(issues) {
  return issues.map((issue) => issue.message);
}

function parseDashboardSchema(body, schema) {
  if (!body || typeof body !== 'object') {
    return { valid: false, errors: ['Request body must be an object'] };
  }
  const result = schema.safeParse(body);
  if (result.success) return { valid: true, data: body };
  return { valid: false, errors: zodIssuesToMessages(result.error.issues) };
}

function isValidSkillItem(item) {
  return (
    typeof item === 'string' ||
    (typeof item === 'object' && item !== null && typeof item.name === 'string')
  );
}

function validateSkillCategory(errors, category, value) {
  if (Array.isArray(value)) {
    if (value.length > 0 && !value.every(isValidSkillItem)) {
      errors.push(`skills.${category} array items must be strings or {name, level} objects`);
    }
    return;
  }

  if (typeof value === 'object' && value !== null) {
    if (!Array.isArray(value.items)) {
      errors.push(`skills.${category}.items must be an array`);
    } else if (value.items.length > 0 && !value.items.every(isValidSkillItem)) {
      errors.push(`skills.${category}.items must contain strings or {name, level} objects`);
    }
    return;
  }

  errors.push(`skills.${category} must be an array or object with items`);
}

export function validateApplicationCreate(body) {
  return parseDashboardSchema(body, dashboardApplicationCreateSchema);
}

export function validateApplicationUpdate(body) {
  return parseDashboardSchema(body, dashboardApplicationUpdateSchema);
}

export function validateStatusUpdate(body) {
  return parseDashboardSchema(body, dashboardStatusUpdateSchema);
}

export function validatePortfolioData(data, options = {}) {
  const errors = [];

  if (!data.resumeDownload) {
    errors.push('Missing resumeDownload object');
  } else {
    if (!data.resumeDownload.pdfUrl) errors.push('Missing resumeDownload.pdfUrl');
    if (!data.resumeDownload.docxUrl) errors.push('Missing resumeDownload.docxUrl');
    if (!data.resumeDownload.mdUrl) errors.push('Missing resumeDownload.mdUrl');
  }

  if (!Array.isArray(data.resume)) {
    errors.push('resume must be an array');
  } else {
    data.resume.forEach((item, idx) => {
      if (!item.title) errors.push(`resume[${idx}]: missing title`);
      if (!item.description) errors.push(`resume[${idx}]: missing description`);
      if (!Array.isArray(item.stats)) errors.push(`resume[${idx}]: stats must be an array`);
      if (item.highlight && !item.completePdfUrl) {
        errors.push(`resume[${idx}]: highlighted card missing completePdfUrl`);
      }
    });
  }

  if (!Array.isArray(data.projects)) {
    errors.push('projects must be an array');
  } else {
    data.projects.forEach((item, idx) => {
      if (!item.title) errors.push(`projects[${idx}]: missing title`);
      if (!item.tech) errors.push(`projects[${idx}]: missing tech`);
      if (!item.description) errors.push(`projects[${idx}]: missing description`);
    });
  }

  if (!Array.isArray(data.certifications)) {
    errors.push('certifications must be an array');
  } else {
    data.certifications.forEach((item, idx) => {
      if (!item.name) errors.push(`certifications[${idx}]: missing name`);
      if (!item.issuer) errors.push(`certifications[${idx}]: missing issuer`);
      if (!item.date && !item.status) errors.push(`certifications[${idx}]: missing date`);
    });
  }

  if (!data.skills || typeof data.skills !== 'object') {
    errors.push('skills must be an object');
  } else {
    Object.entries(data.skills).forEach(([category, value]) => {
      validateSkillCategory(errors, category, value);
    });
  }

  if (errors.length > 0) {
    throw new Error(`Data validation failed:\n  - ${errors.join('\n  - ')}`);
  }

  options.logger?.log?.('✓ Data validation passed\n');
}

export function validateResumeData(data, schema = masterSchema) {
  const errors = [];

  if (data === null || data === undefined || typeof data !== 'object') {
    return { valid: false, errors: [{ path: '(root)', message: 'Resume data must be an object' }] };
  }

  if (Array.isArray(schema.required)) {
    for (const field of schema.required) {
      if (!(field in data)) errors.push({ path: field, message: `Required field missing: ${field}` });
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
      errors.push({ path: `${fieldName}.${field}`, message: `Required field missing: ${fieldName}.${field}` });
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
