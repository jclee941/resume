const {
  createMockDb,
  createRequest,
  makeJob,
  parseJson,
} = require('./auto-apply-run-handler-fixtures.js');

describe('job-dashboard auto-apply discovery failures', () => {
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

  test('runAutoApply fails when every attempted search fails before collecting jobs', async () => {
    const db = createMockDb();
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
      env: { DB: db },
      clients,
    });
    const body = await parseJson(response);

    expect(response.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.errorCode).toBe('AUTO_APPLY_DISCOVERY_FAILED');
    expect(body.results.errors).toBe(1);
    expect(body.results.jobs).toEqual([]);
    expect(db.recorded).toEqual([]);
    expect(consoleError).toHaveBeenCalledWith(
      expect.stringContaining('wanted search failed'),
      'search unavailable'
    );
  });

  test('runAutoApply preserves partial success when one search returns jobs', async () => {
    const db = createMockDb();
    const clients = {
      wanted: {
        setCookies: jest.fn(),
        searchJobs: jest.fn(async () => {
          throw new Error('wanted search unavailable');
        }),
      },
      linkedin: {
        searchJobs: jest.fn(async () => ({
          jobs: [makeJob({ id: 'linkedin-job-1', sourceId: 'linkedin-job-1', source: 'linkedin' })],
        })),
      },
    };

    const response = await runAutoApply({
      request: createRequest({ dryRun: true, platforms: ['wanted', 'linkedin'] }),
      env: { DB: db },
      clients,
    });
    const body = await parseJson(response);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.results.errors).toBe(1);
    expect(body.results.jobs).toHaveLength(1);
    expect(body.results.jobs[0]).toMatchObject({
      id: 'linkedin-job-1',
      source: 'linkedin',
      action: 'would_apply',
    });
    expect(db.recorded).toHaveLength(1);
  });

  test('runAutoApply preserves successful empty discovery from another platform', async () => {
    const db = createMockDb();
    const clients = {
      wanted: {
        setCookies: jest.fn(),
        searchJobs: jest.fn(async () => {
          throw new Error('wanted search unavailable');
        }),
      },
      linkedin: {
        searchJobs: jest.fn(async () => ({ jobs: [] })),
      },
    };

    const response = await runAutoApply({
      request: createRequest({ dryRun: true, platforms: ['wanted', 'linkedin'] }),
      env: { DB: db },
      clients,
    });
    const body = await parseJson(response);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.results).toMatchObject({
      errors: 1,
      searchAttempts: 2,
      searchFailures: 1,
      jobs: [],
    });
    expect(db.recorded).toEqual([]);
  });
});
