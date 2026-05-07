import { decrypt } from '@resume/shared/crypto';

/**
 * Validate an encrypted platform session from KV.
 *
 * @param {Object} env
 * @param {string} session
 * @returns {Promise<boolean>}
 */
export async function validateSession(env, session) {
  try {
    const decrypted = await decrypt(session, env);
    const parsed = JSON.parse(decrypted);
    if (!parsed.expiresAt) return true;
    return new Date(parsed.expiresAt) > new Date();
  } catch {
    return false;
  }
}
