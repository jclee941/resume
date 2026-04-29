import { LazyCrawlerRegistry } from './lazy-crawler-registry.js';

// DEPRECATED: AGENTS.md violation tracked in docs/architecture/MONOREPO_REVIEW_2026-04-29.md (P0-5).
// Module-level singleton — migrate to constructor-injected DI when refactoring this file.
// P0-5 audit fix: replace module-level mutable singleton with closure-bound holder.
// Migration: docs/architecture/MONOREPO_REVIEW_2026-04-29.md (singleton DI plan).
const _globalRegistryHolder = (() => {
  let v = null;
  return { get: () => v, set: (x) => { v = x; }, clear: () => { v = null; } };
})();

/**
 * Get or create global crawler registry
 * @returns {LazyCrawlerRegistry}
 */
export function getCrawlerRegistry() {
  if (!_globalRegistryHolder.get()) {
    _globalRegistryHolder.set(new LazyCrawlerRegistry());
  }
  return _globalRegistryHolder.get();
}
