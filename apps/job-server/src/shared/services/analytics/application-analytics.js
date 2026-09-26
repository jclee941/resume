/**
 * ApplicationAnalytics - Job application success rate analysis
 *
 * Provides insights on application outcomes by:
 * - Company/industry patterns
 * - Position type correlation
 * - Time-based trends
 * - Match score effectiveness
 */

/**
 * ApplicationAnalytics - Job application success rate analysis
 *
 * Provides insights on application outcomes by:
 * - Company/industry patterns
 * - Position type correlation
 * - Time-based trends
 * - Match score effectiveness
 */

/**
 * @typedef {{
 *   source?: string;
 *   status?: string;
 *   appliedAt?: string | number | Date;
 *   job?: {
 *     matchScore?: number;
 *     company?: string;
 *     position?: string;
 *   };
 * }} ApplicationItem
 *
 * @typedef {{
 *   listApplications(): ApplicationItem[];
 * }} ApplicationService
 *
 * @typedef {{
 *   source: string;
 *   total: number;
 *   interviews: number;
 *   offers: number;
 *   rejections: number;
 *   interviewRate: string | number;
 *   offerRate: string | number;
 * }} SourceStats
 *
 * @typedef {{
 *   scoreRange: string;
 *   total: number;
 *   interviews: number;
 *   offers: number;
 *   successRate: string | number;
 * }} ScoreStats
 *
 * @typedef {{
 *   week: string;
 *   weekStart: string;
 *   applied: number;
 *   interviews: number;
 *   offers: number;
 *   rejections: number;
 * }} WeeklyStats
 *
 * @typedef {{
 *   company: string;
 *   total: number;
 *   interviews: number;
 *   offers: number;
 *   responseRate: string | number;
 * }} CompanyStats
 *
 * @typedef {{
 *   positionType: string;
 *   total: number;
 *   interviews: number;
 *   offers: number;
 *   interviewRate: string | number;
 * }} PositionTypeStats
 */

export class ApplicationAnalytics {
  /**
   * @param {{ applicationService: ApplicationService }} options
   */
  constructor({ applicationService }) {
    /** @type {ApplicationService} */
    this.appService = applicationService;
  }

  /**
   * @returns {Promise<SourceStats[]>}
   */
  async getSuccessRateBySource() {
    const apps = this.appService.listApplications();
    /** @type {Record<string, { total: number; interviews: number; offers: number; rejections: number }>} */
    const bySource = {};

    for (const app of apps) {
      const source = app.source || 'manual';
      if (!bySource[source]) {
        bySource[source] = {
          total: 0,
          interviews: 0,
          offers: 0,
          rejections: 0,
        };
      }
      bySource[source].total++;
      if (app.status === 'interview') bySource[source].interviews++;
      if (app.status === 'offer') bySource[source].offers++;
      if (app.status === 'rejected') bySource[source].rejections++;
    }

    return Object.entries(bySource).map(([source, stats]) => ({
      source,
      ...stats,
      interviewRate: stats.total ? ((stats.interviews / stats.total) * 100).toFixed(1) : 0,
      offerRate: stats.total ? ((stats.offers / stats.total) * 100).toFixed(1) : 0,
    }));
  }

  /**
   * @returns {Promise<ScoreStats[]>}
   */
  async getSuccessRateByMatchScore() {
    const apps = this.appService.listApplications();
    const buckets = {
      '90-100': { total: 0, interviews: 0, offers: 0 },
      '80-89': { total: 0, interviews: 0, offers: 0 },
      '70-79': { total: 0, interviews: 0, offers: 0 },
      '60-69': { total: 0, interviews: 0, offers: 0 },
      '<60': { total: 0, interviews: 0, offers: 0 },
    };

    for (const app of apps) {
      const score = app.job?.matchScore ?? 0;
      /** @type {'90-100' | '80-89' | '70-79' | '60-69' | '<60'} */
      let bucket;
      if (score >= 90) bucket = '90-100';
      else if (score >= 80) bucket = '80-89';
      else if (score >= 70) bucket = '70-79';
      else if (score >= 60) bucket = '60-69';
      else bucket = '<60';

      buckets[bucket].total++;
      if (app.status === 'interview') {
        buckets[bucket].interviews++;
      }
      if (app.status === 'offer') {
        buckets[bucket].offers++;
      }
    }

    return Object.entries(buckets).map(([range, stats]) => ({
      scoreRange: range,
      ...stats,
      successRate: stats.total
        ? (((stats.interviews + stats.offers) / stats.total) * 100).toFixed(1)
        : 0,
    }));
  }

  /**
   * @param {number} [weeks=8]
   * @returns {Promise<WeeklyStats[]>}
   */
  async getWeeklyTrend(weeks = 8) {
    const apps = this.appService.listApplications();
    const now = new Date();
    const weeklyData = [];

    for (let i = 0; i < weeks; i++) {
      const weekEnd = new Date(now);
      weekEnd.setDate(weekEnd.getDate() - i * 7);
      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekStart.getDate() - 7);

      const weekApps = apps.filter((a) => {
        const d = new Date(/** @type {string | number | Date} */ (a.appliedAt));
        return d >= weekStart && d < weekEnd;
      });

      weeklyData.unshift({
        week: `W-${i}`,
        weekStart: weekStart.toISOString().slice(0, 10),
        applied: weekApps.length,
        interviews: weekApps.filter((a) => a.status === 'interview').length,
        offers: weekApps.filter((a) => a.status === 'offer').length,
        rejections: weekApps.filter((a) => a.status === 'rejected').length,
      });
    }

    return weeklyData;
  }

  /**
   * @param {number} [limit=10]
   * @returns {Promise<CompanyStats[]>}
   */
  async getTopPerformingCompanies(limit = 10) {
    const apps = this.appService.listApplications();
    /** @type {Record<string, { total: number; interviews: number; offers: number }>} */
    const byCompany = {};

    for (const app of apps) {
      const company = app.job?.company || 'Unknown';
      if (!byCompany[company]) {
        byCompany[company] = { total: 0, interviews: 0, offers: 0 };
      }
      byCompany[company].total++;
      if (app.status === 'interview') byCompany[company].interviews++;
      if (app.status === 'offer') byCompany[company].offers++;
    }

    return Object.entries(byCompany)
      .map(([company, stats]) => ({
        company,
        ...stats,
        responseRate: stats.total
          ? (((stats.interviews + stats.offers) / stats.total) * 100).toFixed(1)
          : 0,
      }))
      .sort((a, b) => parseFloat(String(b.responseRate)) - parseFloat(String(a.responseRate)))
      .slice(0, limit);
  }

  /**
   * @returns {Promise<PositionTypeStats[]>}
   */
  async getPositionTypeAnalysis() {
    const apps = this.appService.listApplications();
    /** @type {Record<string, { total: number; interviews: number; offers: number }>} */
    const byType = {};

    /** @param {string | undefined} position */
    const categorize = (position) => {
      const p = (position || '').toLowerCase();
      if (p.includes('devops') || p.includes('sre') || p.includes('platform')) return 'DevOps/SRE';
      if (p.includes('security') || p.includes('보안')) return 'Security';
      if (p.includes('backend') || p.includes('server')) return 'Backend';
      if (p.includes('frontend') || p.includes('react')) return 'Frontend';
      if (p.includes('data') || p.includes('ml')) return 'Data/ML';
      return 'Other';
    };

    for (const app of apps) {
      const type = categorize(app.job?.position);
      if (!byType[type]) {
        byType[type] = { total: 0, interviews: 0, offers: 0 };
      }
      byType[type].total++;
      if (app.status === 'interview') byType[type].interviews++;
      if (app.status === 'offer') byType[type].offers++;
    }

    return Object.entries(byType).map(([type, stats]) => ({
      positionType: type,
      ...stats,
      interviewRate: stats.total ? ((stats.interviews / stats.total) * 100).toFixed(1) : 0,
    }));
  }

  /**
   * @returns {Promise<{
   *   generatedAt: string;
   *   summary: { totalApplications: number; interviewRate: string; offerRate: string };
   *   bySource: SourceStats[];
   *   byMatchScore: ScoreStats[];
   *   weeklyTrend: WeeklyStats[];
   *   topCompanies: CompanyStats[];
   *   byPositionType: PositionTypeStats[];
   *   recommendations: string[];
   * }>}
   */
  async generateReport() {
    const [bySource, byScore, trend, topCompanies, byPosition] = await Promise.all([
      this.getSuccessRateBySource(),
      this.getSuccessRateByMatchScore(),
      this.getWeeklyTrend(),
      this.getTopPerformingCompanies(),
      this.getPositionTypeAnalysis(),
    ]);

    const apps = this.appService.listApplications();
    const total = apps.length;
    const interviews = apps.filter((a) => a.status === 'interview').length;
    const offers = apps.filter((a) => a.status === 'offer').length;

    return {
      generatedAt: new Date().toISOString(),
      summary: {
        totalApplications: total,
        interviewRate: total ? `${((interviews / total) * 100).toFixed(1)}%` : '0%',
        offerRate: total ? `${((offers / total) * 100).toFixed(1)}%` : '0%',
      },
      bySource,
      byMatchScore: byScore,
      weeklyTrend: trend,
      topCompanies,
      byPositionType: byPosition,
      recommendations: this.generateRecommendations(bySource, byScore, byPosition),
    };
  }

  /**
   * @param {SourceStats[]} bySource
   * @param {ScoreStats[]} byScore
   * @param {PositionTypeStats[]} byPosition
   * @returns {string[]}
   */
  generateRecommendations(bySource, byScore, byPosition) {
    const recommendations = [];

    const bestSource = bySource.sort(
      (a, b) => parseFloat(String(b.interviewRate)) - parseFloat(String(a.interviewRate))
    )[0];
    if (bestSource && parseFloat(String(bestSource.interviewRate)) > 0) {
      recommendations.push(
        `Focus on ${bestSource.source}: ${bestSource.interviewRate}% interview rate`
      );
    }

    const scoreEffective = byScore.find(
      (s) => s.scoreRange === '80-89' || s.scoreRange === '90-100'
    );
    if (scoreEffective && parseFloat(String(scoreEffective.successRate)) > 20) {
      recommendations.push(
        `Match scores ${scoreEffective.scoreRange} have ${scoreEffective.successRate}% success - prioritize high-match jobs`
      );
    }

    const bestPosition = byPosition.sort(
      (a, b) => parseFloat(String(b.interviewRate)) - parseFloat(String(a.interviewRate))
    )[0];
    if (bestPosition && parseFloat(String(bestPosition.interviewRate)) > 10) {
      recommendations.push(
        `${bestPosition.positionType} roles show ${bestPosition.interviewRate}% interview rate`
      );
    }

    if (recommendations.length === 0) {
      recommendations.push('Collect more application data for meaningful insights');
    }

    return recommendations;
  }
}

export default ApplicationAnalytics;
