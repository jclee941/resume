const { describe, test, expect, beforeAll, afterEach } = require('@jest/globals');
const {
  createMockAppManager,
  createMockApplier,
  createMockCrawler,
  loadApplyModules,
} = require('./auto-apply-fixtures.js');

let ApplyOrchestrator;

describe('Auto-Apply I/O integration', () => {
  beforeAll(async () => {
    ({ ApplyOrchestrator } = await loadApplyModules());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('crawler.search is called with correct platform parameters', async () => {
    const crawler = createMockCrawler([
      { jobId: '1', position: 'DevOps', company: 'A', source: 'wanted' },
      { jobId: '2', position: 'Backend', company: 'B', source: 'jobkorea' },
    ]);
    const orchestrator = new ApplyOrchestrator(
      crawler,
      createMockApplier(),
      createMockAppManager(),
      {
        enabledPlatforms: ['wanted', 'jobkorea'],
        delayBetweenApplies: 100,
      }
    );

    await orchestrator.searchJobs([' Engineer'], { platforms: ['wanted', 'jobkorea'] });

    expect(crawler.callLog.searchCalls.length).toBe(2);
    expect(crawler.callLog.searchCalls[0].platform).toBe('wanted');
    expect(crawler.callLog.searchCalls[1].platform).toBe('jobkorea');
  });

  test('applier.applyToJob is not called in dry-run mode', async () => {
    const mockJobs = [
      {
        jobId: '1',
        position: 'DevOps',
        company: 'A',
        source: 'wanted',
        sourceUrl: 'https://wanted.co.kr/job/1',
      },
    ];
    const applier = createMockApplier([{ success: true }]);
    const orchestrator = new ApplyOrchestrator(
      createMockCrawler(mockJobs),
      applier,
      createMockAppManager(),
      { delayBetweenApplies: 100 }
    );

    await orchestrator.applyToJobs(mockJobs, true);

    expect(applier.callLog.applyToJob).toBe(0);
  });

  test('applier.applyToJob is called in real mode', async () => {
    const mockJobs = [
      {
        jobId: '1',
        position: 'DevOps',
        company: 'A',
        source: 'wanted',
        sourceUrl: 'https://wanted.co.kr/job/1',
      },
    ];
    const applier = createMockApplier([{ success: true, jobId: 'applied-1' }]);
    const orchestrator = new ApplyOrchestrator(
      createMockCrawler(mockJobs),
      applier,
      createMockAppManager(),
      { delayBetweenApplies: 100 }
    );

    await orchestrator.applyToJobs(mockJobs, false);

    expect(applier.callLog.applyToJob).toBe(1);
  });
});
