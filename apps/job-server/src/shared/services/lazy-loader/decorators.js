import { LazyModule } from './lazy-module.js';

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
