const makeStatement = (handler) => ({
  bind: (...params) => handler(...params),
});

function createMockDb({ alreadyApplied = false } = {}) {
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
        return makeStatement((jobId, source) => ({
          first: async () => (alreadyApplied ? { id: `${source}_${jobId}` } : null),
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

function createClients(job) {
  const applyCalls = [];
  return {
    applyCalls,
    wanted: {
      setCookies: jest.fn(),
      searchJobs: jest.fn(async () => ({ jobs: [job] })),
      apply: jest.fn(async (jobId) => {
        applyCalls.push(jobId);
        return { success: true };
      }),
    },
  };
}

const createRequest = (body) => ({ json: async () => body });
const parseJson = async (response) => JSON.parse(await response.text());

function makeJob(overrides = {}) {
  return {
    id: 'job-1',
    sourceId: 'job-1',
    source: 'wanted',
    position: 'DevOps Engineer',
    company: 'Trace Co',
    sourceUrl: 'https://wanted.co.kr/wd/job-1',
    ...overrides,
  };
}

describe('job-dashboard auto-apply run handler', () => {
  let runAutoApply;

  beforeAll(async () => {
    ({ runAutoApply } =
      await import('../../../apps/job-dashboard/src/handlers/auto-apply/run-handler.js'));
  });

  test('runAutoApply returns decision trace for dry-run matches', async () => {
    const db = createMockDb();
    const clients = createClients(makeJob());

    const response = await runAutoApply({
      request: createRequest({ dryRun: true, platforms: ['wanted'] }),
      env: { DB: db },
      clients,
    });
    const body = await parseJson(response);

    expect(body.success).toBe(true);
    expect(body.results.jobs).toHaveLength(1);
    expect(body.results.jobs[0]).toMatchObject({
      id: 'job-1',
      source: 'wanted',
      action: 'would_apply',
      decisionTrace: [
        expect.objectContaining({ stage: 'discovered', outcome: 'included' }),
        expect.objectContaining({ stage: 'scored', reason: 'score_meets_threshold' }),
        expect.objectContaining({ stage: 'duplicate_checked', reason: 'not_previously_applied' }),
        expect.objectContaining({ stage: 'dry_run_recorded', reason: 'dry_run' }),
      ],
    });
    expect(clients.applyCalls).toHaveLength(0);
  });

  test('runAutoApply preserves existing response contract with decision trace', async () => {
    const job = makeJob({
      position: 'Platform Engineer',
      company: 'Contract Co',
      url: 'https://wanted.co.kr/wd/job-1',
    });
    const response = await runAutoApply({
      request: createRequest({ dryRun: true, platforms: ['wanted'], maxApplications: 3 }),
      env: { DB: createMockDb() },
      clients: createClients(job),
    });
    const body = await parseJson(response);

    expect(body).toMatchObject({
      success: true,
      dryRun: true,
      platforms: ['wanted'],
      config: {
        keywords: ['DevOps'],
        minMatchScore: 1,
        maxDailyApplications: 3,
      },
      todayApplications: 0,
      remaining: 3,
      results: {
        searched: 1,
        matched: 1,
        applied: 1,
        skipped: 0,
        errors: 0,
      },
    });
    expect(body.results.jobs[0]).toMatchObject({
      id: 'job-1',
      source: 'wanted',
      position: 'Platform Engineer',
      company: 'Contract Co',
      url: 'https://wanted.co.kr/wd/job-1',
      action: 'would_apply',
    });
    expect(Array.isArray(body.results.jobs[0].decisionTrace)).toBe(true);
  });

  test('runAutoApply rejects unsupported platforms without trace leakage', async () => {
    const response = await runAutoApply({
      request: createRequest({ dryRun: true, platforms: ['unknown'] }),
      env: { DB: createMockDb() },
      clients: createClients({ id: 'unused' }),
    });
    const body = await parseJson(response);

    expect(response.status).toBe(400);
    expect(body).toMatchObject({
      success: false,
      error: expect.stringContaining('No valid platforms'),
    });
    expect(JSON.stringify(body)).not.toContain('decisionTrace');
  });

  test('runAutoApply traces duplicate dry-run matches as skipped decisions', async () => {
    const job = makeJob({ company: 'Duplicate Co' });
    const clients = createClients(job);
    const response = await runAutoApply({
      request: createRequest({ dryRun: true, platforms: ['wanted'] }),
      env: { DB: createMockDb({ alreadyApplied: true }) },
      clients,
    });
    const body = await parseJson(response);

    expect(body.success).toBe(true);
    expect(body.results.skipped).toBe(1);
    expect(body.results.jobs).toHaveLength(1);
    expect(body.results.jobs[0]).toMatchObject({
      id: 'job-1',
      source: 'wanted',
      action: 'skipped_already_applied',
      decisionTrace: expect.arrayContaining([
        expect.objectContaining({
          stage: 'duplicate_checked',
          outcome: 'skipped',
          reason: 'already_applied',
        }),
      ]),
    });
    expect(clients.applyCalls).toHaveLength(0);
  });
});
