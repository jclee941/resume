function normalizeDiagnostics(errors, schema, sourceFile) {
  return errors.map((error) => normalizeDiagnostic(error, schema, sourceFile));
}

function normalizeDiagnostic(error, schema, sourceFile) {
  const tokens = pathTokens(error.path);
  const targetSchema = schemaAtPath(schema, tokens);
  const type = error.type || inferType(error, targetSchema);

  return {
    ...error,
    sourceFile: sourceFile ?? null,
    jsonPointer: toJsonPointer(tokens),
    arrayIndex: tokens.filter((token) => Number.isInteger(token)).at(-1) ?? null,
    rawInput: error.rawInput ?? error.value ?? null,
    expected: error.expected ?? expectedValue(targetSchema, type),
    expectedFormat: error.expectedFormat ?? targetSchema?.description ?? targetSchema?.format ?? null,
    allowed: error.allowed ?? targetSchema?.enum ?? null,
    type,
    code: error.code || codeFor(type),
  };
}

function pathTokens(path) {
  if (!path || path === '(root)') return [];
  return [...path.matchAll(/([^.[\]]+)|\[(\d+)\]/g)].map((match) =>
    match[2] === undefined ? match[1] : Number(match[2])
  );
}

function schemaAtPath(schema, tokens) {
  return tokens.reduce((current, token) => {
    if (!current) return undefined;
    return Number.isInteger(token) ? current.items : current.properties?.[token];
  }, schema);
}

function toJsonPointer(tokens) {
  return tokens
    .map((token) => String(token).replaceAll('~', '~0').replaceAll('/', '~1'))
    .map((token) => `/${token}`)
    .join('');
}

function inferType(error, schema) {
  if (error.message.startsWith('Expected ')) return 'type';
  if (schema?.enum) return 'enum';
  if (schema?.pattern) return 'pattern';
  if (schema?.format) return 'format';
  if (schema?.minLength !== undefined) return 'minLength';
  if (schema?.maxLength !== undefined) return 'maxLength';
  if (schema?.minItems !== undefined) return 'minItems';
  if (schema?.minimum !== undefined) return 'minimum';
  return 'validation';
}

function expectedValue(schema, type) {
  if (type === 'additionalProperties') return false;
  if (type === 'anyOf') return 'one of the allowed schemas';
  const types = schema?.type ? (Array.isArray(schema.type) ? schema.type : [schema.type]) : [];
  return types.length > 0 ? types.map((value) => `'${value}'`).join(' or ') : null;
}

function codeFor(type) {
  return type === 'type' ? 'invalid-type' : type;
}

module.exports = { normalizeDiagnostics };
