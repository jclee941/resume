export {
  encrypt as encryptWebCrypto,
  decrypt as decryptWebCrypto,
} from './webcrypto.js';

export {
  EncryptionService as NodeEncryptionService,
} from './node.js';

export const CRYPTO_ALGORITHMS = Object.freeze({
  WEBCRYPTO_AES_GCM: 'AES-GCM (12-byte IV, base64 wire format) — Cloudflare Workers',
  NODE_AES_256_GCM: 'aes-256-gcm (16-byte IV + 16-byte authTag, hex key) — Node.js',
});
