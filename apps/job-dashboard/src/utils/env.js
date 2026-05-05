/**
 * Validated env accessor for the job-dashboard Worker (issue #34 / SSOT-029).
 *
 * Calls into `@resume/env`'s `validateEnv` with the per-app Zod schema and
 * memoizes the result per (rawEnv reference) so each request reuses one
 * validation pass. Throws an `EnvValidationError` on first call when a
 * required key is missing — which becomes a 500 from the Worker fetch
 * handler (visible in tail logs / CF Analytics).
 */

import { validateEnv, EnvValidationError } from '@resume/env';
import { jobDashboardEnvSchema } from '@resume/env/schemas/job-dashboard';

const envCache = new WeakMap();

/**
 * @param {object} rawEnv - the env object handed to the fetch handler
 * @returns {object} the validated env (typed via the schema)
 * @throws {EnvValidationError}
 */
export function getValidatedEnv(rawEnv) {
  if (!rawEnv || typeof rawEnv !== 'object') {
    throw new TypeError('getValidatedEnv: rawEnv must be a non-null object');
  }
  const cached = envCache.get(rawEnv);
  if (cached) return cached;
  const validated = validateEnv(jobDashboardEnvSchema, rawEnv, {
    appName: 'job-dashboard',
  });
  envCache.set(rawEnv, validated);
  return validated;
}

export { EnvValidationError };
