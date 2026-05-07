/**
 * Loki Logger for Job Dashboard Worker — thin wrapper over canonical
 * `@resume/shared/logger` with the Loki transport (SSOT-038 / issue #47
 * Slice 2).
 *
 * The original 91-LOC implementation duplicated what
 * `packages/shared/src/logger/transports/loki.js` already provides. This
 * file is now a thin façade that:
 *
 *  1. Constructs a canonical `Logger` once per call with the Loki transport
 *     pinned to `JOB_NAME = 'job-worker'`.
 *  2. Exposes the original `logToLoki / logRequest / logError` API surface
 *     so existing call sites (when added) keep working without churn.
 *
 * For new code prefer the canonical API directly:
 *
 *   import { Logger, createLokiTransport } from '@resume/shared/logger';
 *   const logger = new Logger(env, {
 *     service: 'job-worker',
 *     transports: [createLokiTransport()],
 *   });
 *   await logger.info('Request', { path });
 */

import { Logger, createLokiTransport } from '@resume/shared/logger';

const JOB_NAME = 'job-worker';

function buildLogger(env) {
  return new Logger(env, {
    service: JOB_NAME,
    transports: [createLokiTransport()],
  });
}

/**
 * Log to Grafana Loki (fire-and-forget).
 *
 * @param {Object} env - Cloudflare Worker environment bindings
 * @param {string} message - Log message
 * @param {string} [level='INFO'] - Log level (INFO, WARN, ERROR, DEBUG)
 * @param {Object} [labels={}] - Additional labels
 * @returns {Promise<void>}
 */
export async function logToLoki(env, message, level = 'INFO', labels = {}) {
  const logger = buildLogger(env);
  const method = level.toLowerCase();
  if (typeof logger[method] !== 'function') {
    return logger.info(message, labels);
  }
  return logger[method](message, labels);
}

/**
 * Log request info.
 *
 * @param {Object} env
 * @param {Request} request
 * @param {URL} url
 * @returns {Promise<void>}
 */
export async function logRequest(env, request, url) {
  return logToLoki(env, `Request: ${request.method} ${url.pathname}`, 'INFO', {
    path: url.pathname,
    method: request.method,
  });
}

/**
 * Log an error to Loki.
 *
 * @param {Object} env
 * @param {Error} error
 * @param {Object} [context={}]
 * @returns {Promise<void>}
 */
export async function logError(env, error, context = {}) {
  const logger = buildLogger(env);
  return logger.error(`Error: ${error.message}`, error, context);
}
