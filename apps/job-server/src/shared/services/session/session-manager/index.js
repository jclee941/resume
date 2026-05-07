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

  static configure(dependencies = {}) {
    SessionManager.#defaultInstance = new SessionManager(dependencies);
    return SessionManager.#defaultInstance;
  }

  static getInstance() {
    return SessionManager.#defaultInstance;
  }

  static load(platform = null) {
    return SessionManager.#defaultInstance.load(platform);
  }

  static save(platform, data) {
    return SessionManager.#defaultInstance.save(platform, data);
  }

  static clear(platform = null) {
    return SessionManager.#defaultInstance.clear(platform);
  }

  static getAPI(platform = 'wanted') {
    return SessionManager.#defaultInstance.getAPI(platform);
  }

  static getStatus() {
    return SessionManager.#defaultInstance.getStatus();
  }

  static checkHealth(platform, thresholdMs = 2 * 60 * 60 * 1000, validateContent = false) {
    return SessionManager.#defaultInstance.checkHealth(platform, thresholdMs, validateContent);
  }

  static validateSessionContent(platform, session) {
    return SessionManager.#defaultInstance.validateSessionContent(platform, session);
  }

  static tryRefresh(platform) {
    return SessionManager.#defaultInstance.tryRefresh(platform);
  }

  static isRenewalNeeded(platform, threshold = 0.8) {
    return SessionManager.#defaultInstance.isRenewalNeeded(platform, threshold);
  }

  static getSessionStatus(platform) {
    return SessionManager.#defaultInstance.getSessionStatus(platform);
  }

  static getEncryptedSession(platform) {
    return SessionManager.#defaultInstance.getEncryptedSession(platform);
  }

  static restoreEncryptedSession(platform, encryptedData) {
    return SessionManager.#defaultInstance.restoreEncryptedSession(platform, encryptedData);
  }

  getStore() {
    if (!this.store) {
      this.store = this.storeFactory(this.logger);
    }
    return this.store;
  }

  createAuthenticatedApi(session) {
    return this.apiFactory(session);
  }

  runSessionExtraction(platform) {
    return this.refreshRunner(platform);
  }

  load = sessionStorageMethods.load;

  save = sessionStorageMethods.save;

  clear = sessionStorageMethods.clear;

  getAPI = sessionCookieMethods.getAPI;

  getStatus = sessionExpirationMethods.getStatus;

  checkHealth = sessionExpirationMethods.checkHealth;

  validateSessionContent = sessionContentValidationMethods.validateSessionContent;

  tryRefresh = sessionRefreshMethods.tryRefresh;

  isRenewalNeeded = sessionExpirationMethods.isRenewalNeeded;

  getSessionStatus = sessionExpirationMethods.getSessionStatus;

  getEncryptedSession = sessionExportMethods.getEncryptedSession;

  restoreEncryptedSession = sessionExportMethods.restoreEncryptedSession;
}

export default SessionManager;
