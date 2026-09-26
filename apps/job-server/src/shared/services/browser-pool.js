/**
 * Browser pool public API.
 *
 * Kept as a barrel export for backward compatibility with existing imports.
 */

import { BrowserPool } from './browser-pool/pool-manager.js';

export { BrowserPool } from './browser-pool/pool-manager.js';

/**
 * Create an isolated browser pool for constructor-injected services.
 * @param {Object} [config] - Browser pool configuration.
 * @returns {BrowserPool}
 */
export function createBrowserPool(config = {}) {
  return new BrowserPool(config);
}
export default BrowserPool;
