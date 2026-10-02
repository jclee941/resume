import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';

import * as cronRouter from '../cron-router.js';
import { syncApplicationHistory } from '../../../services/application-history/sync.js';
import {
  createSqliteD1,
  wantedRecord,
} from '../../../services/application-history/__tests__/history-test-kit.js';

const { HEALTH_CHECK_CRON, RESUME_SYNC_CRON, scheduled } = cronRouter;
const MONDAY_MIDNIGHT = Date.UTC(2026, 9, 5, 0, 0);
const TUESDAY_AFTERNOON = Date.UTC(2026, 8, 29, 14, 0);

const BINDINGS = [
  'RESUME_SYNC_WORKFLOW',
  'CLEANUP_WORKFLOW',
  'APPLICATION_WORKFLOW',
  'HEALTH_CHECK_WORKFLOW',
  'DAILY_REPORT_WORKFLOW',
];

const ENABLED_CONFIG = {
  auto_apply_enabled: 'true',
  max_daily_applications: '7',
  min_match_score: '65',
  auto_apply_keywords: JSON.stringify(['DevOps', 'SRE']),
};

function createConfigDb(values, { failing = false } = {}) {
  return {
    prepare() {
      return {
        bind() {
          return {
            async all() {
              if (failing) throw new Error('D1 down');
              return { results: Object.entries(values).map(([key, value]) => ({ key, value })) };
            },
          };
        },
      };
    },
  };
}

function createHarness(overrides = {}, rejecting = []) {
  const calls = [];
  const env = { ...overrides };
  for (const name of BINDINGS) {
    if (name in overrides) continue;
    env[name] = {
      create(options) {
        calls.push({ name, params: options.params });
        if (rejecting.includes(name)) return Promise.reject(new Error(`${name} boom`));
        return Promise.resolve({ id: `${name}-1` });
      },
    };
  }
  const waited = [];
  const ctx = { waitUntil: (promise) => waited.push(promise) };
  return { calls, env, ctx, waited };
}

function skippedInfos(infos) {
  return infos.filter(([message]) => message === '[cron] auto-apply start skipped');
}

function startedNames(calls) {
  return calls.map((call) => call.name).sort();
}

describe('cron-router', () => {
  const originalFetch = globalThis.fetch;
  const originalWarn = console.warn;
  const originalInfo = console.info;
  let warnings;
  let infos;

  beforeEach(() => {
    warnings = [];
    infos = [];
    console.info = (...args) => infos.push(args);
    globalThis.fetch = () => {
      throw new Error('network access is not allowed in cron-router tests');
    };
    console.warn = (...args) => warnings.push(args);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    console.warn = originalWarn;
    console.info = originalInfo;
  });

  it('exports the two cron expressions and keeps the default export shape', () => {
    assert.equal(RESUME_SYNC_CRON, '0 21 * * *');
    assert.equal(HEALTH_CHECK_CRON, '0 * * * *');
    assert.deepEqual(Object.keys(cronRouter.default).sort(), [
      'HEALTH_CHECK_CRON',
      'RESUME_SYNC_CRON',
      'scheduled',
    ]);
  });

  it('resume-sync cron starts resume sync (dry run) and cleanup', async () => {
    const { calls, env, ctx, waited } = createHarness();
    await scheduled({ cron: RESUME_SYNC_CRON }, env, ctx);
    assert.deepEqual(startedNames(calls), ['CLEANUP_WORKFLOW', 'RESUME_SYNC_WORKFLOW']);
    assert.deepEqual(calls.find((c) => c.name === 'RESUME_SYNC_WORKFLOW').params, {
      dryRun: true,
      source: 'cron',
    });
    assert.deepEqual(calls.find((c) => c.name === 'CLEANUP_WORKFLOW').params, { source: 'cron' });
    assert.equal(waited.length, 2);
    for (const promise of waited) assert.ok(promise instanceof Promise);
  });

  it('resume-sync cron also starts one live Wanted auto-apply run approving at the D1 score', async () => {
    const { calls, env, ctx } = createHarness({ JOB_DB: createConfigDb(ENABLED_CONFIG) });
    await scheduled({ cron: RESUME_SYNC_CRON }, env, ctx);
    assert.deepEqual(startedNames(calls), [
      'APPLICATION_WORKFLOW',
      'CLEANUP_WORKFLOW',
      'RESUME_SYNC_WORKFLOW',
    ]);
    const applications = calls.filter((c) => c.name === 'APPLICATION_WORKFLOW');
    assert.equal(applications.length, 1);
    assert.deepEqual(applications[0].params, {
      triggerType: 'cron-auto-apply',
      source: 'cron',
      platforms: ['wanted', 'remember'],
      searchCriteria: { keywords: ['DevOps', 'SRE'], keyword: 'DevOps' },
      minMatchScore: 65,
      maxDailyApplications: 7,
      dryRun: false,
      autoApprove: true,
      autoApproveThreshold: 65,
    });
  });

  it('syncs application history before the discovery start, once, on the resume-sync cron only', async () => {
    const order = [];
    const { calls, env, ctx } = createHarness({ JOB_DB: createConfigDb(ENABLED_CONFIG) });
    env.APPLICATION_WORKFLOW = {
      create() {
        order.push('APPLICATION_WORKFLOW');
        return Promise.resolve({ id: 'a' });
      },
    };
    const syncApplicationHistory = async (syncEnv, options) => {
      order.push('history');
      assert.equal(syncEnv, env);
      assert.equal(options.timeoutMs, 120_000);
      return { ok: true, status: 'success', platforms: {} };
    };

    await scheduled({ cron: RESUME_SYNC_CRON }, env, ctx, { syncApplicationHistory });
    assert.deepEqual(order, ['history', 'APPLICATION_WORKFLOW']);
    assert.equal(startedNames(calls).includes('RESUME_SYNC_WORKFLOW'), true);

    order.length = 0;
    await scheduled({ cron: HEALTH_CHECK_CRON, scheduledTime: TUESDAY_AFTERNOON }, env, ctx, {
      syncApplicationHistory,
    });
    assert.deepEqual(order, []);
  });

  it('a failing history sync is logged and does not block any start', async () => {
    const { calls, env, ctx } = createHarness({ JOB_DB: createConfigDb(ENABLED_CONFIG) });
    const syncApplicationHistory = async () => {
      throw new Error('history boom');
    };

    await scheduled({ cron: RESUME_SYNC_CRON }, env, ctx, { syncApplicationHistory });

    assert.deepEqual(startedNames(calls), [
      'APPLICATION_WORKFLOW',
      'CLEANUP_WORKFLOW',
      'RESUME_SYNC_WORKFLOW',
    ]);
    assert.ok(
      warnings.some(
        ([message, detail]) => /history sync failed/.test(message) && detail === 'history boom'
      )
    );
  });

  it('a session refresh that outlives its budget is left behind and the starts still run', async () => {
    const { calls, env, ctx } = createHarness({ JOB_DB: createConfigDb(ENABLED_CONFIG) });
    const syncApplicationHistory = async () => ({ ok: true, status: 'success', platforms: {} });

    await scheduled({ cron: RESUME_SYNC_CRON }, env, ctx, {
      syncApplicationHistory,
      refreshSessions: () => new Promise(() => {}),
      refreshBudgetMs: 5,
    });

    assert.deepEqual(startedNames(calls), [
      'APPLICATION_WORKFLOW',
      'CLEANUP_WORKFLOW',
      'RESUME_SYNC_WORKFLOW',
    ]);
    assert.ok(
      warnings.some(([message]) => /session refresh not finished within 5 ms/.test(message))
    );
  });

  it(
    'the preflight deadline leaves a still-running history sync behind and the starts run',
    { timeout: 2000 },
    async () => {
      const { calls, env, ctx } = createHarness({ JOB_DB: createConfigDb(ENABLED_CONFIG) });
      let received;

      await scheduled({ cron: RESUME_SYNC_CRON }, env, ctx, {
        syncApplicationHistory: (_env, options) => {
          received = options;
          return new Promise(() => {});
        },
        refreshSessions: async () => {},
        preflightBudgetMs: 5,
      });

      assert.deepEqual(startedNames(calls), [
        'APPLICATION_WORKFLOW',
        'CLEANUP_WORKFLOW',
        'RESUME_SYNC_WORKFLOW',
      ]);
      assert.equal(typeof received.deadline, 'number');
      assert.ok(
        warnings.some(([message]) => /still running at the preflight deadline/.test(message))
      );
    }
  );

  it(
    'a stalled auto-apply config read skips only the discovery start',
    { timeout: 2000 },
    async () => {
      const hangingDb = { prepare: () => ({ bind: () => ({ all: () => new Promise(() => {}) }) }) };
      const { calls, env, ctx } = createHarness({ JOB_DB: hangingDb });

      await scheduled({ cron: RESUME_SYNC_CRON }, env, ctx, {
        syncApplicationHistory: async () => ({ ok: true, status: 'success', platforms: {} }),
        refreshSessions: async () => {},
        configBudgetMs: 5,
      });

      assert.deepEqual(startedNames(calls), ['CLEANUP_WORKFLOW', 'RESUME_SYNC_WORKFLOW']);
      assert.ok(warnings.some(([message]) => /config not read within 5 ms/.test(message)));
    }
  );

  it(
    'stops issuing history writes at the preflight deadline in a slow multi-batch run',
    { timeout: 2000 },
    async () => {
      const db = createSqliteD1();
      const { calls, env, ctx } = createHarness({ JOB_DB: db });
      let now = 0;
      const batchStarts = [];
      const batch = db.batch;
      db.batch = async (statements) => {
        batchStarts.push(now);
        const results = await batch(statements);
        now += 20_000;
        return results;
      };
      const records = Array.from({ length: 663 }, (_, index) => wantedRecord(5000 + index));

      await scheduled({ cron: RESUME_SYNC_CRON }, env, ctx, {
        refreshSessions: async () => {
          now = 540_000;
        },
        syncApplicationHistory: (syncEnv, options) =>
          syncApplicationHistory(syncEnv, {
            ...options,
            platforms: ['wanted'],
            adapters: {
              wanted: async () => {
                now += 119_000;
                return records;
              },
            },
          }),
        clock: () => now,
      });

      assert.deepEqual(batchStarts, [659_000, 679_000, 699_000, 719_000]);
      assert.ok(batchStarts.every((start) => start < 720_000));
      assert.equal(db.sqlite.prepare('SELECT COUNT(*) AS n FROM applications').get().n, 200);
      assert.equal(db.sqlite.prepare('SELECT COUNT(*) AS n FROM sync_logs').get().n, 0);
      assert.ok(
        infos.some(([, , platforms]) =>
          /write window closed after 4 of 14 write batches/.test(platforms)
        )
      );
      assert.equal(startedNames(calls).includes('RESUME_SYNC_WORKFLOW'), true);
      assert.equal(startedNames(calls).includes('CLEANUP_WORKFLOW'), true);
    }
  );

  it('the hourly cron never starts the application workflow', async () => {
    const { calls, env, ctx } = createHarness({ JOB_DB: createConfigDb(ENABLED_CONFIG) });
    await scheduled({ cron: HEALTH_CHECK_CRON, scheduledTime: MONDAY_MIDNIGHT }, env, ctx);
    assert.equal(calls.filter((c) => c.name === 'APPLICATION_WORKFLOW').length, 0);
  });

  it('skips the discovery run with a log line when D1 auto_apply_enabled is false', async () => {
    const db = createConfigDb({ ...ENABLED_CONFIG, auto_apply_enabled: 'false' });
    const { calls, env, ctx } = createHarness({ JOB_DB: db });
    await scheduled({ cron: RESUME_SYNC_CRON }, env, ctx);
    assert.deepEqual(startedNames(calls), ['CLEANUP_WORKFLOW', 'RESUME_SYNC_WORKFLOW']);
    assert.equal(skippedInfos(infos).length, 1);
    assert.equal(skippedInfos(infos)[0][0], '[cron] auto-apply start skipped');
  });

  it('skips the discovery run when AUTO_APPLY_CRON_ENABLED is false', async () => {
    const { calls, env, ctx } = createHarness({
      JOB_DB: createConfigDb(ENABLED_CONFIG),
      AUTO_APPLY_CRON_ENABLED: 'false',
    });
    await scheduled({ cron: RESUME_SYNC_CRON }, env, ctx);
    assert.deepEqual(startedNames(calls), ['CLEANUP_WORKFLOW', 'RESUME_SYNC_WORKFLOW']);
    assert.equal(skippedInfos(infos).length, 1);
  });

  it('an unreadable D1 config skips the discovery run without blocking the other starts', async () => {
    const db = createConfigDb(ENABLED_CONFIG, { failing: true });
    const { calls, env, ctx } = createHarness({ JOB_DB: db });
    await scheduled({ cron: RESUME_SYNC_CRON }, env, ctx);
    assert.deepEqual(startedNames(calls), ['CLEANUP_WORKFLOW', 'RESUME_SYNC_WORKFLOW']);
    assert.equal(skippedInfos(infos).length, 1);
  });

  it('a rejecting application workflow does not stop resume sync and cleanup', async () => {
    const { calls, env, ctx } = createHarness({ JOB_DB: createConfigDb(ENABLED_CONFIG) }, [
      'APPLICATION_WORKFLOW',
    ]);
    await assert.rejects(scheduled({ cron: RESUME_SYNC_CRON }, env, ctx), /APPLICATION_WORKFLOW/);
    assert.deepEqual(startedNames(calls), [
      'APPLICATION_WORKFLOW',
      'CLEANUP_WORKFLOW',
      'RESUME_SYNC_WORKFLOW',
    ]);
  });

  it('the hourly cron starts only the health check outside Monday 00:00 UTC', async () => {
    const mondayOneAm = MONDAY_MIDNIGHT + 3_600_000;
    const tuesdayMidnight = MONDAY_MIDNIGHT + 86_400_000;
    for (const scheduledTime of [TUESDAY_AFTERNOON, mondayOneAm, tuesdayMidnight, undefined]) {
      const { calls, env, ctx, waited } = createHarness();
      await scheduled({ cron: HEALTH_CHECK_CRON, scheduledTime }, env, ctx);
      assert.deepEqual(calls, [{ name: 'HEALTH_CHECK_WORKFLOW', params: { source: 'cron' } }]);
      assert.equal(waited.length, 1);
    }
  });

  it('the hourly cron also starts the weekly report at 00:00 UTC on Mondays', async () => {
    assert.equal(new Date(MONDAY_MIDNIGHT).getUTCDay(), 1);
    const { calls, env, ctx, waited } = createHarness();
    await scheduled({ cron: HEALTH_CHECK_CRON, scheduledTime: MONDAY_MIDNIGHT }, env, ctx);
    assert.deepEqual(calls, [
      { name: 'HEALTH_CHECK_WORKFLOW', params: { source: 'cron' } },
      { name: 'DAILY_REPORT_WORKFLOW', params: { type: 'weekly', source: 'cron' } },
    ]);
    assert.equal(waited.length, 2);
  });

  it('unknown or missing cron starts nothing and warns', async () => {
    for (const controller of [{ cron: '5 5 * * *' }, {}, undefined]) {
      const { calls, env, ctx, waited } = createHarness();
      await scheduled(controller, env, ctx);
      assert.deepEqual(calls, []);
      assert.deepEqual(waited, []);
    }
    assert.equal(warnings.length, 3);
  });

  it('RESUME_SYNC_CRON_DRY_RUN=false disables dry run, anything else keeps it', async () => {
    const cases = [
      ['false', false],
      ['FALSE', false],
      ['true', true],
      ['0', true],
      ['', true],
      [undefined, true],
    ];
    for (const [value, expected] of cases) {
      const { calls, env, ctx } = createHarness(
        value === undefined ? {} : { RESUME_SYNC_CRON_DRY_RUN: value }
      );
      await scheduled({ cron: RESUME_SYNC_CRON }, env, ctx);
      const sync = calls.find((c) => c.name === 'RESUME_SYNC_WORKFLOW');
      assert.equal(sync.params.dryRun, expected, `value ${JSON.stringify(value)}`);
    }
  });

  it('a rejecting workflow does not stop the others and scheduled() rejects after', async () => {
    const { calls, env, ctx, waited } = createHarness({}, ['RESUME_SYNC_WORKFLOW']);
    await assert.rejects(scheduled({ cron: RESUME_SYNC_CRON }, env, ctx), /RESUME_SYNC_WORKFLOW/);
    assert.deepEqual(startedNames(calls), ['CLEANUP_WORKFLOW', 'RESUME_SYNC_WORKFLOW']);
    assert.equal(waited.length, 2);
  });

  it('a missing binding fails the run but still starts the other workflow', async () => {
    const { calls, env, ctx } = createHarness({ RESUME_SYNC_WORKFLOW: undefined });
    await assert.rejects(scheduled({ cron: RESUME_SYNC_CRON }, env, ctx), /RESUME_SYNC_WORKFLOW/);
    assert.deepEqual(startedNames(calls), ['CLEANUP_WORKFLOW']);

    const missingCleanup = createHarness({ CLEANUP_WORKFLOW: undefined });
    await assert.rejects(
      scheduled({ cron: RESUME_SYNC_CRON }, missingCleanup.env, missingCleanup.ctx),
      /CLEANUP_WORKFLOW/
    );
    assert.deepEqual(startedNames(missingCleanup.calls), ['RESUME_SYNC_WORKFLOW']);
  });

  it('names every failed workflow in the thrown error', async () => {
    const { env, ctx } = createHarness({}, ['RESUME_SYNC_WORKFLOW', 'CLEANUP_WORKFLOW']);
    await assert.rejects(scheduled({ cron: RESUME_SYNC_CRON }, env, ctx), (error) => {
      assert.match(error.message, /RESUME_SYNC_WORKFLOW/);
      assert.match(error.message, /CLEANUP_WORKFLOW/);
      return true;
    });
  });
});
