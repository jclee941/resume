/**
 * Resume Validation Adapter — thin wrapper over canonical SSoT.
 *
 * The CANONICAL resume schema is the JSON Schema at:
 *   packages/data/resumes/master/resume_schema.json
 *
 * This file is a thin adapter that:
 *   1. Loads the canonical JSON Schema (`masterSchema` re-export).
 *   2. Validates resume payloads using a layered approach:
 *      - Pre-checks for null/undefined/non-object root + type checks
 *      - Delegates property-level validation to the SimpleValidator engine
 *        in tools/scripts/utils/validate-resume-data.js, ensuring CI and
 *        runtime checks produce identical errors for matching cases.
 *   3. Reformats errors for MCP responses.
 *
 * Issue #17: Was 245 LOC of hand-rolled validation that drifted from
 * validate-resume-data.js. Now ~115 LOC; the engine-level type checks live
 * in the canonical CJS module to guarantee CI/runtime parity.
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

// ESM: __dirname equivalent for path resolution
const __dirname = dirname(fileURLToPath(import.meta.url));

// CommonJS interop for the validate-resume-data.js engine (CJS module)
const require = createRequire(import.meta.url);
const validatorEngine = require('../../../../../tools/scripts/utils/validate-resume-data.js');

// Canonical schema path (relative to this file):
//   apps/job-server/src/shared/validation/index.js
//   → packages/data/resumes/master/resume_schema.json
const SCHEMA_PATH = join(
  __dirname,
  '../../../../../packages/data/resumes/master/resume_schema.json'
);

export const masterSchema = JSON.parse(readFileSync(SCHEMA_PATH, 'utf-8'));

/**
 * Validate resume data against the canonical JSON Schema.
 *
 * Provides the MCP-facing validation contract. Pre-checks handle the cases
 * the canonical engine cannot (null root, non-object root, type mismatches
 * on top-level fields), then delegates property-required checks to the engine.
 *
 * @param {Object} data - Resume data object to validate
 * @param {Object} [schema=masterSchema] - JSON Schema (defaults to canonical)
 * @returns {{ valid: boolean, errors?: Array<{path:string,message:string}> }}
 */
export function validateResumeData(data, schema = masterSchema) {
  const errors = [];

  // Pre-check 1: root must be an object
  if (data === null || data === undefined || typeof data !== 'object') {
    errors.push({
      path: '(root)',
      message: 'Resume data must be an object',
    });
    return { valid: false, errors };
  }

  // Pre-check 2: top-level required fields
  if (Array.isArray(schema.required)) {
    for (const field of schema.required) {
      if (!(field in data)) {
        errors.push({
          path: field,
          message: `Required field missing: ${field}`,
        });
      }
    }
  }

  // Pre-check 3: type checks for fields the canonical engine doesn't catch
  // (engine's _validateProperty allows null and skips type checks for objects
  //  with `additionalProperties: true`)
  if ('personal' in data && (data.personal === null || typeof data.personal !== 'object')) {
    errors.push({ path: 'personal', message: "Field 'personal' must be an object" });
  } else if (data.personal && schema.properties?.personal?.required) {
    for (const field of schema.properties.personal.required) {
      if (!(field in data.personal)) {
        errors.push({
          path: `personal.${field}`,
          message: `Required field missing: personal.${field}`,
        });
      }
    }
  }

  if ('education' in data && (data.education === null || typeof data.education !== 'object')) {
    errors.push({ path: 'education', message: "Field 'education' must be an object" });
  } else if (data.education && schema.properties?.education?.required) {
    for (const field of schema.properties.education.required) {
      if (!(field in data.education)) {
        errors.push({
          path: `education.${field}`,
          message: `Required field missing: education.${field}`,
        });
      }
    }
  }

  if ('careers' in data && !Array.isArray(data.careers)) {
    errors.push({ path: 'careers', message: "Field 'careers' must be an array" });
  }

  if ('skills' in data && data.skills !== null && typeof data.skills !== 'object') {
    errors.push({ path: 'skills', message: "Field 'skills' must be an object" });
  }

  // Delegate to canonical engine for happy-path full validation when no
  // structural failures were found. Engine handles required-property,
  // pattern, and enum checks identically to CI.
  if (errors.length === 0) {
    const engineResult = validatorEngine.validateResumeData(data, schema);
    if (!engineResult.valid && engineResult.errors) {
      errors.push(...engineResult.errors);
    }
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * Format validation errors for MCP response shape.
 *
 * @param {Array} errors - Array of validation errors from validateResumeData
 * @returns {Array<{field:string,message:string}>}
 */
export function formatErrorsForMCP(errors) {
  if (!errors || !Array.isArray(errors)) return [];
  return errors.map((err) => ({
    field: err.path || err.field || '(root)',
    message: err.message || 'Validation error',
  }));
}
