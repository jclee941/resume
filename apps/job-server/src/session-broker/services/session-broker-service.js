import EncryptionService from './encryption-service.js';
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

    this.loginFlows = {
      wanted: new WantedLoginFlow({
        browser: this.browser,
        encryptionService: this.encryptionService,
        logger: this.logger,
      }),
    };
  }

  getState(platform) {
    return getState(this, platform);
  }

  getStateEntry(platform) {
    return getStateEntry(this, platform);
  }

  setState(platform, stateOrEntry) {
    setState(this, platform, stateOrEntry);
  }

  async checkSession(platform) {
    return checkSession(this, platform);
  }

  async renewSession(platform) {
    return renewSession(this, platform);
  }

  async getValidSession(platform) {
    return getValidSession(this, platform);
  }

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
