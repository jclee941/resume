const { TEST_ENCRYPTION_KEY, encryptSession } = require('./platform-session-fixtures.js');

let wantedSession;

beforeAll(async () => {
  wantedSession = await encryptSession('wanted-cookie=value');
});

const {
  createMockDb,
  createRequest,
  makeApprovalIdOnlyBody,
  makeJob,
  makeRealSubmitBody,
  parseJson,
} = require('./auto-apply-run-handler-fixtures.js');

describe('job-dashboard auto-apply run handler edge cases', () => {
  let runAutoApply;

  beforeAll(async () => {
    ({ runAutoApply } =
      await import('../../../apps/job-dashboard/src/handlers/auto-apply/run-handler.js'));
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
      env: { JOB_DB: createMockDb() },
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
        JOB_DB: createMockDb(),
        ENCRYPTION_KEY: TEST_ENCRYPTION_KEY,
        SESSIONS: {
          get: jest.fn(async () => wantedSession),
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
