/**
 * @typedef {{
 *   prepare(query: string): {
 *     bind(...values: unknown[]): {
 *       first(): Promise<{ count: number }>;
 *       all(): Promise<{ results: Array<{ created_at: string; status: string; source: string; [key: string]: unknown }> }>;
 *     };
 *     first(): Promise<{ count: number }>;
 *     all(): Promise<{ results: Array<{ status: string; source: string; count: number; [key: string]: unknown }> }>;
 *   };
 * }} StatsDb
 *
 * @typedef {{
 *   query: { date?: string };
 *   [key: string]: unknown;
 * }} StatsRequest
 *
 * @typedef {{
 *   total: number;
 *   byDay?: Record<string, number>;
 *   byStatus?: Record<string, number>;
 *   bySource?: Record<string, number>;
 *   period?: { start: string; end: string };
 * }} WeeklyStatsData
 *
 * @typedef {{
 *   totalApplications?: number;
 *   byStatus?: Record<string, number>;
 *   bySource?: Record<string, number>;
 *   successRate?: number;
 *   responseRate: number;
 *   lastUpdated?: string;
 * }} AllStatsData
 *
 * @typedef {{
 *   type: string;
 *   message: string;
 * }} Recommendation
 */

export class StatsHandler {
  /**
   * @param {StatsDb} db
   */
  constructor(db) {
    /** @type {StatsDb} */
    this.db = db;
  }

  /**
   * @param {unknown} data
   * @param {number} [status]
   * @returns {Response}
   */
  jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * @param {unknown} [_request]
   * @returns {Promise<Response>}
   */
  async getStats(_request) {
    const total = await this.db.prepare('SELECT COUNT(*) as count FROM applications').first();

    const byStatus = await this.db
      .prepare('SELECT status, COUNT(*) as count FROM applications GROUP BY status')
      .all();

    const bySource = await this.db
      .prepare('SELECT source, COUNT(*) as count FROM applications GROUP BY source')
      .all();

    /** @type {Record<string, number>} */
    const statusMap = {};
    for (const row of byStatus.results) {
      statusMap[row.status] = row.count;
    }

    /** @type {Record<string, number>} */
    const sourceMap = {};
    for (const row of bySource.results) {
      sourceMap[row.source] = row.count;
    }

    const offers = statusMap.offer || 0;
    const rejected = statusMap.rejected || 0;
    const completed = offers + rejected;
    const successRate = completed > 0 ? Math.round((offers / completed) * 100) : 0;

    const applied = await this.db
      .prepare('SELECT COUNT(*) as count FROM applications WHERE applied_at IS NOT NULL')
      .first();

    const responded = await this.db
      .prepare(
        "SELECT COUNT(*) as count FROM applications WHERE applied_at IS NOT NULL AND status NOT IN ('applied', 'pending')"
      )
      .first();

    const responseRate =
      applied?.count > 0 ? Math.round((responded?.count / applied.count) * 100) : 0;

    return this.jsonResponse({
      totalApplications: total?.count || 0,
      byStatus: statusMap,
      bySource: sourceMap,
      successRate,
      responseRate,
      lastUpdated: new Date().toISOString(),
    });
  }

  /**
   * @param {unknown} [_request]
   * @returns {Promise<Response>}
   */
  async getWeeklyStats(_request) {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const apps = await this.db
      .prepare('SELECT * FROM applications WHERE created_at >= ?')
      .bind(weekAgo.toISOString())
      .all();

    /** @type {Record<string, number>} */
    const byDay = {};
    /** @type {Record<string, number>} */
    const byStatus = {};
    /** @type {Record<string, number>} */
    const bySource = {};

    for (let i = 0; i < 7; i++) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      byDay[date.toISOString().split('T')[0]] = 0;
    }

    for (const app of apps.results) {
      const date = app.created_at.split('T')[0];
      if (byDay[date] !== undefined) byDay[date]++;
      byStatus[app.status] = (byStatus[app.status] || 0) + 1;
      bySource[app.source] = (bySource[app.source] || 0) + 1;
    }

    return this.jsonResponse({
      total: apps.results.length,
      byDay,
      byStatus,
      bySource,
      period: { start: weekAgo.toISOString(), end: now.toISOString() },
    });
  }

  /**
   * @param {StatsRequest} request
   * @returns {Promise<Response>}
   */
  async getDailyReport(request) {
    const date = request.query.date || new Date().toISOString().split('T')[0];

    const newApps = await this.db
      .prepare('SELECT COUNT(*) as count FROM applications WHERE created_at LIKE ?')
      .bind(`${date}%`)
      .first();

    const applied = await this.db
      .prepare('SELECT COUNT(*) as count FROM applications WHERE applied_at LIKE ?')
      .bind(`${date}%`)
      .first();

    const pending = await this.db
      .prepare("SELECT COUNT(*) as count FROM applications WHERE status = 'pending'")
      .first();

    const active = await this.db
      .prepare(
        "SELECT COUNT(*) as count FROM applications WHERE status IN ('applied', 'viewed', 'in_progress', 'interview')"
      )
      .first();

    const total = await this.db.prepare('SELECT COUNT(*) as count FROM applications').first();

    return this.jsonResponse({
      date,
      newApplications: newApps?.count || 0,
      applied: applied?.count || 0,
      pending: pending?.count || 0,
      active: active?.count || 0,
      total: total?.count || 0,
    });
  }

  /**
   * @param {StatsRequest} request
   * @returns {Promise<Response>}
   */
  async getWeeklyReport(request) {
    const weeklyStats = await this.getWeeklyStats(request);
    /** @type {WeeklyStatsData} */
    const statsData = JSON.parse(await weeklyStats.text());

    const allStats = await this.getStats(request);
    /** @type {AllStatsData} */
    const allStatsData = JSON.parse(await allStats.text());

    return this.jsonResponse({
      ...statsData,
      successRate: allStatsData.successRate,
      responseRate: allStatsData.responseRate,
      recommendations: this.generateRecommendations(statsData, allStatsData),
    });
  }

  /**
   * @param {WeeklyStatsData} weeklyStats
   * @param {AllStatsData} allStats
   * @returns {Recommendation[]}
   */
  generateRecommendations(weeklyStats, allStats) {
    const recommendations = [];

    if (weeklyStats.total < 5) {
      recommendations.push({
        type: 'action',
        message: '이번 주 지원이 적습니다. 검색을 늘려보세요.',
      });
    }

    if (allStats.responseRate < 30) {
      recommendations.push({
        type: 'improvement',
        message: '응답률이 낮습니다. 이력서 개선을 고려하세요.',
      });
    }

    const pending = allStats.byStatus?.pending || 0;
    if (pending > 10) {
      recommendations.push({
        type: 'followup',
        message: `${pending}개의 대기 중인 지원이 있습니다.`,
      });
    }

    return recommendations;
  }
}
