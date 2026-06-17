const {
  createRequest,
  makeApprovalIdOnlyBody,
  makeJob,
  makeRealSubmitBody,
  parseJson,
} = require('./auto-apply-run-handler-fixtures.js');

const makeStatement = (handler) => ({
  bind: (...params) => handler(...params),
});

function createMockDb() {
  const recorded = [];
  return {
    recorded,
    prepare(query) {
      if (query.includes('SELECT key, value FROM config')) {
        return makeStatement(() => ({
          all: async () => ({
            results: [
              { key: 'auto_apply_enabled', value: 'true' },
              { key: 'max_daily_applications', value: '5' },
              { key: 'min_match_score', value: '1' },
              { key: 'auto_apply_keywords', value: JSON.stringify(['DevOps']) },
            ],
          }),
        }));
      }

      if (query.includes('COUNT(*) as count')) {
        return makeStatement(() => ({
          first: async () => ({ count: 0 }),
        }));
      }

      if (query.includes('SELECT id FROM applications')) {
        return makeStatement(() => ({
          first: async () => null,
        }));
      }

      if (query.includes('INSERT INTO applications')) {
        return makeStatement((...params) => ({
          run: async () => {
            recorded.push(params);
          },
        }));
      }

      throw new Error(`Unexpected query: ${query}`);
    },
  };
}

describe('job-dashboard auto-apply run handler edge cases', () => {
  let runAutoApply;
  let consoleError;

  beforeAll(async () => {
    ({ runAutoApply } =
      await import('../../../apps/job-dashboard/src/handlers/auto-apply/run-handler.js'));
  });

  beforeEach(() => {
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  test('runAutoApply counts downstream search failures in results', async () => {
    const clients = {
      wanted: {
        setCookies: jest.fn(),
        searchJobs: jest.fn(async () => {
          throw new Error('search unavailable');
        }),
      },
    };

    const response = await runAutoApply({
      request: createRequest({ dryRun: true, platforms: ['wanted'] }),
      env: { DB: createMockDb() },
      clients,
    });
    const body = await parseJson(response);

    expect(body.success).toBe(true);
    expect(body.results.errors).toBe(1);
    expect(body.results.jobs).toEqual([]);
    expect(consoleError).toHaveBeenCalledWith(
      expect.stringContaining('wanted search failed'),
      'search unavailable'
    );
  });

  test('runAutoApply returns a skipped decision when real wanted apply has no session', async () => {
    const clients = {
      wanted: {
        setCookies: jest.fn(),
        searchJobs: jest.fn(async () => ({ jobs: [makeJob()] })),
        apply: jest.fn(async () => ({ success: true })),
      },
    };

    const response = await runAutoApply({
      request: createRequest(makeRealSubmitBody()),
      env: { DB: createMockDb() },
      clients,
    });
    const body = await parseJson(response);

    expect(body.success).toBe(true);
    expect(body.results).toMatchObject({ applied: 0, skipped: 1, errors: 0 });
    expect(body.results.jobs).toHaveLength(1);
    expect(body.results.jobs[0]).toMatchObject({
      id: 'job-1',
      source: 'wanted',
      action: 'skipped_no_session',
      decisionTrace: expect.arrayContaining([
        expect.objectContaining({
          stage: 'session_checked',
          outcome: 'skipped',
          reason: 'missing_wanted_session',
        }),
      ]),
    });
    expect(clients.wanted.apply).not.toHaveBeenCalled();
  });

  test('runAutoApply requires human approval before real wanted apply with a session', async () => {
    const clients = {
      wanted: {
        setCookies: jest.fn(),
        searchJobs: jest.fn(async () => ({ jobs: [makeJob()] })),
        apply: jest.fn(async () => ({ success: true })),
      },
    };

    const response = await runAutoApply({
      request: createRequest(makeApprovalIdOnlyBody()),
      env: {
        DB: createMockDb(),
        SESSIONS: {
          get: jest.fn(async () => 'wanted-cookie=value'),
        },
      },
      clients,
    });
    const body = await parseJson(response);

    expect(body.success).toBe(true);
    expect(body.results).toMatchObject({ applied: 0, skipped: 1, errors: 0 });
    expect(body.results.jobs[0]).toMatchObject({
      action: 'skipped_human_approval_required',
      decisionTrace: expect.arrayContaining([
        expect.objectContaining({
          stage: 'session_checked',
          outcome: 'passed',
          reason: 'wanted_session_available',
        }),
        expect.objectContaining({
          stage: 'human_approval_checked',
          outcome: 'skipped',
          reason: 'missing_explicit_human_approval',
        }),
      ]),
    });
    expect(clients.wanted.apply).not.toHaveBeenCalled();
  });
});
