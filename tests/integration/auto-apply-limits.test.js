const { describe, test, expect, beforeAll, afterEach } = require('@jest/globals');
const {
  createMockAppManager,
  createMockApplier,
  createMockCrawler,
  loadApplyModules,
} = require('./auto-apply-fixtures.js');

let ApplyOrchestrator;

describe('Auto-Apply daily limit integration', () => {
  beforeAll(async () => {
    ({ ApplyOrchestrator } = await loadApplyModules());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('max daily limit caps dry-run planning and counts skipped jobs', async () => {
    const mockJobs = Array.from({ length: 7 }, (_, index) => ({
      jobId: `job-${index + 1}`,
      position: `Position ${index + 1}`,
      company: `Company ${index + 1}`,
      source: 'wanted',
      sourceUrl: `https://wanted.co.kr/job/${index + 1}`,
    }));
    const orchestrator = new ApplyOrchestrator(
      createMockCrawler(mockJobs),
      createMockApplier(Array(7).fill({ success: true, jobId: 'applied' })),
      createMockAppManager(),
      { maxDailyApplications: 5, delayBetweenApplies: 100 }
    );

    const result = await orchestrator.applyToJobs(mockJobs, true);

    expect(result.results.length).toBe(5);
    expect(result.applied).toBe(0);
    expect(result.skipped).toBe(7);
  });

  test('daily limit reached returns early with reason', async () => {
    const mockJobs = [
      {
        jobId: '1',
        position: 'Position 1',
        company: 'Company 1',
        source: 'wanted',
        sourceUrl: 'https://wanted.co.kr/job/1',
      },
    ];
    const existingApps = Array.from({ length: 5 }, (_, index) => ({
      id: `existing-${index + 1}`,
      status: 'applied',
      appliedAt: new Date().toISOString(),
    }));
    const orchestrator = new ApplyOrchestrator(
      createMockCrawler(mockJobs),
      createMockApplier(),
      createMockAppManager(existingApps),
      { maxDailyApplications: 5, delayBetweenApplies: 100 }
    );

    const result = await orchestrator.applyToJobs(mockJobs, true);

    expect(result.results.length).toBe(0);
    expect(result.skipped).toBe(1);
    expect(result.reason).toBe('Daily limit reached');
  });

  test('remaining capacity is calculated correctly', async () => {
    const mockJobs = Array.from({ length: 3 }, (_, index) => ({
      jobId: `job-${index + 1}`,
      position: `Position ${index + 1}`,
      company: `Company ${index + 1}`,
      source: 'wanted',
      sourceUrl: `https://wanted.co.kr/job/${index + 1}`,
    }));
    const existingApps = [
      { id: 'existing-1', status: 'applied', appliedAt: new Date().toISOString() },
      { id: 'existing-2', status: 'applied', appliedAt: new Date().toISOString() },
    ];
    const orchestrator = new ApplyOrchestrator(
      createMockCrawler(mockJobs),
      createMockApplier(Array(3).fill({ success: true, jobId: 'applied' })),
      createMockAppManager(existingApps),
      { maxDailyApplications: 5, delayBetweenApplies: 100 }
    );

    const result = await orchestrator.applyToJobs(mockJobs, true);

    expect(result.results.length).toBe(3);
    expect(result.applied).toBe(0);
    expect(result.skipped).toBe(3);
  });
});
