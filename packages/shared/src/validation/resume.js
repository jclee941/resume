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

/**
 * @typedef {Object} ValidationError
 * @property {string} [path]
 * @property {string} [field]
 * @property {string} message
 * @property {string | null} [sourceFile]
 * @property {string} [jsonPointer]
 * @property {number | null} [arrayIndex]
 * @property {unknown} [rawInput]
 * @property {string} [expected]
 * @property {string | null} [expectedFormat]
 * @property {string[] | null} [allowed]
 * @property {string} [type]
 * @property {string} [code]
 */

/**
 * @param {Record<string, unknown> | null | undefined} schema
 * @returns {boolean}
 */
function isUsableSchema(schema) {
  return (
    schema !== null &&
    typeof schema === 'object' &&
    !Array.isArray(schema) &&
    schema.type === 'object' &&
    schema.properties !== null &&
    typeof schema.properties === 'object' &&
    Array.isArray(schema.required)
  );
}

function loadMasterSchema() {
  const schemaPath = resolveSchemaPath();
  if (!schemaPath) return null;
  try {
    const schema = JSON.parse(readFileSync(schemaPath, 'utf-8'));
    return isUsableSchema(schema) ? schema : null;
  } catch {
    return null;
  }
}

function loadValidatorEngine() {
  try {
    const requireCanonicalValidator = createRequire(import.meta.url);
    const validatorEngine = requireCanonicalValidator(
      '../../../../tools/scripts/utils/validate-resume-data.js'
    );
    if (typeof validatorEngine.validateResumeData !== 'function') {
      throw new TypeError('Canonical resume validator has no validateResumeData function');
    }
    return validatorEngine;
  } catch {
    return {
      /**
       * @param {unknown} _data
       * @param {unknown} _schema
       * @param {string | null} [sourceFile]
       * @returns {{ valid: boolean, errors: ValidationError[] }}
       */
      validateResumeData: (_data, _schema, sourceFile) => ({
        valid: false,
        errors: [
          diagnostic(
            '(validator)',
            'Canonical resume validator could not be loaded',
            null,
            sourceFile
          ),
        ],
      }),
    };
  }
}

export const masterSchema = loadMasterSchema();
const validatorEngine = loadValidatorEngine();

/**
 * @param {unknown} data
 * @param {Record<string, unknown> | null} [schema]
 * @param {string | null} [sourceFile]
 * @returns {{ valid: boolean, errors?: ValidationError[] }}
 */
export function validateResumeData(data, schema = masterSchema, sourceFile) {
  if (!isUsableSchema(schema)) {
    return {
      valid: false,
      errors: [
        {
          ...diagnostic('(schema)', 'Canonical resume schema is unavailable', null, sourceFile),
          expected: 'a usable JSON schema',
          type: 'schema',
          code: 'schema-unavailable',
        },
      ],
    };
  }

  if (data === null || data === undefined || typeof data !== 'object') {
    return {
      valid: false,
      errors: [diagnostic('(root)', 'Resume data must be an object', data, sourceFile)],
    };
  }

  const result = validatorEngine.validateResumeData(data, schema, sourceFile);
  return { valid: result.valid, errors: result.errors ?? undefined };
}

/**
 * @param {string} path
 * @param {string} message
 * @param {unknown} [rawInput]
 * @param {string | null} [sourceFile]
 * @returns {ValidationError}
 */
function diagnostic(path, message, rawInput = null, sourceFile = null) {
  return {
    path,
    message,
    sourceFile: sourceFile ?? null,
    jsonPointer: '',
    arrayIndex: null,
    rawInput,
    expected: "'object'",
    expectedFormat: null,
    allowed: null,
    type: 'type',
    code: 'invalid-type',
  };
}

/**
 * @param {ValidationError[] | unknown} errors
 * @returns {Record<string, unknown>[]}
 */
export function formatErrorsForMCP(errors) {
  if (!errors || !Array.isArray(errors)) return [];
  return errors.map((error) => {
    const safeError = Object.fromEntries(
      Object.entries(error).filter(([key]) => key !== 'rawInput' && key !== 'value')
    );
    return {
      ...safeError,
      field: safeError.path || safeError.field || '(root)',
      message: safeError.message || 'Validation error',
    };
  });
}
