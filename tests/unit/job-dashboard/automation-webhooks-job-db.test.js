const path = require('node:path');

const handlersDir = path.join(__dirname, '../../../apps/job-dashboard/src/handlers');

function createRecordingDb(rows = {}) {
  const queries = [];
  const rowsFor = (sql) => {
    if (sql.includes('GROUP BY status')) return rows.byStatus || [];
    if (sql.includes("status = 'saved'")) return rows.saved || [];
    return [];
  };
  const statement = (sql, params = []) => ({
    bind: (...next) => statement(sql, next),
    all: async () => {
      queries.push({ sql, params });
      return { results: rowsFor(sql) };
    },
    first: async () => {
      queries.push({ sql, params });
      return sql.includes('COUNT(*)') ? { count: 0 } : null;
    },
    run: async () => {
      queries.push({ sql, params });
      return { meta: { changes: 1 } };
    },
  });
  return { queries, prepare: (sql) => statement(sql) };
}

describe('automation webhook handlers use JOB_DB', () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    global.fetch = jest.fn(async (url) => {
      if (String(url).includes('/resumes/v1/list')) {
        return Response.json({ data: [{ id: 7, is_default: true }] });
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  test('daily report totals come from JOB_DB applications', async () => {
    const { ReportHandler } = await import(path.join(handlersDir, 'report-handler.js'));
    const portfolioDb = createRecordingDb();
    const jobDb = createRecordingDb({
      byStatus: [
        { status: 'saved', count: 50 },
        { status: 'applied', count: 9 },
      ],
    });

    const response = await new ReportHandler(
      { DB: portfolioDb, JOB_DB: jobDb },
      null
    ).triggerDailyReport(new Request('https://resume.jclee.me/job/api/automation/report'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.report.summary.total).toBe(59);
    expect(portfolioDb.queries).toEqual([]);
  });

  test('job search stores results in JOB_DB', async () => {
    const { JobSearchHandler } = await import(path.join(handlersDir, 'job-search-handler.js'));
    const portfolioDb = createRecordingDb();
    const jobDb = createRecordingDb();
    const handler = new JobSearchHandler({ DB: portfolioDb, JOB_DB: jobDb });
    handler.fetchWantedJobs = async () => [{ id: '42', company: 'Acme', title: 'SRE' }];

    const response = await handler.triggerJobSearch({ json: async () => ({ keywords: ['SRE'] }) });

    expect(response.status).toBe(200);
    expect(jobDb.queries.some(({ sql }) => sql.includes('INTO applications'))).toBe(true);
    expect(portfolioDb.queries).toEqual([]);
  });

  test('webhook auto-apply selects saved candidates from JOB_DB', async () => {
    const { AutoApplyWebhookHandler } = await import(
      path.join(handlersDir, 'auto-apply-webhook-handler.js')
    );
    const portfolioDb = createRecordingDb();
    const jobDb = createRecordingDb({
      saved: [{ id: 'wanted_1', job_id: '1', position: 'SRE', company: 'Acme', match_score: 90 }],
    });
    const auth = { getCookies: async () => 'wanted-session=stub' };

    const response = await new AutoApplyWebhookHandler(
      { DB: portfolioDb, JOB_DB: jobDb },
      auth
    ).triggerAutoApply({ json: async () => ({ dryRun: true }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ success: true, skipped: 1, dryRun: true });
    expect(portfolioDb.queries).toEqual([]);
  });
});
