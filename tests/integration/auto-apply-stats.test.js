const { describe, test, expect, beforeAll, afterEach } = require('@jest/globals');
const {
  createMockAppManager,
  createMockCrawler,
  loadApplyModules,
} = require('./auto-apply-fixtures.js');

let ApplyOrchestrator;

describe('Auto-Apply stats integration', () => {
  beforeAll(async () => {
    ({ ApplyOrchestrator } = await loadApplyModules());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('dry-run plans jobs without recording applied stats', async () => {
    const mockJobs = [
      {
        jobId: '1',
        position: 'DevOps Engineer',
        company: 'Company A',
        source: 'wanted',
        sourceUrl: 'https://wanted.co.kr/job/1',
      },
      {
        jobId: '2',
        position: 'Backend Developer',
        company: 'Company B',
        source: 'wanted',
        sourceUrl: 'https://wanted.co.kr/job/2',
      },
    ];
    const orchestrator = new ApplyOrchestrator(
      createMockCrawler(mockJobs),
      {
        applyToJob: async () => ({ success: true }),
        initBrowser: async () => {},
        closeBrowser: async () => {},
      },
      createMockAppManager(),
      { maxDailyApplications: 20, delayBetweenApplies: 100 }
    );

    const result = await orchestrator.applyToJobs(mockJobs, true);
    const stats = orchestrator.getStats();

    expect(result.results.length).toBe(2);
    expect(result.applied).toBe(0);
    expect(result.failed).toBe(0);
    expect(stats.applied).toBe(0);
    expect(stats.failed).toBe(0);
  });

  test('real mode tracks successful and failed applications', async () => {
    const mockJobs = [
      {
        jobId: '1',
        position: 'DevOps',
        company: 'A',
        source: 'wanted',
        sourceUrl: 'https://wanted.co.kr/job/1',
      },
      {
        jobId: '2',
        position: 'Backend',
        company: 'B',
        source: 'wanted',
        sourceUrl: 'https://wanted.co.kr/job/2',
      },
    ];
    const applier = {
      applyToJob: async (job) =>
        job.jobId === '1'
          ? { success: true, jobId: 'applied-1' }
          : { success: false, error: 'Form validation failed' },
      initBrowser: async () => {},
      closeBrowser: async () => {},
    };
    const orchestrator = new ApplyOrchestrator(
      createMockCrawler(mockJobs),
      applier,
      createMockAppManager(),
      { maxDailyApplications: 20, delayBetweenApplies: 100 }
    );

    const result = await orchestrator.applyToJobs(mockJobs, false);

    expect(result.results.length).toBe(2);
    expect(result.applied).toBe(1);
    expect(result.failed).toBe(1);
  });
});
