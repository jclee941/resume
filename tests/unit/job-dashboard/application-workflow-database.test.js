describe('Application Workflow persistence', () => {
  let saveWorkflowState;

  beforeAll(async () => {
    ({ saveWorkflowState } =
      await import('../../../apps/job-dashboard/src/workflows/application/database.js'));
  });

  test('binds null while a running workflow has no completion timestamp', async () => {
    const bindings = [];
    const ctx = {
      env: {
        JOB_DB: {
          prepare() {
            return {
              bind(...values) {
                bindings.push(...values);
                return { run: async () => ({ success: true }) };
              },
            };
          },
        },
      },
    };

    await saveWorkflowState(ctx, {
      id: 'workflow-test',
      status: 'running',
      triggerType: 'cf-native-auto-apply',
      stats: {
        jobsFound: 0,
        jobsApproved: 0,
        jobsApplied: 0,
        jobsFailed: 0,
      },
      startedAt: '2026-08-31T00:00:00.000Z',
      steps: [],
      errors: [],
    });

    expect(bindings[8]).toBeNull();
  });
});
