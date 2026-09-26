/**
 * @fileoverview Platform session cookies stored in KV SESSIONS as
 * `auth:<platform>`. Values are AES-GCM encrypted at rest with ENCRYPTION_KEY
 * (`@resume/shared/crypto`) and every read decrypts. A value that does not
 * decrypt (legacy plaintext, corrupt data, rotated key) is treated as absent so
 * callers re-mint a session instead of sending it upstream.
 * @module services/platform-session
 */
import { decrypt, encrypt } from '@resume/shared/crypto';

export function platformSessionKey(platform) {
  return `auth:${platform}`;
}

/**
 * @param {{ SESSIONS: { put: Function }, ENCRYPTION_KEY?: string }} env
 * @param {string} platform
 * @param {string} value cookie header or serialized session JSON
 * @param {number} ttlSeconds
 * @returns {Promise<void>}
 */
export async function writePlatformSession(env, platform, value, ttlSeconds) {
  const ciphertext = await encrypt(value, env);
  await env.SESSIONS.put(platformSessionKey(platform), ciphertext, {
    expirationTtl: ttlSeconds,
  });
}

/**
 * @param {unknown} stored raw KV value
 * @param {{ ENCRYPTION_KEY?: string }} env
 * @param {string} [label] KV key named in the warning (never the value)
 * @returns {Promise<string|null>} plaintext, or null when absent or undecryptable
 */
export async function decryptPlatformSession(stored, env, label = 'platform session') {
  if (typeof stored !== 'string' || stored.length === 0) return null;
  try {
    return await decrypt(stored, env);
  } catch (error) {
    console.warn(
      `[platform-session] ${label} is not decryptable with ENCRYPTION_KEY; treating it as absent: ${error?.message || error}`
    );
    return null;
  }
}

/**
 * @param {{ SESSIONS?: { get: Function }, ENCRYPTION_KEY?: string }} env
 * @param {string} platform
 * @returns {Promise<string|null>}
 */
export async function readPlatformSession(env, platform) {
  const key = platformSessionKey(platform);
  const stored = await env?.SESSIONS?.get?.(key);
  return decryptPlatformSession(stored, env, key);
}
