import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert';
import { ApplicationAnalytics } from '../index.js';

describe('ApplicationAnalytics', () => {
  let mockAppService;
  let analytics;

  const createMockApplications = () => [
    {
      id: '1',
      job: { company: 'Toss', position: 'DevOps Engineer', matchScore: 85 },
      status: 'offered',
      source: 'wanted',
      appliedAt: new Date().toISOString(),
    },
    {
      id: '2',
      job: { company: 'Kakao', position: 'Security Engineer', matchScore: 75 },
      status: 'interviewing',
      source: 'wanted',
      appliedAt: new Date().toISOString(),
    },
    {
      id: '3',
      job: { company: 'Naver', position: 'Backend Developer', matchScore: 65 },
      status: 'rejected',
      source: 'saramin',
      appliedAt: new Date().toISOString(),
    },
    {
      id: '4',
      job: { company: 'Line', position: 'SRE', matchScore: 90 },
      status: 'pending',
      source: 'wanted',
      appliedAt: new Date().toISOString(),
    },
  ];

  beforeEach(() => {
    mockAppService = {
      listApplications: mock.fn(() => createMockApplications()),
    };
    analytics = new ApplicationAnalytics(mockAppService);
  });

  describe('getSuccessRateBySource()', () => {
    it('groups applications by source platform', async () => {
      const result = await analytics.getSuccessRateBySource();

      assert.ok(Array.isArray(result));
      assert.ok(result.length > 0);

      const wanted = result.find((r) => r.source === 'wanted');
      assert.ok(wanted);
      assert.strictEqual(wanted.total, 3);
    });

    it('calculates interview and offer rates', async () => {
      const result = await analytics.getSuccessRateBySource();

      const wanted = result.find((r) => r.source === 'wanted');
      assert.ok(parseFloat(wanted.interviewRate) > 0);
      assert.ok(parseFloat(wanted.offerRate) > 0);
    });
  });

  describe('getSuccessRateByMatchScore()', () => {
    it('buckets applications by score range', async () => {
      const result = await analytics.getSuccessRateByMatchScore();

      assert.ok(Array.isArray(result));
      const bucket80 = result.find((r) => r.scoreRange === '80-89');
      assert.ok(bucket80);
      assert.strictEqual(bucket80.total, 1);
    });

    it('calculates success rate per bucket', async () => {
      const result = await analytics.getSuccessRateByMatchScore();

      result.forEach((bucket) => {
        assert.ok(bucket.successRate !== undefined);
      });
    });
  });

  describe('getWeeklyTrend()', () => {
    it('returns weekly data for specified weeks', async () => {
      const result = await analytics.getWeeklyTrend(4);

      assert.strictEqual(result.length, 4);
      result.forEach((week) => {
        assert.ok(week.week);
        assert.ok(week.weekStart);
        assert.ok(week.applied !== undefined);
      });
    });

    it('defaults to 8 weeks', async () => {
      const result = await analytics.getWeeklyTrend();

      assert.strictEqual(result.length, 8);
    });
  });

  describe('getTopPerformingCompanies()', () => {
    it('returns companies sorted by response rate', async () => {
      const result = await analytics.getTopPerformingCompanies();

      assert.ok(Array.isArray(result));
      assert.ok(result.length <= 10);

      for (let i = 1; i < result.length; i++) {
        assert.ok(
          parseFloat(result[i - 1].responseRate) >=
            parseFloat(result[i].responseRate),
        );
      }
    });

    it('respects limit parameter', async () => {
      const result = await analytics.getTopPerformingCompanies(2);

      assert.ok(result.length <= 2);
    });
  });

  describe('getPositionTypeAnalysis()', () => {
    it('categorizes positions into types', async () => {
      const result = await analytics.getPositionTypeAnalysis();

      assert.ok(Array.isArray(result));
      const devops = result.find((r) => r.positionType === 'DevOps/SRE');
      assert.ok(devops);
    });

    it('calculates interview rate per type', async () => {
      const result = await analytics.getPositionTypeAnalysis();

      result.forEach((type) => {
        assert.ok(type.interviewRate !== undefined);
      });
    });
  });

  describe('generateReport()', () => {
    it('aggregates all analytics into single report', async () => {
      const report = await analytics.generateReport();

      assert.ok(report.generatedAt);
      assert.ok(report.summary);
      assert.ok(report.bySource);
      assert.ok(report.byMatchScore);
      assert.ok(report.weeklyTrend);
      assert.ok(report.topCompanies);
      assert.ok(report.byPositionType);
      assert.ok(report.recommendations);
    });

    it('includes summary statistics', async () => {
      const report = await analytics.generateReport();

      assert.ok(report.summary.totalApplications !== undefined);
      assert.ok(report.summary.interviewRate);
      assert.ok(report.summary.offerRate);
    });

    it('generates recommendations', async () => {
      const report = await analytics.generateReport();

      assert.ok(Array.isArray(report.recommendations));
      assert.ok(report.recommendations.length > 0);
    });
  });

  describe('generateRecommendations()', () => {
    it('returns fallback when no data', () => {
      const recommendations = analytics.generateRecommendations([], [], []);

      assert.ok(recommendations.length > 0);
      assert.ok(recommendations[0].includes('Collect more'));
    });
  });
});
