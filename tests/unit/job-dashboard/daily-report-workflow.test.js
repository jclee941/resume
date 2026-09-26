// Regression: DailyReportWorkflow accepted a report date but computed every stat
// relative to "now", so a report requested for a past date covered the wrong days.
describe('DailyReportWorkflow report date', () => {
  let DailyReportWorkflow;

  beforeAll(async () => {
    jest.unstable_mockModule(
      'cloudflare:workers',
      () => ({
        WorkflowEntrypoint: class {
          constructor(_ctx, env) {
            this.env = env;
          }
        },
      }),
      { virtual: true }
    );
    ({ DailyReportWorkflow } =
      await import('../../../apps/job-dashboard/src/workflows/daily-report.js'));
  });

  function createRecordingDb() {
    const statements = [];
    return {
      statements,
      prepare(sql) {
        const statement = {
          sql,
          bindings: [],
          bind(...values) {
            statement.bindings.push(...values);
            return statement;
          },
          async first() {
            return { total: 0 };
          },
          async all() {
            return { results: [] };
          },
          async run() {
            return { success: true };
          },
        };
        statements.push(statement);
        return statement;
      },
    };
  }

  const step = { do: async (_name, _config, callback) => callback() };

  test.each([
    ['daily', "date(?1, '-1 day')", "BETWEEN date(?1, '-2 days') AND date(?1, '-1 day')"],
    ['weekly', "date(?1, '-7 days')", "BETWEEN date(?1, '-14 days') AND date(?1, '-7 days')"],
  ])('anchors %s stats to the requested report date', async (type, windowStart, trendWindow) => {
    const db = createRecordingDb();
    const workflow = new DailyReportWorkflow({}, { JOB_DB: db });

    const result = await workflow.run(
      { instanceId: 'report-1', payload: { type, date: '2026-09-01' } },
      step
    );

    const queries = db.statements.filter((statement) => statement.sql.includes('SELECT'));
    expect(queries).toHaveLength(4);
    for (const query of queries) {
      expect(query.bindings).toEqual(['2026-09-01']);
      expect(query.sql).not.toContain("'now'");
    }
    const [applications, platforms, searches, trends] = queries;
    for (const query of [applications, platforms, searches]) {
      expect(query.sql).toContain(`date(created_at) >= ${windowStart}`);
      expect(query.sql).toContain('date(created_at) <= date(?1)');
    }
    expect(trends.sql).toContain(trendWindow);
    expect(result.report.date).toBe('2026-09-01');
  });
});
