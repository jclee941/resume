export {
  encrypt,
  encrypt as encryptWebCrypto,
  decrypt,
  decrypt as decryptWebCrypto,
} from './webcrypto.js';

export const CRYPTO_ALGORITHMS = Object.freeze({
  WEBCRYPTO_AES_GCM: 'AES-GCM (12-byte IV, base64 wire format) — Cloudflare Workers',
});
