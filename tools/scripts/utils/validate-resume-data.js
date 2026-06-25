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
/**
 * Validate resume data against schema
 * @param {Object} data - Resume data to validate
 * @param {Object} schema - JSON Schema
 * @returns {Object} - { valid: boolean, errors: Array|null }
 */
function validateResumeData(data, schema) {
  const validator = new SimpleValidator(schema);
  return validator.validate(data);
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
    } catch (e) {
      return {
        valid: false,
        errors: [
          {
            type: 'parse_error',
            message: `Invalid JSON: ${e.message}`,
            file: filePath,
          },
        ],
        data: null,
      };
    }

    // Load schema
    const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
    let schema;
    try {
      schema = JSON.parse(schemaContent);
    } catch (e) {
      return {
        valid: false,
        errors: [
          {
            type: 'schema_parse_error',
            message: `Invalid schema JSON: ${e.message}`,
            file: schemaPath,
          },
        ],
        data: null,
      };
    }

    // Validate
    const result = validateResumeData(data, schema);
    return {
      ...result,
      data: result.valid ? data : null,
    };
  } catch (e) {
    return {
      valid: false,
      errors: [
        {
          type: 'file_error',
          message: `Error reading file: ${e.message}`,
        },
      ],
      data: null,
    };
  }
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
    output += `   Message: ${error.message}\n`;

    if (error.value !== undefined) {
      output += `   Got: ${JSON.stringify(error.value).substring(0, 100)}\n`;
    }

    if (error.allowed) {
      output += `   Allowed: ${error.allowed.join(', ')}\n`;
    }

    if (error.expectedFormat) {
      output += `   Expected format: ${error.expectedFormat}\n`;
    }

    output += '\n';
  }

  return output;
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
