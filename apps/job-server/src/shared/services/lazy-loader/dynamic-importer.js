/**
 * Dynamic import helper with caching
 */
export class DynamicImporter {
  #cache = new Map();
  #logger;

  constructor(options = {}) {
    this.#logger = options.logger || console;
  }

  /**
   * Import module dynamically
   * @param {string} path - Module path
   * @param {boolean} [cache=true] - Cache the result
   * @returns {Promise<*>}
   */
  async import(path, cache = true) {
    if (cache && this.#cache.has(path)) {
      return this.#cache.get(path);
    }

    try {
      this.#logger.debug(`📦 Importing: ${path}`);
      const start = Date.now();

      const module = await import(path);

      const duration = Date.now() - start;
      this.#logger.debug(`✅ Imported: ${path} (${duration}ms)`);

      if (cache) {
        this.#cache.set(path, module);
      }

      return module;
    } catch (error) {
      this.#logger.error(`❌ Failed to import ${path}:`, error);
      throw error;
    }
  }

  /**
   * Preload multiple modules
   * @param {string[]} paths
   * @returns {Promise<Array>}
   */
  async preload(paths) {
    return Promise.all(paths.map((p) => this.import(p)));
  }

  /**
   * Clear import cache
   */
  clearCache() {
    this.#cache.clear();
  }

  /**
   * Remove from cache
   * @param {string} path
   */
  invalidate(path) {
    this.#cache.delete(path);
  }
}
