/**
 * Validate environment-variable inputs against a Zod schema.
 *
 * SSOT-029 / issue #34. Used at app bootstrap (Worker `fetch`, Node entry)
 * to fail fast with a clear error when a required env var is missing.
 *
 * Returns the parsed (and possibly type-coerced) env object on success.
 * Throws an `EnvValidationError` whose `.message` enumerates every
 * problem path so logs/CI surface the missing key by name.
 */

export class EnvValidationError extends Error {
  /**
   * @param {string} appName - logical app name for the error prefix
   * @param {Array<{path: (string|number)[], message: string}>} issues
   */
  constructor(appName, issues) {
    const lines = issues.map((i) => {
      const path = (i.path || []).join('.') || '<root>';
      return `  - ${path}: ${i.message}`;
    });
    super(`Invalid environment for "${appName}":\n${lines.join('\n')}`);
    this.name = 'EnvValidationError';
    this.appName = appName;
    this.issues = issues;
  }
}

/**
 * Validate `source` against `schema`.
 *
 * @template T
 * @param {{ parse?: Function, safeParse?: Function }} schema - Zod schema
 * @param {object} source - raw env object
 * @param {object} [options]
 * @param {string} [options.appName='app'] - prefix for error messages
 * @returns {T} parsed env (typed)
 * @throws {EnvValidationError}
 */
export function validateEnv(schema, source, options = {}) {
  const appName = options.appName || 'app';

  if (!schema || typeof schema.safeParse !== 'function') {
    throw new TypeError('validateEnv: schema must be a Zod schema with .safeParse()');
  }
  if (source === null || typeof source !== 'object') {
    throw new TypeError('validateEnv: source must be a non-null object');
  }

  const result = schema.safeParse(source);
  if (result.success) return result.data;

  const issues = result.error?.issues || [];
  throw new EnvValidationError(appName, issues);
}
