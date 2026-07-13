import { decrypt } from '@resume/shared/crypto';

export async function resolveWantedSession(env, encryptedSession) {
  try {
    const decrypted = await decrypt(encryptedSession, env);
    let value;
    try {
      value = JSON.parse(decrypted);
    } catch {
      value = decrypted;
    }

    const cookies = typeof value === 'string' ? value.trim() : value?.cookies?.trim();
    if (!cookies) return { cookies: '', sessionValid: false };

    const expiresAt = typeof value === 'object' ? (value.expiresAt ?? value.expires_at) : null;
    if (expiresAt !== null && expiresAt !== undefined) {
      const expiry = new Date(expiresAt).getTime();
      if (!Number.isFinite(expiry) || expiry <= Date.now()) {
        return { cookies: '', sessionValid: false };
      }
    }
    return { cookies, sessionValid: true };
  } catch {
    return { cookies: '', sessionValid: false };
  }
}

/**
 * Validate an encrypted platform session from KV.
 *
 * @param {Object} env
 * @param {string} session
 * @returns {Promise<boolean>}
 */
export async function validateSession(env, session) {
  return (await resolveWantedSession(env, session)).sessionValid;
}
