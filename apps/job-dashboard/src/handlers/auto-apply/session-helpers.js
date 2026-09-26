import { readPlatformSession } from '../../services/platform-session.js';

/**
 * Decrypted Wanted cookie header from `auth:wanted`, or null when no usable
 * session is stored.
 * @param {Object} env
 * @returns {Promise<string|null>}
 */
export async function getWantedSession(env) {
  return readPlatformSession(env, 'wanted');
}
