/**
 * Unified Logger for error handling and structured logging.
 *
 * Wraps Elasticsearch client with request context, error classification,
 * and consistent log levels across all applications.
 *
 * @example
 *   import { Logger } from '../shared/logger/index.js';
 *   const logger = Logger.create(env, { service: 'job-worker' });
 *   const reqLogger = logger.child({ requestId, method: 'GET', path: '/api/health' });
 *   reqLogger.info('Request received');
 *   reqLogger.error('Handler failed', error, { handler: 'health' });
 */

import {
  logToElasticsearch,
  flush as esFlush,
  generateRequestId,
} from '../clients/elasticsearch/index.js';
import { HttpError, normalizeError } from '../errors/index.js';

/** @enum {string} */
const LogLevel = {
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
  FATAL: 'FATAL',
};

const LEVEL_PRIORITY = {
  [LogLevel.DEBUG]: 0,
  [LogLevel.INFO]: 1,
  [LogLevel.WARN]: 2,
  [LogLevel.ERROR]: 3,
  [LogLevel.FATAL]: 4,
};

function parseTraceId(traceparent) {
  if (typeof traceparent !== 'string') {
    return null;
  }

  const parts = traceparent.trim().split('-');
  if (parts.length !== 4) {
    return null;
  }

  const traceId = parts[1];
  return /^[0-9a-f]{32}$/i.test(traceId) ? traceId.toLowerCase() : null;
}

/**
 * Immutable request context that flows through the handler chain.
 * Created once at the entry point, passed to all handlers.
 */
export class RequestContext {
  /**
   * @param {Object} options
   * @param {string} [options.requestId]
   * @param {number} [options.startTime]
   * @param {string} [options.method]
   * @param {string} [options.path]
   * @param {string} [options.userAgent]
   * @param {Object} [options.geo]
   * @param {Object} [options.extra] - Additional context data
   */
  constructor(options = {}) {
    this.requestId = options.requestId || generateRequestId();
    this.startTime = options.startTime || Date.now();
    this.method = options.method || '';
    this.path = options.path || '';
    this.userAgent = options.userAgent || '';
    this.geo = options.geo || null;
    this.traceparent = options.traceparent || '';
    this.tracestate = options.tracestate || '';
    this.traceId = options.traceId || parseTraceId(this.traceparent) || '';
    this.extra = options.extra || {};
    Object.freeze(this);
  }

  /**
   * Create RequestContext from a Cloudflare Worker Request.
   * @param {Request} request
   * @param {URL} [url]
   * @returns {RequestContext}
   */
  static fromRequest(request, url) {
    const parsedUrl = url || new URL(request.url);
    return new RequestContext({
      method: request.method,
      path: parsedUrl.pathname,
      userAgent: request.headers.get('user-agent') || '',
      geo: request.cf
        ? {
            country: request.cf.country,
            city: request.cf.city,
            asn: request.cf.asn,
          }
        : null,
      traceparent: request.headers.get('traceparent') || '',
      tracestate: request.headers.get('tracestate') || '',
    });
  }

  /** @returns {number} Elapsed time in milliseconds */
  get elapsed() {
    return Date.now() - this.startTime;
  }

  /** @returns {Object} ECS-compatible labels */
  toLabels() {
    const labels = {
      http: {
        request: { method: this.method, id: this.requestId },
      },
      url: { path: this.path },
    };
    if (this.userAgent) {
      labels.user_agent = { original: this.userAgent };
    }
    if (this.geo) {
      labels.client = {
        geo: {
          country_iso_code: this.geo.country,
          city_name: this.geo.city,
        },
        as: { number: this.geo.asn },
      };
    }
    if (this.traceId) {
      labels.traceId = this.traceId;
      labels.correlationId = this.traceId;
      labels.trace = { id: this.traceId };
    }
    if (this.traceparent) {
      labels.traceparent = this.traceparent;
    }
    if (this.tracestate) {
      labels.tracestate = this.tracestate;
    }
    return labels;
  }
}

/**
 * Structured logger with context inheritance and error classification.
 *
 * Each Logger instance carries immutable context that gets merged into
 * every log entry. Use child() to create scoped loggers with additional context.
 */
export class Logger {
  /**
   * @param {Object} env - Cloudflare Worker env bindings
   * @param {Object} [options]
   * @param {string} [options.service] - Service name (e.g. 'job-worker')
   * @param {string} [options.minLevel] - Minimum log level
   * @param {RequestContext} [options.reqCtx] - Request context
   * @param {Object} [options.context] - Additional labels merged into every log
   */
  constructor(env, options = {}) {
    this.env = env;
    this.service = options.service || 'default';
    this.minLevel = options.minLevel || LogLevel.DEBUG;
    this.reqCtx = options.reqCtx || null;
    this.context = options.context || {};
  }

  /**
   * Create a Logger instance.
   * @param {Object} env
   * @param {Object} [options]
   * @returns {Logger}
   */
  static create(env, options = {}) {
    return new Logger(env, options);
  }

  /**
   * Create a child logger with additional context.
   * Inherits parent's env, service, minLevel, and reqCtx.
   * @param {Object} extraContext - Additional labels to merge
   * @returns {Logger}
   */
  child(extraContext = {}) {
    return new Logger(this.env, {
      service: this.service,
      minLevel: this.minLevel,
      reqCtx: this.reqCtx,
      context: { ...this.context, ...extraContext },
    });
  }

  /**
   * Create a child logger bound to a RequestContext.
   * @param {RequestContext} reqCtx
   * @returns {Logger}
   */
  withRequest(reqCtx) {
    return new Logger(this.env, {
      service: this.service,
      minLevel: this.minLevel,
      reqCtx,
      context: this.context,
    });
  }

  /**
   * Check if a log level should be emitted.
   * @param {string} level
   * @returns {boolean}
   */
  _shouldLog(level) {
    return (LEVEL_PRIORITY[level] ?? 0) >= (LEVEL_PRIORITY[this.minLevel] ?? 0);
  }

  /**
   * Build merged labels from logger context + request context + extra.
   * @param {Object} [extra]
   * @returns {Object}
   */
  _buildLabels(extra = {}) {
    const labels = { ...this.context };
    if (this.reqCtx) {
      Object.assign(labels, this.reqCtx.toLabels());
    }
    Object.assign(labels, extra);
    return labels;
  }

  /**
   * Core log method.
   * @param {string} level
   * @param {string} message
   * @param {Object} [extra]
   * @param {Object} [options]
   * @returns {Promise<void>}
   */
  async _log(level, message, extra = {}, options = {}) {
    if (!this._shouldLog(level)) return;

    const labels = this._buildLabels(extra);
    const opts = {
      ...options,
      job: this.service,
      requestId: this.reqCtx?.requestId,
    };

    return logToElasticsearch(this.env, message, level, labels, opts);
  }

  /**
   * @param {string} message
   * @param {Object} [extra]
   * @returns {Promise<void>}
   */
  async debug(message, extra) {
    return this._log(LogLevel.DEBUG, message, extra);
  }

  /**
   * @param {string} message
   * @param {Object} [extra]
   * @returns {Promise<void>}
   */
  async info(message, extra) {
    return this._log(LogLevel.INFO, message, extra);
  }

  /**
   * @param {string} message
   * @param {Object} [extra]
   * @returns {Promise<void>}
   */
  async warn(message, extra) {
    return this._log(LogLevel.WARN, message, extra);
  }

  /**
   * Log an error with full classification and context.
   *
   * Normalizes any thrown value into an AppError, enriches with request context,
   * and sends structured error data to Elasticsearch.
   *
   * @param {string} message - Human-readable description of what went wrong
   * @param {Error|AppError|*} error - The error (or any thrown value)
   * @param {Object} [extra] - Additional context labels
   * @returns {Promise<void>}
   */
  async error(message, error, extra = {}) {
    const normalized = normalizeError(error);
    const labels = this._buildLabels(extra);

    // Enrich labels with error classification
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

    // Add HTTP error specifics
    if (normalized instanceof HttpError) {
      errorLabels.http = {
        ...errorLabels.http,
        response: { status_code: normalized.statusCode },
      };
    }

    // Add domain-specific error context
    if (normalized.context) {
      errorLabels.error.context = normalized.context;
    }

    const opts = {
      job: this.service,
      requestId: this.reqCtx?.requestId,
      immediate: true,
    };

    // Also console.error for Worker tail logs / wrangler tail
    console.error(`[${this.service}] ${message}:`, normalized.message);

    return logToElasticsearch(
      this.env,
      `${message}: ${normalized.message}`,
      LogLevel.ERROR,
      errorLabels,
      opts
    );
  }

  /**
   * Log a fatal error that may require immediate attention.
   * Always logged immediately. Also triggers console.error for wrangler tail.
   *
   * @param {string} message
   * @param {Error|*} error
   * @param {Object} [extra]
   * @returns {Promise<void>}
   */
  async fatal(message, error, extra = {}) {
    const normalized = normalizeError(error);
    const labels = this._buildLabels({
      ...extra,
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
    });

    console.error(`[FATAL][${this.service}] ${message}:`, normalized.message);

    return logToElasticsearch(
      this.env,
      `[FATAL] ${message}: ${normalized.message}`,
      LogLevel.FATAL,
      labels,
      {
        job: this.service,
        requestId: this.reqCtx?.requestId,
        immediate: true,
      }
    );
  }

  /**
   * Log HTTP request arrival.
   * @param {Request} request
   * @param {URL} url
   * @returns {Promise<void>}
   */
  async logRequest(request, url) {
    return this._log(LogLevel.INFO, `${request.method} ${url.pathname}`, {
      event: {
        start: new Date(this.reqCtx?.startTime || Date.now()).toISOString(),
        kind: 'event',
        category: ['web'],
        type: ['access'],
      },
    });
  }

  /**
   * Log HTTP response with timing.
   * @param {Response} response
   * @returns {Promise<void>}
   */
  async logResponse(response) {
    const duration = this.reqCtx?.elapsed || 0;
    const level = response.status >= 400 ? LogLevel.WARN : LogLevel.INFO;

    return this._log(
      level,
      `${this.reqCtx?.method || '?'} ${response.status} ${duration}ms`,
      {
        http: {
          response: { status_code: response.status },
        },
        event: {
          duration: duration * 1_000_000,
          outcome: response.status < 400 ? 'success' : 'failure',
        },
      },
      { immediate: true }
    );
  }

  /**
   * Flush all pending log entries.
   * Call in ctx.waitUntil() before Worker response completes.
   * @returns {Promise<void>}
   */
  async flush() {
    return esFlush(this.env, { job: this.service });
  }
}

export { LogLevel, generateRequestId };

export default Logger;
