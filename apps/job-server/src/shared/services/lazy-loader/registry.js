import { LazyCrawlerRegistry } from './lazy-crawler-registry.js';

// DEPRECATED: AGENTS.md violation tracked in docs/architecture/MONOREPO_REVIEW_2026-04-29.md (P0-5).
// Module-level singleton — migrate to constructor-injected DI when refactoring this file.
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
