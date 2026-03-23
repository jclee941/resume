import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
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

    it('uses manual source when source is missing', async () => {
      const manualAnalytics = new ApplicationAnalytics({
        listApplications: mock.fn(() => [
          {
            id: 'manual-1',
            job: { company: 'X', position: 'Backend', matchScore: 70 },
            status: 'pending',
            appliedAt: new Date().toISOString(),
          },
        ]),
      });

      const result = await manualAnalytics.getSuccessRateBySource();
      const manual = result.find((r) => r.source === 'manual');
      assert.ok(manual);
      assert.strictEqual(manual.total, 1);
    });

    it('handles zero-total source branch in rate formatting', async () => {
      const entriesOriginal = Object.entries;
      mock.method(Object, 'entries', (value) => {
        if (value && value.syntheticZeroSource) {
          return [['synthetic', { total: 0, interviews: 0, offers: 0, rejections: 0 }]];
        }
        return entriesOriginal(value);
      });

      const zeroBranchAnalytics = new ApplicationAnalytics({
        listApplications: mock.fn(() => [{ source: 'syntheticZeroSource', status: 'pending' }]),
      });

      const result = await zeroBranchAnalytics.getSuccessRateBySource();
      const synthetic = result.find((r) => r.source === 'synthetic');

      assert.ok(synthetic);
      assert.strictEqual(synthetic.interviewRate, 0);
      assert.strictEqual(synthetic.offerRate, 0);
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

    it('places missing/low scores into <60 bucket', async () => {
      const lowScoreAnalytics = new ApplicationAnalytics({
        listApplications: mock.fn(() => [
          {
            id: 'low-1',
            job: { company: 'Unknown', position: 'Role' },
            status: 'pending',
            appliedAt: new Date().toISOString(),
          },
        ]),
      });

      const result = await lowScoreAnalytics.getSuccessRateByMatchScore();
      const lowBucket = result.find((r) => r.scoreRange === '<60');

      assert.ok(lowBucket);
      assert.strictEqual(lowBucket.total, 1);
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
        assert.ok(parseFloat(result[i - 1].responseRate) >= parseFloat(result[i].responseRate));
      }
    });

    it('respects limit parameter', async () => {
      const result = await analytics.getTopPerformingCompanies(2);

      assert.ok(result.length <= 2);
    });

    it('uses Unknown company when company field is missing', async () => {
      const unknownAnalytics = new ApplicationAnalytics({
        listApplications: mock.fn(() => [
          {
            id: 'u-1',
            job: {},
            status: 'pending',
            appliedAt: new Date().toISOString(),
          },
        ]),
      });

      const result = await unknownAnalytics.getTopPerformingCompanies();
      assert.strictEqual(result[0].company, 'Unknown');
    });

    it('handles zero-total company branch in response rate formatting', async () => {
      const entriesOriginal = Object.entries;
      mock.method(Object, 'entries', (value) => {
        if (value && value.syntheticZeroCompany) {
          return [['synthetic', { total: 0, interviews: 0, offers: 0 }]];
        }
        return entriesOriginal(value);
      });

      const zeroBranchAnalytics = new ApplicationAnalytics({
        listApplications: mock.fn(() => [
          { job: { company: 'syntheticZeroCompany' }, status: 'pending' },
        ]),
      });

      const result = await zeroBranchAnalytics.getTopPerformingCompanies();
      assert.strictEqual(result[0].responseRate, 0);
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

    it('categorizes unknown positions as Other', async () => {
      const otherAnalytics = new ApplicationAnalytics({
        listApplications: mock.fn(() => [
          {
            id: 'other-1',
            job: { company: 'Etc Inc', position: 'Quality Assurance Specialist' },
            status: 'pending',
            appliedAt: new Date().toISOString(),
          },
        ]),
      });

      const result = await otherAnalytics.getPositionTypeAnalysis();
      const other = result.find((r) => r.positionType === 'Other');

      assert.ok(other);
      assert.strictEqual(other.total, 1);
    });

    it('handles missing position as Other', async () => {
      const missingPositionAnalytics = new ApplicationAnalytics({
        listApplications: mock.fn(() => [
          {
            id: 'missing-pos',
            job: {},
            status: 'pending',
            appliedAt: new Date().toISOString(),
          },
        ]),
      });

      const result = await missingPositionAnalytics.getPositionTypeAnalysis();
      assert.strictEqual(result[0].positionType, 'Other');
    });

    it('categorizes Frontend and Data/ML branches', async () => {
      const typedAnalytics = new ApplicationAnalytics({
        listApplications: mock.fn(() => [
          {
            id: 'fe-1',
            job: { company: 'UI Co', position: 'Frontend React Engineer' },
            status: 'interviewing',
            appliedAt: new Date().toISOString(),
          },
          {
            id: 'ml-1',
            job: { company: 'AI Co', position: 'Data ML Engineer' },
            status: 'offered',
            appliedAt: new Date().toISOString(),
          },
        ]),
      });

      const result = await typedAnalytics.getPositionTypeAnalysis();

      assert.ok(result.find((r) => r.positionType === 'Frontend'));
      assert.ok(result.find((r) => r.positionType === 'Data/ML'));
    });

    it('handles zero-total position branch in interview-rate formatting', async () => {
      // stats.total is always >= 1 for real entries (defensive branch).
      // Inject a zero-total entry via Object.entries mock to exercise the falsy branch.
      const orig = Object.entries;
      let hooked = false;
      mock.method(Object, 'entries', function (obj) {
        const res = orig.call(Object, obj);
        if (!hooked && res.length > 0 && res[0][1]?.total !== undefined) {
          hooked = true;
          res.push(['ZeroType', { total: 0, interviews: 0, offers: 0 }]);
        }
        return res;
      });

      const zeroBranchAnalytics = new ApplicationAnalytics({
        listApplications: mock.fn(() => [{ job: { position: 'generic role' }, status: 'pending' }]),
      });

      const result = await zeroBranchAnalytics.getPositionTypeAnalysis();
      const zero = result.find((r) => r.positionType === 'ZeroType');
      assert.ok(zero, 'injected zero-total entry must appear');
      assert.strictEqual(zero.interviewRate, 0);
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

    it('returns zero summary rates when there are no applications', async () => {
      const emptyAnalytics = new ApplicationAnalytics({
        listApplications: mock.fn(() => []),
      });

      const report = await emptyAnalytics.generateReport();

      assert.strictEqual(report.summary.totalApplications, 0);
      assert.strictEqual(report.summary.interviewRate, '0%');
      assert.strictEqual(report.summary.offerRate, '0%');
    });
  });

  describe('generateRecommendations()', () => {
    it('returns fallback when no data', () => {
      const recommendations = analytics.generateRecommendations([], [], []);

      assert.ok(recommendations.length > 0);
      assert.ok(recommendations[0].includes('Collect more'));
    });

    it('includes high-score recommendation when high buckets are effective', () => {
      const recommendations = analytics.generateRecommendations(
        [
          {
            source: 'wanted',
            total: 10,
            interviews: 5,
            offers: 2,
            interviewRate: '50.0',
            offerRate: '20.0',
          },
        ],
        [
          { scoreRange: '90-100', total: 4, interviews: 2, offers: 1, successRate: '50.0' },
          { scoreRange: '80-89', total: 2, interviews: 0, offers: 0, successRate: '0.0' },
        ],
        [{ positionType: 'DevOps/SRE', total: 5, interviews: 2, offers: 1, interviewRate: '40.0' }]
      );

      assert.ok(recommendations.some((r) => r.includes('Match scores 90-100 have 50.0% success')));
    });
  });
});
