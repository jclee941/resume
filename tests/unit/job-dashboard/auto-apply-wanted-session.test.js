describe('Cloudflare Native Wanted session lookup', () => {
  let getWantedSession;

  beforeAll(async () => {
    ({ getWantedSession } =
      await import('../../../apps/job-dashboard/src/handlers/auto-apply/session-helpers.js'));
  });

  test('uses the OneID cookie minted into auth:wanted', async () => {
    const reads = [];
    const env = {
      SESSIONS: {
        async get(key) {
          reads.push(key);
          return key === 'auth:wanted' ? 'WWW_ONEID_ACCESS_TOKEN=token' : null;
        },
      },
    };

    await expect(getWantedSession(env)).resolves.toBe('WWW_ONEID_ACCESS_TOKEN=token');
    expect(reads[0]).toBe('auth:wanted');
  });
});
