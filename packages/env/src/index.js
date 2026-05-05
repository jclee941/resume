/**
 * @resume/env — type-safe environment variable validation.
 *
 * SSOT-029 / issue #34. Each app provides a Zod schema describing its
 * required and optional env vars; this package provides the validator.
 *
 * Per-app schemas live under `./schemas/*.js`.
 */

export { validateEnv, EnvValidationError } from './parse.js';
