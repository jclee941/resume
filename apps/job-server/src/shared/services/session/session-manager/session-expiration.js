import { SUPPORTED_SESSION_PLATFORMS, getSessionTtlMs } from '../session-constants.js';

/**
 * @typedef {Object} SessionDataLike
 * @property {number} [timestamp]
 * @property {string | number | Date} [expiresAt]
 * @property {string} [email]
 * @property {Record<string, unknown>} [cookies]
 * @property {Record<string, unknown>} [tokens]
 * @property {unknown} [token]
 * @property {unknown} [cookieString]
 * @property {unknown} [cookiesString]
 */

/**
 * @typedef {object} SessionHealthResult
 * @property {boolean} valid
 * @property {boolean} expiringSoon
 * @property {Date | null} expiresAt
 * @property {string | null} [reason]
 */

/**
 * @typedef {object} SessionStatusResult
 * @property {boolean} exists
 * @property {boolean} valid
 * @property {boolean} needsRenewal
 * @property {SessionDataLike | null} session
 */

/**
 * @typedef {object} PlatformStatusEntry
 * @property {string} platform
 * @property {boolean} authenticated
 * @property {string | null} email
 * @property {string | null} expiresAt
 * @property {string | null} lastUpdated
 */

/**
 * @typedef {Object} SessionExpirationHost
 * @property {((platform?: string) => Record<string, SessionDataLike> | SessionDataLike | null)} load
 * @property {(platform: string, session: SessionDataLike) => { valid: boolean; reason: string | null }} validateSessionContent
 * @property {(platform: string, threshold?: number) => boolean} isRenewalNeeded
 * @property {(platform: string) => SessionStatusResult} getSessionStatus
 */

/**
 * @param {SessionDataLike | null | undefined} session
 * @param {string} platform
 * @returns {Date | null}
 */
function getSessionExpiresAt(session, platform) {
  if (!session?.timestamp) return null;
  return new Date(session.timestamp + getSessionTtlMs(platform));
}

/**
 * @param {SessionDataLike | null | undefined} session
 * @param {string} platform
 * @param {number} [now]
 * @returns {boolean}
 */
function isTimestampValid(session, platform, now = Date.now()) {
  return Boolean(session?.timestamp && now - session.timestamp < getSessionTtlMs(platform));
}

export const sessionExpirationMethods = {
  /**
   * @this {SessionExpirationHost}
   * @returns {PlatformStatusEntry[]}
   */
  getStatus() {
    const sessions = /** @type {Record<string, SessionDataLike> | null} */ (this.load()) || {};

    return SUPPORTED_SESSION_PLATFORMS.map((platform) => {
      const session = sessions[platform];
      const expiresAt = getSessionExpiresAt(session, platform);

      return {
        platform,
        authenticated: isTimestampValid(session, platform),
        email: session?.email || null,
        expiresAt: expiresAt ? expiresAt.toISOString() : null,
        lastUpdated: session?.timestamp ? new Date(session.timestamp).toISOString() : null,
      };
    });
  },

  /**
   * @this {SessionExpirationHost}
   * @param {string} platform
   * @param {number} [thresholdMs]
   * @param {boolean} [validateContent]
   * @returns {SessionHealthResult}
   */
  checkHealth(platform, thresholdMs = 2 * 60 * 60 * 1000, validateContent = false) {
    const session = /** @type {SessionDataLike | null} */ (this.load(platform));
    if (!session || !session.timestamp) {
      return { valid: false, expiringSoon: false, expiresAt: null, reason: 'no_session' };
    }

    const expiresAt = /** @type {Date} */ (getSessionExpiresAt(session, platform));
    const remaining = expiresAt.getTime() - Date.now();
    const timestampValid = remaining > 0;

    if (validateContent && timestampValid) {
      const contentValidation = this.validateSessionContent(platform, session);
      if (!contentValidation.valid) {
        return {
          valid: false,
          expiringSoon: false,
          expiresAt,
          reason: contentValidation.reason,
        };
      }
    }

    return {
      valid: timestampValid,
      expiringSoon: timestampValid && remaining < thresholdMs,
      expiresAt,
    };
  },

  /**
   * @this {SessionExpirationHost}
   * @param {string} platform
   * @param {number} [threshold]
   * @returns {boolean}
   */
  isRenewalNeeded(platform, threshold = 0.8) {
    const session = /** @type {SessionDataLike | null} */ (this.load(platform));
    if (!session || !session.timestamp || !session.expiresAt) {
      return true;
    }

    const now = Date.now();
    const expiresAt = new Date(session.expiresAt).getTime();
    const totalLifetime = expiresAt - session.timestamp;
    const elapsed = now - session.timestamp;

    return elapsed >= totalLifetime * threshold;
  },

  /**
   * @this {SessionExpirationHost}
   * @param {string} platform
   * @returns {SessionStatusResult}
   */
  getSessionStatus(platform) {
    const session = /** @type {SessionDataLike | null} */ (this.load(platform));

    if (!session) {
      return { exists: false, valid: false, needsRenewal: true, session: null };
    }

    return {
      exists: true,
      valid: isTimestampValid(session, platform),
      needsRenewal: this.isRenewalNeeded(platform),
      session,
    };
  },
};
