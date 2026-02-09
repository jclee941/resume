import {
  logToElasticsearch,
  logRequest as esLogRequest,
  logError as esLogError,
  flush,
  generateRequestId,
} from '../../utils/es-logger.js';

export class RequestContext {
  constructor(requestId, method, pathname, startTime) {
    this.requestId = requestId;
    this.method = method;
    this.pathname = pathname;
    this.startTime = startTime;
  }

  static fromRequest(request, url) {
    return new RequestContext(generateRequestId(), request.method, url.pathname, Date.now());
  }

  get elapsed() {
    return Date.now() - this.startTime;
  }

  toLabels() {
    return {
      'http.request.method': this.method,
      'url.path': this.pathname,
      'trace.id': this.requestId,
    };
  }
}

class Logger {
  constructor(env, context = {}) {
    this.env = env;
    this.context = context;
    this.reqCtx = null;
  }

  static create(env, options = {}) {
    return new Logger(env, options.context || {});
  }

  withRequest(reqCtx) {
    this.reqCtx = reqCtx;
    return this;
  }

  info(message, extra = {}) {
    const labels = { ...this.context, ...(this.reqCtx?.toLabels() || {}), ...extra };
    logToElasticsearch(this.env, message, 'info', labels).catch(() => {});
  }

  warn(message, extra = {}) {
    const labels = { ...this.context, ...(this.reqCtx?.toLabels() || {}), ...extra };
    logToElasticsearch(this.env, message, 'warn', labels).catch(() => {});
  }

  error(message, errorOrExtra = {}) {
    const labels = { ...this.context, ...(this.reqCtx?.toLabels() || {}) };
    if (errorOrExtra instanceof Error) {
      esLogError(this.env, errorOrExtra, labels).catch(() => {});
      console.error(`[ERROR] ${message}:`, errorOrExtra.message);
    } else {
      logToElasticsearch(this.env, message, 'error', { ...labels, ...errorOrExtra }).catch(
        () => {}
      );
      console.error(`[ERROR] ${message}`);
    }
  }

  logRequest(request, url) {
    esLogRequest(this.env, request, url).catch(() => {});
  }

  flush() {
    return flush(this.env);
  }
}

export { generateRequestId };
export default Logger;
