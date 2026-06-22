const { describe, test, expect, beforeAll, afterEach } = require('@jest/globals');
const {
  createMockAppManager,
  createMockApplier,
  createMockCrawler,
  loadApplyModules,
} = require('./auto-apply-fixtures.js');

let ApplyOrchestrator;

describe('Auto-Apply error recovery integration', () => {
  beforeAll(async () => {
    ({ ApplyOrchestrator } = await loadApplyModules());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('network error during search returns empty array', async () => {
    const orchestrator = new ApplyOrchestrator(
      {
        search: async () => {
          throw new Error('Network error: ECONNREFUSED');
        },
      },
      createMockApplier(),
      createMockAppManager(),
      { enabledPlatforms: ['wanted'], delayBetweenApplies: 100 }
    );

    const jobs = await orchestrator.searchJobs(['DevOps'], { platforms: ['wanted'] });

    expect(jobs).toEqual([]);
  });

  test('auth error returns failed apply result', async () => {
    const mockJobs = [
      {
        jobId: '1',
        position: 'DevOps Engineer',
        company: 'Company A',
        source: 'wanted',
        sourceUrl: 'https://wanted.co.kr/job/1',
      },
    ];
    const orchestrator = new ApplyOrchestrator(
      createMockCrawler(mockJobs),
      {
        initBrowser: async () => {
          throw new Error('Auth error: Invalid session');
        },
        applyToJob: async () => ({ success: false, error: 'Auth error' }),
        closeBrowser: async () => {},
      },
      createMockAppManager(),
      { delayBetweenApplies: 100 }
    );

    const result = await orchestrator.applyToJobs(mockJobs, false);

    expect(result.results.length).toBe(0);
    expect(result.error).toContain('Browser init failed');
  });

  test('CAPTCHA detection returns failed result with error message', async () => {
    const mockJobs = [
      {
        jobId: '1',
        position: 'DevOps Engineer',
        company: 'Company A',
        source: 'wanted',
        sourceUrl: 'https://wanted.co.kr/job/1',
      },
    ];
    const orchestrator = new ApplyOrchestrator(
      createMockCrawler(mockJobs),
      {
        initBrowser: async () => {},
        applyToJob: async () => ({
          success: false,
          error: 'CAPTCHA detected: Please solve manually',
          captcha: true,
        }),
        closeBrowser: async () => {},
      },
      createMockAppManager(),
      { delayBetweenApplies: 100 }
    );

    const result = await orchestrator.applyToJobs(mockJobs, false);

    expect(result.results.length).toBe(1);
    expect(result.results[0].success).toBe(false);
    expect(result.results[0].error).toContain('CAPTCHA');
  });

  test('search error on one platform does not stop other platforms', async () => {
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
        source: 'jobkorea',
        sourceUrl: 'https://jobkorea.co.kr/job/2',
      },
    ];
    const orchestrator = new ApplyOrchestrator(
      {
        search: async (platform) => {
          if (platform === 'wanted') return mockJobs.filter((job) => job.source === 'wanted');
          throw new Error('Network error');
        },
      },
      createMockApplier(),
      createMockAppManager(),
      { enabledPlatforms: ['wanted', 'jobkorea'], parallelSearch: false, delayBetweenApplies: 100 }
    );

    const jobs = await orchestrator.searchJobs(['DevOps'], { platforms: ['wanted', 'jobkorea'] });

    expect(jobs.length).toBe(1);
    expect(jobs[0].source).toBe('wanted');
  });
});
