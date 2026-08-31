const path = require('node:path');

const DEFAULT_KEYWORDS = ['DevOps', 'SRE', 'Platform Engineer', '보안'];
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

  test('all helper queries fall back to DB when JOB_DB is absent', async () => {
    const fallbackDb = createRecordingDb();

    await exerciseAllDbHelpers({ DB: fallbackDb });

    expect(fallbackDb.queries).toHaveLength(4);
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

  test('preserves valid auto_apply_keywords config', async () => {
    const keywords = ['Cloud Security', 'Platform'];
    const db = createRecordingDb(JSON.stringify(keywords));

    const config = await helpers.getConfig({ JOB_DB: db });

    expect(config.keywords).toEqual(keywords);
  });
});
