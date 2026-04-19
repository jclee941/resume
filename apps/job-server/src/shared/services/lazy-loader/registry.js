import { LazyCrawlerRegistry } from './lazy-crawler-registry.js';

let globalRegistry = null;

/**
 * Get or create global crawler registry
 * @returns {LazyCrawlerRegistry}
 */
export function getCrawlerRegistry() {
  if (!globalRegistry) {
    globalRegistry = new LazyCrawlerRegistry();
  }
  return globalRegistry;
}
