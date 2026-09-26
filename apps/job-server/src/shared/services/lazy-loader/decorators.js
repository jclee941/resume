import { LazyModule } from './lazy-module.js';

/**
 * Create a lazy module
 * @template T
 * @param {() => Promise<T>} loader
 * @returns {LazyModule<T>}
 */
export function lazy(loader) {
  return new LazyModule(loader);
}

/**
 * Decorator for lazy-loading class methods
 * @param {Record<string, unknown>} target
 * @param {string} propertyKey
 * @param {PropertyDescriptor} descriptor
 */
export function lazyLoad(target, propertyKey, descriptor) {
  const originalMethod = /** @type {(...args: unknown[]) => Promise<unknown>} */ (descriptor.value);
  const cacheKey = `_lazy_${propertyKey}`;

  /**
   * @this {Record<string, LazyModule<unknown>> & typeof target}
   * @param {unknown[]} args
   */
  descriptor.value = async function (...args) {
    if (!this[cacheKey]) {
      this[cacheKey] = new LazyModule(() => originalMethod.apply(this, args));
    }
    return this[cacheKey].get();
  };

  return descriptor;
}
