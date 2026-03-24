import assert from 'node:assert/strict';
import { beforeEach, describe, it, mock } from 'node:test';

import StatsService, { getStatsService } from '../stats-service.js';

describe('StatsService', () => {
  beforeEach(() => {
    mock.restoreAll();
  });

  it('getStats delegates to manager.getStats', () => {
    const getStats = mock.fn(() => ({ total: 10 }));
    const manager = { getStats, generateDailyReport: mock.fn() };
    const appService = {
      getManager: mock.fn(() => manager),
      list: mock.fn(() => ({ applications: [] })),
    };
    const service = new StatsService(appService);

    const result = service.getStats();

    assert.deepEqual(result, { total: 10 });
    assert.equal(appService.getManager.mock.callCount(), 1);
    assert.equal(getStats.mock.callCount(), 1);
  });

  it('getWeeklyStats aggregates in-range applications and ignores out-of-range day buckets', () => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const eightDaysAgo = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000).toISOString();

    const list = mock.fn(() => ({
      applications: [
        { createdAt: `${today}T10:00:00.000Z`, status: 'pending', source: 'wanted' },
        { createdAt: `${yesterday}T09:00:00.000Z`, status: 'accepted', source: 'saramin' },
        { createdAt: eightDaysAgo, status: 'pending', source: 'wanted' },
      ],
    }));

    const appService = {
      getManager: mock.fn(() => ({ getStats: mock.fn(), generateDailyReport: mock.fn() })),
      list,
    };
    const service = new StatsService(appService);

    const result = service.getWeeklyStats();

    assert.equal(result.total, 3);
    assert.equal(Object.keys(result.byDay).length, 7);
    assert.equal(result.byDay[today], 1);
    assert.equal(result.byDay[yesterday], 1);
    assert.equal(result.byStatus.pending, 2);
    assert.equal(result.byStatus.accepted, 1);
    assert.equal(result.bySource.wanted, 2);
    assert.equal(result.bySource.saramin, 1);
    assert.equal(typeof result.period.start, 'string');
    assert.equal(typeof result.period.end, 'string');
    assert.equal(list.mock.callCount(), 1);
    assert.equal(typeof list.mock.calls[0].arguments[0].fromDate, 'string');
  });

  it('getWeeklyStats handles missing applications field', () => {
    const appService = {
      getManager: mock.fn(() => ({ getStats: mock.fn(), generateDailyReport: mock.fn() })),
      list: mock.fn(() => ({})),
    };
    const service = new StatsService(appService);

    const result = service.getWeeklyStats();

    assert.equal(result.total, 0);
    assert.equal(Object.keys(result.byDay).length, 7);
    assert.deepEqual(result.byStatus, {});
    assert.deepEqual(result.bySource, {});
  });

  it('generateRecommendations returns all recommendation types when all conditions are true', () => {
    const service = new StatsService({
      getManager: () => ({}),
      list: () => ({ applications: [] }),
    });
    const recommendations = service.generateRecommendations(
      { total: 1 },
      { responseRate: 10, byStatus: { pending: 11 } }
    );

    assert.equal(recommendations.length, 3);
    assert.equal(recommendations[0].type, 'warning');
    assert.equal(recommendations[1].type, 'info');
    assert.equal(recommendations[2].type, 'action');
  });

  it('generateRecommendations returns empty list when no conditions are met and pending is missing', () => {
    const service = new StatsService({
      getManager: () => ({}),
      list: () => ({ applications: [] }),
    });
    const recommendations = service.generateRecommendations(
      { total: 6 },
      { responseRate: 80, byStatus: undefined }
    );

    assert.deepEqual(recommendations, []);
  });

  it('getWeeklyReport composes weekly and overall stats with recommendations', () => {
    const service = new StatsService({
      getManager: () => ({}),
      list: () => ({ applications: [] }),
    });
    mock.method(service, 'getWeeklyStats', () => ({
      total: 7,
      byDay: { a: 1 },
      byStatus: { pending: 2 },
      bySource: { wanted: 7 },
      period: { start: 's', end: 'e' },
    }));
    mock.method(service, 'getStats', () => ({
      successRate: 50,
      responseRate: 20,
      averageResponseTime: 3,
    }));
    mock.method(service, 'generateRecommendations', () => [{ type: 'info', message: 'x' }]);

    const report = service.getWeeklyReport();

    assert.equal(report.total, 7);
    assert.equal(report.successRate, 50);
    assert.equal(report.responseRate, 20);
    assert.equal(report.averageResponseTime, 3);
    assert.deepEqual(report.recommendations, [{ type: 'info', message: 'x' }]);
  });

  it('getDailyReport delegates with and without date argument', () => {
    const generateDailyReport = mock.fn((date) => ({ date: date ?? 'today' }));
    const appService = {
      getManager: mock.fn(() => ({ getStats: mock.fn(), generateDailyReport })),
      list: mock.fn(() => ({ applications: [] })),
    };
    const service = new StatsService(appService);

    const withDate = service.getDailyReport('2026-03-01');
    const withoutDate = service.getDailyReport();

    assert.deepEqual(withDate, { date: '2026-03-01' });
    assert.deepEqual(withoutDate, { date: 'today' });
    assert.deepEqual(generateDailyReport.mock.calls[0].arguments, ['2026-03-01']);
    assert.deepEqual(generateDailyReport.mock.calls[1].arguments, [undefined]);
  });
});

describe('getStatsService singleton', () => {
  beforeEach(() => {
    mock.restoreAll();
  });

  it('returns null before initialization and keeps first instance thereafter', () => {
    const initial = getStatsService();
    assert.equal(initial, null);

    const firstAppService = {
      getManager: () => ({ getStats: () => ({}), generateDailyReport: () => ({}) }),
      list: () => ({ applications: [] }),
    };
    const secondAppService = {
      getManager: () => ({
        getStats: () => ({ changed: true }),
        generateDailyReport: () => ({ changed: true }),
      }),
      list: () => ({
        applications: [
          { createdAt: new Date().toISOString(), status: 'pending', source: 'wanted' },
        ],
      }),
    };

    const created = getStatsService(firstAppService);
    const reusedWithDifferentService = getStatsService(secondAppService);
    const reusedWithoutService = getStatsService();

    assert.ok(created instanceof StatsService);
    assert.equal(reusedWithDifferentService, created);
    assert.equal(reusedWithoutService, created);
  });
});
