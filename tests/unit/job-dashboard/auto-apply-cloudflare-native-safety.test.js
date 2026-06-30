const {
  createMockDb,
  createRequest,
  parseJson,
} = require('./auto-apply-run-handler-fixtures.js');

let runAutoApply, QueueWorkflowDispatcher, MESSAGE_TYPES;

function makeNativeCandidate(overrides = {}) {
  return {
    id: 'jobkorea-49043911',
    source: 'jobkorea',
    company: 'Native Queue Co',
    position: 'Security Engineer',
    sourceUrl: 'https://www.jobkorea.co.kr/Recruit/GI_Read/49043911',
    approvalId: 'approval-jobkorea-49043911',
    matchScore: 91,
    ...overrides,
  };
}

describe('job-dashboard Cloudflare native auto-apply safety gates', () => {
  beforeAll(async () => {
    ({ runAutoApply } = await import('../../../apps/job-dashboard/src/handlers/auto-apply/run-handler.js'));
    ({ QueueWorkflowDispatcher } = await import('../../../apps/job-dashboard/src/queues/queue-workflow-dispatcher.js'));
    ({ MESSAGE_TYPES } = await import('../../../apps/job-dashboard/src/queues/queue-message-constants.js'));
  });

  test('runAutoApply rejects native real submits when auto-apply is disabled', async () => {
    const create = jest.fn(async () => ({ id: 'wf-auto-native-disabled' }));
    const response = await runAutoApply({
      request: createRequest({
        dryRun: false,
        explicitSubmit: true,
        submitOptIn: true,
        approvalId: 'approval-jobkorea-49043911',
        candidates: [makeNativeCandidate()],
      }),
      env: createNativeEnv({ create, autoApplyEnabled: false }),
      clients: {},
    });
    const body = await parseJson(response);

    expect(response.status).toBe(400);
    expect(body).toMatchObject({ success: false, error: 'Auto-apply is disabled' });
    expect(create).not.toHaveBeenCalled();
  });

  test('runAutoApply rejects unsupported explicit native platforms before workflow dispatch', async () => {
    const create = jest.fn(async () => ({ id: 'wf-auto-native-unsupported' }));
    const response = await runAutoApply({
      request: createRequest({
        cloudflareNative: true,
        dryRun: false,
        explicitSubmit: true,
        submitOptIn: true,
        approvalId: 'approval-greenhouse-1',
        candidates: [
          makeNativeCandidate({
            id: 'greenhouse-1',
            source: 'greenhouse',
            approvalId: 'approval-greenhouse-1',
          }),
        ],
      }),
      env: createNativeEnv({ create }),
      clients: {},
    });
    const body = await parseJson(response);

    expect(response.status).toBe(400);
    expect(body).toMatchObject({ success: false, errorCode: 'UNSUPPORTED_CF_NATIVE_PLATFORM' });
    expect(create).not.toHaveBeenCalled();
  });

  test('automatic Cloudflare native dispatch still enforces real submit approval', async () => {
    const create = jest.fn(async () => ({ id: 'wf-auto-native-should-not-run' }));
    const response = await runAutoApply({
      request: createRequest({ dryRun: false, candidates: [makeNativeCandidate()] }),
      env: createNativeEnv({ create }),
      clients: {},
    });
    const body = await parseJson(response);

    expect(response.status).toBe(400);
    expect(body).toMatchObject({ success: false, errorCode: 'REAL_SUBMIT_APPROVAL_REQUIRED' });
    expect(create).not.toHaveBeenCalled();
  });

  test('runAutoApply can enqueue Cloudflare native requests when CRAWL_TASKS is bound', async () => {
    const send = jest.fn(async () => {});
    const response = await runAutoApply({
      request: createRequest({ mode: 'queue', dryRun: true, candidates: [makeNativeCandidate()] }),
      env: { CRAWL_TASKS: { send } },
      clients: {},
    });
    const body = await parseJson(response);

    expect(response.status).toBe(202);
    expect(body.dispatch).toBe('queue');
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        type: MESSAGE_TYPES.APPLY,
        payload: expect.objectContaining({
          candidates: [expect.objectContaining({ source: 'jobkorea' })],
        }),
      })
    );
  });

  test('QueueWorkflowDispatcher forwards full apply payloads to Application Workflow', async () => {
    const create = jest.fn(async () => ({ id: 'wf-from-queue' }));
    const logger = { info: jest.fn(), warn: jest.fn() };
    const dispatcher = new QueueWorkflowDispatcher({ APPLICATION_WORKFLOW: { create } }, logger);

    await dispatcher.dispatch(MESSAGE_TYPES.APPLY, {
      triggerType: 'cf-native-auto-apply',
      candidates: [makeNativeCandidate()],
      dryRun: true,
    });

    expect(create).toHaveBeenCalledWith({
      params: expect.objectContaining({
        triggerType: 'cf-native-auto-apply',
        candidates: [expect.objectContaining({ source: 'jobkorea' })],
        source: 'queue',
      }),
    });
  });
});

function createNativeEnv({ create, autoApplyEnabled = true }) {
  return {
    DB: createConfigDb(autoApplyEnabled),
    APPLICATION_WORKFLOW: { create },
  };
}

function createConfigDb(autoApplyEnabled) {
  if (autoApplyEnabled) return createMockDb();
  const enabledDb = createMockDb();
  return {
    recorded: enabledDb.recorded,
    prepare(query) {
      if (query.includes('SELECT key, value FROM config')) {
        return {
          bind() {
            return {
              all: async () => ({
                results: [
                  { key: 'auto_apply_enabled', value: 'false' },
                  { key: 'max_daily_applications', value: '5' },
                  { key: 'min_match_score', value: '1' },
                  { key: 'auto_apply_keywords', value: JSON.stringify(['DevOps']) },
                ],
              }),
            };
          },
        };
      }
      return enabledDb.prepare(query);
    },
  };
}
