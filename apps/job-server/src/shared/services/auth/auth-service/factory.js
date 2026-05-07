import { AuthService } from './auth-service-core.js';

/**
 * Create an isolated AuthService instance for constructor-injected dependencies.
 * @param {import('./auth-typedefs.js').AuthConfig} config
 * @param {import('./auth-typedefs.js').SessionStore} [store]
 * @returns {AuthService}
 */
export function createAuthService(config, store) {
  return new AuthService(config, store);
}

const instanceHolder = (() => {
  let value = null;
  return {
    get: () => value,
    set: (nextValue) => {
      value = nextValue;
    },
    clear: () => {
      value = null;
    },
  };
})();

/**
 * Get or create AuthService singleton.
 * @deprecated Use createAuthService() and inject the returned instance through constructors.
 * @param {import('./auth-typedefs.js').AuthConfig} [config]
 * @param {import('./auth-typedefs.js').SessionStore} [store]
 * @returns {AuthService|null}
 */
export function getAuthService(config, store) {
  if (!instanceHolder.get() && config) {
    instanceHolder.set(createAuthService(config, store));
  }
  return instanceHolder.get();
}
