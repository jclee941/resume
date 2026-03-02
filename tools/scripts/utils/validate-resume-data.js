/**
 * Resume Data Validator
 * 
 * Validates resume_data.json against the JSON schema.
 * Provides detailed error messages for debugging.
 */

const fs = require('fs');
const path = require('path');

// Simple JSON Schema validator (lightweight alternative to ajv)
class SimpleValidator {
  constructor(schema) {
    this.schema = schema;
    this.errors = [];
  }

  validate(data) {
    this.errors = [];
    this._validateObject(data, this.schema, '');
    return {
      valid: this.errors.length === 0,
      errors: this.errors.length > 0 ? this.errors : null,
    };
  }

  _validateObject(data, schema, path) {
    // Type check
    if (schema.type && typeof data !== schema.type) {
      if (schema.type === 'object' && typeof data !== 'object') {
        this.errors.push({
          path: path || '(root)',
          message: `Expected type '${schema.type}', got '${typeof data}'`,
          value: data,
        });
        return;
      }
    }

    // Check required fields
    if (schema.required && Array.isArray(schema.required)) {
      for (const field of schema.required) {
        if (!(field in data)) {
          this.errors.push({
            path: path ? `${path}.${field}` : field,
            message: 'Required field is missing',
            type: 'required',
          });
        }
      }
    }

    // Validate each property
    if (schema.properties) {
      for (const [key, value] of Object.entries(data)) {
        const propSchema = schema.properties[key];
        const propPath = path ? `${path}.${key}` : key;

        if (propSchema) {
          this._validateProperty(value, propSchema, propPath);
        }
      }
    }
  }

  _validateProperty(data, schema, path) {
    // Handle null values
    if (data === null) {
      if (schema.type && schema.type !== 'null' && !schema.type.includes('null')) {
        // Allow null if explicitly allowed
        if (!(Array.isArray(schema.type) && schema.type.includes('null'))) {
          // Check if it's a anyOf with null option
          if (!schema.anyOf || !schema.anyOf.some((s) => s.type === 'null')) {
            return; // Allow null for now
          }
        }
      }
      return;
    }

    // Type validation
    if (schema.type === 'array') {
      if (!Array.isArray(data)) {
        this.errors.push({
          path,
          message: `Expected array, got ${typeof data}`,
          value: data,
        });
        return;
      }

      // Check minItems
      if (schema.minItems !== undefined && data.length < schema.minItems) {
        this.errors.push({
          path,
          message: `Array must have at least ${schema.minItems} items, got ${data.length}`,
          value: data,
        });
      }

      // Validate array items
      if (schema.items) {
        for (let i = 0; i < data.length; i++) {
          const itemPath = `${path}[${i}]`;
          this._validateProperty(data[i], schema.items, itemPath);
        }
      }
      return;
    }

    if (schema.type === 'object') {
      if (typeof data !== 'object' || Array.isArray(data)) {
        this.errors.push({
          path,
          message: `Expected object, got ${typeof data}`,
          value: data,
        });
        return;
      }

      // Validate nested object
      this._validateObject(data, schema, path);
      return;
    }

    // String validation
    if (schema.type === 'string') {
      if (typeof data !== 'string') {
        this.errors.push({
          path,
          message: `Expected string, got ${typeof data}`,
          value: data,
        });
        return;
      }

      // Pattern validation
      if (schema.pattern) {
        const regex = new RegExp(schema.pattern);
        if (!regex.test(data)) {
          this.errors.push({
            path,
            message: `String does not match pattern '${schema.pattern}'`,
            value: data,
            expectedFormat: schema.description || schema.pattern,
          });
        }
      }

      // Length validation
      if (schema.minLength !== undefined && data.length < schema.minLength) {
        this.errors.push({
          path,
          message: `String too short (min: ${schema.minLength}, got: ${data.length})`,
          value: data,
        });
      }

      if (schema.maxLength !== undefined && data.length > schema.maxLength) {
        this.errors.push({
          path,
          message: `String too long (max: ${schema.maxLength}, got: ${data.length})`,
          value: data,
        });
      }

      // Format validation
      if (schema.format === 'email') {
        const emailRegex =
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(data)) {
          this.errors.push({
            path,
            message: 'Invalid email format',
            value: data,
          });
        }
      }

      // Enum validation
      if (schema.enum && !schema.enum.includes(data)) {
        this.errors.push({
          path,
          message: `Value must be one of: ${schema.enum.join(', ')}`,
          value: data,
          allowed: schema.enum,
        });
      }
    }

    // Number/Integer validation
    if (schema.type === 'integer' || schema.type === 'number') {
      if (typeof data !== 'number') {
        this.errors.push({
          path,
          message: `Expected number, got ${typeof data}`,
          value: data,
        });
        return;
      }

      if (schema.minimum !== undefined && data < schema.minimum) {
        this.errors.push({
          path,
          message: `Value must be at least ${schema.minimum}, got ${data}`,
          value: data,
        });
      }
    }
  }
}

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
    console.error('Example: node validate-resume-data.js packages/data/resumes/master/resume_data.json');
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
