/**
 * @param {string} secret
 * @param {string} runtime
 * @returns {Promise<CryptoKey | null>}
 */
async function importKey(secret, runtime) {
  if (runtime === 'webcrypto') {
    return crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign', 'verify']
    );
  }
  return null;
}

/**
 * @param {string} message
 * @param {string} secret
 * @returns {Promise<string>}
 */
export async function signHmacWebCrypto(message, secret) {
  const key = await importKey(secret, 'webcrypto');
  const signature = await crypto.subtle.sign(
    'HMAC',
    /** @type {CryptoKey} */ (key),
    new TextEncoder().encode(message)
  );
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * @param {string} message
 * @param {string} signature
 * @param {string} secret
 * @returns {Promise<boolean>}
 */
export async function verifyHmacWebCrypto(message, signature, secret) {
  const expected = await signHmacWebCrypto(message, secret);
  return timingSafeEqualString(expected, signature);
}

/**
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
export function timingSafeEqualString(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) {
    return false;
  }
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}
