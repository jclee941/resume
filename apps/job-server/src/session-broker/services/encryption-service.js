import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH_BYTES = 16;
const AUTH_TAG_LENGTH_BYTES = 16;
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;

export class EncryptionService {
  constructor(options = {}) {
    this.ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
    this.now = options.now ?? (() => Date.now());
    this.keyHex = options.key ?? process.env.SESSION_ENCRYPTION_KEY;
    this.key = this.#parseKey(this.keyHex);
  }

  encrypt(data) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throw new TypeError('EncryptionService.encrypt expects a plain object');
    }

    const iv = randomBytes(IV_LENGTH_BYTES);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);
    const payload = JSON.stringify({
      timestamp: this.now(),
      data,
    });

    const ciphertext = Buffer.concat([cipher.update(payload, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return Buffer.concat([iv, authTag, ciphertext]).toString('base64');
  }

  decrypt(encryptedBase64) {
    const payload = this.#decryptPayload(encryptedBase64);
    if (this.#isTimestampExpired(payload.timestamp)) {
      return null;
    }

    return payload.data;
  }

  isExpired(encryptedBase64) {
    const payload = this.#decryptPayload(encryptedBase64);
    return this.#isTimestampExpired(payload.timestamp);
  }

  #decryptPayload(encryptedBase64) {
    if (!encryptedBase64 || typeof encryptedBase64 !== 'string') {
      throw new TypeError('Encrypted payload must be a base64 string');
    }

    const combined = Buffer.from(encryptedBase64, 'base64');
    const minimumLength = IV_LENGTH_BYTES + AUTH_TAG_LENGTH_BYTES + 1;
    if (combined.length < minimumLength) {
      throw new Error('Encrypted payload is malformed');
    }

    const iv = combined.subarray(0, IV_LENGTH_BYTES);
    const authTag = combined.subarray(IV_LENGTH_BYTES, IV_LENGTH_BYTES + AUTH_TAG_LENGTH_BYTES);
    const ciphertext = combined.subarray(IV_LENGTH_BYTES + AUTH_TAG_LENGTH_BYTES);

    const decipher = createDecipheriv(ALGORITHM, this.key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString(
      'utf8'
    );
    const payload = JSON.parse(decrypted);

    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new Error('Decrypted payload is invalid');
    }

    if (typeof payload.timestamp !== 'number' || !Number.isFinite(payload.timestamp)) {
      throw new Error('Decrypted payload is missing timestamp');
    }

    if (!payload.data || typeof payload.data !== 'object' || Array.isArray(payload.data)) {
      throw new Error('Decrypted payload is missing data');
    }

    return payload;
  }

  #isTimestampExpired(timestamp) {
    return this.now() - timestamp >= this.ttlMs;
  }

  #parseKey(keyHex) {
    if (typeof keyHex !== 'string' || !/^[0-9a-fA-F]{64}$/.test(keyHex)) {
      throw new Error('SESSION_ENCRYPTION_KEY must be a 64-character hex string');
    }

    return Buffer.from(keyHex, 'hex');
  }
}

export default EncryptionService;
