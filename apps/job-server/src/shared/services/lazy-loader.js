/**
 * Lazy Loader - Dynamic module loading utilities
 *
 * Provides lazy loading for heavy modules, crawlers, and services
 * to improve startup time and reduce memory footprint.
 */

import { EventEmitter } from 'events';

/**
 * Lazy-loaded module wrapper
 * @template T
 */
export class LazyModule {
  #loader;
  #module = null;
  #loading = null;
  #loaded = false;
  #error = null;

  /**
   * @param {Function} loader - Async loader function
   */
  constructor(loader) {
    this.#loader = loader;
  }

  /**
   * Check if module is loaded
   * @returns {boolean}
   */
  get loaded() {
    return this.#loaded;
  }

  /**
   * Get last error if any
   * @returns {Error|null}
   */
  get error() {
    return this.#error;
  }

  /**
   * Get the module (loads if necessary)
   * @returns {Promise<T>}
   */
  async get() {
    if (this.#loaded) {
      return this.#module;
    }

    if (this.#loading) {
      return this.#loading;
    }

    this.#loading = this.#load();
    return this.#loading;
  }

  /**
   * Get module synchronously (only if already loaded)
   * @returns {T|null}
   */
  getSync() {
    return this.#loaded ? this.#module : null;
  }

  /**
   * Preload the module
   * @returns {Promise<T>}
   */
  async preload() {
    return this.get();
  }

  /**
   * Unload the module
   */
  unload() {
    this.#module = null;
    this.#loaded = false;
    this.#error = null;
  }

  async #load() {
    try {
      this.#module = await this.#loader();
      this.#loaded = true;
      this.#error = null;
      return this.#module;
    } catch (error) {
      this.#error = error;
      throw error;
    } finally {
      this.#loading = null;
    }
  }
}

/**
 * Lazy crawler registry
 */
export class LazyCrawlerRegistry extends EventEmitter {
  #crawlers = new Map();
  #factories = new Map();
  #logger;

  constructor(_options = {}) {
    super();
    this.#logger = options.logger || console;
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
    // Return existing
    if (this.#crawlers.has(name)) {
      const crawler = this.#crawlers.get(name);
      if (crawler instanceof LazyModule) {
        return crawler.get();
      }
      return crawler;
    }

    // Create lazy wrapper
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

/**
 * Service locator with lazy initialization
 */
export class ServiceLocator {
  #services = new Map();
  #singletons = new Map();

  constructor(_options = {}) {}

  /**
   * Register a service factory
   * @param {string} name
   * @param {Function} factory
   * @param {boolean} [singleton=true]
   */
  register(name, factory, singleton = true) {
    this.#services.set(name, { factory, singleton });
  }

  /**
   * Get service instance
   * @param {string} name
   * @returns {Promise<*>}
   */
  async get(name) {
    const config = this.#services.get(name);
    if (!config) {
      throw new Error(`Unknown service: ${name}`);
    }

    // Return existing singleton
    if (config.singleton && this.#singletons.has(name)) {
      return this.#singletons.get(name);
    }

    // Create instance
    const instance = await config.factory();

    if (config.singleton) {
      this.#singletons.set(name, instance);
    }

    return instance;
  }

  /**
   * Get service synchronously (if already initialized)
   * @param {string} name
   * @returns {*|null}
   */
  getSync(name) {
    return this.#singletons.get(name) || null;
  }

  /**
   * Check if service is registered
   * @param {string} name
   * @returns {boolean}
   */
  has(name) {
    return this.#services.has(name);
  }

  /**
   * Clear all singletons
   */
  clear() {
    this.#singletons.clear();
  }
}

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

/**
 * Stream processor for large responses
 */
export class StreamProcessor {
  #logger;

  constructor(options = {}) {
    this.#logger = options.logger || console;
  }

  /**
   * Process stream in chunks
   * @param {ReadableStream} stream
   * @param {Function} processor - Process each chunk
   * @param {Object} options
   */
  async process(stream, processor, options = {}) {
    const { onProgress } = options;
    const reader = stream.getReader();

    let totalBytes = 0;
    let chunks = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        totalBytes += value.length;
        chunks++;

        await processor(value, { totalBytes, chunks });

        if (onProgress && chunks % 10 === 0) {
          onProgress({ totalBytes, chunks });
        }
      }

      return { totalBytes, chunks };
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Stream JSON parser
   * @param {ReadableStream} stream
   * @returns {AsyncGenerator}
   */
  async *parseJSONStream(stream) {
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Split by newlines and parse JSON objects
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed) {
            try {
              yield JSON.parse(trimmed);
            } catch (_e) {
              this.#logger.debug('Failed to parse JSON line:', trimmed);
            }
          }
        }
      }

      // Parse remaining buffer
      if (buffer.trim()) {
        try {
          yield JSON.parse(buffer);
        } catch (_e) {
          this.#logger.debug('Failed to parse final JSON buffer');
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}

// Global registry instance
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

/**
 * Create a lazy module
 * @param {Function} loader
 * @returns {LazyModule}
 */
export function lazy(loader) {
  return new LazyModule(loader);
}

/**
 * Decorator for lazy-loading class methods
 * @param {Object} target
 * @param {string} propertyKey
 * @param {PropertyDescriptor} descriptor
 */
export function lazyLoad(target, propertyKey, descriptor) {
  const originalMethod = descriptor.value;
  const cacheKey = `_lazy_${propertyKey}`;

  descriptor.value = async function (...args) {
    if (!this[cacheKey]) {
      this[cacheKey] = new LazyModule(() => originalMethod.apply(this, args));
    }
    return this[cacheKey].get();
  };

  return descriptor;
}

export default {
  LazyModule,
  LazyCrawlerRegistry,
  ServiceLocator,
  DynamicImporter,
  StreamProcessor,
  getCrawlerRegistry,
  lazy,
  lazyLoad,
};
