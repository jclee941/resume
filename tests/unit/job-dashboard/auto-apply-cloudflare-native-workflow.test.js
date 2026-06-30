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

describe('job-dashboard Cloudflare native application workflow', () => {
  let runApplicationWorkflow;

  beforeAll(async () => {
    ({ runApplicationWorkflow } = await import(
      '../../../apps/job-dashboard/src/workflows/application/workflow-runner.js'
    ));
  });

  test('Application Workflow handles explicit JobKorea candidates as native handoff', async () => {
    const { calls, ctx, step } = createWorkflowHarness();
    const result = await runNativeWorkflow(runApplicationWorkflow, ctx, step, makeNativeCandidate());

    expectNativeHandoff(result);
    expect(calls).toEqual({ search: 0, submit: 1, record: 0 });
  });

  test('Application Workflow normalizes mixed-case JobKorea candidates as native handoff', async () => {
    const { calls, ctx, step } = createWorkflowHarness();
    const result = await runNativeWorkflow(
      runApplicationWorkflow,
      ctx,
      step,
      makeNativeCandidate({ source: 'JobKorea' })
    );

    expectNativeHandoff(result);
    expect(calls).toEqual({ search: 0, submit: 1, record: 0 });
  });
});

function runNativeWorkflow(runApplicationWorkflow, ctx, step, candidate) {
  return runApplicationWorkflow(
    ctx,
    {
      payload: {
        triggerType: 'cf-native-auto-apply',
        candidates: [candidate],
        dryRun: false,
        maxDailyApplications: 1,
      },
    },
    step
  );
}

function expectNativeHandoff(result) {
  expect(result.success).toBe(true);
  expect(result.workflow.status).toBe('completed');
  expect(result.applications).toEqual([
    expect.objectContaining({
      success: true,
      action: 'handoff_required',
      status: 'handoff-required',
      platform: 'jobkorea',
      networkWrite: false,
    }),
  ]);
}

function createWorkflowHarness() {
  const calls = { search: 0, submit: 0, record: 0 };
  return {
    calls,
    ctx: {
      env: { JOB_DB: createEmptyApplicationsDb() },
      async saveWorkflowState() {},
      async logWorkflowStep() {},
      async getDailyApplicationCount() {
        return 0;
      },
      async getMatchingConfig() {
        return { keywords: ['security'] };
      },
      async createApprovalRequest(_workflowId, job, status) {
        expect(job.source).toBe('jobkorea');
        expect(status).toBe('approved');
        return `approval-${job.id}`;
      },
      async getApprovalStatus() {
        return 'approved';
      },
      async sendApprovalRequestNotification() {},
      async searchJobs() {
        calls.search += 1;
        throw new Error('explicit candidates must not search');
      },
      async generateCoverLetter() {
        return 'cover letter';
      },
      async getResume() {
        return { id: 'resume-master' };
      },
      async submitApplication({ platform }) {
        calls.submit += 1;
        expect(platform).toBe('jobkorea');
        return {
          success: false,
          requiresJobServer: true,
          requiresBrowserAutomation: true,
          error: 'JobKorea requires browser automation',
        };
      },
      async recordApplication() {
        calls.record += 1;
      },
    },
    step: {
      async do(_name, _options, callback) {
        return callback();
      },
      async sleep() {},
    },
  };
}

function createEmptyApplicationsDb() {
  return {
    prepare(query) {
      if (query.includes('SELECT id FROM applications')) {
        return {
          bind() {
            return { first: async () => null };
          },
        };
      }
      throw new Error(`Unexpected query: ${query}`);
    },
  };
}
