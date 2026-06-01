import { decryptAes256Gcm, deriveAes256GcmKey, encryptAes256Gcm } from '@resume/shared/crypto';

/**
 * Credential manager for platform-specific authentication.
 * Encrypts credentials at rest using AES-256-GCM.
 */

const _AUTH_TAG_LENGTH = 16; // Used implicitly by AES-256-GCM

// Issue #16: closure-bound holder eliminates top-level mutable Map binding.
/** @type {{ get: () => Map, clear: () => void }} */
const _credentialStoreHolder = (() => {
  let m = new Map();
  return {
    get: () => m,
    clear: () => {
      m = new Map();
    },
  };
})();

/**
 * Derive encryption key from environment secret.
 * @param {string} [secret] - Encryption secret (defaults to ENCRYPTION_KEY env var)
 * @returns {Buffer} 32-byte key
 */
function deriveKey(secret) {
  return deriveAes256GcmKey(secret);
}

/**
 * Store encrypted credentials for a platform.
 * @param {string} platform - Platform identifier
 * @param {Object} credentials - Credentials to store (username, password, apiKey, etc.)
 * @param {string} [encryptionSecret] - Optional encryption secret override
 */
export function storeCredentials(platform, credentials, encryptionSecret) {
  const key = deriveKey(encryptionSecret);
  const plaintext = JSON.stringify(credentials);
  const { encrypted, iv, tag } = encryptAes256Gcm(plaintext, { key });

  _credentialStoreHolder.get().set(platform, { encrypted, iv, tag });
}

/**
 * Retrieve and decrypt credentials for a platform.
 * @param {string} platform - Platform identifier
 * @param {string} [encryptionSecret] - Optional encryption secret override
 * @returns {Object|null} Decrypted credentials or null if not found
 */
export function getCredentials(platform, encryptionSecret, { logger = console } = {}) {
  const entry = _credentialStoreHolder.get().get(platform);
  if (!entry) return null;

  try {
    const key = deriveKey(encryptionSecret);
    return JSON.parse(decryptAes256Gcm(entry, { key }));
  } catch (e) {
    logger.error('Failed to decrypt credentials:', e);
    return null;
  }
}

/**
 * Check if credentials exist for a platform.
 * @param {string} platform - Platform identifier
 * @returns {boolean}
 */
export function hasCredentials(platform) {
  return _credentialStoreHolder.get().has(platform);
}

/**
 * Remove credentials for a platform.
 * @param {string} platform - Platform identifier
 * @returns {boolean}
 */
export function removeCredentials(platform) {
  return _credentialStoreHolder.get().delete(platform);
}

/**
 * List platforms with stored credentials.
 * @returns {string[]}
 */
export function listCredentialPlatforms() {
  return [..._credentialStoreHolder.get().keys()];
}

/**
 * Load credentials from environment variables.
 * Convention: {PLATFORM}_USERNAME, {PLATFORM}_PASSWORD, {PLATFORM}_API_KEY
 * @param {string} platform - Platform identifier
 * @param {string} [encryptionSecret] - Optional encryption secret
 * @returns {boolean} True if any credentials were loaded
 */
export function loadFromEnv(platform, encryptionSecret) {
  const prefix = platform.toUpperCase().replace(/-/g, '_');
  const credentials = {};
  let found = false;

  for (const suffix of ['USERNAME', 'PASSWORD', 'API_KEY', 'TOKEN', 'SECRET']) {
    const envKey = `${prefix}_${suffix}`;
    if (process.env[envKey]) {
      credentials[suffix.toLowerCase()] = process.env[envKey];
      found = true;
    }
  }

  if (found) {
    storeCredentials(platform, credentials, encryptionSecret);
  }
  return found;
}
