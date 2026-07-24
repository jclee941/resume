/**
 * Resume Data Validator
 *
 * Validates resume_data.json against the JSON schema.
 * Provides detailed error messages for debugging.
 */

const fs = require('fs');
const path = require('path');
const { JsonSchemaLiteValidator } = require('./json-schema-lite-validator.js');

class SimpleValidator extends JsonSchemaLiteValidator {}

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

function schemaUnavailableError(sourceFile) {
  return {
    path: '(schema)',
    message: 'Canonical resume schema is unavailable',
    file: sourceFile,
    sourceFile,
    jsonPointer: '',
    arrayIndex: null,
    expected: 'a usable JSON schema',
    expectedFormat: null,
    allowed: null,
    type: 'schema',
    code: 'schema-unavailable',
  };
}

/**
 * Validate resume data against schema
 * @param {Object} data - Resume data to validate
 * @param {Object} schema - JSON Schema
 * @returns {Object} - { valid: boolean, errors: Array|null }
 */
function validateResumeData(data, schema, sourceFile) {
  if (!isUsableSchema(schema)) {
    return { valid: false, errors: [schemaUnavailableError(sourceFile)] };
  }
  const validator = new SimpleValidator(schema);
  return validator.validate(data, sourceFile);
}

/**
 * Load and validate resume data from file
 * @param {string} filePath - Path to resume_data.json
 * @param {string} schemaPath - Path to resume_schema.json
 * @returns {Object} - { valid: boolean, errors: Array|null, data: Object|null }
 */
function validateResumeDataFile(filePath, schemaPath) {
  try {
    // Load data
    const dataContent = fs.readFileSync(filePath, 'utf-8');
    let data;
    try {
      data = JSON.parse(dataContent);
    } catch {
      return {
        valid: false,
        errors: [fileError('parse_error', 'Malformed JSON input', filePath)],
        data: null,
      };
    }

    // Load schema
    const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
    let schema;
    try {
      schema = JSON.parse(schemaContent);
    } catch {
      return {
        valid: false,
        errors: [fileError('schema_parse_error', 'Malformed JSON schema', schemaPath)],
        data: null,
      };
    }
    if (!isUsableSchema(schema)) {
      return {
        valid: false,
        errors: [schemaUnavailableError(schemaPath)],
        data: null,
      };
    }

    // Validate
    const result = validateResumeData(data, schema, filePath);
    return {
      ...result,
      data: result.valid ? data : null,
    };
  } catch (e) {
    return {
      valid: false,
      errors: [fileError('file_error', e.message, filePath)],
      data: null,
    };
  }
}

function fileError(type, detail, sourceFile) {
  return {
    path: '(root)',
    message: `Invalid ${type.replaceAll('_', ' ')}: ${detail}`,
    file: sourceFile,
    sourceFile,
    jsonPointer: '',
    arrayIndex: null,
    expected: null,
    expectedFormat: null,
    allowed: null,
    type,
    code: type.replaceAll('_', '-'),
  };
}

/**
 * Format validation errors for console output
 * @param {Array} errors - Array of error objects
 * @returns {string} - Formatted error message
 */
function formatErrors(errors) {
  if (!errors || errors.length === 0) {
    return '';
  }

  let output = `\n❌ Validation failed with ${errors.length} error(s):\n\n`;

  for (let i = 0; i < errors.length; i++) {
    const error = errors[i];
    output += `${i + 1}. Field: ${error.path || 'unknown'}\n`;
    output += `   JSON Pointer: ${error.jsonPointer ?? ''}\n`;
    output += `   Source file: ${error.sourceFile ?? error.file ?? 'unknown'}\n`;
    output += `   Array index: ${error.arrayIndex ?? 'n/a'}\n`;
    output += `   Expected: ${formatValue(error.expected)}\n`;
    output += `   Expected format: ${formatValue(error.expectedFormat)}\n`;
    output += `   Allowed: ${formatValue(error.allowed)}\n`;
    output += `   Type: ${error.type ?? 'validation'}\n`;
    output += `   Code: ${error.code ?? 'validation'}\n`;
    output += `   Message: ${error.message}\n`;

    output += '\n';
  }

  return output;
}

function formatValue(value) {
  return value === undefined ? 'n/a' : JSON.stringify(value);
}

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: node validate-resume-data.js <data-file> [schema-file]');
    console.error(
      'Example: node validate-resume-data.js packages/data/resumes/master/resume_data.json'
    );
    process.exit(1);
  }

  const dataFile = args[0];
  const schemaFile = args[1] || path.join(path.dirname(dataFile), 'resume_schema.json');

  console.log(`📋 Validating ${dataFile}...`);
  const result = validateResumeDataFile(dataFile, schemaFile);

  if (result.valid) {
    console.log('✅ Validation passed!');
    process.exit(0);
  } else {
    console.error(formatErrors(result.errors));
    process.exit(1);
  }
}

module.exports = {
  validateResumeData,
  validateResumeDataFile,
  formatErrors,
};
