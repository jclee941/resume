import { HttpError } from '../errors/index.js';

/**
 * @typedef {Object} ErrorDetails
 * @property {string} type
 * @property {string} message
 * @property {string | undefined} [stack_trace]
 * @property {string} [code]
 * @property {Record<string, unknown>} [context]
 */

/**
 * @typedef {Object} HttpErrorDetails
 * @property {{ status_code: number }} [response]
 */

/**
 * @typedef {Record<string, unknown> & {
 *   error: ErrorDetails;
 *   http?: HttpErrorDetails;
 *   event: { kind: string; category: string[]; type: string[]; severity?: number };
 * }} LogLabels
 */

/**
 * @param {string | null | undefined | unknown} traceparent
 * @returns {string | null}
 */
function parseTraceId(traceparent) {
  if (typeof traceparent !== 'string') return null;

  const parts = traceparent.trim().split('-');
  if (parts.length !== 4) return null;

  const traceId = parts[1];
  return /^[0-9a-f]{32}$/i.test(traceId) ? traceId.toLowerCase() : null;
}

/**
 * @param {Record<string, unknown>} labels
 * @param {import('../errors/index.js').AppError} normalized
 * @returns {LogLabels}
 */
function buildErrorLabels(labels, normalized) {
  /** @type {LogLabels} */
  const errorLabels = {
    ...labels,
    error: {
      type: normalized.name,
      message: normalized.message,
      stack_trace: normalized.stack?.substring(0, 2000),
      code: normalized.errorCode,
    },
    event: {
      kind: 'event',
      category: ['web'],
      type: ['error'],
    },
  };

  if (normalized instanceof HttpError) {
    errorLabels.http = {
      ...errorLabels.http,
      response: { status_code: normalized.statusCode },
    };
  }
  if (normalized.context) errorLabels.error.context = normalized.context;
  return errorLabels;
}

/**
 * @param {Record<string, unknown>} labels
 * @param {import('../errors/index.js').AppError} normalized
 * @returns {LogLabels}
 */
function buildFatalLabels(labels, normalized) {
  return {
    ...labels,
    error: {
      type: normalized.name,
      message: normalized.message,
      stack_trace: normalized.stack?.substring(0, 2000),
      code: normalized.errorCode,
    },
    event: {
      kind: 'alert',
      category: ['web'],
      type: ['error'],
      severity: 1,
    },
  };
}

/**
 * @param {number} status
 * @param {number} duration
 * @returns {Record<string, unknown>}
 */
function buildResponseLabels(status, duration) {
  return {
    http: { response: { status_code: status } },
    event: {
      duration: duration * 1_000_000,
      outcome: status < 400 ? 'success' : 'failure',
    },
  };
}

export { buildErrorLabels, buildFatalLabels, buildResponseLabels, parseTraceId };
