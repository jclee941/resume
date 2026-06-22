import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';

import { notifications } from '../../../shared/services/notifications/index.js';
import { applyToJob, applyToWanted } from '../wanted-strategy.js';
import {
  WANTED_PLATFORM,
  configureWantedSession,
  createMemorySessionStore,
  createWantedApi,
  resetWantedApplyState,
  resetWantedSession,
} from './wanted-test-doubles.js';

function createContext(overrides = {}) {
  const applications = [];
  const statusUpdates = [];

  return {
    applications,
    statusUpdates,
    ctx: {
      config: { delayBetweenApps: 0 },
      logger: {
        info: mock.fn(),
        error: mock.fn(),
        warn: mock.fn(),
        debug: mock.fn(),
      },
      appManager: {
        addApplication: mock.fn((job, data) => {
          const application = {
            id: `tracked-${job.id}`,
            job,
            ...data,
          };
          applications.push(application);
          return application;
        }),
        updateStatus: mock.fn((id, status, note) => {
          statusUpdates.push({ id, status, note });
        }),
        recordRetryMetric: mock.fn(),
      },
      statsService: {
        recordApplyRetryMetric: mock.fn(),
      },
      ...overrides,
    },
  };
}

function createWantedJob(id) {
  return {
    id,
    company: 'Wanted Test Co',
    title: 'Platform Engineer',
    source: WANTED_PLATFORM,
    sourceUrl: `https://www.wanted.co.kr/wd/${String(id).replace(/^wanted_/, '')}`,
  };
}

describe('Wanted job ID validation', () => {
  let store;
  let api;

  beforeEach(() => {
    resetWantedApplyState();
    api = createWantedApi();
    store = createMemorySessionStore({
      email: 'applicant@example.com',
      username: 'Test Applicant',
      mobile: '010-0000-0000',
      cookies: 'wanted_session=test',
    });

    configureWantedSession({ api, store });
    mock.method(notifications, 'notifyApplySuccess', async () => {});
    mock.method(notifications, 'notifyApplyFailed', async () => {});
  });

  afterEach(() => {
    resetWantedSession();
    mock.restoreAll();
  });

  it('rejects malformed wanted_ IDs locally before session, API, browser, or app tracking work', async () => {
    const page = {
      goto: mock.fn(async () => {}),
      evaluate: mock.fn(async () => ({ ok: true, status: 200, body: { id: 'browser-app' } })),
    };
    const { ctx } = createContext({
      page,
      findByText: mock.fn(async () => null),
    });

    const result = await applyToWanted.call(ctx, createWantedJob('wanted_bad'));

    assert.equal(store.calls.load.length, 0, 'session store should not be read for malformed Wanted job IDs');
    assert.equal(api.calls.getProfile, 0, 'session validation should not call the Wanted API');
    assert.equal(api.calls.chaosRequest.length, 0, 'malformed IDs should not reach Wanted API requests');
    assert.equal(page.goto.mock.callCount(), 0, 'malformed IDs should not open the browser flow');
    assert.equal(page.evaluate.mock.callCount(), 0, 'malformed IDs should not submit from the browser');
    assert.equal(ctx.appManager.addApplication.mock.callCount(), 0, 'malformed IDs should not be tracked');
    assert.equal(result.success, false);
    assert.equal(result.applicationId, null);
    assert.equal(result.retryable, false);
    assert.match(result.error, /wanted|job\.id|invalid|malformed/i);
  });

  it('submits numeric Wanted IDs through the mocked API fallback', async () => {
    const { ctx, applications, statusUpdates } = createContext();

    const result = await applyToWanted.call(ctx, createWantedJob(123456));

    const applicationRequest = api.calls.chaosRequest.find((call) => call.path === '/applications/v1');
    assert.equal(result.success, true);
    assert.equal(result.applicationId, 'application-123456');
    assert.equal(applicationRequest.options.method, 'POST');
    assert.equal(applicationRequest.options.body.job_id, 123456);
    assert.equal(applications.length, 1);
    assert.equal(statusUpdates.length, 1);
  });

  it('submits wanted_ prefixed numeric IDs through the mocked API fallback', async () => {
    const { ctx, applications, statusUpdates } = createContext();

    const result = await applyToWanted.call(ctx, createWantedJob('wanted_789012'));

    const applicationRequest = api.calls.chaosRequest.find((call) => call.path === '/applications/v1');
    assert.equal(result.success, true);
    assert.equal(result.applicationId, 'application-789012');
    assert.equal(applicationRequest.options.method, 'POST');
    assert.equal(applicationRequest.options.body.job_id, 789012);
    assert.equal(applications.length, 1);
    assert.equal(statusUpdates.length, 1);
  });

  it('reconstructs browser navigation from the validated Wanted ID', async () => {
    const page = {
      goto: mock.fn(async () => {}),
      evaluate: mock.fn(async () => ({ ok: true, status: 200, body: { id: 'browser-app' } })),
    };
    const { ctx } = createContext({
      page,
      findByText: mock.fn(async () => null),
    });
    const job = {
      ...createWantedJob('wanted_321'),
      sourceUrl: 'https://evil.example/apply',
    };

    const result = await applyToWanted.call(ctx, job);

    assert.equal(result.success, true);
    assert.equal(page.goto.mock.calls[0].arguments[0], 'https://www.wanted.co.kr/wd/321');
  });

  it('keeps protected payload fields from validated data when extra payload conflicts', async () => {
    const { ctx } = createContext();

    const result = await applyToJob.call(ctx, createWantedJob('wanted_654'), {
      extraPayload: {
        job_id: 999,
        resume_keys: ['wrong'],
        status: 'draft',
        nationality_code: 'KR',
      },
    });

    const applicationRequest = api.calls.chaosRequest.find((call) => call.path === '/applications/v1');
    assert.equal(result.success, true);
    assert.equal(applicationRequest.options.body.job_id, 654);
    assert.deepEqual(applicationRequest.options.body.resume_keys, ['resume-key-1']);
    assert.equal(applicationRequest.options.body.status, 'apply');
  });
});
