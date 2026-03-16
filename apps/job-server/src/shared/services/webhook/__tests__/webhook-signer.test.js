import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { signWebhookPayload, verifyWebhookSignature } from '../webhook-signer.js';

describe('webhook-signer', () => {
  describe('signWebhookPayload()', () => {
    it('returns signature in t=<ts>,v1=<hmac> format', () => {
      const payload = JSON.stringify({ event: 'test' });
      const { signature, timestamp } = signWebhookPayload(payload, 'secret', 1700000000);

      assert.equal(timestamp, 1700000000);
      assert.match(signature, /^t=1700000000,v1=[a-f0-9]{64}$/);
    });

    it('is deterministic with fixed timestamp', () => {
      const payload = JSON.stringify({ event: 'deterministic' });
      const first = signWebhookPayload(payload, 'secret', 1700000000);
      const second = signWebhookPayload(payload, 'secret', 1700000000);

      assert.equal(first.signature, second.signature);
      assert.equal(first.timestamp, second.timestamp);
    });

    it('produces different signatures for different payloads', () => {
      const first = signWebhookPayload('{"a":1}', 'secret', 1700000000);
      const second = signWebhookPayload('{"a":2}', 'secret', 1700000000);

      assert.notEqual(first.signature, second.signature);
    });

    it('produces different signatures for different secrets', () => {
      const payload = '{"a":1}';
      const first = signWebhookPayload(payload, 'secret-a', 1700000000);
      const second = signWebhookPayload(payload, 'secret-b', 1700000000);

      assert.notEqual(first.signature, second.signature);
    });
  });

  describe('verifyWebhookSignature()', () => {
    it('accepts a valid roundtrip signature', () => {
      const payload = JSON.stringify({ event: 'roundtrip', ok: true });
      const secret = 'roundtrip-secret';
      const nowTs = Math.floor(Date.now() / 1000);
      const { signature } = signWebhookPayload(payload, secret, nowTs);

      const result = verifyWebhookSignature(payload, signature, secret);
      assert.deepEqual(result, { valid: true });
    });

    it('rejects expired signatures', () => {
      const payload = JSON.stringify({ event: 'expired' });
      const secret = 'secret';
      const oldTimestamp = Math.floor(Date.now() / 1000) - 600;
      const { signature } = signWebhookPayload(payload, secret, oldTimestamp);

      const result = verifyWebhookSignature(payload, signature, secret, 300);
      assert.equal(result.valid, false);
      assert.equal(result.error, 'Signature expired');
    });

    it('rejects malformed signatures', () => {
      const payload = JSON.stringify({ event: 'malformed' });
      const result = verifyWebhookSignature(payload, 'invalid-format', 'secret');

      assert.equal(result.valid, false);
      assert.equal(result.error, 'Invalid signature format');
    });

    it('rejects signatures with wrong secret', () => {
      const payload = JSON.stringify({ event: 'wrong-secret' });
      const nowTs = Math.floor(Date.now() / 1000);
      const { signature } = signWebhookPayload(payload, 'secret-a', nowTs);

      const result = verifyWebhookSignature(payload, signature, 'secret-b');
      assert.equal(result.valid, false);
      assert.equal(result.error, 'Invalid signature');
    });

    it('detects payload tampering', () => {
      const originalPayload = JSON.stringify({ event: 'tamper', value: 1 });
      const tamperedPayload = JSON.stringify({ event: 'tamper', value: 2 });
      const secret = 'tamper-secret';
      const nowTs = Math.floor(Date.now() / 1000);
      const { signature } = signWebhookPayload(originalPayload, secret, nowTs);

      const result = verifyWebhookSignature(tamperedPayload, signature, secret);
      assert.equal(result.valid, false);
      assert.equal(result.error, 'Invalid signature');
    });
  });
});
