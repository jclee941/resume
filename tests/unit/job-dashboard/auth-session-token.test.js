// Tests for HMAC-signed session tokens (P1-5 fix from MONOREPO_REVIEW_2026-04-29.md).
// `mintSessionToken` + `verifySessionToken` must:
//   - sign payload with env.ADMIN_TOKEN via HMAC-SHA256
//   - reject tampered payloads, expired tokens, malformed strings
//   - succeed on a fresh round-trip
//
// Module under test is ESM; Jest is configured with experimental-vm-modules so
// `import()` works inside CommonJS test files.

describe('auth-service mintSessionToken / verifySessionToken (P1-5)', () => {
  let auth;
  beforeAll(async () => {
    auth = await import('../../../apps/job-dashboard/src/services/auth.js');
  });

  const ENV = { ADMIN_TOKEN: 'super-secret-admin-token-with-enough-length' };

  test('mintSessionToken returns a 3-part dotted token and verifies cleanly', async () => {
    const token = await auth.mintSessionToken(ENV);
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3);

    const result = await auth.verifySessionToken(token, ENV);
    expect(result.ok).toBe(true);
    expect(typeof result.exp).toBe('number');
    expect(result.exp).toBeGreaterThan(Date.now());
  });

  test('rejects token with wrong shape', async () => {
    expect((await auth.verifySessionToken('not.a.valid.token', ENV)).ok).toBe(false);
    expect((await auth.verifySessionToken('only.two', ENV)).ok).toBe(false);
    expect((await auth.verifySessionToken('', ENV)).ok).toBe(false);
    expect((await auth.verifySessionToken(null, ENV)).ok).toBe(false);
    expect((await auth.verifySessionToken(undefined, ENV)).ok).toBe(false);
  });

  test('rejects token with bad signature', async () => {
    const token = await auth.mintSessionToken(ENV);
    const [exp, nonce] = token.split('.');
    const tampered = `${exp}.${nonce}.deadbeef00000000000000000000000000000000000000000000000000000000`;
    const result = await auth.verifySessionToken(tampered, ENV);
    expect(result.ok).toBe(false);
  });

  test('rejects expired token', async () => {
    // mint with negative TTL → already expired
    const token = await auth.mintSessionToken(ENV, -1000);
    const result = await auth.verifySessionToken(token, ENV);
    expect(result.ok).toBe(false);
  });

  test('rejects token signed with different ADMIN_TOKEN', async () => {
    const token = await auth.mintSessionToken(ENV);
    const otherEnv = { ADMIN_TOKEN: 'a-totally-different-secret' };
    const result = await auth.verifySessionToken(token, otherEnv);
    expect(result.ok).toBe(false);
  });

  test('rejects token when env.ADMIN_TOKEN missing', async () => {
    const token = await auth.mintSessionToken(ENV);
    expect((await auth.verifySessionToken(token, {})).ok).toBe(false);
    expect((await auth.verifySessionToken(token, null)).ok).toBe(false);
  });

  test('mintSessionToken throws when ADMIN_TOKEN missing', async () => {
    await expect(auth.mintSessionToken({})).rejects.toThrow('ADMIN_TOKEN not configured');
  });

  test('verifyAdminAuth accepts session token and reports mode=session', async () => {
    const token = await auth.mintSessionToken(ENV);
    const request = new Request('https://example.com/api/applications', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const result = await auth.verifyAdminAuth(request, ENV);
    expect(result.ok).toBe(true);
    expect(result.mode).toBe('session');
    expect(typeof result.exp).toBe('number');
  });

  test('verifyAdminAuth still accepts deprecated legacy raw ADMIN_TOKEN bearer', async () => {
    const request = new Request('https://example.com/api/applications', {
      headers: { Authorization: `Bearer ${ENV.ADMIN_TOKEN}` },
    });
    const result = await auth.verifyAdminAuth(request, ENV);
    expect(result.ok).toBe(true);
    expect(result.mode).toBe('legacy-admin-token');
    expect(result.deprecated).toBe(true);
  });

  test('verifyAdminAuth accepts session token from HttpOnly cookie before bearer fallback', async () => {
    const token = await auth.mintSessionToken(ENV);
    const request = new Request('https://example.com/api/applications', {
      headers: {
        Cookie: `adminToken=${token}`,
        Authorization: `Bearer ${ENV.ADMIN_TOKEN}`,
      },
    });
    const result = await auth.verifyAdminAuth(request, ENV);
    expect(result.ok).toBe(true);
    expect(result.mode).toBe('session');
    expect(result.deprecated).toBeUndefined();
  });

  test('verifyAdminAuth rejects when token absent', async () => {
    const request = new Request('https://example.com/api/applications');
    const result = await auth.verifyAdminAuth(request, ENV);
    expect(result.ok).toBe(false);
    expect(result.status).toBe(401);
  });
});
