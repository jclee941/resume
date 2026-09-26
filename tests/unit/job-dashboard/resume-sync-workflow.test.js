const { TEST_ENCRYPTION_KEY, encryptSession } = require('./platform-session-fixtures.js');

let wantedSession;

beforeAll(async () => {
  wantedSession = await encryptSession('WWW_ONEID_ACCESS_TOKEN=test');
});

// Regression: the 0 21 * * * cron starts ResumeSyncWorkflow without resumeId, which
// made D1 reject bind(undefined) on every run. Platform calls must use the stored
// Wanted target resume ID, not the master key.
describe('ResumeSyncWorkflow resume identifiers', () => {
  let ResumeSyncWorkflow;
  let originalFetch;

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
    ({ ResumeSyncWorkflow } =
      await import('../../../apps/job-dashboard/src/workflows/resume-sync.js'));
  });

  beforeEach(() => {
    originalFetch = global.fetch;
    global.fetch = jest.fn(async () => Response.json({ careers: [], skills: [] }));
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  function createEnv({ targetResumeId = 'W-100' } = {}) {
    const binds = [];
    const row = {
      data: JSON.stringify({ careers: [], skills: [] }),
      target_resume_id: targetResumeId,
    };
    return {
      binds,
      JOB_DB: {
        prepare: () => ({
          bind: (...values) => {
            binds.push(values);
            return { first: async () => row };
          },
        }),
      },
      ENCRYPTION_KEY: TEST_ENCRYPTION_KEY,
      SESSIONS: { get: async () => wantedSession },
    };
  }

  function run(env, payload) {
    const step = { do: (_name, _config, fn) => fn(), sleep: async () => {} };
    return new ResumeSyncWorkflow({}, env).run({ instanceId: 'sync-1', payload }, step);
  }

  test('cron payload defaults to the master resume and exports the stored Wanted target', async () => {
    const env = createEnv();

    const result = await run(env, { sections: ['all'], dryRun: true, source: 'cron' });

    expect(result).toMatchObject({ success: true, dryRun: true });
    expect(env.binds[0]).toEqual(['master']);
    expect(global.fetch.mock.calls[0][0]).toBe(
      'https://www.wanted.co.kr/api/chaos/resumes/v1/W-100'
    );
  });

  test('explicit targetResumeId overrides the stored target', async () => {
    const env = createEnv();

    await run(env, { resumeId: 'master', targetResumeId: 'W-200', dryRun: true });

    expect(global.fetch.mock.calls[0][0]).toBe(
      'https://www.wanted.co.kr/api/chaos/resumes/v1/W-200'
    );
  });

  test('missing Wanted target fails with an actionable error instead of calling Wanted', async () => {
    const env = createEnv({ targetResumeId: null });

    await expect(run(env, { dryRun: true })).rejects.toThrow('No Wanted resume ID');
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
