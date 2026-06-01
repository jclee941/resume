import assert from 'node:assert';
import { describe, it } from 'node:test';
import { isJwtExpired } from '../jobkorea-handler/jwt-utils.js';

describe('jwt-utils', () => {
  it('returns true when jkat cookie is missing', () => {
    assert.strictEqual(isJwtExpired('session=abc; User=UID='), true);
  });

  it('returns true for an expired JWT', () => {
    const expiredPayload = Buffer.from(
      JSON.stringify({ exp: Math.floor(Date.now() / 1000) - 100 })
    ).toString('base64url');
    const jwt = `header.${expiredPayload}.signature`;
    assert.strictEqual(isJwtExpired(`jkat=${jwt}`), true);
  });

  it('returns false for a valid JWT', () => {
    const futurePayload = Buffer.from(
      JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })
    ).toString('base64url');
    const jwt = `header.${futurePayload}.signature`;
    assert.strictEqual(isJwtExpired(`jkat=${jwt}`), false);
  });

  it('returns true when JWT is within 60-second buffer of expiry', () => {
    const nearExpiryPayload = Buffer.from(
      JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 30 })
    ).toString('base64url');
    const jwt = `header.${nearExpiryPayload}.signature`;
    assert.strictEqual(isJwtExpired(`jkat=${jwt}`), true);
  });
});
