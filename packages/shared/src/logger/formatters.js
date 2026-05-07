import { HttpError } from '../errors/index.js';

function parseTraceId(traceparent) {
  if (typeof traceparent !== 'string') return null;

  const parts = traceparent.trim().split('-');
  if (parts.length !== 4) return null;

  const traceId = parts[1];
  return /^[0-9a-f]{32}$/i.test(traceId) ? traceId.toLowerCase() : null;
}

/**
 * @param {Object} labels
 * @param {import('../errors/index.js').AppError|Error} normalized
 * @returns {Object}
 */
function buildErrorLabels(labels, normalized) {
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
 * @param {Object} labels
 * @param {import('../errors/index.js').AppError|Error} normalized
 * @returns {Object}
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
 * @returns {Object}
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
