import { sessionCookieMethods } from './session-cookie.js';
import { sessionContentValidationMethods } from './session-content-validation.js';
import { sessionExpirationMethods } from './session-expiration.js';
import { sessionExportMethods } from './session-export.js';
import { sessionRefreshMethods } from './session-refresh.js';
import { sessionStorageMethods } from './session-storage.js';

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
  static logger = console;

  static load = sessionStorageMethods.load;

  static save = sessionStorageMethods.save;

  static clear = sessionStorageMethods.clear;

  static getAPI = sessionCookieMethods.getAPI;

  static getStatus = sessionExpirationMethods.getStatus;

  static checkHealth = sessionExpirationMethods.checkHealth;

  static validateSessionContent = sessionContentValidationMethods.validateSessionContent;

  static tryRefresh = sessionRefreshMethods.tryRefresh;

  static isRenewalNeeded = sessionExpirationMethods.isRenewalNeeded;

  static getSessionStatus = sessionExpirationMethods.getSessionStatus;

  static getEncryptedSession = sessionExportMethods.getEncryptedSession;

  static restoreEncryptedSession = sessionExportMethods.restoreEncryptedSession;
}

export default SessionManager;
