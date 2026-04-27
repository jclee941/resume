/**
 * @typedef {Object} PlatformSession
 * @property {string} platform
 * @property {string} cookies
 * @property {string} [token]
 * @property {string} [email]
 * @property {number} expiresAt
 * @property {number} [refreshedAt]
 */

/**
 * @typedef {Object} AdminSession
 * @property {string} userId
 * @property {string} signedAt
 * @property {number} expiresAt
 * @property {string} signature
 */

/**
 * @typedef {Object} WebhookSignature
 * @property {string} algorithm
 * @property {string} signature
 * @property {string} timestamp
 */
