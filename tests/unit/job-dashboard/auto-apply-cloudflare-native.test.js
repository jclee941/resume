const {
  createMockDb,
  createRequest,
  parseJson,
} = require('./auto-apply-run-handler-fixtures.js');

let runAutoApply;

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

describe('job-dashboard Cloudflare native auto-apply', () => {
  beforeAll(async () => {
    ({ runAutoApply } = await import('../../../apps/job-dashboard/src/handlers/auto-apply/run-handler.js'));
  });

  test('runAutoApply dispatches Cloudflare native requests to Application Workflow', async () => {
    const create = jest.fn(async () => ({ id: 'wf-native-1' }));
    const response = await runAutoApply({
      request: createRequest({
        cloudflareNative: true,
        dryRun: false,
        explicitSubmit: true,
        submitOptIn: true,
        approvalId: 'approval-jobkorea-49043911',
        candidates: [makeNativeCandidate()],
        maxApplications: 1,
      }),
      env: createNativeEnv({ create }),
      clients: {},
    });
    const body = await parseJson(response);

    expect(response.status).toBe(202);
    expect(body).toMatchObject({ success: true, accepted: true, dispatch: 'workflow', instanceId: 'wf-native-1' });
    expect(create).toHaveBeenCalledWith({
      params: expect.objectContaining({
        triggerType: 'cf-native-auto-apply',
        dryRun: false,
        maxDailyApplications: 1,
        platforms: ['jobkorea'],
        candidates: [expect.objectContaining({ source: 'jobkorea' })],
        source: 'cf-native',
      }),
    });
  });

  test('runAutoApply automatically dispatches approved JobKorea real submits to Cloudflare native', async () => {
    const create = jest.fn(async () => ({ id: 'wf-auto-native-1' }));
    const response = await runAutoApply({
      request: createRequest({
        dryRun: false,
        explicitSubmit: true,
        submitOptIn: true,
        approvalId: 'approval-jobkorea-49043911',
        candidates: [makeNativeCandidate()],
      }),
      env: createNativeEnv({ create }),
      clients: {},
    });
    const body = await parseJson(response);

    expect(response.status).toBe(202);
    expect(body).toMatchObject({ success: true, accepted: true, dispatch: 'workflow', instanceId: 'wf-auto-native-1' });
    expect(create).toHaveBeenCalledWith({
      params: expect.objectContaining({
        dryRun: false,
        explicitSubmit: true,
        submitOptIn: true,
        candidates: [expect.objectContaining({ source: 'jobkorea' })],
      }),
    });
  });

  test('runAutoApply automatically dispatches mixed-case JobKorea real submits to Cloudflare native', async () => {
    const create = jest.fn(async () => ({ id: 'wf-auto-native-mixed-case' }));
    const response = await runAutoApply({
      request: createRequest({
        dryRun: false,
        explicitSubmit: true,
        submitOptIn: true,
        approvalId: 'approval-jobkorea-49043911',
        candidates: [makeNativeCandidate({ source: 'JobKorea' })],
      }),
      env: createNativeEnv({ create }),
      clients: {},
    });
    const body = await parseJson(response);

    expect(response.status).toBe(202);
    expect(body).toMatchObject({ success: true, accepted: true, dispatch: 'workflow', instanceId: 'wf-auto-native-mixed-case' });
    expect(create).toHaveBeenCalledWith({
      params: expect.objectContaining({
        platforms: ['jobkorea'],
        candidates: [expect.objectContaining({ source: 'jobkorea' })],
      }),
    });
  });

  test('runAutoApply accepts platform-only native candidates before auto-dispatch', async () => {
    const create = jest.fn(async () => ({ id: 'wf-auto-native-platform-only' }));
    const response = await runAutoApply({
      request: createRequest({
        dryRun: false,
        explicitSubmit: true,
        submitOptIn: true,
        approvalId: 'approval-jobkorea-49043911',
        candidates: [makeNativeCandidate({ source: undefined, platform: 'JobKorea' })],
      }),
      env: createNativeEnv({ create }),
      clients: {},
    });
    const body = await parseJson(response);

    expect(response.status).toBe(202);
    expect(body).toMatchObject({ success: true, accepted: true, dispatch: 'workflow', instanceId: 'wf-auto-native-platform-only' });
    expect(create).toHaveBeenCalledWith({
      params: expect.objectContaining({
        platforms: ['jobkorea'],
        candidates: [expect.objectContaining({ source: 'jobkorea', platform: 'JobKorea' })],
      }),
    });
  });

  test('runAutoApply forwards explicitCandidates alias into native workflow payload', async () => {
    const create = jest.fn(async () => ({ id: 'wf-auto-native-explicit-alias' }));
    const response = await runAutoApply({
      request: createRequest({
        dryRun: false,
        explicitSubmit: true,
        submitOptIn: true,
        approvalId: 'approval-jobkorea-49043911',
        explicitCandidates: [makeNativeCandidate({ source: 'JobKorea' })],
      }),
      env: createNativeEnv({ create }),
      clients: {},
    });
    const body = await parseJson(response);

    expect(response.status).toBe(202);
    expect(body).toMatchObject({ success: true, accepted: true, dispatch: 'workflow', instanceId: 'wf-auto-native-explicit-alias' });
    expect(create).toHaveBeenCalledWith({
      params: expect.objectContaining({
        platforms: ['jobkorea'],
        candidates: [expect.objectContaining({ source: 'jobkorea' })],
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
