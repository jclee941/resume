/**
 * Resume Validation Adapter for ES6 Modules
 * Loads JSON schema and provides validation functions for resume-sync.js
 * 
 * Location: apps/job-server/src/shared/validation/index.js
 * Schema: packages/data/resumes/master/resume_schema.json (relative: ../../../../data/...)
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// ES6 module: Calculate __dirname for path resolution
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load master schema from relative path
// From: apps/job-server/src/shared/validation/
// To:   packages/data/resumes/master/resume_schema.json
const schemaPath = join(__dirname, '../../../../../packages/data/resumes/master/resume_schema.json');
export const masterSchema = JSON.parse(readFileSync(schemaPath, 'utf-8'));

/**
 * Validate resume data against schema
 * Checks required top-level and nested fields
 * 
 * @param {Object} data - Resume data object to validate
 * @param {Object} schema - JSON Schema (draft-07) for validation
 * @returns {Object} Validation result: { valid: boolean, errors?: Array }
 *   - valid: true → Resume passes validation
 *   - valid: false → Check errors array for details
 *   - errors: Array of {path, message} for each validation failure
 * 
 * @example
 * const result = validateResumeData(resumeData, masterSchema);
 * if (!result.valid) {
 *   console.log("Validation errors:", result.errors);
 * }
 */
export function validateResumeData(data, schema) {
  const errors = [];
  
  // Type check: ensure data is an object
  if (!data || typeof data !== 'object') {
    errors.push({
      path: '(root)',
      message: 'Resume data must be an object'
    });
    return { valid: false, errors };
  }
  
  // Validate required top-level fields
  if (schema.required && Array.isArray(schema.required)) {
    for (const field of schema.required) {
      if (!(field in data)) {
        errors.push({
          path: field,
          message: `Required field missing: ${field}`
        });
      }
    }
  }
  
  // Validate nested required fields in "personal"
  if (data.personal) {
    if (typeof data.personal !== 'object') {
      errors.push({
        path: 'personal',
        message: "Field 'personal' must be an object"
      });
    } else if (schema.properties?.personal?.required) {
      for (const field of schema.properties.personal.required) {
        if (!(field in data.personal)) {
          errors.push({
            path: `personal.${field}`,
            message: `Required field missing: personal.${field}`
          });
        }
      }
    }
  }
  
  // Validate nested required fields in "education"
  if (data.education) {
    if (typeof data.education !== 'object') {
      errors.push({
        path: 'education',
        message: "Field 'education' must be an object"
      });
    } else if (schema.properties?.education?.required) {
      for (const field of schema.properties.education.required) {
        if (!(field in data.education)) {
          errors.push({
            path: `education.${field}`,
            message: `Required field missing: education.${field}`
          });
        }
      }
    }
  }
  
  // Validate careers is array if present
  if (data.careers && !Array.isArray(data.careers)) {
    errors.push({
      path: 'careers',
      message: "Field 'careers' must be an array"
    });
  }
  
  // Validate skills is array if present
  if (data.skills && !Array.isArray(data.skills)) {
    errors.push({
      path: 'skills',
      message: "Field 'skills' must be an array"
    });
  }
  
  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  };
}

/**
 * Format validation errors for MCP response
 * Converts internal validator error format to MCP-compliant format
 * 
 * @param {Array} errors - Array of validation errors from validateResumeData
 * @returns {Array} MCP-formatted errors: [{field, message}, ...]
 * 
 * @example
 * const validation = validateResumeData(data, schema);
 * if (!validation.valid) {
 *   const mcpErrors = formatErrorsForMCP(validation.errors);
 *   return {
 *     success: false,
 *     error: "Validation failed",
 *     errors: mcpErrors
 *   };
 * }
 */
export function formatErrorsForMCP(errors) {
  if (!errors || !Array.isArray(errors)) {
    return [];
  }
  
  return errors.map(err => ({
    field: err.path || err.field || '(root)',
    message: err.message || 'Validation error'
  }));
}
