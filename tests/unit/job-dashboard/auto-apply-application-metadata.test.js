const {
  createClients,
  createMockDb,
  createRequest,
  makeJob,
  parseJson,
} = require('./auto-apply-run-handler-fixtures.js');

describe('job-dashboard auto-apply application metadata', () => {
  let runAutoApply;

  beforeAll(async () => {
    ({ runAutoApply } =
      await import('../../../apps/job-dashboard/src/handlers/auto-apply/run-handler.js'));
  });

  test('runAutoApply records auto-apply metadata in the applications table', async () => {
    const db = createMockDb();
    const clients = createClients(makeJob({ adapterBacked: true }));
    const response = await runAutoApply({
      request: createRequest({ dryRun: true, platforms: ['wanted'], runId: 'run-auto-apply-1' }),
      env: { DB: db },
      clients,
    });
    const body = await parseJson(response);
    const recorded = db.recorded[0];

    expect(body.runId).toBe('run-auto-apply-1');
    expect(recorded).toBeDefined();
    expect(recorded.slice(15, 22)).toEqual([
      'run-auto-apply-1',
      1,
      'would_apply',
      1,
      expect.any(String),
      null,
      null,
    ]);
    expect(JSON.parse(recorded[19])).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ stage: 'dry_run_recorded', outcome: 'would_apply' }),
      ])
    );
  });
});
