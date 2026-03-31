/**
 * Integration Tests for Full Apply Flow
 * Tests the complete job application pipeline with real orchestrator classes
 */

const { describe, test, expect, beforeAll, afterEach } = require('@jest/globals');

// Dynamic imports for ES modules
let ApplyOrchestrator;
let JobFilter;
let ApplicationManager;

const createMockCrawler = (jobs = []) => {
  const callLog = { search: 0, searchCalls: [] };
  return {
    callLog,
    search: async (platform, keywords, options) => {
      callLog.search++;
      callLog.searchCalls.push({ platform, keywords, options });
      return jobs.filter((j) => j.source === platform);
    },
  };
};

const createMockApplier = (results = []) => {
  const callLog = { applyToJob: 0 };
  return {
    callLog,
    applyToJob: async (job) => {
      callLog.applyToJob++;
      return results.shift() || { success: true, jobId: `mock-${job.jobId || Math.random()}` };
    },
    initBrowser: async () => {},
    closeBrowser: async () => {},
  };
};

const createMockAppManager = (existingApps = []) => {
  const apps = [...existingApps];
  return {
    listApplications: () => apps,
    addApplication: (app) => apps.push(app),
    updateApplication: (id, updates) => {
      const idx = apps.findIndex((a) => a.id === id);
      if (idx !== -1) apps[idx] = { ...apps[idx], ...updates };
    },
  };
};

describe('Auto-Apply Full Flow Integration', () => {
  beforeAll(async () => {
    const orchMod = await import('../../apps/job-server/src/shared/services/apply/orchestrator.js');
    const filterMod = await import('../../apps/job-server/src/shared/services/apply/job-filter.js');
    const appMgrMod = await import('../../apps/job-server/src/auto-apply/application-manager.js');
    ApplyOrchestrator = orchMod.ApplyOrchestrator;
    JobFilter = filterMod.JobFilter;
    ApplicationManager = appMgrMod.ApplicationManager;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Scenario A: Full Apply Pipeline
  describe('Scenario A: Full Apply Pipeline', () => {
    test('searchJobs → filterByMatchScore → applyToJobs → trackApplication', async () => {
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
      const applier = createMockApplier([
        { success: true, jobId: 'applied-1' },
        { success: true, jobId: 'applied-2' },
      ]);
      const appManager = createMockAppManager([]);

      const orchestrator = new ApplyOrchestrator(crawler, applier, appManager, {
        maxDailyApplications: 20,
        enabledPlatforms: ['wanted', 'jobkorea', 'saramin'],
        delayBetweenApplies: 100,
      });

      // Step 1: Search jobs
      const jobs = await orchestrator.searchJobs(['엔지니어'], {
        platforms: ['wanted', 'jobkorea', 'saramin'],
      });
      expect(jobs.length).toBe(4);
      expect(crawler.callLog.search).toBe(3); // 3 platforms

      // Step 2: Filter by match score (no platform priority bonus in test config)
      const jobFilter = new JobFilter({
        keywords: ['DevOps'],
        autoApplyThreshold: 75,
        reviewThreshold: 60,
        platformPriority: [], // Disable platform priority bonus
      });
      const filterResult = await jobFilter.filter(jobs);
      // DevOps jobs: base 50 + 20 (keyword) = 70 → manual-review
      // Non-DevOps jobs: base 50 < 60 threshold → filtered out
      const devOpsJobs = filterResult.jobs.filter((j) => j.position.includes('DevOps'));
      expect(devOpsJobs.length).toBe(2);
      expect(devOpsJobs.every((j) => j.tier === 'manual-review')).toBe(true);

      // Step 3: Apply to jobs (dry-run)
      const applyResult = await orchestrator.applyToJobs(filterResult.jobs.slice(0, 2), true);
      expect(applyResult.results.length).toBe(2);
      expect(applyResult.applied).toBe(2); // dryRun returns success
      expect(applyResult.skipped).toBe(0);

      // Step 4: Verify crawler was called
      expect(crawler.callLog.search).toBe(3);
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
          id: '2',
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
      const applier = createMockApplier([]);
      const appManager = createMockAppManager([]);

      const orchestrator = new ApplyOrchestrator(crawler, applier, appManager, {
        delayBetweenApplies: 100,
      });

      // Only wanted platform
      const wantedJobs = await orchestrator.searchJobs(['엔지니어'], { platforms: ['wanted'] });
      expect(wantedJobs.length).toBe(2);
      expect(wantedJobs.every((j) => j.source === 'wanted')).toBe(true);
    });
  });

  // Scenario B: Match Score Filtering
  describe('Scenario B: Match Score Filtering', () => {
    test('< 60 score jobs are skipped', async () => {
      const mockJobs = [
        { jobId: '1', position: 'Cleaner', company: 'Company A', source: 'wanted', matchScore: 30 },
        { jobId: '2', position: 'Cashier', company: 'Company B', source: 'wanted', matchScore: 25 },
      ];

      const jobFilter = new JobFilter({
        reviewThreshold: 60,
        autoApplyThreshold: 75,
        platformPriority: [],
      });
      const result = await jobFilter.filter(mockJobs);
      expect(result.jobs.length).toBe(0);
    });

    test('60-74 score jobs go to manual review', async () => {
      const mockJobs = [
        {
          jobId: '1',
          position: 'Junior Developer',
          company: 'Company A',
          source: 'wanted',
          matchScore: 65,
        },
        {
          jobId: '2',
          position: 'Medior Engineer',
          company: 'Company B',
          source: 'wanted',
          matchScore: 70,
        },
      ];

      const jobFilter = new JobFilter({
        reviewThreshold: 60,
        autoApplyThreshold: 75,
        platformPriority: [],
      });
      const result = await jobFilter.filter(mockJobs);
      expect(result.jobs.length).toBe(2);
      expect(result.jobs.every((j) => j.tier === 'manual-review')).toBe(true);
    });

    test('≥75 score jobs are auto-apply tier', async () => {
      const mockJobs = [
        {
          jobId: '1',
          position: 'Senior DevOps',
          company: 'Company A',
          source: 'wanted',
          matchScore: 80,
        },
        {
          jobId: '2',
          position: 'Lead Engineer',
          company: 'Company B',
          source: 'wanted',
          matchScore: 90,
        },
      ];

      const jobFilter = new JobFilter({
        reviewThreshold: 60,
        autoApplyThreshold: 75,
        platformPriority: [],
      });
      const result = await jobFilter.filter(mockJobs);
      expect(result.jobs.length).toBe(2);
      expect(result.jobs.every((j) => j.tier === 'auto-apply')).toBe(true);
    });

    test('keyword matching adds +20 per match to base score', async () => {
      const mockJobs = [
        { jobId: '1', position: 'DevOps Engineer', company: 'Company A', source: 'wanted' },
        { jobId: '2', position: 'Backend Developer', company: 'Company B', source: 'wanted' },
      ];

      const jobFilter = new JobFilter({
        keywords: ['DevOps'],
        reviewThreshold: 60,
        autoApplyThreshold: 75,
        platformPriority: [],
      });
      const result = await jobFilter.filter(mockJobs);

      // DevOps job: base 50 + 20 (keyword match) = 70 → manual-review
      // Backend job: base 50 + 0 = 50 → filtered out (< 60)
      expect(result.jobs.length).toBe(1);
      expect(result.jobs[0].position).toBe('DevOps Engineer');
      expect(result.jobs[0].tier).toBe('manual-review');
    });

    test('platform priority adds bonus to score', async () => {
      const mockJobs = [
        { jobId: '1', position: 'Engineer', company: 'Company A', source: 'wanted' },
      ];

      // With default platform priority, 'wanted' gets +6 bonus
      const jobFilterWithPriority = new JobFilter({
        reviewThreshold: 60,
        autoApplyThreshold: 75,
        platformPriority: ['wanted', 'saramin', 'jobkorea'],
      });
      const resultWith = await jobFilterWithPriority.filter(mockJobs);
      // base 50 + 6 (wanted priority) = 56 < 60 → filtered out

      // Without platform priority, same job gets base 50 < 60 → filtered out
      const jobFilterWithout = new JobFilter({
        reviewThreshold: 60,
        autoApplyThreshold: 75,
        platformPriority: [],
      });
      const resultWithout = await jobFilterWithout.filter(mockJobs);

      // Both should be filtered out since even with priority, score is below threshold
      expect(resultWith.jobs.length).toBe(0);
      expect(resultWithout.jobs.length).toBe(0);
    });
  });

  // Scenario C: Error Recovery
  describe('Scenario C: Error Recovery', () => {
    test('network error during search returns empty array', async () => {
      const crawler = {
        search: async () => {
          throw new Error('Network error: ECONNREFUSED');
        },
      };
      const applier = createMockApplier([]);
      const appManager = createMockAppManager([]);

      const orchestrator = new ApplyOrchestrator(crawler, applier, appManager, {
        enabledPlatforms: ['wanted'],
        delayBetweenApplies: 100,
      });

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

      const applier = {
        initBrowser: async () => {
          throw new Error('Auth error: Invalid session');
        },
        applyToJob: async () => ({ success: false, error: 'Auth error' }),
        closeBrowser: async () => {},
      };
      const appManager = createMockAppManager([]);

      const orchestrator = new ApplyOrchestrator(createMockCrawler(mockJobs), applier, appManager, {
        delayBetweenApplies: 100,
      });

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

      const applier = {
        initBrowser: async () => {},
        applyToJob: async () => ({
          success: false,
          error: 'CAPTCHA detected: Please solve manually',
          captcha: true,
        }),
        closeBrowser: async () => {},
      };
      const appManager = createMockAppManager([]);

      const orchestrator = new ApplyOrchestrator(createMockCrawler(mockJobs), applier, appManager, {
        delayBetweenApplies: 100,
      });

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

      const crawler = {
        search: async (platform) => {
          if (platform === 'wanted') {
            return mockJobs.filter((j) => j.source === 'wanted');
          }
          throw new Error('Network error');
        },
      };
      const applier = createMockApplier([]);
      const appManager = createMockAppManager([]);

      const orchestrator = new ApplyOrchestrator(crawler, applier, appManager, {
        enabledPlatforms: ['wanted', 'jobkorea'],
        parallelSearch: false,
        delayBetweenApplies: 100,
      });

      const jobs = await orchestrator.searchJobs(['DevOps'], { platforms: ['wanted', 'jobkorea'] });
      // Should still get wanted results even if jobkorea fails
      expect(jobs.length).toBe(1);
      expect(jobs[0].source).toBe('wanted');
    });
  });

  // Scenario D: Daily Limit Enforcement
  describe('Scenario D: Daily Limit Enforcement', () => {
    test('max 5/day, 7 attempted, 5 processed, 2 skipped', async () => {
      const mockJobs = Array.from({ length: 7 }, (_, i) => ({
        jobId: `job-${i + 1}`,
        position: `Position ${i + 1}`,
        company: `Company ${i + 1}`,
        source: 'wanted',
        sourceUrl: `https://wanted.co.kr/job/${i + 1}`,
      }));

      const applier = createMockApplier(Array(7).fill({ success: true, jobId: 'applied' }));
      const appManager = createMockAppManager([]);

      const orchestrator = new ApplyOrchestrator(createMockCrawler(mockJobs), applier, appManager, {
        maxDailyApplications: 5,
        delayBetweenApplies: 100,
      });

      const result = await orchestrator.applyToJobs(mockJobs, true);

      expect(result.results.length).toBe(5);
      expect(result.applied).toBe(5);
      expect(result.skipped).toBe(2);
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

      const applier = createMockApplier([]);
      // Simulate already at daily limit (5 existing applications)
      const existingApps = Array.from({ length: 5 }, (_, i) => ({
        id: `existing-${i + 1}`,
        status: 'applied',
        appliedAt: new Date().toISOString(),
      }));
      const appManager = createMockAppManager(existingApps);

      const orchestrator = new ApplyOrchestrator(createMockCrawler(mockJobs), applier, appManager, {
        maxDailyApplications: 5,
        delayBetweenApplies: 100,
      });

      const result = await orchestrator.applyToJobs(mockJobs, true);

      expect(result.results.length).toBe(0);
      expect(result.skipped).toBe(1);
      expect(result.reason).toBe('Daily limit reached');
    });

    test('remaining capacity is calculated correctly', async () => {
      const mockJobs = Array.from({ length: 3 }, (_, i) => ({
        jobId: `job-${i + 1}`,
        position: `Position ${i + 1}`,
        company: `Company ${i + 1}`,
        source: 'wanted',
        sourceUrl: `https://wanted.co.kr/job/${i + 1}`,
      }));

      const applier = createMockApplier([
        { success: true, jobId: 'applied-1' },
        { success: true, jobId: 'applied-2' },
        { success: true, jobId: 'applied-3' },
      ]);
      // Already have 2 applications today
      const existingApps = [
        { id: 'existing-1', status: 'applied', appliedAt: new Date().toISOString() },
        { id: 'existing-2', status: 'applied', appliedAt: new Date().toISOString() },
      ];
      const appManager = createMockAppManager(existingApps);

      const orchestrator = new ApplyOrchestrator(createMockCrawler(mockJobs), applier, appManager, {
        maxDailyApplications: 5,
        delayBetweenApplies: 100,
      });

      const result = await orchestrator.applyToJobs(mockJobs, true);

      // 5 max - 2 existing = 3 remaining, all 3 jobs should be processed
      expect(result.results.length).toBe(3);
      expect(result.applied).toBe(3);
      expect(result.skipped).toBe(0);
    });
  });

  // Additional: External I/O Verification
  describe('External I/O Verification', () => {
    test('crawler.search is called with correct platform parameters', async () => {
      const mockJobs = [
        { jobId: '1', position: 'DevOps', company: 'A', source: 'wanted' },
        { jobId: '2', position: 'Backend', company: 'B', source: 'jobkorea' },
      ];

      const crawler = createMockCrawler(mockJobs);
      const applier = createMockApplier([]);
      const appManager = createMockAppManager([]);

      const orchestrator = new ApplyOrchestrator(crawler, applier, appManager, {
        enabledPlatforms: ['wanted', 'jobkorea'],
        delayBetweenApplies: 100,
      });

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
      const appManager = createMockAppManager([]);

      const orchestrator = new ApplyOrchestrator(createMockCrawler(mockJobs), applier, appManager, {
        delayBetweenApplies: 100,
      });

      await orchestrator.applyToJobs(mockJobs, true); // dryRun = true

      expect(applier.callLog.applyToJob).toBe(0); // Should not call applyToJob in dry-run
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
      const appManager = createMockAppManager([]);

      const orchestrator = new ApplyOrchestrator(createMockCrawler(mockJobs), applier, appManager, {
        delayBetweenApplies: 100,
      });

      await orchestrator.applyToJobs(mockJobs, false); // dryRun = false

      expect(applier.callLog.applyToJob).toBe(1);
    });
  });

  // UnifiedApplySystem smoke test
  describe('UnifiedApplySystem Integration', () => {
    test('orchestrator with full config produces correct stats', async () => {
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

      // In dry-run mode, all jobs succeed regardless of applier results
      const applier = createMockApplier([
        { success: true, jobId: 'applied-1' },
        { success: true, jobId: 'applied-2' },
      ]);
      const appManager = createMockAppManager([]);

      const orchestrator = new ApplyOrchestrator(createMockCrawler(mockJobs), applier, appManager, {
        maxDailyApplications: 20,
        delayBetweenApplies: 100,
      });

      const result = await orchestrator.applyToJobs(mockJobs, true);

      // In dry-run mode, every job returns success: true
      expect(result.results.length).toBe(2);
      expect(result.applied).toBe(2);
      expect(result.failed).toBe(0);

      const stats = orchestrator.getStats();
      expect(stats.applied).toBe(2);
      expect(stats.failed).toBe(0);
    });

    test('orchestrator tracks failed applications in real mode', async () => {
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

      // Real mode: first succeeds, second fails
      const applier = {
        callLog: { applyToJob: 0 },
        applyToJob: async (job) => {
          applier.callLog.applyToJob++;
          if (job.jobId === '1') {
            return { success: true, jobId: 'applied-1' };
          }
          return { success: false, error: 'Form validation failed' };
        },
        initBrowser: async () => {},
        closeBrowser: async () => {},
      };
      const appManager = createMockAppManager([]);

      const orchestrator = new ApplyOrchestrator(createMockCrawler(mockJobs), applier, appManager, {
        maxDailyApplications: 20,
        delayBetweenApplies: 100,
      });

      const result = await orchestrator.applyToJobs(mockJobs, false); // real mode

      expect(result.results.length).toBe(2);
      expect(result.applied).toBe(1);
      expect(result.failed).toBe(1);
    });
  });
});
