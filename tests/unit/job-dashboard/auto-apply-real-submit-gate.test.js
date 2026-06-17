const {
  createClients,
  createMockDb,
  createRequest,
  makeJob,
  parseJson,
} = require('./auto-apply-run-handler-fixtures.js');

describe('job-dashboard auto-apply real submit gate', () => {
  let runAutoApply;

  beforeAll(async () => {
    ({ runAutoApply } =
      await import('../../../apps/job-dashboard/src/handlers/auto-apply/run-handler.js'));
  });

  test('rejects real submit before search without explicit approval gate', async () => {
    const clients = createClients(makeJob());
    const response = await runAutoApply({
      request: createRequest({ dryRun: false, platforms: ['wanted'] }),
      env: { DB: createMockDb() },
      clients,
    });
    const body = await parseJson(response);

    expect(response.status).toBe(400);
    expect(body).toMatchObject({
      success: false,
      errorCode: 'REAL_SUBMIT_APPROVAL_REQUIRED',
    });
    expect(clients.wanted.searchJobs).not.toHaveBeenCalled();
    expect(clients.applyCalls).toHaveLength(0);
  });
});
