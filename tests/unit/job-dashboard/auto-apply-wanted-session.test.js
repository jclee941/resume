const { TEST_ENCRYPTION_KEY, encryptSession } = require('./platform-session-fixtures.js');

describe('Cloudflare Native Wanted session lookup', () => {
  let getWantedSession;

  beforeAll(async () => {
    ({ getWantedSession } =
      await import('../../../apps/job-dashboard/src/handlers/auto-apply/session-helpers.js'));
  });

  function envWith(value) {
    const reads = [];
    return {
      reads,
      ENCRYPTION_KEY: TEST_ENCRYPTION_KEY,
      SESSIONS: {
        async get(key) {
          reads.push(key);
          return key === 'auth:wanted' ? value : null;
        },
      },
    };
  }

  test('decrypts the OneID cookie minted into auth:wanted', async () => {
    const env = envWith(await encryptSession('WWW_ONEID_ACCESS_TOKEN=token'));

    await expect(getWantedSession(env)).resolves.toBe('WWW_ONEID_ACCESS_TOKEN=token');
    expect(env.reads).toEqual(['auth:wanted']);
  });

  test('treats a legacy plaintext auth:wanted value as missing', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const env = envWith('WWW_ONEID_ACCESS_TOKEN=token');

    await expect(getWantedSession(env)).resolves.toBeNull();
    expect(env.reads).toEqual(['auth:wanted']);
    warn.mockRestore();
  });
});
