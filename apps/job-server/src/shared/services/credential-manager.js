import { createHash, createCipheriv, createDecipheriv, randomBytes } from 'crypto';

/**
 * Credential manager for platform-specific authentication.
 * Encrypts credentials at rest using AES-256-GCM.
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const _AUTH_TAG_LENGTH = 16; // Used implicitly by AES-256-GCM

/** @type {Map<string, {encrypted: Buffer, iv: Buffer, tag: Buffer}>} */
const credentialStore = new Map();

/**
 * Derive encryption key from environment secret.
 * @param {string} [secret] - Encryption secret (defaults to ENCRYPTION_KEY env var)
 * @returns {Buffer} 32-byte key
 */
function deriveKey(secret) {
  const raw = secret || process.env.ENCRYPTION_KEY || 'default-dev-key-change-in-production';
  return createHash('sha256').update(raw).digest();
}

/**
 * Store encrypted credentials for a platform.
 * @param {string} platform - Platform identifier
 * @param {Object} credentials - Credentials to store (username, password, apiKey, etc.)
 * @param {string} [encryptionSecret] - Optional encryption secret override
 */
export function storeCredentials(platform, credentials, encryptionSecret) {
  const key = deriveKey(encryptionSecret);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const plaintext = JSON.stringify(credentials);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  credentialStore.set(platform, { encrypted, iv, tag });
}

/**
 * Retrieve and decrypt credentials for a platform.
 * @param {string} platform - Platform identifier
 * @param {string} [encryptionSecret] - Optional encryption secret override
 * @returns {Object|null} Decrypted credentials or null if not found
 */
export function getCredentials(platform, encryptionSecret) {
  const entry = credentialStore.get(platform);
  if (!entry) return null;

  try {
    const key = deriveKey(encryptionSecret);
    const decipher = createDecipheriv(ALGORITHM, key, entry.iv);
    decipher.setAuthTag(entry.tag);

    const decrypted = Buffer.concat([decipher.update(entry.encrypted), decipher.final()]);
    return JSON.parse(decrypted.toString('utf8'));
  } catch {
    return null;
  }
}

/**
 * Check if credentials exist for a platform.
 * @param {string} platform - Platform identifier
 * @returns {boolean}
 */
export function hasCredentials(platform) {
  return credentialStore.has(platform);
}

/**
 * Remove credentials for a platform.
 * @param {string} platform - Platform identifier
 * @returns {boolean}
 */
export function removeCredentials(platform) {
  return credentialStore.delete(platform);
}

/**
 * List platforms with stored credentials.
 * @returns {string[]}
 */
export function listCredentialPlatforms() {
  return [...credentialStore.keys()];
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
