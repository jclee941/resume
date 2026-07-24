function validateStringValue(errors, data, schema, path) {
  validateStringPattern(errors, data, schema, path);
  validateStringLength(errors, data, schema, path);
  validateStringFormat(errors, data, schema, path);
  if (schema.enum && !schema.enum.includes(data)) {
    errors.push({
      path,
      message: `Value must be one of: ${schema.enum.join(', ')}`,
      value: data,
      allowed: schema.enum,
      type: 'enum',
    });
  }
}

function validateStringPattern(errors, data, schema, path) {
  if (schema.pattern && !new RegExp(schema.pattern).test(data)) {
    errors.push({
      path,
      message: `String does not match pattern '${schema.pattern}'`,
      value: data,
      expectedFormat: schema.description || schema.pattern,
      type: 'pattern',
    });
  }
}

function validateStringLength(errors, data, schema, path) {
  if (schema.minLength !== undefined && data.length < schema.minLength) {
    errors.push({
      path,
      message: `String too short (min: ${schema.minLength}, got: ${data.length})`,
      value: data,
      type: 'minLength',
    });
  }
  if (schema.maxLength !== undefined && data.length > schema.maxLength) {
    errors.push({
      path,
      message: `String too long (max: ${schema.maxLength}, got: ${data.length})`,
      value: data,
      type: 'maxLength',
    });
  }
}

function validateStringFormat(errors, data, schema, path) {
  if (schema.format === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data)) {
    errors.push({ path, message: 'Invalid email format', value: data, type: 'format' });
  }
  if (schema.format === 'uri' && !isUri(data)) {
    errors.push({ path, message: 'Invalid URI format', value: data, type: 'format' });
  }
}

function validateNumberValue(errors, data, schema, path, allowsInteger) {
  if (allowsInteger && !Number.isInteger(data)) {
    errors.push({ path, message: `Expected integer, got ${data}`, value: data });
    return;
  }
  if (schema.minimum !== undefined && data < schema.minimum) {
    errors.push({
      path,
      message: `Value must be at least ${schema.minimum}, got ${data}`,
      value: data,
      type: 'minimum',
    });
  }
}

function isUri(value) {
  try {
    const url = new URL(value);
    return Boolean(url.protocol && url.hostname);
  } catch {
    return false;
  }
}

module.exports = {
  validateNumberValue,
  validateStringValue,
};
