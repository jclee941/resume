const { describe, test, expect, beforeAll, afterEach } = require('@jest/globals');
const {
  createMockAppManager,
  createMockApplier,
  createMockCrawler,
  loadApplyModules,
} = require('./auto-apply-fixtures.js');

let ApplyOrchestrator;
let JobFilter;

describe('Auto-Apply pipeline integration', () => {
  beforeAll(async () => {
    ({ ApplyOrchestrator, JobFilter } = await loadApplyModules());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('searches, filters, and plans dry-run applications', async () => {
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
      {
        jobId: '3',
        position: 'System Admin',
        company: 'Company C',
        source: 'saramin',
        sourceUrl: 'https://saramin.co.kr/job/3',
      },
      {
        jobId: '4',
        position: 'DevOps Engineer',
        company: 'Company D',
        source: 'wanted',
        sourceUrl: 'https://wanted.co.kr/job/4',
      },
    ];
    const crawler = createMockCrawler(mockJobs);
    const orchestrator = new ApplyOrchestrator(
      crawler,
      createMockApplier(),
      createMockAppManager(),
      {
        maxDailyApplications: 20,
        enabledPlatforms: ['wanted', 'jobkorea', 'saramin'],
        delayBetweenApplies: 100,
      }
    );

    const jobs = await orchestrator.searchJobs(['엔지니어'], {
      platforms: ['wanted', 'jobkorea', 'saramin'],
    });
    const filterResult = await new JobFilter({
      keywords: ['DevOps'],
      autoApplyThreshold: 75,
      reviewThreshold: 60,
      platformPriority: [],
    }).filter(jobs);
    const devOpsJobs = filterResult.jobs.filter((job) => job.position.includes('DevOps'));
    const applyResult = await orchestrator.applyToJobs(filterResult.jobs.slice(0, 2), true);

    expect(jobs.length).toBe(4);
    expect(crawler.callLog.search).toBe(3);
    expect(devOpsJobs.length).toBe(2);
    expect(devOpsJobs.every((job) => job.tier === 'manual-review')).toBe(true);
    expect(applyResult.results.length).toBe(2);
    expect(applyResult.applied).toBe(0);
    expect(applyResult.skipped).toBe(2);
  });

  test('searchJobs with platform filter returns only matching sources', async () => {
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
      {
        jobId: '3',
        position: 'System Admin',
        company: 'Company C',
        source: 'saramin',
        sourceUrl: 'https://saramin.co.kr/job/3',
      },
      {
        jobId: '4',
        position: 'DevOps Engineer',
        company: 'Company D',
        source: 'wanted',
        sourceUrl: 'https://wanted.co.kr/job/4',
      },
    ];
    const orchestrator = new ApplyOrchestrator(
      createMockCrawler(mockJobs),
      createMockApplier(),
      createMockAppManager(),
      { delayBetweenApplies: 100 }
    );

    const wantedJobs = await orchestrator.searchJobs(['엔지니어'], { platforms: ['wanted'] });

    expect(wantedJobs.length).toBe(2);
    expect(wantedJobs.every((job) => job.source === 'wanted')).toBe(true);
  });
});
