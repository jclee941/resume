import { createHmac } from 'crypto';

/**
 * Signs a webhook payload using HMAC-SHA256.
 * Format: t=<unix_timestamp>,v1=<hmac_hex>
 *
 * @param {string} payload - JSON string payload to sign
 * @param {string} secret - HMAC secret key
 * @param {number} [timestamp] - Unix timestamp (defaults to Date.now()/1000)
 * @returns {{ signature: string, timestamp: number }}
 */
export function signWebhookPayload(payload, secret, timestamp) {
  const ts = timestamp || Math.floor(Date.now() / 1000);
  const signedContent = `${ts}.${payload}`;
  const hmac = createHmac('sha256', secret).update(signedContent).digest('hex');
  return {
    signature: `t=${ts},v1=${hmac}`,
    timestamp: ts,
  };
}

/**
 * Verifies a webhook signature.
 * @param {string} payload - JSON string payload
 * @param {string} signature - Signature header value (t=...,v1=...)
 * @param {string} secret - HMAC secret
 * @param {number} [maxAgeSeconds=300] - Maximum age in seconds (default 5 min)
 * @returns {{ valid: boolean, error?: string }}
 */
export function verifyWebhookSignature(payload, signature, secret, maxAgeSeconds = 300) {
  if (typeof signature !== 'string') {
    return { valid: false, error: 'Invalid signature format' };
  }

  const match = signature.match(/^t=(\d+),v1=([a-f0-9]+)$/);
  if (!match) {
    return { valid: false, error: 'Invalid signature format' };
  }

  const [, ts, receivedHmac] = match;
  const timestamp = parseInt(ts, 10);
  const now = Math.floor(Date.now() / 1000);

  if (now - timestamp > maxAgeSeconds) {
    return { valid: false, error: 'Signature expired' };
  }

  const signedContent = `${timestamp}.${payload}`;
  const expectedHmac = createHmac('sha256', secret).update(signedContent).digest('hex');

  if (receivedHmac.length !== expectedHmac.length) {
    return { valid: false, error: 'Invalid signature' };
  }

  let result = 0;
  for (let i = 0; i < receivedHmac.length; i++) {
    result |= receivedHmac.charCodeAt(i) ^ expectedHmac.charCodeAt(i);
  }

  return result === 0 ? { valid: true } : { valid: false, error: 'Invalid signature' };
}
