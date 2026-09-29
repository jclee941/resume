import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';

import * as cronRouter from '../cron-router.js';

const { HEALTH_CHECK_CRON, RESUME_SYNC_CRON, scheduled } = cronRouter;
const MONDAY_MIDNIGHT = Date.UTC(2026, 9, 5, 0, 0);
const TUESDAY_AFTERNOON = Date.UTC(2026, 8, 29, 14, 0);

const BINDINGS = [
  'RESUME_SYNC_WORKFLOW',
  'CLEANUP_WORKFLOW',
  'HEALTH_CHECK_WORKFLOW',
  'DAILY_REPORT_WORKFLOW',
];

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

function startedNames(calls) {
  return calls.map((call) => call.name).sort();
}

describe('cron-router', () => {
  const originalFetch = globalThis.fetch;
  const originalWarn = console.warn;
  let warnings;

  beforeEach(() => {
    warnings = [];
    globalThis.fetch = () => {
      throw new Error('network access is not allowed in cron-router tests');
    };
    console.warn = (...args) => warnings.push(args);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    console.warn = originalWarn;
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
