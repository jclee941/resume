import { EncryptionService } from '@resume/shared/crypto';
import {
  DEFAULT_RETRY_ATTEMPTS,
  DEFAULT_RETRY_DELAY_MS,
  DEFAULT_SESSION_LIFETIME_MS,
  DEFAULT_TTL_THRESHOLD,
  defaultSleep,
  SESSION_STATES,
  SUPPORTED_SESSION_BROKER_PLATFORMS,
} from './session-broker-constants.js';
import { getState, getStateEntry, setState } from './session-broker-state.js';
import {
  checkSession,
  getHealth,
  getValidSession,
  renewSession,
  validateEncryptedSession,
} from './session-broker-operations.js';
import WantedLoginFlow from './wanted-login-flow.js';

export { SESSION_STATES, SUPPORTED_SESSION_BROKER_PLATFORMS };

/**
 * @typedef {Object} SessionBrokerStateEntry
 * @property {string} [state]
 * @property {string | null} [lastError]
 * @property {string | null} [expiresAt]
 * @property {string | null} [renewedAt]
 */

/**
 * @typedef {Object} SessionBrokerServiceOptions
 * @property {unknown} [sessionStore]
 * @property {Map<string, SessionBrokerStateEntry>} [stateStore]
 * @property {string[]} [platforms]
 * @property {Record<string, () => import('./session-broker-operations.js').LoginFlow>} [loginFlowFactories]
 * @property {() => number} [now]
 * @property {(ms: number) => Promise<void>} [sleep]
 * @property {(() => unknown) | null} [browserFactory]
 * @property {EncryptionService} [encryptionService]
 * @property {unknown} [browser]
 * @property {Console | { log?: (msg: string) => void; error?: (msg: string, ...args: unknown[]) => void }} [logger]
 * @property {number} [sessionLifetimeMs]
 * @property {number} [ttlThreshold]
 * @property {number} [retryAttempts]
 * @property {number} [retryDelayMs]
 */

/**
 * SessionBrokerService
 *
 * Dual-mode design:
 * - Production: uses SessionManager for persistent session storage and
 *   WantedLoginFlow for real browser-based session renewal. Instantiated
 *   by session-broker-routes.js as `new SessionBrokerService()`.
 * - Test: accepts dependency-injected `sessionStore` (Map), `stateStore`
 *   (Map), `platforms` array, `loginFlowFactories`, `now`/`sleep` clocks,
 *   and `browserFactory` so tests can verify behavior without I/O.
 *
 * State entries stored in stateStore are objects of shape:
 *   { state: SESSION_STATES, lastError: string|null, expiresAt, renewedAt }
 */
export default class SessionBrokerService {
  /**
   * @param {SessionBrokerServiceOptions} [options]
   */
  constructor(options = {}) {
    this.sessionStore = options.sessionStore ?? null;
    this.stateStore = options.stateStore ?? new Map();
    this.platforms = options.platforms
      ? [...options.platforms]
      : [...SUPPORTED_SESSION_BROKER_PLATFORMS];
    this.loginFlowFactories = options.loginFlowFactories ?? {};
    this.nowFn = options.now ?? (() => Date.now());
    this.sleepFn = options.sleep ?? defaultSleep;
    this.browserFactory = options.browserFactory ?? null;

    this.encryptionService = options.encryptionService || new EncryptionService();
    this.browser = options.browser || (this.browserFactory ? this.browserFactory() : undefined);
    this.logger = options.logger || console;

    this.sessionLifetimeMs = options.sessionLifetimeMs || DEFAULT_SESSION_LIFETIME_MS;
    this.ttlThreshold = options.ttlThreshold ?? DEFAULT_TTL_THRESHOLD;
    this.retryAttempts = options.retryAttempts ?? DEFAULT_RETRY_ATTEMPTS;
    this.retryDelayMs = options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;

    /** @type {Record<string, import('./session-broker-operations.js').LoginFlow>} */
    this.loginFlows = {
      wanted: new WantedLoginFlow({
        browser: this.browser,
        encryptionService: this.encryptionService,
        logger: this.logger,
      }),
    };
  }

  /**
   * @param {string} platform
   */
  getState(platform) {
    return getState(this, platform);
  }

  /**
   * @param {string} platform
   */
  getStateEntry(platform) {
    return getStateEntry(this, platform);
  }

  /**
   * @param {string} platform
   * @param {string | Partial<SessionBrokerStateEntry>} stateOrEntry
   */
  setState(platform, stateOrEntry) {
    setState(this, platform, stateOrEntry);
  }

  /**
   * @param {string} platform
   */
  async checkSession(platform) {
    return checkSession(this, platform);
  }

  /**
   * @param {string} platform
   */
  async renewSession(platform) {
    return renewSession(this, platform);
  }

  /**
   * @param {string} platform
   */
  async getValidSession(platform) {
    return getValidSession(this, platform);
  }

  /**
   * @param {string} platform
   * @param {string} encryptedSession
   */
  async validateEncryptedSession(platform, encryptedSession) {
    return validateEncryptedSession(this, platform, encryptedSession);
  }

  async getHealth() {
    return getHealth(this);
  }

  healthCheck() {
    return this.getHealth();
  }
}
