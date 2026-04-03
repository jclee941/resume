import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import fastifyCookie from '@fastify/cookie';

import authPlugin from '../../plugins/auth.js';
import autoApplyRoutes from '../auto-apply.js';

function createSchedulerStub(overrides = {}) {
  const state = {
    started: true,
    running: false,
    nextRun: '2030-01-01T00:00:00.000Z',
    schedule: {
      enabled: true,
      cron: '0 */6 * * *',
      timezone: 'Asia/Seoul',
      preventOverlapping: true,
      timeout: 300000,
    },
    lastRun: null,
    lastResult: null,
    lastError: null,
    stats: {
      totalRuns: 0,
      successRuns: 0,
      failedRuns: 0,
      skippedOverlaps: 0,
      manualTriggers: 0,
      averageDurationMs: 0,
      lastDurationMs: null,
    },
    history: [],
  };

  const scheduler = {
    config: { ...state.schedule },
    startCalls: 0,
    stopCalls: 0,
    triggerCalls: [],
    getStatus() {
      return {
        schedule: { ...state.schedule },
        nextRun: state.nextRun,
        started: state.started,
        running: state.running,
        lastRun: state.lastRun,
        lastResult: state.lastResult,
        lastError: state.lastError,
        stats: { ...state.stats },
        history: [...state.history],
      };
    },
    updateConfig(updates = {}) {
      if (updates.cron === 'invalid cron') {
        throw new Error('Invalid cron expression');
      }
      state.schedule = { ...state.schedule, ...updates };
      this.config = { ...state.schedule };
      return this.getStatus();
    },
    start() {
      this.startCalls += 1;
      state.started = true;
      return this.getStatus();
    },
    stop() {
      this.stopCalls += 1;
      state.started = false;
      return this.getStatus();
    },
    isRunning() {
      return state.running;
    },
    trigger(payload = {}) {
      this.triggerCalls.push(payload);
      return Promise.resolve({ success: true, runId: 'run-123' });
    },
    __setRunning(value) {
      state.running = value;
    },
    __setStatus(next) {
      if (typeof next.running === 'boolean') state.running = next.running;
      if (next.lastResult !== undefined) state.lastResult = next.lastResult;
      if (next.lastError !== undefined) state.lastError = next.lastError;
      if (next.lastRun !== undefined) state.lastRun = next.lastRun;
      if (next.nextRun !== undefined) state.nextRun = next.nextRun;
      if (next.stats !== undefined) state.stats = { ...state.stats, ...next.stats };
      if (next.history !== undefined) state.history = [...next.history];
    },
  };

  if (overrides.isRunning) {
    scheduler.isRunning = overrides.isRunning;
  }
  if (overrides.trigger) {
    scheduler.trigger = overrides.trigger;
  }
  if (overrides.updateConfig) {
    scheduler.updateConfig = overrides.updateConfig;
  }
  if (overrides.config) {
    scheduler.config = { ...scheduler.config, ...overrides.config };
  }

  return scheduler;
}

async function buildApp(scheduler) {
  const app = Fastify({ logger: false });

  app.decorate('autoApplyScheduler', scheduler);
  await app.register(fastifyCookie);
  await app.register(authPlugin);
  await app.register(autoApplyRoutes, { prefix: '/api/auto-apply' });

  await app.ready();
  return app;
}

describe('auto-apply routes', () => {
  const originalAdminToken = process.env.ADMIN_TOKEN;
  const validToken = 'test-token';

  beforeEach(() => {
    process.env.ADMIN_TOKEN = validToken;
  });

  afterEach(() => {
    if (typeof originalAdminToken === 'string') {
      process.env.ADMIN_TOKEN = originalAdminToken;
    } else {
      delete process.env.ADMIN_TOKEN;
    }
  });

  describe('authentication', () => {
    it('rejects requests without auth token', async () => {
      const app = await buildApp(createSchedulerStub());

      const response = await app.inject({
        method: 'GET',
        url: '/api/auto-apply/status',
      });

      assert.equal(response.statusCode, 401);
      assert.deepEqual(response.json(), { error: 'Unauthorized' });
      await app.close();
    });

    it('rejects invalid bearer tokens', async () => {
      const app = await buildApp(createSchedulerStub());

      const response = await app.inject({
        method: 'GET',
        url: '/api/auto-apply/status',
        headers: { authorization: 'Bearer wrong-token' },
      });

      assert.equal(response.statusCode, 401);
      assert.deepEqual(response.json(), { error: 'Unauthorized' });
      await app.close();
    });

    it('accepts valid bearer token auth', async () => {
      const app = await buildApp(createSchedulerStub());

      const response = await app.inject({
        method: 'GET',
        url: '/api/auto-apply/status',
        headers: { authorization: `Bearer ${validToken}` },
      });

      assert.equal(response.statusCode, 200);
      await app.close();
    });
  });

  describe('schedule endpoints', () => {
    it('GET /schedule returns current schedule config', async () => {
      const scheduler = createSchedulerStub();
      const app = await buildApp(scheduler);

      const response = await app.inject({
        method: 'GET',
        url: '/api/auto-apply/schedule',
        headers: { authorization: `Bearer ${validToken}` },
      });

      assert.equal(response.statusCode, 200);
      const body = response.json();
      assert.equal(body.success, true);
      assert.equal(body.schedule.enabled, true);
      assert.equal(body.schedule.cron, '0 */6 * * *');
      assert.equal(body.running, false);
      assert.equal(typeof body.nextRun, 'string');

      await app.close();
    });

    it('POST /schedule updates schedule with valid config', async () => {
      const scheduler = createSchedulerStub();
      const app = await buildApp(scheduler);

      const response = await app.inject({
        method: 'POST',
        url: '/api/auto-apply/schedule',
        headers: {
          authorization: `Bearer ${validToken}`,
          'content-type': 'application/json',
        },
        payload: {
          cron: '*/30 * * * *',
          enabled: false,
          timezone: 'UTC',
        },
      });

      assert.equal(response.statusCode, 200);
      const body = response.json();
      assert.equal(body.success, true);
      assert.equal(body.message, 'Scheduler updated');
      assert.equal(body.schedule.cron, '*/30 * * * *');
      assert.equal(body.schedule.enabled, false);
      assert.equal(body.schedule.timezone, 'UTC');

      await app.close();
    });

    it('POST /schedule rejects invalid cron expressions', async () => {
      const scheduler = createSchedulerStub();
      const app = await buildApp(scheduler);

      const response = await app.inject({
        method: 'POST',
        url: '/api/auto-apply/schedule',
        headers: {
          authorization: `Bearer ${validToken}`,
          'content-type': 'application/json',
        },
        payload: {
          cron: 'invalid cron',
        },
      });

      assert.equal(response.statusCode, 400);
      const body = response.json();
      assert.equal(body.success, false);
      assert.equal(body.error, 'Invalid cron expression');

      await app.close();
    });
  });

  describe('trigger endpoint', () => {
    it('POST /trigger starts async auto-apply run and returns 202', async () => {
      const scheduler = createSchedulerStub();
      const app = await buildApp(scheduler);

      const response = await app.inject({
        method: 'POST',
        url: '/api/auto-apply/trigger',
        headers: {
          authorization: `Bearer ${validToken}`,
          'content-type': 'application/json',
        },
        payload: { dryRun: false },
      });

      assert.equal(response.statusCode, 202);
      const body = response.json();
      assert.equal(body.success, true);
      assert.equal(body.status, 'running');
      assert.equal(body.message, 'Auto-apply manually triggered');

      assert.equal(scheduler.triggerCalls.length, 1);
      assert.deepEqual(scheduler.triggerCalls[0], {
        source: 'api',
        options: { dryRun: false },
      });

      await app.close();
    });

    it('POST /trigger prevents overlapping runs with 409', async () => {
      const scheduler = createSchedulerStub();
      scheduler.__setRunning(true);
      scheduler.config.preventOverlapping = true;
      const app = await buildApp(scheduler);

      const response = await app.inject({
        method: 'POST',
        url: '/api/auto-apply/trigger',
        headers: { authorization: `Bearer ${validToken}` },
      });

      assert.equal(response.statusCode, 409);
      assert.deepEqual(response.json(), {
        success: false,
        status: 'running',
        message: 'Auto-apply already running; overlapping run prevented',
      });

      assert.equal(scheduler.triggerCalls.length, 0);
      await app.close();
    });

    it('POST /trigger passes dryRun parameter to scheduler trigger options', async () => {
      const scheduler = createSchedulerStub();
      const app = await buildApp(scheduler);

      await app.inject({
        method: 'POST',
        url: '/api/auto-apply/trigger',
        headers: {
          authorization: `Bearer ${validToken}`,
          'content-type': 'application/json',
        },
        payload: { dryRun: true, maxApplications: 5 },
      });

      assert.deepEqual(scheduler.triggerCalls[0], {
        source: 'api',
        options: { dryRun: true, maxApplications: 5 },
      });

      await app.close();
    });
  });

  describe('status endpoint', () => {
    it('GET /status returns status with running state, stats, and history when idle', async () => {
      const scheduler = createSchedulerStub();
      scheduler.__setStatus({
        running: false,
        stats: { totalRuns: 3, successRuns: 2, failedRuns: 1 },
        history: [{ source: 'api', status: 'completed', success: true }],
      });
      const app = await buildApp(scheduler);

      const response = await app.inject({
        method: 'GET',
        url: '/api/auto-apply/status',
        headers: { authorization: `Bearer ${validToken}` },
      });

      assert.equal(response.statusCode, 200);
      const body = response.json();
      assert.equal(body.status, 'idle');
      assert.equal(body.running, false);
      assert.equal(body.isRunning, false);
      assert.equal(body.stats.totalRuns, 3);
      assert.equal(Array.isArray(body.history), true);
      assert.equal(body.history.length, 1);
      assert.equal(typeof body.uptime, 'number');
      assert.equal(typeof body.memoryUsage, 'number');

      await app.close();
    });

    it('GET /status returns 200 and running status when active', async () => {
      const scheduler = createSchedulerStub();
      scheduler.__setStatus({
        running: true,
        stats: { totalRuns: 5 },
      });
      const app = await buildApp(scheduler);

      const response = await app.inject({
        method: 'GET',
        url: '/api/auto-apply/status',
        headers: { authorization: `Bearer ${validToken}` },
      });

      assert.equal(response.statusCode, 200);
      const body = response.json();
      assert.equal(body.status, 'running');
      assert.equal(body.running, true);
      assert.equal(body.isRunning, true);

      await app.close();
    });
  });

  describe('legacy run endpoint', () => {
    it('POST /run starts auto-apply with configuration overrides', async () => {
      const scheduler = createSchedulerStub();
      const app = await buildApp(scheduler);

      const response = await app.inject({
        method: 'POST',
        url: '/api/auto-apply/run',
        headers: {
          authorization: `Bearer ${validToken}`,
          'content-type': 'application/json',
        },
        payload: {
          dryRun: false,
          maxApplications: 7,
          minMatchScore: 75,
        },
      });

      assert.equal(response.statusCode, 202);
      const body = response.json();
      assert.equal(body.success, true);
      assert.equal(body.message, 'Auto-apply started');
      assert.equal(body.status, 'running');

      assert.equal(scheduler.triggerCalls.length, 1);
      assert.deepEqual(scheduler.triggerCalls[0], {
        source: 'api',
        options: {
          dryRun: false,
          maxApplications: 7,
          minMatchScore: 75,
        },
      });

      await app.close();
    });

    it('POST /run returns 409 for overlapping execution attempts', async () => {
      const scheduler = createSchedulerStub();
      scheduler.__setRunning(true);
      scheduler.config.preventOverlapping = true;
      const app = await buildApp(scheduler);

      const response = await app.inject({
        method: 'POST',
        url: '/api/auto-apply/run',
        headers: { authorization: `Bearer ${validToken}` },
      });

      assert.equal(response.statusCode, 409);
      assert.deepEqual(response.json(), {
        success: false,
        status: 'running',
        message: 'Auto-apply already running; overlapping run prevented',
      });

      await app.close();
    });

    it('POST /run handles trigger failures asynchronously and still acknowledges request', async () => {
      const scheduler = createSchedulerStub({
        trigger(payload = {}) {
          this.triggerCalls.push(payload);
          return Promise.reject(new Error('run failed'));
        },
      });
      const app = await buildApp(scheduler);

      const response = await app.inject({
        method: 'POST',
        url: '/api/auto-apply/run',
        headers: {
          authorization: `Bearer ${validToken}`,
          'content-type': 'application/json',
        },
        payload: { dryRun: true },
      });

      assert.equal(response.statusCode, 202);
      const body = response.json();
      assert.equal(body.success, true);
      assert.equal(body.status, 'running');
      assert.equal(scheduler.triggerCalls.length, 1);

      await app.close();
    });
  });
});
