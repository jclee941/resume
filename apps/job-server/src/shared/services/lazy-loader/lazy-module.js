/**
 * Lazy-loaded module wrapper
 * @template T
 */
export class LazyModule {
  /** @type {() => Promise<T>} */
  #loader;
  /** @type {T | null} */
  #module = null;
  /** @type {Promise<T> | null} */
  #loading = null;
  /** @type {boolean} */
  #loaded = false;
  /** @type {Error | null} */
  #error = null;

  /**
   * @param {() => Promise<T>} loader - Async loader function
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
    if (this.#loaded && this.#module !== null) {
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

  /**
   * @returns {Promise<T>}
   */
  async #load() {
    try {
      this.#module = await this.#loader();
      this.#loaded = true;
      this.#error = null;
      return this.#module;
    } catch (error) {
      this.#error = error instanceof Error ? error : new Error(String(error));
      throw error;
    } finally {
      this.#loading = null;
    }
  }
}
