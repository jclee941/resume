/**
 * @typedef {{
 *   path: string;
 *   message: string;
 *   value?: unknown;
 *   expectedFormat?: string | null;
 *   allowed?: unknown;
 *   type?: string;
 *   code?: string;
 *   rawInput?: unknown;
 *   expected?: unknown;
 *   sourceFile?: string | null;
 *   jsonPointer?: string;
 *   arrayIndex?: number | null;
 *   [key: string]: unknown;
 * }} RawValidationError
 */

/**
 * @typedef {{
 *   type?: string | string[];
 *   required?: string[];
 *   properties?: Record<string, SchemaObject>;
 *   additionalProperties?: boolean;
 *   items?: SchemaObject;
 *   pattern?: string;
 *   description?: string;
 *   minLength?: number;
 *   maxLength?: number;
 *   minItems?: number;
 *   minimum?: number;
 *   format?: string;
 *   enum?: (string | number)[];
 *   anyOf?: SchemaObject[];
 *   [key: string]: unknown;
 * }} SchemaObject
 */

/**
 * @typedef {RawValidationError & {
 *   sourceFile: string | null;
 *   jsonPointer: string;
 *   arrayIndex: number | null;
 *   rawInput: unknown;
 *   expected: unknown;
 *   expectedFormat: string | null;
 *   allowed: unknown;
 *   type: string;
 *   code: string;
 * }} NormalizedDiagnostic
 */

/**
 * @param {RawValidationError[]} errors
 * @param {SchemaObject} schema
 * @param {string} [sourceFile]
 * @returns {NormalizedDiagnostic[]}
 */
function normalizeDiagnostics(errors, schema, sourceFile) {
  return errors.map((error) => normalizeDiagnostic(error, schema, sourceFile));
}

/**
 * @param {RawValidationError} error
 * @param {SchemaObject} schema
 * @param {string} [sourceFile]
 * @returns {NormalizedDiagnostic}
 */
function normalizeDiagnostic(error, schema, sourceFile) {
  const tokens = pathTokens(error.path);
  const targetSchema = schemaAtPath(schema, tokens);
  const type = error.type || inferType(error, targetSchema);

  return {
    ...error,
    sourceFile: sourceFile ?? null,
    jsonPointer: toJsonPointer(tokens),
    arrayIndex:
      /** @type {number | null} */ (tokens.filter((token) => Number.isInteger(token)).at(-1)) ??
      null,
    rawInput: error.rawInput ?? error.value ?? null,
    expected: error.expected ?? expectedValue(targetSchema, type),
    expectedFormat:
      error.expectedFormat ?? targetSchema?.description ?? targetSchema?.format ?? null,
    allowed: error.allowed ?? targetSchema?.enum ?? null,
    type,
    code: error.code || codeFor(type),
  };
}

/**
 * @param {string} path
 * @returns {(string | number)[]}
 */
function pathTokens(path) {
  if (!path || path === '(root)') return [];
  return [...path.matchAll(/([^.[\]]+)|\[(\d+)\]/g)].map((match) =>
    match[2] === undefined ? match[1] : Number(match[2])
  );
}

/**
 * @param {SchemaObject | undefined} schema
 * @param {(string | number)[]} tokens
 * @returns {SchemaObject | undefined}
 */
function schemaAtPath(schema, tokens) {
  return tokens.reduce(
    /**
     * @param {SchemaObject | undefined} current
     * @param {string | number} token
     * @returns {SchemaObject | undefined}
     */
    (current, token) => {
      if (!current) return undefined;
      return Number.isInteger(token) ? current.items : current.properties?.[token];
    },
    schema
  );
}

/**
 * @param {(string | number)[]} tokens
 * @returns {string}
 */
function toJsonPointer(tokens) {
  return tokens
    .map((token) => String(token).replaceAll('~', '~0').replaceAll('/', '~1'))
    .map((token) => `/${token}`)
    .join('');
}

/**
 * @param {RawValidationError} error
 * @param {SchemaObject | undefined} schema
 * @returns {string}
 */
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

/**
 * @param {SchemaObject | undefined} schema
 * @param {string} type
 * @returns {string | boolean | null}
 */
function expectedValue(schema, type) {
  if (type === 'additionalProperties') return false;
  if (type === 'anyOf') return 'one of the allowed schemas';
  const types = schema?.type ? (Array.isArray(schema.type) ? schema.type : [schema.type]) : [];
  return types.length > 0 ? types.map((value) => `'${value}'`).join(' or ') : null;
}

/**
 * @param {string} type
 * @returns {string}
 */
function codeFor(type) {
  return type === 'type' ? 'invalid-type' : type;
}

module.exports = { normalizeDiagnostics };
