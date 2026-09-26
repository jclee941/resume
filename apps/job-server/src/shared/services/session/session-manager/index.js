import { sessionCookieMethods } from './session-cookie.js';
import { sessionContentValidationMethods } from './session-content-validation.js';
import { sessionExpirationMethods } from './session-expiration.js';
import { sessionExportMethods } from './session-export.js';
import { sessionRefreshMethods } from './session-refresh.js';
import { sessionStorageMethods } from './session-storage.js';
import { createAuthenticatedWantedApi } from './session-cookie.js';
import { runCdpSessionExtraction } from './session-refresh.js';
import { createStore } from './session-store-factory.js';

/**
 * @typedef {import('./session-cookie.js').SessionData & import('./session-expiration.js').SessionDataLike & { timestamp?: number }} UnifiedSessionData
 * @typedef {{
 *   logger?: import('@resume/shared/session/store.js').SessionStoreLogger,
 *   store?: ReturnType<typeof createStore>,
 *   storeFactory?: typeof createStore,
 *   apiFactory?: (session: import('./session-cookie.js').SessionData) => Promise<unknown>,
 *   refreshRunner?: (platform: string) => Promise<void> | void
 * }} SessionManagerDependencies
 */

/**
 * SessionManager — file-based session persistence.
 *
 * Implements the {@link SessionStore} port contract:
 * - load(platform)  → object|null
 * - save(platform, session) → boolean
 * - clear(platform) → boolean
 *
 * Used directly by crawlers, auth tools, and the auto-apply system.
 * The session broker accesses this via the SessionStore port for renewal.
 */
export class SessionManager {
  static #defaultInstance = new SessionManager();

  /** @param {SessionManagerDependencies} [dependencies] */
  constructor(dependencies = {}) {
    this.logger = dependencies.logger ?? console;
    this.store = dependencies.store ?? null;
    this.storeFactory = dependencies.storeFactory ?? createStore;
    this.apiFactory = dependencies.apiFactory ?? createAuthenticatedWantedApi;
    this.refreshRunner = dependencies.refreshRunner ?? runCdpSessionExtraction;
  }

  static get logger() {
    return SessionManager.#defaultInstance.logger;
  }

  static set logger(logger) {
    SessionManager.#defaultInstance.logger = logger;
  }

  /** @param {SessionManagerDependencies} [dependencies] */
  static configure(dependencies = {}) {
    SessionManager.#defaultInstance = new SessionManager(dependencies);
    return SessionManager.#defaultInstance;
  }

  static getInstance() {
    return SessionManager.#defaultInstance;
  }

  /** @param {string | null} [platform] */
  static load(platform = null) {
    return SessionManager.#defaultInstance.load(platform);
  }

  /**
   * @param {string} platform
   * @param {unknown} data
   */
  static save(platform, data) {
    return SessionManager.#defaultInstance.save(platform, data);
  }

  /** @param {string | null} [platform] */
  static clear(platform = null) {
    return SessionManager.#defaultInstance.clear(platform);
  }

  static getAPI(platform = 'wanted') {
    return SessionManager.#defaultInstance.getAPI(platform);
  }

  static getStatus() {
    return SessionManager.#defaultInstance.getStatus();
  }

  /** @param {string} platform */
  static checkHealth(platform, thresholdMs = 2 * 60 * 60 * 1000, validateContent = false) {
    return SessionManager.#defaultInstance.checkHealth(platform, thresholdMs, validateContent);
  }

  /**
   * @param {string} platform
   * @param {import('./session-content-validation.js').SessionData} session
   */
  static validateSessionContent(platform, session) {
    return SessionManager.#defaultInstance.validateSessionContent(platform, session);
  }

  /** @param {string} platform */
  static tryRefresh(platform) {
    return SessionManager.#defaultInstance.tryRefresh(platform);
  }

  /** @param {string} platform */
  static isRenewalNeeded(platform, threshold = 0.8) {
    return SessionManager.#defaultInstance.isRenewalNeeded(platform, threshold);
  }

  /** @param {string} platform */
  static getSessionStatus(platform) {
    return SessionManager.#defaultInstance.getSessionStatus(platform);
  }

  /** @param {string} platform */
  static getEncryptedSession(platform) {
    return SessionManager.#defaultInstance.getEncryptedSession(platform);
  }

  /**
   * @param {string} platform
   * @param {string} encryptedData
   */
  static restoreEncryptedSession(platform, encryptedData) {
    return SessionManager.#defaultInstance.restoreEncryptedSession(platform, encryptedData);
  }

  /** @returns {import('./session-storage.js').SessionStoreContract} */
  getStore() {
    if (!this.store) {
      this.store = this.storeFactory(this.logger);
    }
    return /** @type {import('./session-storage.js').SessionStoreContract} */ (this.store);
  }

  /** @param {import('./session-cookie.js').SessionData} session */
  createAuthenticatedApi(session) {
    return this.apiFactory(session);
  }

  /** @param {string} platform */
  runSessionExtraction(platform) {
    return this.refreshRunner(platform);
  }

  /** @type {((platform: string) => UnifiedSessionData | null) & ((platform?: string | null) => Record<string, UnifiedSessionData> | UnifiedSessionData | null)} */
  load =
    /** @type {((platform: string) => UnifiedSessionData | null) & ((platform?: string | null) => Record<string, UnifiedSessionData> | UnifiedSessionData | null)} */ (
      sessionStorageMethods.load
    );

  save = sessionStorageMethods.save;

  clear = sessionStorageMethods.clear;

  getAPI = sessionCookieMethods.getAPI;

  getStatus = sessionExpirationMethods.getStatus;

  checkHealth = sessionExpirationMethods.checkHealth;

  validateSessionContent =
    /** @type {(platform: string, session: import('./session-expiration.js').SessionDataLike) => { valid: boolean; reason: string | null }} */ (
      sessionContentValidationMethods.validateSessionContent
    );

  tryRefresh = sessionRefreshMethods.tryRefresh;

  isRenewalNeeded = sessionExpirationMethods.isRenewalNeeded;

  getSessionStatus = sessionExpirationMethods.getSessionStatus;

  getEncryptedSession = sessionExportMethods.getEncryptedSession;

  restoreEncryptedSession = sessionExportMethods.restoreEncryptedSession;
}

export default SessionManager;
