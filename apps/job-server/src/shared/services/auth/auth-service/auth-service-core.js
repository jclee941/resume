import { OAuth2Client } from 'google-auth-library';
import { SessionManager } from '../../session/index.js';
import { verifyGoogleCredentialWithSession } from './google-auth-flow.js';
import { clearPlatformAuth, getAuthStatus, savePlatformAuth } from './platform-auth.js';
import { renewSession } from './session-renewal.js';
import { logoutSession, validateSession } from './token-store.js';

export class AuthService {
  /** @type {OAuth2Client} */
  #googleClient;
  /** @type {import('./auth-typedefs.js').AuthConfig} */
  #config;
  /** @type {import('./auth-typedefs.js').SessionStore} */
  #store;
  /** @type {import('./auth-typedefs.js').PlatformSessionStore} */
  #sessionStore;

  /**
   * @param {import('./auth-typedefs.js').AuthConfig} config
   * @param {import('./auth-typedefs.js').SessionStore|import('./auth-typedefs.js').AuthServiceDependencies} [dependencies]
   */
  constructor(config, dependencies = {}) {
    this.#config = {
      sessionTTL: 24 * 60 * 60 * 1000,
      ...config,
    };
    this.logger = config.logger ?? console;
    this.#googleClient = new OAuth2Client(config.googleClientId);
    const resolvedDependencies = isLegacySessionStore(dependencies)
      ? { store: dependencies }
      : dependencies;
    this.#store = resolvedDependencies.store || {
      sessions: new Map(),
      csrfTokens: new Map(),
    };
    this.#sessionStore = resolvedDependencies.sessionStore || SessionManager.getInstance();
  }

  /**
   * Verify Google OAuth credential and create session.
   * @param {string} credential
   * @returns {Promise<import('./auth-typedefs.js').GoogleAuthResult>}
   */
  async verifyGoogleCredential(credential) {
    return verifyGoogleCredentialWithSession(
      this.#googleClient,
      this.#config,
      this.#store,
      this.logger,
      credential
    );
  }

  getAuthStatus() {
    return getAuthStatus(this.#sessionStore);
  }

  savePlatformAuth(platform, cookies, email) {
    return savePlatformAuth(this.#sessionStore, platform, cookies, email);
  }

  clearPlatformAuth(platform) {
    return clearPlatformAuth(this.#sessionStore, platform);
  }

  logout(sessionId) {
    return logoutSession(this.#store, sessionId);
  }

  validateSession(sessionId) {
    return validateSession(this.#store, sessionId);
  }

  renewSession(platform) {
    return renewSession(this.#sessionStore, platform);
  }

  /**
   * Get session TTL in seconds (for cookie Max-Age).
   * @returns {number}
   */
  getSessionTTLSeconds() {
    return Math.floor(this.#config.sessionTTL / 1000);
  }
}

/**
 * @param {unknown} dependencies
 * @returns {dependencies is import('./auth-typedefs.js').SessionStore}
 */
function isLegacySessionStore(dependencies) {
  return Boolean(dependencies?.sessions && dependencies?.csrfTokens);
}
