const { createMockDb, parseJson } = require('./auto-apply-run-handler-fixtures.js');

function createScheduledCliproxyClient(job) {
  return {
    searchJobs: jest.fn(async () => ({ jobs: [job] })),
  };
}

function createSessions(values = {}) {
  return { get: jest.fn(async (key) => values[key] ?? null) };
}

function makeCliproxyJob() {
  return {
    id: 'cliproxy-job-1',
    sourceId: 'cliproxy-job-1',
    source: 'cliproxy',
    position: 'Security Engineer',
    company: 'Cliproxy Enterprise',
    sourceUrl: 'https://jobs.example/cliproxy-job-1',
    matchScore: 95,
    adapterBacked: true,
  };
}

describe('scheduled Cliproxy auto-apply discovery', () => {
  let runScheduledCliproxyAutoApply;

  beforeAll(async () => {
    ({ runScheduledCliproxyAutoApply } =
      await import('../../../apps/job-dashboard/src/handlers/auto-apply/scheduled-cliproxy.js'));
  });

  test('records a dry-run would_apply candidate with a scheduled run id', async () => {
    const db = createMockDb();
    const cliproxy = createScheduledCliproxyClient(makeCliproxyJob());

    const response = await runScheduledCliproxyAutoApply({
      controller: { scheduledTime: Date.parse('2026-06-26T00:00:00.000Z') },
      env: {
        DB: db,
        SESSIONS: createSessions(),
        CLIPROXY_AUTO_APPLY_KEYWORDS: 'security',
        CLIPROXY_AUTO_APPLY_MAX_APPLICATIONS: '1',
      },
      clients: { cliproxy },
    });
    const body = await parseJson(response);

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      success: true,
      dryRun: true,
      runId: expect.stringMatching(/^scheduled-cliproxy-/),
      platforms: ['cliproxy'],
      results: { applied: 1 },
    });
    expect(body.results.jobs[0]).toMatchObject({
      id: 'cliproxy-job-1',
      source: 'cliproxy',
      action: 'would_apply',
      adapterBacked: true,
    });
    expect(cliproxy.searchJobs).toHaveBeenCalledWith('security', {
      limit: 20,
      profile: expect.objectContaining({ skills: expect.any(Array) }),
    });
    expect(db.recorded[0].slice(15, 19)).toEqual([body.runId, 1, 'would_apply', 1]);
  });

  test('skips discovery when disabled by environment opt-out', async () => {
    const db = createMockDb();
    const cliproxy = createScheduledCliproxyClient(makeCliproxyJob());

    const response = await runScheduledCliproxyAutoApply({
      controller: { scheduledTime: Date.parse('2026-06-26T00:00:00.000Z') },
      env: { DB: db, CLIPROXY_AUTO_APPLY_ENABLED: 'false' },
      clients: { cliproxy },
    });
    const body = await parseJson(response);

    expect(response.status).toBe(200);
    expect(body).toEqual({
      success: true,
      skipped: true,
      reason: 'cliproxy_auto_apply_disabled',
    });
    expect(cliproxy.searchJobs).not.toHaveBeenCalled();
    expect(db.recorded).toEqual([]);
  });

  test('skips discovery while auto-apply is paused from Telegram', async () => {
    const db = createMockDb();
    const cliproxy = createScheduledCliproxyClient(makeCliproxyJob());

    const response = await runScheduledCliproxyAutoApply({
      controller: { scheduledTime: Date.parse('2026-06-26T00:00:00.000Z') },
      env: { DB: db, SESSIONS: createSessions({ 'config:auto-apply:paused': 'true' }) },
      clients: { cliproxy },
    });
    const body = await parseJson(response);

    expect(response.status).toBe(200);
    expect(body).toEqual({ success: true, skipped: true, reason: 'auto_apply_paused' });
    expect(cliproxy.searchJobs).not.toHaveBeenCalled();
    expect(db.recorded).toEqual([]);
  });

  test('reports a failed scheduled run when Cliproxy search fails before any candidate', async () => {
    const db = createMockDb();
    const cliproxy = {
      searchJobs: jest.fn(async () => {
        throw new Error('Cliproxy job search failed with HTTP 502');
      }),
    };

    const response = await runScheduledCliproxyAutoApply({
      controller: { scheduledTime: Date.parse('2026-06-26T00:00:00.000Z') },
      env: {
        DB: db,
        SESSIONS: createSessions(),
        CLIPROXY_AUTO_APPLY_KEYWORDS: 'security',
        CLIPROXY_AUTO_APPLY_MAX_APPLICATIONS: '1',
      },
      clients: { cliproxy },
    });
    const body = await parseJson(response);

    expect(response.status).toBe(500);
    expect(body).toMatchObject({
      success: false,
      errorCode: 'AUTO_APPLY_DISCOVERY_FAILED',
      dryRun: true,
      runId: expect.stringMatching(/^scheduled-cliproxy-/),
      results: { errors: 1 },
    });
    expect(db.recorded).toEqual([]);
  });
});
