import { normalizeError } from '../errors/index.js';
import { LEVEL_PRIORITY, LogLevel } from './config.js';
import { buildErrorLabels, buildFatalLabels, buildResponseLabels } from './formatters.js';
import { createDefaultTransports, dispatchToTransports, flushTransports } from './transports.js';

/**
 * Structured logger with context inheritance and error classification.
 */
class Logger {
  /**
   * @param {Object} env - Cloudflare Worker env bindings
   * @param {Object} [options]
   * @param {string} [options.service]
   * @param {string} [options.minLevel]
   * @param {RequestContext} [options.reqCtx]
   * @param {Object} [options.context]
   * @param {Array<{name: string, send: Function, flush?: Function}>} [options.transports]
   */
  constructor(env, options = {}) {
    this.env = env;
    this.service = options.service || 'default';
    this.minLevel = options.minLevel || LogLevel.DEBUG;
    this.reqCtx = options.reqCtx || null;
    this.context = options.context || {};
    this.transports = createDefaultTransports(options.transports);
  }

  /** @param {Object} env @param {Object} [options] @returns {Logger} */
  static create(env, options = {}) {
    return new Logger(env, options);
  }

  /** @param {Object} extraContext @returns {Logger} */
  child(extraContext = {}) {
    return new Logger(this.env, {
      service: this.service,
      minLevel: this.minLevel,
      reqCtx: this.reqCtx,
      context: { ...this.context, ...extraContext },
      transports: this.transports,
    });
  }

  /** @param {RequestContext} reqCtx @returns {Logger} */
  withRequest(reqCtx) {
    return new Logger(this.env, {
      service: this.service,
      minLevel: this.minLevel,
      reqCtx,
      context: this.context,
      transports: this.transports,
    });
  }

  /** @param {string} level @returns {boolean} */
  _shouldLog(level) {
    return (LEVEL_PRIORITY[level] ?? 0) >= (LEVEL_PRIORITY[this.minLevel] ?? 0);
  }

  /** @param {Object} [extra] @returns {Object} */
  _buildLabels(extra = {}) {
    const labels = { ...this.context };
    if (this.reqCtx) Object.assign(labels, this.reqCtx.toLabels());
    Object.assign(labels, extra);
    return labels;
  }

  /**
   * @param {string} level
   * @param {string} message
   * @param {Object} [extra]
   * @param {Object} [options]
   * @returns {Promise<void>}
   */
  async _log(level, message, extra = {}, options = {}) {
    if (!this._shouldLog(level)) return;
    return this._dispatch({
      level,
      message,
      labels: this._buildLabels(extra),
      immediate: options.immediate === true,
      options,
    });
  }

  /** @param {Object} entry @returns {Promise<void>} */
  async _dispatch(entry) {
    return dispatchToTransports(this.transports, {
      level: entry.level,
      message: entry.message,
      service: this.service,
      labels: entry.labels,
      env: this.env,
      immediate: entry.immediate === true,
      options: { ...(entry.options || {}), job: this.service, requestId: this.reqCtx?.requestId },
    });
  }

  /** @param {string} message @param {Object} [extra] @returns {Promise<void>} */
  async debug(message, extra) {
    return this._log(LogLevel.DEBUG, message, extra);
  }

  /** @param {string} message @param {Object} [extra] @returns {Promise<void>} */
  async info(message, extra) {
    return this._log(LogLevel.INFO, message, extra);
  }

  /** @param {string} message @param {Object} [extra] @returns {Promise<void>} */
  async warn(message, extra) {
    return this._log(LogLevel.WARN, message, extra);
  }

  /** @param {string} message @param {Error|*} error @param {Object} [extra] */
  async error(message, error, extra = {}) {
    const normalized = normalizeError(error);
    console.error(`[${this.service}] ${message}:`, normalized.message);
    return this._dispatch({
      level: LogLevel.ERROR,
      message: `${message}: ${normalized.message}`,
      labels: buildErrorLabels(this._buildLabels(extra), normalized),
      immediate: true,
    });
  }

  /** @param {string} message @param {Error|*} error @param {Object} [extra] */
  async fatal(message, error, extra = {}) {
    const normalized = normalizeError(error);
    console.error(`[FATAL][${this.service}] ${message}:`, normalized.message);
    return this._dispatch({
      level: LogLevel.FATAL,
      message: `[FATAL] ${message}: ${normalized.message}`,
      labels: buildFatalLabels(this._buildLabels(extra), normalized),
      immediate: true,
    });
  }

  /** @param {Request} request @param {URL} url @returns {Promise<void>} */
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

  /** @param {Response} response @returns {Promise<void>} */
  async logResponse(response) {
    const duration = this.reqCtx?.elapsed || 0;
    const level = response.status >= 400 ? LogLevel.WARN : LogLevel.INFO;
    return this._log(
      level,
      `${this.reqCtx?.method || '?'} ${response.status} ${duration}ms`,
      buildResponseLabels(response.status, duration),
      { immediate: true }
    );
  }

  /** @returns {Promise<void>} */
  async flush() {
    return flushTransports(this.transports, this.env, { job: this.service });
  }
}

export { Logger };
export default Logger;
