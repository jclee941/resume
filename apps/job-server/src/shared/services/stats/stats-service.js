/**
 * Framework-agnostic Stats Service
 * Extracts business logic from server/routes/stats.js and dashboard/routes/stats.js
 */

/**
 * @typedef {import('../../../auto-apply/application-manager/statistics.js').ApplicationStats & {
 *   successRate: number;
 *   responseRate: number;
 *   averageResponseTime: number | null;
 * }} FullApplicationStats
 */

/**
 * @typedef {import('../../../auto-apply/application-manager/reports.js').DailyReport} DailyReport
 */

/**
 * @typedef {import('@resume/types').ApplicationManagerPort & {
 *   getStats(): FullApplicationStats;
 *   generateDailyReport(date?: string): DailyReport;
 * }} StatsManagerPort
 */

/**
 * @typedef {Object} WeeklyStats
 * @property {number} total
 * @property {Record<string, number>} byDay
 * @property {Record<string, number>} byStatus
 * @property {Record<string, number>} bySource
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
   * @returns {FullApplicationStats}
   */
  getStats() {
    return /** @type {StatsManagerPort} */ (this.#appService.getManager()).getStats();
  }

  /**
   * Get weekly stats with breakdown
   * @returns {WeeklyStats}
   */
  getWeeklyStats() {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const result = this.#appService.list({ fromDate: weekAgo.toISOString() });
    /** @type {Array<import('@resume/types').Application & { createdAt: string; source: string }>} */
    const apps =
      /** @type {Array<import('@resume/types').Application & { createdAt: string; source: string }>} */ (
        result.applications || []
      );

    /** @type {Record<string, number>} */
    const byDay = {};
    /** @type {Record<string, number>} */
    const byStatus = {};
    /** @type {Record<string, number>} */
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
   * @param {FullApplicationStats} allStats
   * @returns {Recommendation[]}
   */
  generateRecommendations(weeklyStats, allStats) {
    /** @type {Recommendation[]} */
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
   * @returns {WeeklyStats & {
   *   successRate: number;
   *   responseRate: number;
   *   averageResponseTime: number | null;
   *   recommendations: Recommendation[];
   * }}
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
   * @returns {DailyReport}
   */
  getDailyReport(date) {
    return /** @type {StatsManagerPort} */ (this.#appService.getManager()).generateDailyReport(
      date
    );
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
export default StatsService;
