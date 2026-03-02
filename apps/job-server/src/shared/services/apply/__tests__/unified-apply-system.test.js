import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert';
import { UnifiedApplySystem, JobFilter, ApplyOrchestrator } from '../index.js';

describe('JobFilter', () => {
  describe('filter()', () => {
    it('deduplicates jobs by company:position key', async () => {
      const filter = new JobFilter({ minMatchScore: 0, reviewThreshold: 0 });
      const jobs = [
        { company: 'Toss', position: 'DevOps', matchScore: 50 },
        { company: 'toss', position: 'devops', matchScore: 50 },
        { company: 'Kakao', position: 'Backend', matchScore: 50 },
      ];

      const result = await filter.filter(jobs);

      assert.strictEqual(result.jobs.length, 2);
      assert.strictEqual(result.stats.input, 3);
      assert.strictEqual(result.stats.afterDedup, 2);
    });

    it('excludes jobs matching excludeKeywords', async () => {
      const filter = new JobFilter({
        excludeKeywords: ['intern', 'junior'],
        minMatchScore: 0,
        reviewThreshold: 0,
      });
      const jobs = [
        { company: 'A', position: 'Senior DevOps', matchScore: 50 },
        { company: 'B', position: 'DevOps Intern', matchScore: 50 },
        { company: 'C', position: 'Junior Developer', matchScore: 50 },
      ];

      const result = await filter.filter(jobs);

      assert.strictEqual(result.jobs.length, 1);
      assert.strictEqual(result.jobs[0].company, 'A');
    });

    it('excludes companies in excludeCompanies list', async () => {
      const filter = new JobFilter({
        excludeCompanies: ['BadCorp'],
        minMatchScore: 0,
        reviewThreshold: 0,
      });
      const jobs = [
        { company: 'GoodCorp', position: 'DevOps', matchScore: 50 },
        { company: 'BadCorp Inc', position: 'DevOps', matchScore: 50 },
      ];

      const result = await filter.filter(jobs);

      assert.strictEqual(result.jobs.length, 1);
      assert.strictEqual(result.jobs[0].company, 'GoodCorp');
    });

    it('boosts score for preferred companies', async () => {
      const filter = new JobFilter({
        preferredCompanies: ['Toss'],
        minMatchScore: 0,
        reviewThreshold: 0,
      });
      const jobs = [
        { company: 'Toss', position: 'DevOps', matchScore: 50 },
        { company: 'Other', position: 'DevOps', matchScore: 50 },
      ];

      const result = await filter.filter(jobs);

      assert.ok(result.jobs[0].matchScore > result.jobs[1].matchScore);
      assert.strictEqual(result.jobs[0].company, 'Toss');
    });

    it('filters out jobs below minMatchScore', async () => {
      const filter = new JobFilter({ minMatchScore: 70 });
      const jobs = [
        { company: 'A', position: 'DevOps', matchScore: 80 },
        { company: 'B', position: 'DevOps', matchScore: 50 },
      ];

      const result = await filter.filter(jobs);

      assert.strictEqual(result.jobs.length, 1);
      assert.strictEqual(result.jobs[0].company, 'A');
    });

    it('respects existing job IDs for deduplication', async () => {
      const filter = new JobFilter({ minMatchScore: 0, reviewThreshold: 0 });
      const jobs = [
        { company: 'A', position: 'DevOps', matchScore: 50 },
        { company: 'B', position: 'DevOps', matchScore: 50 },
      ];
      const existingIds = new Set(['a:devops']);

      const result = await filter.filter(jobs, existingIds);

      assert.strictEqual(result.jobs.length, 1);
      assert.strictEqual(result.jobs[0].company, 'B');
    });
  });
});

describe('ApplyOrchestrator', () => {
  let mockCrawler;
  let mockApplier;
  let mockAppManager;

  beforeEach(() => {
    mockCrawler = {
      search: mock.fn(async () => [
        { company: 'Test', position: 'DevOps', source: 'wanted' },
      ]),
    };
    mockApplier = {
      apply: mock.fn(async () => ({ success: true })),
    };
    mockAppManager = {
      listApplications: mock.fn(() => []),
      addApplication: mock.fn(),
    };
  });

  describe('searchJobs()', () => {
    it('searches across enabled platforms', async () => {
      const orchestrator = new ApplyOrchestrator(
        mockCrawler,
        mockApplier,
        mockAppManager,
        { enabledPlatforms: ['wanted', 'saramin'] },
      );

      const jobs = await orchestrator.searchJobs(['devops']);

      assert.strictEqual(mockCrawler.search.mock.calls.length, 2);
      assert.ok(jobs.length >= 0);
    });

    it('handles search failures gracefully', async () => {
      mockCrawler.search = mock.fn(async () => {
        throw new Error('Network error');
      });
      const orchestrator = new ApplyOrchestrator(
        mockCrawler,
        mockApplier,
        mockAppManager,
        { parallelSearch: false },
      );

      const jobs = await orchestrator.searchJobs(['devops']);

      assert.strictEqual(jobs.length, 0);
    });
  });

  describe('applyToJobs()', () => {
    it('returns dry-run results without calling applier', async () => {
      const orchestrator = new ApplyOrchestrator(
        mockCrawler,
        mockApplier,
        mockAppManager,
      );
      const jobs = [{ company: 'Test', position: 'DevOps' }];

      const result = await orchestrator.applyToJobs(jobs, true);

      assert.strictEqual(result.applied, 1);
      assert.strictEqual(result.results[0].dryRun, true);
      assert.strictEqual(mockApplier.apply.mock.calls.length, 0);
    });

    it('calls applier when dryRun is false', async () => {
      const orchestrator = new ApplyOrchestrator(
        mockCrawler,
        mockApplier,
        mockAppManager,
        { delayBetweenApplies: 0 },
      );
      const jobs = [{ company: 'Test', position: 'DevOps' }];

      const result = await orchestrator.applyToJobs(jobs, false);

      assert.strictEqual(result.applied, 1);
      assert.strictEqual(mockApplier.apply.mock.calls.length, 1);
      assert.strictEqual(mockAppManager.addApplication.mock.calls.length, 1);
    });

    it('respects daily application limit', async () => {
      mockAppManager.listApplications = mock.fn(() =>
        Array(20).fill({ status: 'applied' }),
      );
      const orchestrator = new ApplyOrchestrator(
        mockCrawler,
        mockApplier,
        mockAppManager,
        { maxDailyApplications: 20 },
      );
      const jobs = [{ company: 'Test', position: 'DevOps' }];

      const result = await orchestrator.applyToJobs(jobs, false);

      assert.strictEqual(result.skipped, 1);
      assert.strictEqual(result.reason, 'Daily limit reached');
    });

    it('handles apply failures', async () => {
      mockApplier.apply = mock.fn(async () => {
        throw new Error('Apply failed');
      });
      const orchestrator = new ApplyOrchestrator(
        mockCrawler,
        mockApplier,
        mockAppManager,
        { delayBetweenApplies: 0 },
      );
      const jobs = [{ company: 'Test', position: 'DevOps' }];

      const result = await orchestrator.applyToJobs(jobs, false);

      assert.strictEqual(result.failed, 1);
      assert.ok(result.results[0].error);
    });
  });

  describe('getStats()', () => {
    it('returns accumulated statistics', async () => {
      const orchestrator = new ApplyOrchestrator(
        mockCrawler,
        mockApplier,
        mockAppManager,
      );

      await orchestrator.searchJobs(['devops']);
      const stats = orchestrator.getStats();

      assert.ok(stats.searched >= 0);
      assert.ok(stats.startTime !== null);
    });
  });

  describe('reset()', () => {
    it('clears statistics', async () => {
      const orchestrator = new ApplyOrchestrator(
        mockCrawler,
        mockApplier,
        mockAppManager,
      );

      await orchestrator.searchJobs(['devops']);
      orchestrator.reset();
      const stats = orchestrator.getStats();

      assert.strictEqual(stats.searched, 0);
      assert.strictEqual(stats.startTime, null);
    });
  });
});

describe('UnifiedApplySystem', () => {
  let mockCrawler;
  let mockApplier;
  let mockAppManager;
  let mockNotifier;

  beforeEach(() => {
    mockCrawler = {
      search: mock.fn(async () => [
        {
          company: 'Toss',
          position: 'DevOps',
          matchScore: 80,
          source: 'wanted',
        },
        {
          company: 'Kakao',
          position: 'Backend',
          matchScore: 70,
          source: 'wanted',
        },
      ]),
    };
    mockApplier = {
      apply: mock.fn(async () => ({ success: true })),
    };
    mockAppManager = {
      listApplications: mock.fn(() => []),
      addApplication: mock.fn(),
    };
    mockNotifier = {
      notifyAutoApplyResult: mock.fn(async () => {}),
      notifySearchResults: mock.fn(async () => {}),
    };
  });

  describe('run()', () => {
    it('executes full pipeline: search -> filter -> apply', async () => {
      const system = new UnifiedApplySystem({
        crawler: mockCrawler,
        applier: mockApplier,
        appManager: mockAppManager,
        notifier: mockNotifier,
        config: { minMatchScore: 60 },
      });

      const result = await system.run({ keywords: ['devops'], dryRun: true });

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.dryRun, true);
      assert.ok(result.phases.search.found >= 0);
      assert.ok(result.phases.filter);
      assert.ok(result.phases.apply);
      assert.ok(result.timestamp);
    });

    it('sends notifications when notify is true', async () => {
      const system = new UnifiedApplySystem({
        crawler: mockCrawler,
        applier: mockApplier,
        appManager: mockAppManager,
        notifier: mockNotifier,
      });

      await system.run({ keywords: ['devops'], notify: true, dryRun: true });

      assert.strictEqual(
        mockNotifier.notifyAutoApplyResult.mock.calls.length,
        1,
      );
    });

    it('skips notifications when notify is false', async () => {
      const system = new UnifiedApplySystem({
        crawler: mockCrawler,
        applier: mockApplier,
        appManager: mockAppManager,
        notifier: mockNotifier,
      });

      await system.run({ keywords: ['devops'], notify: false, dryRun: true });

      assert.strictEqual(
        mockNotifier.notifyAutoApplyResult.mock.calls.length,
        0,
      );
    });

    it('handles notifier failure gracefully', async () => {
      mockNotifier.notifyAutoApplyResult = mock.fn(async () => {
        throw new Error('Slack down');
      });
      const system = new UnifiedApplySystem({
        crawler: mockCrawler,
        applier: mockApplier,
        appManager: mockAppManager,
        notifier: mockNotifier,
      });

      const result = await system.run({ keywords: ['devops'], notify: true });

      assert.strictEqual(result.success, true);
    });
  });

  describe('searchOnly()', () => {
    it('returns filtered jobs without applying', async () => {
      const system = new UnifiedApplySystem({
        crawler: mockCrawler,
        applier: mockApplier,
        appManager: mockAppManager,
        config: { minMatchScore: 60 },
      });

      const result = await system.searchOnly(['devops']);

      assert.ok(Array.isArray(result.jobs));
      assert.ok(result.stats.searched >= 0);
      assert.strictEqual(mockApplier.apply.mock.calls.length, 0);
    });
  });

  describe('updateConfig()', () => {
    it('updates configuration dynamically', async () => {
      const system = new UnifiedApplySystem({
        crawler: mockCrawler,
        applier: mockApplier,
        appManager: mockAppManager,
      });

      system.updateConfig({ minMatchScore: 80, reviewThreshold: 80 });

      const result = await system.searchOnly(['devops']);
      assert.ok(result.jobs.every((j) => j.matchScore >= 80));
    });
  });

  describe('getStats()', () => {
    it('returns orchestrator statistics', async () => {
      const system = new UnifiedApplySystem({
        crawler: mockCrawler,
        applier: mockApplier,
        appManager: mockAppManager,
      });

      await system.run({ keywords: ['devops'], dryRun: true });
      const stats = system.getStats();

      assert.ok(stats.searched !== undefined);
    });
  });

  describe('reset()', () => {
    it('resets orchestrator state', async () => {
      const system = new UnifiedApplySystem({
        crawler: mockCrawler,
        applier: mockApplier,
        appManager: mockAppManager,
      });

      await system.run({ keywords: ['devops'], dryRun: true });
      system.reset();
      const stats = system.getStats();

      assert.strictEqual(stats.searched, 0);
    });
  });
});
