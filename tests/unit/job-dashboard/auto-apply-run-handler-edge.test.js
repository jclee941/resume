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
