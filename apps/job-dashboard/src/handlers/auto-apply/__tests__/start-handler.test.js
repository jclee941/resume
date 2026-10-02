import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { startAutoApply } from '../start-handler.js';

const ENABLED = {
  auto_apply_enabled: 'true',
  max_daily_applications: '7',
  min_match_score: '65',
  auto_apply_keywords: JSON.stringify(['DevOps', 'SRE']),
};
const DISABLED = { ...ENABLED, auto_apply_enabled: 'false' };

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

function createHarness(config, { failing = false, extraEnv = {} } = {}) {
  const creates = [];
  const env = {
    JOB_DB: createConfigDb(config, { failing }),
    APPLICATION_WORKFLOW: {
      async create(options) {
        creates.push(options.params);
        return { id: 'instance-1' };
      },
    },
    ...extraEnv,
  };
  return { creates, env };
}

function post(body) {
  return new Request('https://resume.jclee.me/job/api/auto-apply/start', {
    method: 'POST',
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

describe('startAutoApply', () => {
  it('creates a dry-run instance with the cron params even when auto-apply is disabled', async () => {
    const { creates, env } = createHarness(DISABLED);
    const response = await startAutoApply({ request: post({ dryRun: true }), env });

    assert.equal(response.status, 202);
    assert.deepEqual(await response.json(), {
      success: true,
      instanceId: 'instance-1',
      dryRun: true,
    });
    assert.deepEqual(creates, [
      {
        triggerType: 'dashboard-auto-apply',
        source: 'dashboard',
        platforms: ['wanted', 'remember'],
        searchCriteria: { keywords: ['DevOps', 'SRE'], keyword: 'DevOps' },
        minMatchScore: 65,
        maxDailyApplications: 7,
        dryRun: true,
        autoApprove: true,
        autoApproveThreshold: 65,
      },
    ]);
  });

  it('defaults to a dry run when the body has no dryRun', async () => {
    const { creates, env } = createHarness(ENABLED);
    const response = await startAutoApply({ request: post(undefined), env });

    assert.equal(response.status, 202);
    assert.equal(creates.length, 1);
    assert.equal(creates[0].dryRun, true);
  });

  it('rejects a live run with 409 and creates nothing when auto-apply is disabled', async () => {
    const { creates, env } = createHarness(DISABLED);
    const response = await startAutoApply({ request: post({ dryRun: false }), env });

    assert.equal(response.status, 409);
    assert.deepEqual(await response.json(), { success: false, error: 'auto-apply is disabled' });
    assert.deepEqual(creates, []);
  });

  it('rejects a live run with 409 when the cron switch is off', async () => {
    const { creates, env } = createHarness(ENABLED, {
      extraEnv: { AUTO_APPLY_CRON_ENABLED: 'false' },
    });
    const response = await startAutoApply({ request: post({ dryRun: false }), env });

    assert.equal(response.status, 409);
    assert.deepEqual(creates, []);
  });

  it('creates a live instance with autoApprove and the min score threshold when enabled', async () => {
    const { creates, env } = createHarness(ENABLED);
    const response = await startAutoApply({ request: post({ dryRun: false }), env });

    assert.equal(response.status, 202);
    assert.deepEqual(await response.json(), {
      success: true,
      instanceId: 'instance-1',
      dryRun: false,
    });
    assert.equal(creates.length, 1);
    assert.equal(creates[0].dryRun, false);
    assert.equal(creates[0].autoApprove, true);
    assert.equal(creates[0].autoApproveThreshold, 65);
    assert.equal(creates[0].autoApproveThreshold, creates[0].minMatchScore);
    assert.equal(creates[0].triggerType, 'dashboard-auto-apply');
    assert.equal(creates[0].source, 'dashboard');
  });

  it('answers 503 and creates nothing when the D1 config cannot be read', async () => {
    for (const dryRun of [true, false]) {
      const { creates, env } = createHarness(ENABLED, { failing: true });
      const response = await startAutoApply({ request: post({ dryRun }), env });

      assert.equal(response.status, 503);
      assert.equal((await response.json()).success, false);
      assert.deepEqual(creates, []);
    }
  });

  it('rejects a non-boolean dryRun with 400', async () => {
    const { creates, env } = createHarness(ENABLED);
    const response = await startAutoApply({ request: post({ dryRun: 'false' }), env });

    assert.equal(response.status, 400);
    assert.deepEqual(creates, []);
  });
});
