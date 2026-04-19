import { EventEmitter } from 'events';
import { LazyModule } from './lazy-module.js';

/**
 * Lazy crawler registry
 */
export class LazyCrawlerRegistry extends EventEmitter {
  #crawlers = new Map();
  #factories = new Map();
  #logger;

  constructor(_options = {}) {
    super();
    this.#logger = _options.logger || console;
  }

  /**
   * Register a crawler factory
   * @param {string} name - Platform name
   * @param {Function} factory - Factory function returning crawler instance
   */
  register(name, factory) {
    this.#factories.set(name, factory);
    this.emit('registered', { name });
  }

  /**
   * Get crawler (lazy loaded)
   * @param {string} name
   * @returns {Promise<*>}
   */
  async get(name) {
    if (this.#crawlers.has(name)) {
      const crawler = this.#crawlers.get(name);
      if (crawler instanceof LazyModule) {
        return crawler.get();
      }
      return crawler;
    }

    const factory = this.#factories.get(name);
    if (!factory) {
      throw new Error(`Unknown crawler: ${name}`);
    }

    const lazy = new LazyModule(async () => {
      this.#logger.info(`🔄 Loading crawler: ${name}`);
      const start = Date.now();

      try {
        const crawler = await factory();
        const duration = Date.now() - start;
        this.#logger.info(`✅ Crawler loaded: ${name} (${duration}ms)`);
        this.emit('loaded', { name, duration });
        return crawler;
      } catch (error) {
        this.#logger.error(`❌ Failed to load crawler ${name}:`, error);
        this.emit('error', { name, error });
        throw error;
      }
    });

    this.#crawlers.set(name, lazy);
    return lazy.get();
  }

  /**
   * Get crawler synchronously (if already loaded)
   * @param {string} name
   * @returns {*|null}
   */
  getSync(name) {
    const crawler = this.#crawlers.get(name);
    if (crawler instanceof LazyModule) {
      return crawler.getSync();
    }
    return crawler || null;
  }

  /**
   * Preload specific crawlers
   * @param {string[]} names
   * @returns {Promise<void>}
   */
  async preload(names) {
    await Promise.all(names.map((name) => this.get(name)));
  }

  /**
   * Preload all registered crawlers
   * @returns {Promise<void>}
   */
  async preloadAll() {
    return this.preload(Array.from(this.#factories.keys()));
  }

  /**
   * Unload a crawler
   * @param {string} name
   */
  unload(name) {
    const crawler = this.#crawlers.get(name);
    if (crawler instanceof LazyModule) {
      crawler.unload();
    }
    this.#crawlers.delete(name);
    this.emit('unloaded', { name });
  }

  /**
   * Unload all crawlers
   */
  unloadAll() {
    for (const name of this.#crawlers.keys()) {
      this.unload(name);
    }
  }

  /**
   * Get loaded crawler names
   * @returns {string[]}
   */
  getLoadedNames() {
    const loaded = [];
    for (const [name, crawler] of this.#crawlers) {
      if (crawler instanceof LazyModule ? crawler.loaded : true) {
        loaded.push(name);
      }
    }
    return loaded;
  }

  /**
   * Get registered crawler names
   * @returns {string[]}
   */
  getRegisteredNames() {
    return Array.from(this.#factories.keys());
  }

  /**
   * Check if crawler is registered
   * @param {string} name
   * @returns {boolean}
   */
  isRegistered(name) {
    return this.#factories.has(name);
  }

  /**
   * Check if crawler is loaded
   * @param {string} name
   * @returns {boolean}
   */
  isLoaded(name) {
    const crawler = this.#crawlers.get(name);
    return crawler instanceof LazyModule ? crawler.loaded : false;
  }
}
