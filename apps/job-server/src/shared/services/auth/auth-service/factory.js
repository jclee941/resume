import { AuthService } from './auth-service-core.js';

/**
 * Create an isolated AuthService instance for constructor-injected dependencies.
 * @param {import('./auth-typedefs.js').AuthConfig & import('./auth-typedefs.js').AuthServiceDependencies} options
 * @param {import('./auth-typedefs.js').AuthServiceDependencies|import('./auth-typedefs.js').SessionStore} [dependencies]
 * @returns {AuthService}
 */
export function createAuthService(options, dependencies) {
  const { store, sessionStore, ...config } = options;
  return new AuthService(config, dependencies ?? { store, sessionStore });
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
 * @param {import('./auth-typedefs.js').AuthConfig & import('./auth-typedefs.js').AuthServiceDependencies} [config]
 * @param {import('./auth-typedefs.js').AuthServiceDependencies|import('./auth-typedefs.js').SessionStore} [dependencies]
 * @returns {AuthService|null}
 */
export function getAuthService(options, dependencies) {
  if (!instanceHolder.get() && options) {
    instanceHolder.set(createAuthService(options, dependencies));
  }
  return instanceHolder.get();
}
