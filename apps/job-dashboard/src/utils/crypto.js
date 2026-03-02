const ALGORITHM = 'AES-GCM';
const IV_LENGTH = 12;

async function getKey(env) {
  if (!env?.ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY not configured');
  }

  let keyBytes;
  try {
    keyBytes = Uint8Array.from(atob(env.ENCRYPTION_KEY), (c) =>
      c.charCodeAt(0),
    );
  } catch {
    throw new Error('ENCRYPTION_KEY must be valid base64');
  }

  if (keyBytes.length !== 32) {
    throw new Error(
      `ENCRYPTION_KEY must be exactly 32 bytes (got ${keyBytes.length}). Generate with: openssl rand -base64 32`,
    );
  }

  return crypto.subtle.importKey('raw', keyBytes, ALGORITHM, false, [
    'encrypt',
    'decrypt',
  ]);
}

export async function encrypt(plaintext, env) {
  const key = await getKey(env);
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    encoded,
  );
  const combined = new Uint8Array(IV_LENGTH + ciphertext.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), IV_LENGTH);
  return btoa(String.fromCharCode(...combined));
}

export async function decrypt(ciphertext, env) {
  const key = await getKey(env);
  const combined = Uint8Array.from(atob(ciphertext), (c) => c.charCodeAt(0));
  const iv = combined.slice(0, IV_LENGTH);
  const data = combined.slice(IV_LENGTH);
  const decrypted = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv },
    key,
    data,
  );
  return new TextDecoder().decode(decrypted);
}
