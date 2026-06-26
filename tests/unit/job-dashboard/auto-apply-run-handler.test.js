const {
  createClients,
  createMockDb,
  createRequest,
  makeJob,
  parseJson,
} = require('./auto-apply-run-handler-fixtures.js');
describe('job-dashboard auto-apply run handler', () => {
  let runAutoApply;
  let scoreWorkflowJobs;
  beforeAll(async () => {
    ({ runAutoApply } =
      await import('../../../apps/job-dashboard/src/handlers/auto-apply/run-handler.js'));
    ({ scoreWorkflowJobs } =
      await import('../../../apps/job-dashboard/src/workflows/application/job-search-and-scoring.js'));
  });
  const run = (body, { db = createMockDb(), clients = createClients(makeJob()) } = {}) =>
    runAutoApply({ request: createRequest(body), env: { DB: db }, clients });
  test('runAutoApply returns decision trace for dry-run matches', async () => {
    const db = createMockDb();
    const clients = createClients(makeJob());
    const response = await run({ dryRun: true, platforms: ['wanted'] }, { db, clients });
    const body = await parseJson(response);
    expect(body.success).toBe(true);
    expect(body.results.jobs).toHaveLength(1);
    expect(body.results.jobs[0]).toMatchObject({
      id: 'job-1',
      source: 'wanted',
      action: 'would_apply',
      decisionTrace: expect.arrayContaining([
        expect.objectContaining({ stage: 'discovered', outcome: 'included' }),
        expect.objectContaining({ stage: 'scored', reason: 'score_meets_threshold' }),
        expect.objectContaining({ stage: 'duplicate_checked', reason: 'not_previously_applied' }),
        expect.objectContaining({ stage: 'dry_run_recorded', reason: 'dry_run' }),
      ]),
    });
    expect(clients.applyCalls).toHaveLength(0);
  });
  test('runAutoApply preserves existing response contract with decision trace', async () => {
    const job = makeJob({
      position: 'Platform Engineer',
      company: 'Contract Co',
      url: 'https://wanted.co.kr/wd/job-1',
    });
    const response = await run(
      { dryRun: true, platforms: ['wanted'], maxApplications: 3 },
      { clients: createClients(job) }
    );
    const body = await parseJson(response);
    expect(body).toMatchObject({
      success: true,
      dryRun: true,
      platforms: ['wanted'],
      config: { keywords: ['DevOps'], minMatchScore: 1, maxDailyApplications: 3 },
      todayApplications: 0,
      remaining: 3,
      results: { searched: 1, matched: 1, applied: 1, skipped: 0, errors: 0 },
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
    const response = await run(
      { dryRun: true, platforms: ['unknown'] },
      { clients: createClients({ id: 'unused' }) }
    );
    const body = await parseJson(response);
    expect(response.status).toBe(400);
    expect(body).toMatchObject({
      success: false,
      error: expect.stringContaining('No valid platforms'),
    });
    expect(JSON.stringify(body)).not.toContain('decisionTrace');
  });
  test('runAutoApply rejects malformed non-array platforms before searching', async () => {
    const clients = createClients(makeJob());
    const response = await run(
      { dryRun: true, atsStub: true, platforms: 'greenhouse' },
      { clients }
    );
    const body = await parseJson(response);
    expect(response.status).toBe(400);
    expect(body).toMatchObject({
      success: false,
      error: expect.stringContaining('platforms must be an array'),
      errorCode: 'INVALID_AUTO_APPLY_REQUEST',
    });
    expect(clients.wanted.searchJobs).not.toHaveBeenCalled();
    expect(clients.linkedin.searchJobs).not.toHaveBeenCalled();
    expect(clients.remember.searchJobs).not.toHaveBeenCalled();
    expect(clients.applyCalls).toHaveLength(0);
    expect(JSON.stringify(body)).not.toContain('decisionTrace');
  });
  test.each([
    ['missing', {}],
    ['empty', { platforms: [] }],
  ])('runAutoApply preserves default platforms for %s platforms input', async (_label, input) => {
    const response = await run({ dryRun: true, ...input });
    const body = await parseJson(response);
    expect(response.status).toBe(200);
    expect(body.platforms).toEqual(['wanted', 'linkedin', 'remember']);
  });
  test('runAutoApply accepts ATS stub dry-runs and workflow scores before gates', async () => {
    const response = await run({
      dryRun: true,
      platforms: ['greenhouse'],
      keywords: ['security'],
      atsStub: true,
    });
    const body = await parseJson(response);
    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      success: true,
      dryRun: true,
      submitted: 0,
      platforms: ['greenhouse'],
      results: { applied: 1 },
    });
    expect(body.results.jobs[0]).toMatchObject({ source: 'greenhouse', action: 'would_apply' });
    const step = { do: jest.fn(async (_name, _options, fn) => fn()) };
    const workflow = { id: 'wf-ats', stats: {}, steps: [], errors: [] };
    const ctx = {
      getMatchingConfig: jest.fn(async () => ({ skills: ['kubernetes'] })),
      logWorkflowStep: jest.fn(),
    };
    const jobs = ['greenhouse', 'lever', 'ashby'].map((source) => ({
      id: `${source}-ats-stub-security`,
      source,
      sourceId: `${source}-ats-stub-security`,
      position: 'Security Engineer',
      company: `${source} ATS Stub`,
      sourceUrl: `https://example.invalid/${source}`,
      atsStub: true,
      matchScore: 100,
    }));
    const scored = await scoreWorkflowJobs(ctx, step, workflow, jobs, 60, { remaining: 3 });
    expect(
      scored.map(({ source, matchScore, action, status, dryRun }) => ({
        source,
        matchScore,
        action,
        status,
        dryRun,
      }))
    ).toEqual([
      {
        source: 'greenhouse',
        matchScore: 100,
        action: 'would_apply',
        status: 'dry-run',
        dryRun: true,
      },
      { source: 'lever', matchScore: 100, action: 'would_apply', status: 'dry-run', dryRun: true },
      { source: 'ashby', matchScore: 100, action: 'would_apply', status: 'dry-run', dryRun: true },
    ]);
    console.log(
      'ats dry run scores',
      scored.map(({ source, matchScore }) => `${source}:${matchScore}`).join(',')
    );
  });
  test('runAutoApply traces duplicate dry-run matches as skipped decisions', async () => {
    const job = makeJob({ company: 'Duplicate Co' });
    const clients = createClients(job);
    const response = await run(
      { dryRun: true, platforms: ['wanted'] },
      { db: createMockDb({ alreadyApplied: true }), clients }
    );
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
