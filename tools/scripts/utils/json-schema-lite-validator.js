const {
  validateNumberValue,
  validateStringValue,
} = require('./json-schema-lite-primitives.js');

class JsonSchemaLiteValidator {
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
    if (!this._validateType(data, schema, path || '(root)')) return;
    if (data === null || typeof data !== 'object' || Array.isArray(data)) return;

    for (const field of schema.required || []) {
      if (!(field in data)) {
        this.errors.push({
          path: path ? `${path}.${field}` : field,
          message: 'Required field is missing',
          type: 'required',
        });
      }
    }

    for (const [key, value] of Object.entries(data)) {
      const propSchema = schema.properties?.[key];
      const propPath = path ? `${path}.${key}` : key;
      if (propSchema) {
        this._validateProperty(value, propSchema, propPath);
      } else if (schema.additionalProperties === false) {
        this.errors.push({
          path: propPath,
          message: 'Additional property is not allowed',
          value,
          type: 'additionalProperties',
        });
      }
    }
  }

  _validateProperty(data, schema, path) {
    if (schema.anyOf) {
      this._validateAnyOf(data, schema, path);
      return;
    }
    if (data === null) {
      this._validateNull(data, schema, path);
      return;
    }
    if (!this._validateType(data, schema, path)) return;
    if (this._allowsType(schema, 'array')) return this._validateArray(data, schema, path);
    if (this._allowsType(schema, 'object')) return this._validateObject(data, schema, path);
    if (this._allowsType(schema, 'string')) {
      validateStringValue(this.errors, data, schema, path);
    }
    if (this._allowsType(schema, 'integer') || this._allowsType(schema, 'number')) {
      validateNumberValue(this.errors, data, schema, path, this._allowsType(schema, 'integer'));
    }
  }

  _validateAnyOf(data, schema, path) {
    const matched = schema.anyOf.some((candidate) => this._schemaMatches(data, candidate, path));
    if (!matched) {
      this.errors.push({
        path,
        message: 'Value does not match any allowed schema',
        value: data,
        type: 'anyOf',
      });
    }
  }

  _validateNull(data, schema, path) {
    if (!this._allowsType(schema, 'null')) {
      this.errors.push({
        path,
        message: `Expected ${this._formatExpectedTypes(schema)}, got null`,
        value: data,
      });
    }
  }

  _validateArray(data, schema, path) {
    if (schema.minItems !== undefined && data.length < schema.minItems) {
      this.errors.push({
        path,
        message: `Array must have at least ${schema.minItems} items, got ${data.length}`,
        value: data,
      });
    }
    if (schema.items) {
      for (let index = 0; index < data.length; index += 1) {
        this._validateProperty(data[index], schema.items, `${path}[${index}]`);
      }
    }
  }

  _schemaMatches(data, schema, path) {
    const validator = new JsonSchemaLiteValidator(this.schema);
    validator._validateProperty(data, schema, path);
    return validator.errors.length === 0;
  }

  _validateType(data, schema, path) {
    const expectedTypes = this._types(schema);
    if (expectedTypes.length === 0 || expectedTypes.some((type) => this._matchesType(data, type))) {
      return true;
    }
    this.errors.push({
      path,
      message: `Expected ${this._formatExpectedTypes(schema)}, got ${Array.isArray(data) ? 'array' : typeof data}`,
      value: data,
    });
    return false;
  }

  _allowsType(schema, type) {
    const types = this._types(schema);
    return types.length === 0 || types.includes(type);
  }

  _types(schema) {
    if (!schema.type) return [];
    return Array.isArray(schema.type) ? schema.type : [schema.type];
  }

  _matchesType(data, type) {
    if (type === 'array') return Array.isArray(data);
    if (type === 'object') return data !== null && typeof data === 'object' && !Array.isArray(data);
    if (type === 'integer') return typeof data === 'number' && Number.isInteger(data);
    if (type === 'number') return typeof data === 'number' && Number.isFinite(data);
    if (type === 'null') return data === null;
    return typeof data === type;
  }

  _formatExpectedTypes(schema) {
    return this._types(schema)
      .map((type) => `'${type}'`)
      .join(' or ');
  }

}

module.exports = {
  JsonSchemaLiteValidator,
};
