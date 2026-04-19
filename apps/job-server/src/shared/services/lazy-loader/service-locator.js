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

    if (config.singleton && this.#singletons.has(name)) {
      return this.#singletons.get(name);
    }

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
