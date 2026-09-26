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
