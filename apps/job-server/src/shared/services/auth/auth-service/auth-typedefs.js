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
 * @typedef {Object} CsrfTokenEntry
 * @property {string} token
 * @property {number} createdAt
 */

/**
 * @typedef {Object} SessionStore
 * @property {Map<string, {email: string, expiresAt: number}>} sessions
 * @property {Map<string, CsrfTokenEntry>} csrfTokens
 */

/**
 * @typedef {Object} PlatformSessionStore
 * @property {(platform?: string|null) => Object|null} load
 * @property {(platform: string, session: Object) => boolean} save
 * @property {(platform?: string|null) => boolean} clear
 * @property {() => Array<Object>} [getStatus]
 * @property {(platform: string, thresholdMs?: number, validateContent?: boolean) => Object} [checkHealth]
 */

/**
 * @typedef {Object} AuthServiceDependencies
 * @property {SessionStore} [store]
 * @property {PlatformSessionStore} [sessionStore]
 */

export {};
