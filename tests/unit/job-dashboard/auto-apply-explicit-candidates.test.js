const {
  createMockDb,
  createRequest,
  makeApprovedJob,
  makeRealSubmitBody,
  parseJson,
} = require('./auto-apply-run-handler-fixtures.js');

function createClients() {
  const applyCalls = [];
  return {
    applyCalls,
    wanted: {
      setCookies: jest.fn(),
      searchJobs: jest.fn(async () => {
        throw new Error('search should not run for explicit candidates');
      }),
      apply: jest.fn(async (jobId) => {
        applyCalls.push(jobId);
        return { success: true };
      }),
    },
  };
}

function makeExplicitJob(overrides = {}) {
  return {
    id: 'wanted-101',
    sourceId: 'wanted-101',
    source: 'wanted',
    position: 'Security Engineer',
    company: 'ULW Labs',
    sourceUrl: 'https://wanted.test/jobs/101',
    matchScore: 91,
    ...overrides,
  };
}

function makeApprovedExplicitJob(overrides = {}) {
  return makeApprovedJob({
    ...makeExplicitJob(),
    approvalId: 'approval-wanted-101',
    ...overrides,
  });
}

describe('job-dashboard explicit auto-apply candidates', () => {
  let runAutoApply;

  beforeAll(async () => {
    ({ runAutoApply } =
      await import('../../../apps/job-dashboard/src/handlers/auto-apply/run-handler.js'));
  });

  test('applies explicit recursive candidates without platform search', async () => {
    const db = createMockDb();
    const clients = createClients();
    const candidate = makeApprovedExplicitJob({
      recursive: { next: [{ id: 'wanted-101-detail', type: 'detail' }] },
    });
    const response = await runAutoApply({
      request: createRequest(makeRealSubmitBody(candidate, { maxDepth: 2 })),
      env: { DB: db, SESSIONS: { get: jest.fn(async () => 'wanted-cookie=value') } },
      clients,
    });
    const body = await parseJson(response);

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      success: true,
      results: { searched: 1, matched: 1, applied: 1, skipped: 0, errors: 0 },
      recursion: { maxDepth: 2, visited: 2, truncated: 0 },
    });
    expect(clients.wanted.searchJobs).not.toHaveBeenCalled();
    expect(clients.applyCalls).toEqual(['wanted-101']);
    expect(db.recorded).toHaveLength(1);
  });

  test('traverses nested recursive references only to maxDepth', async () => {
    const response = await runAutoApply({
      request: createRequest({
        dryRun: true,
        maxDepth: 2,
        candidates: [
          makeExplicitJob({
            recursive: {
              next: [
                {
                  id: 'wanted-101-detail',
                  recursive: {
                    next: [
                      {
                        id: 'wanted-101-grandchild',
                        recursive: { next: [{ id: 'wanted-101-too-deep' }] },
                      },
                    ],
                  },
                },
              ],
            },
          }),
        ],
      }),
      env: { DB: createMockDb() },
      clients: createClients(),
    });
    const body = await parseJson(response);

    expect(response.status).toBe(200);
    expect(body.recursion).toMatchObject({
      maxDepth: 2,
      maxVisitedDepth: 2,
      visited: 3,
      truncated: 1,
    });
  });

  test('handles empty explicit candidates and malformed recursive input', async () => {
    const emptyDb = createMockDb();
    const empty = await runAutoApply({
      request: createRequest({ dryRun: true, maxDepth: 0, candidates: [] }),
      env: { DB: emptyDb },
      clients: createClients(),
    });
    expect(await parseJson(empty)).toMatchObject({
      success: true,
      results: { searched: 0, matched: 0, applied: 0, skipped: 0, errors: 0 },
      recursion: { maxDepth: 0, visited: 0, truncated: 0 },
    });
    expect(emptyDb.recorded).toHaveLength(0);

    const malformed = await runAutoApply({
      request: createRequest({ dryRun: false, maxDepth: -1, candidates: [{ id: 'bad' }] }),
      env: { DB: createMockDb() },
      clients: createClients(),
    });
    expect(malformed.status).toBe(400);
    expect(await parseJson(malformed)).toMatchObject({
      success: false,
      errorCode: 'INVALID_AUTO_APPLY_REQUEST',
    });
  });

  test('deduplicates repeated explicit candidates and accepts JOB_DB binding', async () => {
    const db = createMockDb();
    const clients = createClients();
    const approvedJob = makeApprovedExplicitJob();
    const requestBody = makeRealSubmitBody(approvedJob, { maxDepth: 1 });
    const env = { JOB_DB: db, SESSIONS: { get: jest.fn(async () => 'wanted-cookie=value') } };

    const first = await runAutoApply({ request: createRequest(requestBody), env, clients });
    const second = await runAutoApply({ request: createRequest(requestBody), env, clients });
    const firstBody = await parseJson(first);
    const secondBody = await parseJson(second);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(firstBody.results.applied).toBe(1);
    expect(secondBody.results).toMatchObject({ applied: 0, skipped: 1, errors: 0 });
    expect(db.recorded).toHaveLength(1);
  });
});
