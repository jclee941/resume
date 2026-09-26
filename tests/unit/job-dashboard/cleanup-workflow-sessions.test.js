// Regression: the session sweep parsed every auth:* value as JSON and deleted
// anything that failed to parse, which wiped live cookie and encrypted sessions.
describe('CleanupWorkflow session sweep', () => {
  let CleanupWorkflow;

  beforeAll(async () => {
    jest.unstable_mockModule(
      'cloudflare:workers',
      () => ({
        WorkflowEntrypoint: class {
          constructor(_ctx, env) {
            this.env = env;
          }
        },
      }),
      { virtual: true }
    );
    ({ CleanupWorkflow } = await import('../../../apps/job-dashboard/src/workflows/cleanup.js'));
  });

  test('deletes only expired JSON session records and keeps opaque session values', async () => {
    const values = {
      'auth:wanted': 'b3BhcXVlLWNpcGhlcnRleHQtZml4dHVyZS12YWx1ZS0xMjM0NTY3OA==',
      'auth:jobkorea': 'PLAY_SESSION=abc; path=/',
      'auth:legacy-expired': JSON.stringify({ expiresAt: '2000-01-01T00:00:00.000Z' }),
      'auth:legacy-active': JSON.stringify({ expiresAt: '2999-01-01T00:00:00.000Z' }),
      'auth:malformed': '{not json',
    };
    const deleted = [];
    const statement = {
      bind: () => statement,
      first: async () => ({ count: 0 }),
      run: async () => ({ meta: { changes: 0 } }),
    };
    const env = {
      SESSIONS: {
        list: async () => ({ keys: Object.keys(values).map((name) => ({ name })) }),
        get: async (key) => values[key],
        delete: async (key) => {
          deleted.push(key);
        },
      },
      JOB_DB: { prepare: () => statement },
      RATE_LIMIT_KV: { list: async () => ({ keys: [] }), delete: async () => {} },
    };
    const step = { do: (_name, _config, fn) => fn() };

    const result = await new CleanupWorkflow({}, env).run({ payload: {} }, step);

    expect(deleted).toEqual(['auth:legacy-expired']);
    expect(result.deleted.sessions).toBe(1);
  });
});
