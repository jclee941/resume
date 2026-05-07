export async function verifyWebhookSignature(request, env) {
  if (!env?.WEBHOOK_SECRET) {
    return { ok: false, status: 503, error: 'Webhook not configured' };
  }

  const signature = request.headers.get('X-Webhook-Signature');
  if (!signature) {
    return { ok: false, status: 403, error: 'Missing signature' };
  }

  const parts = parseSignatureParts(signature);
  if (parts.error) return parts.error;
  if (!parts.t || !parts.v1) {
    return { ok: false, status: 403, error: 'Invalid signature format' };
  }

  const timestamp = parseInt(parts.t, 10);
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > 300) {
    return { ok: false, status: 403, error: 'Signature expired' };
  }

  const body = await request.clone().text();
  const expectedHmac = await signPayload(`${parts.t}.${body}`, env.WEBHOOK_SECRET);
  if (!sameLengthConstantTime(parts.v1, expectedHmac)) {
    return { ok: false, status: 403, error: 'Invalid signature' };
  }

  const nonceResult = await recordNonce(parts, env);
  if (!nonceResult.ok) return nonceResult;
  return { ok: true };
}

function parseSignatureParts(signature) {
  const parts = {};
  for (const part of signature.split(',')) {
    const trimmed = part.trim();
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) return { error: malformed('Malformed signature part') };
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    if (!key || !value) return { error: malformed('Empty key or value in signature') };
    parts[key] = value;
  }
  return parts;
}

function malformed(error) {
  return { ok: false, status: 403, error };
}

async function signPayload(payload, secret) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function sameLengthConstantTime(a, b) {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < b.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

async function recordNonce(parts, env) {
  if (!env.NONCE_KV) return { ok: true };
  const nonceKey = `webhook:nonce:${parts.t}:${parts.v1.slice(0, 16)}`;
  const existing = await env.NONCE_KV.get(nonceKey);
  if (existing) return { ok: false, status: 403, error: 'Replay detected' };
  await env.NONCE_KV.put(nonceKey, '1', { expirationTtl: 600 });
  return { ok: true };
}
