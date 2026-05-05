/**
 * Elasticsearch transport for the canonical logger.
 *
 * SSOT-038 — pluggable transport. Wraps the existing ES client so the Logger
 * can dispatch to ES via a transport interface without coupling to a specific
 * destination.
 *
 * Transport interface:
 *   send({ level, message, service, labels, env, immediate, options }) -> Promise<void>
 *
 * The transport is a silent no-op when ELASTICSEARCH_URL or
 * ELASTICSEARCH_API_KEY is missing in env.
 */

import { logToElasticsearch, flush as esFlush } from '../../clients/elasticsearch/index.js';

/**
 * Create an Elasticsearch transport.
 * @returns {{name: string, send: Function, flush: Function}}
 */
export function createElasticsearchTransport() {
  return {
    name: 'elasticsearch',

    /**
     * Send one log entry through the existing ES batching/queuing path.
     * @param {Object} entry
     * @param {string} entry.level
     * @param {string} entry.message
     * @param {string} entry.service
     * @param {Object} entry.labels
     * @param {Object} entry.env
     * @param {boolean} [entry.immediate]
     * @param {Object} [entry.options]
     */
    async send(entry) {
      const opts = {
        ...(entry.options || {}),
        job: entry.service,
        immediate: entry.immediate === true,
      };
      return logToElasticsearch(entry.env, entry.message, entry.level, entry.labels, opts);
    },

    /**
     * Flush any queued ES entries.
     * @param {Object} env
     * @param {Object} [options]
     */
    async flush(env, options = {}) {
      return esFlush(env, options);
    },
  };
}

export default createElasticsearchTransport;
