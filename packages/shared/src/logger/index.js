/**
 * Unified structured logger public API.
 *
 * Keep this barrel stable: existing consumers import from
 * `@resume/shared/logger` and must not know about the internal split.
 */

export { Logger, default } from './core.js';
export { RequestContext } from './config.js';
export { LogLevel, generateRequestId } from './config.js';
export {
  buildErrorLabels,
  buildFatalLabels,
  buildResponseLabels,
  parseTraceId,
} from './formatters.js';
export { createDefaultTransports, dispatchToTransports, flushTransports } from './transports.js';
export { createElasticsearchTransport } from './transports/elasticsearch.js';
export { createLokiTransport } from './transports/loki.js';
