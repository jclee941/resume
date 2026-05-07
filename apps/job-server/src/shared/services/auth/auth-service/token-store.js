import { randomBytes } from 'crypto';

/**
 * Create a server-side admin session.
 * @param {import('./auth-typedefs.js').SessionStore} store
 * @param {string} email
 * @param {number} sessionTTL
 * @returns {string}
 */
export function createSession(store, email, sessionTTL) {
  const sessionId = randomBytes(32).toString('hex');
  store.sessions.set(sessionId, {
    email,
    expiresAt: Date.now() + sessionTTL,
  });
  return sessionId;
}

/**
 * Issue a CSRF token bound to a session id.
 * @param {import('./auth-typedefs.js').SessionStore} store
 * @param {string} sessionId
 * @returns {string}
 */
export function generateCsrfToken(store, sessionId) {
  const token = randomBytes(32).toString('hex');
  store.csrfTokens.set(sessionId, token);
  return token;
}

/**
 * Remove an admin session and its CSRF token.
 * @param {import('./auth-typedefs.js').SessionStore} store
 * @param {string} sessionId
 * @returns {{success: boolean}}
 */
export function logoutSession(store, sessionId) {
  if (sessionId) {
    store.sessions.delete(sessionId);
    store.csrfTokens.delete(sessionId);
  }
  return { success: true };
}

/**
 * Validate an admin session and evict expired entries.
 * @param {import('./auth-typedefs.js').SessionStore} store
 * @param {string} sessionId
 * @returns {boolean}
 */
export function validateSession(store, sessionId) {
  const session = store.sessions.get(sessionId);
  if (!session) return false;
  if (Date.now() > session.expiresAt) {
    store.sessions.delete(sessionId);
    return false;
  }
  return true;
}
