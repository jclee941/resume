const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const root = path.join(__dirname, '../../..');
const src = path.join(root, 'apps/job-dashboard/src');

function createD1() {
  const database = new DatabaseSync(':memory:');
  database.exec(fs.readFileSync(path.join(root, 'apps/job-dashboard/schema.sql'), 'utf8'));
  const wrap = (statement, params = []) => ({
    bind: (...next) => wrap(statement, next),
    first: async () => statement.get(...params) ?? null,
    all: async () => ({ results: statement.all(...params) }),
    run: async () => ({ meta: { changes: Number(statement.run(...params).changes) } }),
  });
  return {
    database,
    prepare: (sql) => wrap(database.prepare(sql)),
    batch: async (statements) => Promise.all(statements.map((statement) => statement.run())),
  };
}

function count(db, sql) {
  return db.database.prepare(sql).get().n;
}

function seedJobResult(db, id, age) {
  db.database
    .prepare(
      `INSERT INTO job_search_results (id, source, position, company, crawled_at, created_at, updated_at)
       VALUES (?, 'wanted', 'SRE', 'Acme', datetime('now', ?), datetime('now', ?), datetime('now', ?))`
    )
    .run(id, age, age, age);
}

function seedHealthDetail(db, age, status = 'healthy') {
  db.database
    .prepare(
      `INSERT INTO health_check_details (check_type, service_name, status, latency_ms, created_at)
       VALUES ('http', 'https://resume.jclee.me/health', ?, 12, datetime('now', ?))`
    )
    .run(status, age);
}

const step = { do: async (_name, _config, callback) => callback() };

describe('ops workflows against the schema.sql database', () => {
  let CleanupWorkflow;
  let getPlatformStats;
  let logHealthMetrics;
  let getConsecutiveFailures;
  let notifyHealthFailure;
  let QueueWorkflowDispatcher;
  let recordSyncHistory;

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
    ({ CleanupWorkflow } = await import(path.join(src, 'workflows/cleanup.js')));
    ({ getPlatformStats } = await import(path.join(src, 'workflows/daily-report-stats.js')));
    ({ logHealthMetrics, getConsecutiveFailures } = await import(
      path.join(src, 'workflows/health-check/metrics.js')
    ));
    ({ notifyHealthFailure } = await import(
      path.join(src, 'workflows/health-check/notifications.js')
    ));
    ({ recordSyncHistory } = await import(path.join(src, 'workflows/resume-sync-steps.js')));
    ({ QueueWorkflowDispatcher } = await import(
      path.join(src, 'queues/queue-workflow-dispatcher.js')
    ));
  });

  function cleanupEnv(db) {
    return {
      JOB_DB: db,
      SESSIONS: { list: async () => ({ keys: [] }), get: async () => null, delete: async () => {} },
      RATE_LIMIT_KV: { list: async () => ({ keys: [] }), delete: async () => {} },
    };
  }

  test('cleanup prunes job results and health history older than the requested retention', async () => {
    const db = createD1();
    seedJobResult(db, 'old', '-20 days');
    seedJobResult(db, 'recent', '-2 days');
    seedHealthDetail(db, '-5 days');
    seedHealthDetail(db, '-1 hours');

    const result = await new CleanupWorkflow({}, cleanupEnv(db)).run(
      { payload: { jobResultsMaxAge: 10, healthCheckMaxAge: 3 } },
      step
    );

    expect(result.deleted).toMatchObject({ jobResults: 1, healthChecks: 1 });
    expect(db.database.prepare('SELECT id FROM job_search_results').all()).toEqual([
      { id: 'recent' },
    ]);
    expect(count(db, 'SELECT COUNT(*) AS n FROM health_check_details')).toBe(1);
  });

  test('cleanup ignores malformed retention values and never splices them into SQL', async () => {
    const db = createD1();
    seedJobResult(db, 'twenty-days', '-20 days');
    seedJobResult(db, 'forty-days', '-40 days');

    const result = await new CleanupWorkflow({}, cleanupEnv(db)).run(
      {
        payload: {
          jobResultsMaxAge: "1 days'); DROP TABLE applications; --",
          healthCheckMaxAge: -5,
        },
      },
      step
    );

    expect(result.deleted.jobResults).toBe(1);
    expect(db.database.prepare('SELECT id FROM job_search_results').all()).toEqual([
      { id: 'twenty-days' },
    ]);
    expect(count(db, "SELECT COUNT(*) AS n FROM sqlite_master WHERE name = 'applications'")).toBe(
      1
    );
  });

  test('cleanup dry run counts without deleting', async () => {
    const db = createD1();
    seedJobResult(db, 'old', '-40 days');

    const result = await new CleanupWorkflow({}, cleanupEnv(db)).run(
      { payload: { dryRun: true } },
      step
    );

    expect(result.deleted.jobResults).toBe(0);
    expect(count(db, 'SELECT COUNT(*) AS n FROM job_search_results')).toBe(1);
  });

  test('platform stats group applications by their source column', async () => {
    const db = createD1();
    const insert = db.database.prepare(
      `INSERT INTO applications (id, source, position, company, status, created_at, updated_at)
       VALUES (?, ?, 'SRE', 'Acme', ?, '2026-09-28T09:00:00.000Z', '2026-09-28T09:00:00.000Z')`
    );
    insert.run('a1', 'wanted', 'applied');
    insert.run('a2', 'wanted', 'interview');
    insert.run('a3', 'jobkorea', 'saved');

    const stats = await getPlatformStats({ JOB_DB: db }, 'daily', '2026-09-28');

    expect(stats).toEqual({
      wanted: { count: 2, success: 1, rate: '50.0' },
      jobkorea: { count: 1, success: 0, rate: '0.0' },
    });
  });

  test('health metrics land in health_check_details and feed the failure streak', async () => {
    const db = createD1();
    const env = { JOB_DB: db };
    const workflow = { env, getConsecutiveFailures: () => getConsecutiveFailures(env) };
    const evaluation = {
      overallHealth: 'down',
      services: [
        { url: 'https://resume.jclee.me/health', status: 503, latencyMs: 40, healthy: false },
      ],
      bindings: { d1: { healthy: true, latencyMs: 3 }, kv: { healthy: true, latencyMs: 2 } },
    };

    const logged = await logHealthMetrics(workflow, evaluation);

    expect(logged).toMatchObject({ logged: 3, consecutiveFailures: 1 });
    expect(
      db.database.prepare('SELECT check_type, service_name, status FROM health_check_details').all()
    ).toEqual([
      { check_type: 'http', service_name: 'https://resume.jclee.me/health', status: 'down' },
      { check_type: 'd1', service_name: 'JOB_DB', status: 'healthy' },
      { check_type: 'kv', service_name: 'SESSIONS', status: 'healthy' },
    ]);
    expect(await getConsecutiveFailures(env)).toBe(1);
  });

  test('the failure streak counts runs, not service rows, in any service order', async () => {
    const service = (url, healthy) => ({
      url,
      status: healthy ? 200 : 503,
      latencyMs: 20,
      healthy,
    });
    const run = (first, second) => ({
      overallHealth: first && second ? 'healthy' : 'critical',
      services: [
        service('https://resume.jclee.me/health', first),
        service('https://resume.jclee.me/job/health', second),
      ],
      bindings: { d1: { healthy: true, latencyMs: 3 }, kv: { healthy: true, latencyMs: 2 } },
    });
    for (const [first, second] of [
      [false, true],
      [true, false],
      [false, false],
    ]) {
      const env = { JOB_DB: createD1() };
      const workflow = { env, getConsecutiveFailures: () => getConsecutiveFailures(env) };
      const streaks = [];
      for (let i = 0; i < 3; i += 1) {
        const logged = await logHealthMetrics(workflow, run(first, second));
        streaks.push([logged.consecutiveFailures, await getConsecutiveFailures(env)]);
      }
      expect(streaks).toEqual([
        [1, 1],
        [2, 2],
        [3, 3],
      ]);
      expect((await logHealthMetrics(workflow, run(true, true))).consecutiveFailures).toBe(0);
      expect(await getConsecutiveFailures(env)).toBe(0);
      expect((await logHealthMetrics(workflow, run(first, second))).consecutiveFailures).toBe(1);
    }
  });

  test('the failure notification escalates on the run it reports', async () => {
    const env = { JOB_DB: createD1() };
    const workflow = { env, getConsecutiveFailures: () => getConsecutiveFailures(env) };
    const failed = {
      overallHealth: 'critical',
      services: [
        { url: 'https://resume.jclee.me/health', status: 503, latencyMs: 20, healthy: false },
      ],
      bindings: { d1: { healthy: true, latencyMs: 3 }, kv: { healthy: true, latencyMs: 2 } },
    };
    const levels = [];
    for (let i = 0; i < 3; i += 1) {
      const notice = await notifyHealthFailure(workflow, failed, new Date().toISOString());
      levels.push([notice.consecutiveFailures, notice.escalationLevel]);
      await logHealthMetrics(workflow, failed);
    }
    expect(levels).toEqual([
      [1, 'warning'],
      [2, 'warning'],
      [3, 'critical'],
    ]);
  });

  test('resume sync history records a run once even when the step retries', async () => {
    const db = createD1();
    const run = {
      syncId: 'sync-1',
      resumeId: 'master',
      platforms: ['wanted', 'jobkorea'],
      results: { wanted: { success: true }, jobkorea: { success: true } },
      success: true,
      dryRun: true,
    };

    await recordSyncHistory({ JOB_DB: db }, run);
    await recordSyncHistory({ JOB_DB: db }, run);

    expect(
      db.database.prepare('SELECT id, status, dry_run FROM resume_sync_history').all()
    ).toEqual([{ id: 'sync-1', status: 'completed', dry_run: 1 }]);
  });

  test('queued cleanup messages start the workflow with the params it reads', async () => {
    const create = jest.fn(async () => ({ id: 'cleanup-1' }));
    const dispatcher = new QueueWorkflowDispatcher(
      { CLEANUP_WORKFLOW: { create } },
      { info: () => {}, warn: () => {} }
    );

    await dispatcher.dispatch('cleanup', { retentionDays: 14, dryRun: true });

    expect(create).toHaveBeenCalledWith({
      params: { jobResultsMaxAge: 14, dryRun: true, source: 'queue' },
    });
  });
});
