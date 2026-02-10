/**
 * Framework-agnostic Auth Service
 * Extracts business logic from server/routes/auth.js and dashboard/routes/auth.js
 */
import { OAuth2Client } from 'google-auth-library';
import { randomBytes } from 'crypto';
import { SessionManager } from '../session/index.js';

/**
 * @typedef {Object} AuthConfig
 * @property {string} googleClientId
 * @property {string} adminEmail
 * @property {number} [sessionTTL=86400000] - Session TTL in ms (default 24h)
 */

/**
 * @typedef {Object} GoogleAuthResult
 * @property {boolean} success
 * @property {string} [email]
 * @property {string} [sessionId]
 * @property {string} [csrfToken]
 * @property {string} [error]
 * @property {number} [statusCode]
 */

/**
 * @typedef {Object} SessionStore
 * @property {Map<string, {email: string, expiresAt: number}>} sessions
 * @property {Map<string, string>} csrfTokens
 */

export class AuthService {
  /** @type {OAuth2Client} */
  #googleClient;
  /** @type {AuthConfig} */
  #config;
  /** @type {SessionStore} */
  #store;

  /**
   * @param {AuthConfig} config
   * @param {SessionStore} [store] - Optional external session store
   */
  constructor(config, store) {
    this.#config = {
      sessionTTL: 24 * 60 * 60 * 1000, // 24 hours default
      ...config,
    };
    this.#googleClient = new OAuth2Client(config.googleClientId);
    this.#store = store || {
      sessions: new Map(),
      csrfTokens: new Map(),
    };
  }

  /**
   * Verify Google OAuth credential and create session
   * @param {string} credential - Google ID token
   * @returns {Promise<GoogleAuthResult>}
   */
  async verifyGoogleCredential(credential) {
    if (!credential) {
      return { success: false, error: 'Missing credential', statusCode: 400 };
    }

    let payload;
    try {
      const ticket = await this.#googleClient.verifyIdToken({
        idToken: credential,
        audience: this.#config.googleClientId,
      });
      payload = ticket.getPayload();
    } catch {
      return { success: false, error: 'Invalid token', statusCode: 401 };
    }

    if (!payload?.email || payload.email !== this.#config.adminEmail) {
      return { success: false, error: 'Access denied', statusCode: 403 };
    }

    const sessionId = this.#createSession(payload.email);
    const csrfToken = this.#generateCsrfToken(sessionId);

    return {
      success: true,
      email: payload.email,
      sessionId,
      csrfToken,
    };
  }

  /**
   * Get platform authentication status
   * @returns {{success: boolean, status: Object}}
   */
  getAuthStatus() {
    const status = SessionManager.getStatus();
    return { success: true, status };
  }

  /**
   * Save platform authentication (cookies)
   * @param {string} platform
   * @param {string} cookies
   * @param {string} [email]
   * @returns {{success: boolean, message?: string, error?: string, statusCode?: number}}
   */
  savePlatformAuth(platform, cookies, email) {
    if (!platform || !cookies) {
      return {
        success: false,
        error: 'Platform and cookies required',
        statusCode: 400,
      };
    }

    SessionManager.save(platform, { cookies, email });
    return { success: true, message: `Auth saved for ${platform}` };
  }

  /**
   * Clear platform authentication
   * @param {string} platform
   * @returns {{success: boolean, message: string}}
   */
  clearPlatformAuth(platform) {
    SessionManager.clear(platform);
    return { success: true, message: `Logged out from ${platform}` };
  }

  /**
   * Logout from admin session
   * @param {string} sessionId
   * @returns {{success: boolean}}
   */
  logout(sessionId) {
    if (sessionId) {
      this.#store.sessions.delete(sessionId);
      this.#store.csrfTokens.delete(sessionId);
    }
    return { success: true };
  }

  /**
   * Validate session
   * @param {string} sessionId
   * @returns {boolean}
   */
  validateSession(sessionId) {
    const session = this.#store.sessions.get(sessionId);
    if (!session) return false;
    if (Date.now() > session.expiresAt) {
      this.#store.sessions.delete(sessionId);
      return false;
    }
    return true;
  }

  /**
   * Get session TTL in seconds (for cookie Max-Age)
   * @returns {number}
   */
  getSessionTTLSeconds() {
    return Math.floor(this.#config.sessionTTL / 1000);
  }

  // Private methods
  #createSession(email) {
    const sessionId = randomBytes(32).toString('hex');
    this.#store.sessions.set(sessionId, {
      email,
      expiresAt: Date.now() + this.#config.sessionTTL,
    });
    return sessionId;
  }

  #generateCsrfToken(sessionId) {
    const token = randomBytes(32).toString('hex');
    this.#store.csrfTokens.set(sessionId, token);
    return token;
  }
}

// Singleton instance factory
let instance = null;

/**
 * Get or create AuthService singleton
 * @param {AuthConfig} [config]
 * @param {SessionStore} [store]
 * @returns {AuthService}
 */
export function getAuthService(config, store) {
  if (!instance && config) {
    instance = new AuthService(config, store);
  }
  return instance;
}

export default AuthService;
