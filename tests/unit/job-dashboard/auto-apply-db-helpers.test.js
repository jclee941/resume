const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const DEFAULT_KEYWORDS = [
  '정보보안',
  '보안 엔지니어',
  '보안 인프라',
  '방화벽',
  'SIEM',
  '보안 솔루션',
  '네트워크 보안',
  '보안관제',
  '망분리',
  '금융 보안',
  'Splunk',
  'FortiGate',
];
const modulePath = path.join(
  __dirname,
  '../../../apps/job-dashboard/src/handlers/auto-apply/db-helpers.js'
);

let helpers;

beforeAll(async () => {
  helpers = await import(modulePath);
});

function createRecordingDb(keywordValue) {
  const queries = [];
  const configRows =
    keywordValue === undefined ? [] : [{ key: 'auto_apply_keywords', value: keywordValue }];

  return {
    queries,
    prepare(sql) {
      return {
        bind(...params) {
          queries.push({ params, sql });
          return {
            async all() {
              return { results: configRows };
            },
            async first() {
              return sql.includes('COUNT(*)') ? { count: 1 } : { id: 'existing' };
            },
            async run() {
              return { meta: { changes: 1 } };
            },
          };
        },
      };
    },
  };
}

async function exerciseAllDbHelpers(env) {
  await helpers.getConfig(env);
  await helpers.getTodayApplicationCount(env);
  await helpers.isAlreadyApplied(env, 'job-1', 'wanted');
  await helpers.recordApplication(env, {
    job: { id: 'job-1', title: 'Platform Engineer', company: 'Example' },
    source: 'wanted',
    status: 'saved',
  });
}

describe('job-dashboard auto-apply DB helpers', () => {
  test('all helper queries prefer JOB_DB when both dashboard bindings exist', async () => {
    const jobDb = createRecordingDb();
    const fallbackDb = createRecordingDb();

    await exerciseAllDbHelpers({ JOB_DB: jobDb, DB: fallbackDb });

    expect(jobDb.queries).toHaveLength(4);
    expect(fallbackDb.queries).toHaveLength(0);
  });

  test('helper queries never use the portfolio DB binding', async () => {
    const portfolioDb = createRecordingDb();

    await exerciseAllDbHelpers({ DB: portfolioDb });

    expect(portfolioDb.queries).toHaveLength(0);
  });

  test.each([
    ['missing', undefined],
    ['malformed', '{not-json'],
    ['non-array', JSON.stringify({ keyword: 'SRE' })],
    ['non-string-array', JSON.stringify(['SRE', 42])],
  ])('returns default keywords for %s auto_apply_keywords config', async (_case, value) => {
    const db = createRecordingDb(value);

    const config = await helpers.getConfig({ JOB_DB: db });

    expect(config.keywords).toEqual(DEFAULT_KEYWORDS);
  });

  test('falls back to the default match threshold without a database', async () => {
    const config = await helpers.getConfig({});

    expect(config.minMatchScore).toBe(60);
  });

  test('preserves valid auto_apply_keywords config', async () => {
    const keywords = ['Cloud Security', 'Platform'];
    const db = createRecordingDb(JSON.stringify(keywords));

    const config = await helpers.getConfig({ JOB_DB: db });

    expect(config.keywords).toEqual(keywords);
  });
});

describe('HTTP daily application counter with SQLite', () => {
  const created = '2026-11-09T12:00:00Z';
  const applied = '2026-11-09T10:00:00Z';
  const cohort = [
    ...Array.from({ length: 30 }, () => ['wanted', 'pending', null, created]),
    ['wanted', 'applied', applied, created],
    ['wanted', 'applied', applied, created],
    ['remember', 'viewed', applied, created],
    ...Array.from({ length: 4 }, () => ['wanted', 'applied', '2026-10-01', created]),
  ];
  let sqlite;
  let env;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date(created));
    sqlite = new DatabaseSync(':memory:');
    sqlite.exec(
      'CREATE TABLE applications (source TEXT, status TEXT, applied_at TEXT, created_at TEXT)'
    );
    env = {
      JOB_DB: {
        prepare(sql) {
          return {
            bind(...params) {
              return { first: async () => sqlite.prepare(sql).get(...params) };
            },
          };
        },
      },
    };
  });

  afterEach(() => {
    sqlite.close();
    jest.useRealTimers();
  });

  test.each(
    [
      ['actual applications after previews and imports', cohort, null, 3],
      ['wanted source filter', cohort, 'wanted', 2],
      ['remember source filter', cohort, 'remember', 1],
      ['source without applications', cohort, 'other', 0],
      ['null application timestamp', [['wanted', 'applied', null, created]], null, 0],
      [
        'UTC boundaries including timezone offsets',
        [
          '2026-11-08T23:59:59Z',
          '2026-11-09T00:00:00Z',
          '2026-11-09T23:59:59Z',
          '2026-11-10T00:00:00Z',
          '2026-11-09T00:00:00+09:00',
          '2026-11-10T08:59:59+09:00',
          '2026-11-08T19:00:00-05:00',
          '2026-11-09T19:00:00-05:00',
        ].map((timestamp) => ['wanted', 'applied', timestamp, '2026-11-08T12:00:00Z']),
        null,
        4,
      ],
    ].map(([name, rows, platform, expected]) => ({ name, rows, platform, expected }))
  )('counts $name', async ({ rows, platform, expected }) => {
    const insert = sqlite.prepare('INSERT INTO applications VALUES (?, ?, ?, ?)');
    for (const row of rows) insert.run(...row);

    const count = await helpers.getTodayApplicationCount(env, platform);

    expect(count).toBe(expected);
    expect(Math.max(0, 30 - count)).toBe(30 - expected);
  });
});
