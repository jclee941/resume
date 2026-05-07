import { generateRequestId } from '../clients/elasticsearch/index.js';
import { parseTraceId } from './formatters.js';

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

/**
 * Immutable request context that flows through the handler chain.
 */
class RequestContext {
  /**
   * @param {Object} options
   * @param {string} [options.requestId]
   * @param {number} [options.startTime]
   * @param {string} [options.method]
   * @param {string} [options.path]
   * @param {string} [options.userAgent]
   * @param {Object} [options.geo]
   * @param {Object} [options.extra]
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
      http: { request: { method: this.method, id: this.requestId } },
      url: { path: this.path },
    };
    if (this.userAgent) labels.user_agent = { original: this.userAgent };
    if (this.geo) {
      labels.client = {
        geo: { country_iso_code: this.geo.country, city_name: this.geo.city },
        as: { number: this.geo.asn },
      };
    }
    if (this.traceId) {
      labels.traceId = this.traceId;
      labels.correlationId = this.traceId;
      labels.trace = { id: this.traceId };
    }
    if (this.traceparent) labels.traceparent = this.traceparent;
    if (this.tracestate) labels.tracestate = this.tracestate;
    return labels;
  }
}

export { LogLevel, LEVEL_PRIORITY, RequestContext, generateRequestId };
