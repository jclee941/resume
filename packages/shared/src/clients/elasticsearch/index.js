/**
 * Elasticsearch Logger for Cloudflare Workers
 * Enhanced with batching, ECS format, request timing, and distributed tracing
 *
 * Environment variables:
 * - ELASTICSEARCH_URL: Elasticsearch endpoint
 * - ELASTICSEARCH_API_KEY: API key for authentication
 * - ELASTICSEARCH_INDEX: Index name (default: logs-{job})
 */

import { logToElasticsearch, flush } from './transport.js';
import { generateRequestId, logRequest, logResponse, logError, logEvent } from './formatters.js';

export {
  logToElasticsearch,
  flush,
  generateRequestId,
  logRequest,
  logResponse,
  logError,
  logEvent,
};

export default {
  logToElasticsearch,
  logRequest,
  logResponse,
  logError,
  logEvent,
  flush,
  generateRequestId,
};
