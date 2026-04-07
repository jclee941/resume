import assert from 'node:assert/strict';
import { describe, it, beforeEach } from 'node:test';

import EncryptionService from '../services/encryption-service.js';

const VALID_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

describe('EncryptionService', () => {
  beforeEach(() => {
    process.env.SESSION_ENCRYPTION_KEY = VALID_KEY;
  });

  it('encrypts and decrypts payloads back to the original data', () => {
    const service = new EncryptionService();
    const payload = {
      platform: 'wanted',
      sessionId: 'session-123',
      cookies: ['a=1', 'b=2'],
    };

    const encrypted = service.encrypt(payload);

    assert.equal(typeof encrypted, 'string');
    assert.deepEqual(service.decrypt(encrypted), payload);
    assert.equal(service.isExpired(encrypted), false);
  });

  it('throws when the session encryption key is invalid', () => {
    process.env.SESSION_ENCRYPTION_KEY = 'bad-key';

    assert.throws(
      () => new EncryptionService(),
      /SESSION_ENCRYPTION_KEY must be a 64-character hex string/
    );
  });

  it('fails authentication when ciphertext is tampered with', () => {
    const service = new EncryptionService();
    const encrypted = service.encrypt({ platform: 'wanted', token: 'secret' });
    const tampered = Buffer.from(encrypted, 'base64');
    tampered[tampered.length - 1] ^= 0xff;

    assert.throws(
      () => service.decrypt(tampered.toString('base64')),
      /Unsupported state or unable to authenticate data/
    );
  });

  it('returns null for expired sessions', () => {
    const service = new EncryptionService({
      ttlMs: 1,
      now: (() => {
        let current = 1_000;
        return () => current++;
      })(),
    });
    const encrypted = service.encrypt({ platform: 'wanted', token: 'secret' });

    assert.equal(service.isExpired(encrypted), true);
    assert.equal(service.decrypt(encrypted), null);
  });
});
