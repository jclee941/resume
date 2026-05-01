/**
 * Framework-agnostic Stats Service
 * Extracts business logic from server/routes/stats.js and dashboard/routes/stats.js
 */

/**
 * @typedef {Object} WeeklyStats
 * @property {number} total
 * @property {Object<string, number>} byDay
 * @property {Object<string, number>} byStatus
 * @property {Object<string, number>} bySource
 * @property {{start: string, end: string}} period
 */

/**
 * @typedef {Object} Recommendation
 * @property {'warning' | 'info' | 'action'} type
 * @property {string} message
 */

/**
 * @typedef {Object} StatsServiceConfig
 * @property {import('../applications/application-service.js').ApplicationService} appService
 */

export class StatsService {
  /** @type {import('../applications/application-service.js').ApplicationService} */
  #appService;

  /**
   * @param {import('../applications/application-service.js').ApplicationService} appService
   */
  constructor(appService) {
    this.#appService = appService;
  }

  /**
   * Get overall stats
   * @returns {Object}
   */
  getStats() {
    return this.#appService.getManager().getStats();
  }

  /**
   * Get weekly stats with breakdown
   * @returns {WeeklyStats}
   */
  getWeeklyStats() {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const result = this.#appService.list({ fromDate: weekAgo.toISOString() });
    const apps = result.applications || [];

    const byDay = {};
    const byStatus = {};
    const bySource = {};

    // Initialize last 7 days
    for (let i = 0; i < 7; i++) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      byDay[date.toISOString().split('T')[0]] = 0;
    }

    // Aggregate
    apps.forEach((app) => {
      const date = app.createdAt.split('T')[0];
      if (byDay[date] !== undefined) byDay[date]++;
      byStatus[app.status] = (byStatus[app.status] || 0) + 1;
      bySource[app.source] = (bySource[app.source] || 0) + 1;
    });

    return {
      total: apps.length,
      byDay,
      byStatus,
      bySource,
      period: { start: weekAgo.toISOString(), end: now.toISOString() },
    };
  }

  /**
   * Generate recommendations based on stats
   * @param {WeeklyStats} weeklyStats
   * @param {Object} allStats
   * @returns {Recommendation[]}
   */
  generateRecommendations(weeklyStats, allStats) {
    const recommendations = [];

    if (weeklyStats.total < 5) {
      recommendations.push({
        type: 'warning',
        message: '이번 주 지원 수가 적습니다. 더 많은 채용공고를 검색해보세요.',
      });
    }

    if (allStats.responseRate < 30) {
      recommendations.push({
        type: 'info',
        message: '응답률이 낮습니다. 이력서를 개선하거나 매칭 점수가 높은 공고에 집중해보세요.',
      });
    }

    const pendingCount = allStats.byStatus?.pending || 0;
    if (pendingCount > 10) {
      recommendations.push({
        type: 'action',
        message: `대기 중인 지원이 ${pendingCount}개 있습니다. 지원을 진행해주세요.`,
      });
    }

    return recommendations;
  }

  /**
   * Get comprehensive weekly report with recommendations
   * @returns {Object}
   */
  getWeeklyReport() {
    const weeklyStats = this.getWeeklyStats();
    const allStats = this.getStats();

    return {
      ...weeklyStats,
      successRate: allStats.successRate,
      responseRate: allStats.responseRate,
      averageResponseTime: allStats.averageResponseTime,
      recommendations: this.generateRecommendations(weeklyStats, allStats),
    };
  }

  /**
   * Generate daily report
   * @param {string} [date]
   * @returns {Object}
   */
  getDailyReport(date) {
    return this.#appService.getManager().generateDailyReport(date);
  }
}

/**
 * Create an isolated StatsService instance for constructor-injected dependencies.
 * @param {StatsServiceConfig} config
 * @returns {StatsService}
 */
export function createStatsService(config) {
  return new StatsService(config.appService);
}

// Deprecated singleton compatibility layer.
// DEPRECATED: Prefer createStatsService() and pass the instance through constructors.
// Singleton exports remain temporarily for existing imports and tests.
// Migration: docs/architecture/MONOREPO_REVIEW_2026-04-29.md (singleton DI plan).
const _instanceHolder = (() => {
  let v = null;
  return {
    get: () => v,
    set: (x) => {
      v = x;
    },
    clear: () => {
      v = null;
    },
  };
})();

/**
 * Get or create StatsService singleton
 * @deprecated Use createStatsService() and inject the returned instance through constructors.
 * @param {import('../applications/application-service.js').ApplicationService} appService
 * @returns {StatsService|null}
 */
export function getStatsService(appService) {
  if (!_instanceHolder.get() && appService) {
    _instanceHolder.set(createStatsService({ appService }));
  }
  return _instanceHolder.get();
}

export default StatsService;
