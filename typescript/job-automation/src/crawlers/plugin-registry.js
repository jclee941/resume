/**
 * Plugin registry for managing job platform crawlers.
 * Provides centralized registration, lookup, and lifecycle management.
 */

/** @type {Map<string, {CrawlerClass: Function, options: Object, instance: Object|null}>} */
const registry = new Map();

/**
 * Register a crawler plugin for a platform.
 * @param {string} platform - Platform identifier (e.g., 'rocketpunch')
 * @param {Function} CrawlerClass - Crawler class (must extend BaseCrawler)
 * @param {Object} [options={}] - Default options for the crawler
 * @throws {Error} If platform already registered
 */
export function registerCrawler(platform, CrawlerClass, options = {}) {
  if (registry.has(platform)) {
    throw new Error(`Crawler already registered for platform: ${platform}`);
  }
  registry.set(platform, { CrawlerClass, options, instance: null });
}

/**
 * Get or create a crawler instance for a platform.
 * @param {string} platform - Platform identifier
 * @param {Object} [overrides={}] - Option overrides for this instance
 * @returns {Object} Crawler instance
 * @throws {Error} If platform not registered
 */
export function getCrawler(platform, overrides = {}) {
  const entry = registry.get(platform);
  if (!entry) {
    throw new Error(
      `No crawler registered for platform: ${platform}. Available: ${listPlatforms().join(', ')}`
    );
  }
  if (!entry.instance || Object.keys(overrides).length > 0) {
    const mergedOptions = { ...entry.options, ...overrides };
    entry.instance = new entry.CrawlerClass(mergedOptions);
  }
  return entry.instance;
}

/**
 * List all registered platform identifiers.
 * @returns {string[]} Array of platform names
 */
export function listPlatforms() {
  return [...registry.keys()];
}

/**
 * Check if a platform is registered.
 * @param {string} platform - Platform identifier
 * @returns {boolean}
 */
export function hasPlatform(platform) {
  return registry.has(platform);
}

/**
 * Unregister a crawler plugin.
 * @param {string} platform - Platform identifier
 * @returns {boolean} True if removed, false if not found
 */
export function unregisterCrawler(platform) {
  return registry.delete(platform);
}

/**
 * Get registry stats.
 * @returns {{total: number, platforms: string[], instantiated: string[]}}
 */
export function getRegistryStats() {
  const platforms = listPlatforms();
  const instantiated = platforms.filter((p) => registry.get(p)?.instance !== null);
  return { total: platforms.length, platforms, instantiated };
}
