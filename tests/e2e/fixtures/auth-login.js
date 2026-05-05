/**
 * Deterministic fixtures for /api/auth/login E2E (issue #32).
 *
 * No real Google ID tokens. The shapes here mirror what
 * `https://oauth2.googleapis.com/tokeninfo` returns for a valid token; the
 * spec mocks the worker's outgoing call (Layer A) or hits the gated
 * `?_test_mock=1` bypass endpoint (Layer B).
 */

/**
 * Build a Google tokeninfo payload for a given email.
 * Includes the fields the worker reads (`email`, `email_verified`, `aud`,
 * `exp`, `sub`).
 */
export function mockTokenInfoResponse(email, overrides = {}) {
  return {
    iss: 'https://accounts.google.com',
    aud: 'mock-client-id.apps.googleusercontent.com',
    azp: 'mock-client-id.apps.googleusercontent.com',
    sub: '110000000000000000000',
    email,
    email_verified: 'true',
    name: 'Mock User',
    picture: 'https://example.com/photo.jpg',
    iat: String(Math.floor(Date.now() / 1000)),
    exp: String(Math.floor(Date.now() / 1000) + 3600),
    ...overrides,
  };
}

/**
 * Build a JWT-shaped fake ID token. Not signed; the worker's verify path
 * is mocked at the `tokeninfo` boundary so a hand-rolled base64 envelope
 * is sufficient for the request body.
 */
export function validIdTokenPayload(email) {
  const header = { alg: 'RS256', kid: 'fake-kid' };
  const payload = {
    email,
    email_verified: true,
    aud: 'mock-client-id',
    exp: Math.floor(Date.now() / 1000) + 3600,
  };
  const sig = 'sig';
  return [header, payload]
    .map((o) => Buffer.from(JSON.stringify(o)).toString('base64url'))
    .concat(sig)
    .join('.');
}

export function expiredIdTokenPayload(email) {
  const header = { alg: 'RS256', kid: 'fake-kid' };
  const payload = {
    email,
    email_verified: true,
    aud: 'mock-client-id',
    exp: Math.floor(Date.now() / 1000) - 60,
  };
  const sig = 'sig';
  return [header, payload]
    .map((o) => Buffer.from(JSON.stringify(o)).toString('base64url'))
    .concat(sig)
    .join('.');
}
