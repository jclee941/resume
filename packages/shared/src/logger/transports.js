import { createElasticsearchTransport } from './transports/elasticsearch.js';

/**
 * @param {Array<{name: string, send: Function, flush?: Function}>} [transports]
 * @returns {Array<{name: string, send: Function, flush?: Function}>}
 */
function createDefaultTransports(transports) {
  return Array.isArray(transports) && transports.length > 0
    ? transports
    : [createElasticsearchTransport()];
}

/**
 * @param {Array<{send: Function}>} transports
 * @param {Object} payload
 * @returns {Promise<void>}
 */
async function dispatchToTransports(transports, payload) {
  const results = await Promise.allSettled(
    transports.map((transport) => Promise.resolve().then(() => transport.send(payload)))
  );
  reportTransportFailures(results, 'transport failed');
}

/**
 * @param {Array<{flush?: Function}>} transports
 * @param {Object} env
 * @param {Object} options
 * @returns {Promise<void>}
 */
async function flushTransports(transports, env, options) {
  const results = await Promise.allSettled(
    transports.map((transport) =>
      Promise.resolve().then(() =>
        typeof transport.flush === 'function' ? transport.flush(env, options) : undefined
      )
    )
  );
  reportTransportFailures(results, 'transport flush failed');
}

/**
 * @param {Array<PromiseSettledResult<unknown>>} results
 * @param {string} message
 */
function reportTransportFailures(results, message) {
  for (const result of results) {
    if (result.status === 'rejected') {
      try {
        console.error(`[logger] ${message}: ${result.reason?.message || result.reason}`);
      } catch {
        // Logging must never throw.
      }
    }
  }
}

export { createDefaultTransports, dispatchToTransports, flushTransports };
