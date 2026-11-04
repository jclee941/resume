export function lifecycleStep() {
  const cache = new Map();
  const attempts = {};
  let depth = 0;
  const guard = () => {
    if (depth) throw new Error('Nested Workflow step API');
  };
  return {
    cache,
    attempts,
    async do(name, options, callback) {
      guard();
      if (cache.has(name)) return structuredClone(cache.get(name));
      for (let attempt = 0; ; attempt++) {
        attempts[name] = (attempts[name] || 0) + 1;
        depth++;
        try {
          const result = await callback();
          cache.set(name, structuredClone(result));
          return result;
        } catch (error) {
          if (attempt >= (options?.retries?.limit ?? 0)) throw error;
        } finally {
          depth--;
        }
      }
    },
    async sleep() {
      guard();
    },
  };
}

export function lifecycleContext(overrides = {}) {
  const observed = { states: [], submissions: 0, records: [], searches: [] };
  const ctx = {
    env: {
      JOB_DB: {
        prepare: () => ({
          all: async () => ({ results: [] }),
          bind: () => ({ first: async () => null }),
        }),
      },
    },
    async saveWorkflowState(workflow) {
      observed.states.push(structuredClone(workflow));
    },
    async logWorkflowStep() {},
    async getDailyApplicationCount() {
      return 0;
    },
    async getMatchingConfig() {
      return {};
    },
    async searchJobs(platform) {
      observed.searches.push(platform);
      return [];
    },
    async createApprovalRequest(workflowId, job) {
      return `approval-${workflowId}-${job.id}`;
    },
    async generateCoverLetter() {
      return 'Synthetic letter';
    },
    async getResume() {
      return { id: 'synthetic-resume' };
    },
    async submitApplication() {
      observed.submissions++;
      return { success: true };
    },
    async recordApplication(record) {
      observed.records.push(structuredClone(record));
    },
    ...overrides,
  };
  return { ctx, observed };
}

export const lifecycleJob = {
  id: 'synthetic-1',
  source: 'wanted',
  company: 'Synthetic Example',
  position: 'Engineer',
  matchScore: 90,
  sourceUrl: 'https://example.invalid/synthetic-1',
};

export const lifecycleEvent = (payload = {}) => ({
  instanceId: 'lifecycle-test',
  payload: { dryRun: false, autoApprove: true, ...payload },
});
