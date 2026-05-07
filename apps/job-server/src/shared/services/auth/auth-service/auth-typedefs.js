/**
 * @typedef {Object} AuthConfig
 * @property {string} googleClientId
 * @property {string} adminEmail
 * @property {number} [sessionTTL=86400000] - Session TTL in ms (default 24h)
 * @property {{error: Function}} [logger]
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

export {};
