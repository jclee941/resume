const fs = require('fs');
const path = require('path');
const YAML = require('yaml');

const EXPECTED_DASHBOARD_STATUSES = [
  'pending',
  'saved',
  'applied',
  'viewed',
  'in_progress',
  'interview',
  'offer',
  'rejected',
  'withdrawn',
  'expired',
];

const ROOT = path.resolve(__dirname, '../../..');
const OPENAPI_PATH = path.join(ROOT, 'packages/contracts/openapi.yaml');
const REPORT_HANDLER_PATH = '../../../apps/job-dashboard/src/handlers/report-handler.js';

function collectStatusEnums(node, result = []) {
  if (!node || typeof node !== 'object') {
    return result;
  }
  if (Array.isArray(node.enum) && node.enum.includes('pending')) {
    result.push(node.enum);
  }
  for (const value of Object.values(node)) {
    collectStatusEnums(value, result);
  }
  return result;
}

function createReportDbRecorder() {
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
        async all() {
          return { results: [] };
        },
        async first() {
          return { count: 0 };
        },
      };
      statements.push(statement);
      return statement;
    },
  };
}

function createStatsDbWithResult(result) {
  return {
    prepare(sql) {
      for (const status of EXPECTED_DASHBOARD_STATUSES) {
        expect(sql).toContain(`status = '${status}'`);
      }
      expect(sql).not.toContain("status = 'interviewing'");
      expect(sql).not.toContain("status = 'offered'");
      return {
        async first() {
          return result;
        },
      };
    },
  };
}

describe('application status contract', () => {
  test('keeps runtime, schemas, types, OpenAPI, and report stats on the dashboard status set', async () => {
    // Given: the canonical dashboard application statuses.
    const expected = EXPECTED_DASHBOARD_STATUSES;

    // When: each status source is loaded from the workspace.
    const runtime = await import(
      '../../../apps/job-dashboard/src/handlers/applications/statuses.js'
    );
    const schemas = await import('../../../packages/schemas/src/application.js');
    const types = await import('../../../packages/types/src/application.js');
    const openApi = YAML.parse(fs.readFileSync(OPENAPI_PATH, 'utf8'));
    const openApiStatusEnums = collectStatusEnums(openApi);

    // Then: all contract sources expose exactly the same statuses.
    expect(runtime.VALID_STATUSES).toEqual(expected);
    expect(schemas.VALID_APPLICATION_STATUSES).toEqual(expected);
    expect(schemas.VALID_APPLICATION_STATUSES_WIDE).toEqual(expected);
    expect(types.APPLICATION_STATUSES).toEqual(expected);
    expect(openApiStatusEnums.length).toBeGreaterThanOrEqual(1);
    for (const enumValues of openApiStatusEnums) {
      expect(enumValues).toEqual(expected);
    }
  });

  test('returns current dashboard statuses from daily report stats behavior', async () => {
    const { getApplicationStats } = await import(
      '../../../apps/job-dashboard/src/workflows/daily-report-stats.js'
    );
    const stats = await getApplicationStats(
      {
        JOB_DB: createStatsDbWithResult({
          total: 10,
          pending: 1,
          saved: 1,
          applied: 1,
          viewed: 1,
          in_progress: 1,
          interview: 1,
          offer: 1,
          rejected: 1,
          withdrawn: 1,
          expired: 1,
        }),
      },
      'daily'
    );

    expect(Object.keys(stats)).toEqual(['total', ...EXPECTED_DASHBOARD_STATUSES]);
    expect(stats.interview).toBe(1);
    expect(stats.offer).toBe(1);
    expect(stats).not.toHaveProperty('interviewing');
    expect(stats).not.toHaveProperty('offered');
  });

  test('keeps CommonJS schema export on the dashboard status set', () => {
    const schemas = require('@resume/schemas');

    expect(schemas.VALID_APPLICATION_STATUSES).toEqual(EXPECTED_DASHBOARD_STATUSES);
    expect(schemas.VALID_APPLICATION_STATUSES_WIDE).toEqual(EXPECTED_DASHBOARD_STATUSES);
  });

  test('uses current dashboard statuses in the live daily report handler query', async () => {
    const { ReportHandler } = await import(REPORT_HANDLER_PATH);
    const db = createReportDbRecorder();
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    try {
      const response = await new ReportHandler({ DB: db }, null).triggerDailyReport({});
      const payload = await response.json();
      const highPrioritySql = db.statements.map((statement) => statement.sql).find((sql) => {
        return sql.includes('match_score >= 80');
      });

      expect(payload.success).toBe(true);
      expect(highPrioritySql).toContain("status IN ('saved', 'viewed', 'in_progress')");
      expect(highPrioritySql).not.toContain('reviewing');
    } finally {
      logSpy.mockRestore();
    }
  });
});
