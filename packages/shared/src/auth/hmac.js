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

export async function signHmacWebCrypto(message, secret) {
  const key = await importKey(secret, 'webcrypto');
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function verifyHmacWebCrypto(message, signature, secret) {
  const expected = await signHmacWebCrypto(message, secret);
  return timingSafeEqualString(expected, signature);
}

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
