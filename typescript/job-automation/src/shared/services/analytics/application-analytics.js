/**
 * ApplicationAnalytics - Job application success rate analysis
 *
 * Provides insights on application outcomes by:
 * - Company/industry patterns
 * - Position type correlation
 * - Time-based trends
 * - Match score effectiveness
 */

export class ApplicationAnalytics {
  constructor(applicationService) {
    this.appService = applicationService;
  }

  async getSuccessRateBySource() {
    const apps = this.appService.listApplications();
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
      if (app.status === 'interviewing') bySource[source].interviews++;
      if (app.status === 'offered') bySource[source].offers++;
      if (app.status === 'rejected') bySource[source].rejections++;
    }

    return Object.entries(bySource).map(([source, stats]) => ({
      source,
      ...stats,
      interviewRate: stats.total
        ? ((stats.interviews / stats.total) * 100).toFixed(1)
        : 0,
      offerRate: stats.total
        ? ((stats.offers / stats.total) * 100).toFixed(1)
        : 0,
    }));
  }

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
      let bucket;
      if (score >= 90) bucket = '90-100';
      else if (score >= 80) bucket = '80-89';
      else if (score >= 70) bucket = '70-79';
      else if (score >= 60) bucket = '60-69';
      else bucket = '<60';

      buckets[bucket].total++;
      if (app.status === 'interviewing' || app.status === 'offered') {
        buckets[bucket].interviews++;
      }
      if (app.status === 'offered') {
        buckets[bucket].offers++;
      }
    }

    return Object.entries(buckets).map(([range, stats]) => ({
      scoreRange: range,
      ...stats,
      successRate: stats.total
        ? ((stats.interviews / stats.total) * 100).toFixed(1)
        : 0,
    }));
  }

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
        const d = new Date(a.appliedAt);
        return d >= weekStart && d < weekEnd;
      });

      weeklyData.unshift({
        week: `W-${i}`,
        weekStart: weekStart.toISOString().slice(0, 10),
        applied: weekApps.length,
        interviews: weekApps.filter((a) => a.status === 'interviewing').length,
        offers: weekApps.filter((a) => a.status === 'offered').length,
        rejections: weekApps.filter((a) => a.status === 'rejected').length,
      });
    }

    return weeklyData;
  }

  async getTopPerformingCompanies(limit = 10) {
    const apps = this.appService.listApplications();
    const byCompany = {};

    for (const app of apps) {
      const company = app.job?.company || 'Unknown';
      if (!byCompany[company]) {
        byCompany[company] = { total: 0, interviews: 0, offers: 0 };
      }
      byCompany[company].total++;
      if (app.status === 'interviewing') byCompany[company].interviews++;
      if (app.status === 'offered') byCompany[company].offers++;
    }

    return Object.entries(byCompany)
      .map(([company, stats]) => ({
        company,
        ...stats,
        responseRate: stats.total
          ? (((stats.interviews + stats.offers) / stats.total) * 100).toFixed(1)
          : 0,
      }))
      .sort((a, b) => parseFloat(b.responseRate) - parseFloat(a.responseRate))
      .slice(0, limit);
  }

  async getPositionTypeAnalysis() {
    const apps = this.appService.listApplications();
    const byType = {};

    const categorize = (position) => {
      const p = (position || '').toLowerCase();
      if (p.includes('devops') || p.includes('sre') || p.includes('platform'))
        return 'DevOps/SRE';
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
      if (app.status === 'interviewing') byType[type].interviews++;
      if (app.status === 'offered') byType[type].offers++;
    }

    return Object.entries(byType).map(([type, stats]) => ({
      positionType: type,
      ...stats,
      interviewRate: stats.total
        ? ((stats.interviews / stats.total) * 100).toFixed(1)
        : 0,
    }));
  }

  async generateReport() {
    const [bySource, byScore, trend, topCompanies, byPosition] =
      await Promise.all([
        this.getSuccessRateBySource(),
        this.getSuccessRateByMatchScore(),
        this.getWeeklyTrend(),
        this.getTopPerformingCompanies(),
        this.getPositionTypeAnalysis(),
      ]);

    const apps = this.appService.listApplications();
    const total = apps.length;
    const interviews = apps.filter((a) => a.status === 'interviewing').length;
    const offers = apps.filter((a) => a.status === 'offered').length;

    return {
      generatedAt: new Date().toISOString(),
      summary: {
        totalApplications: total,
        interviewRate: total
          ? `${((interviews / total) * 100).toFixed(1)  }%`
          : '0%',
        offerRate: total ? `${((offers / total) * 100).toFixed(1)  }%` : '0%',
      },
      bySource,
      byMatchScore: byScore,
      weeklyTrend: trend,
      topCompanies,
      byPositionType: byPosition,
      recommendations: this.generateRecommendations(
        bySource,
        byScore,
        byPosition,
      ),
    };
  }

  generateRecommendations(bySource, byScore, byPosition) {
    const recommendations = [];

    const bestSource = bySource.sort(
      (a, b) => parseFloat(b.interviewRate) - parseFloat(a.interviewRate),
    )[0];
    if (bestSource && parseFloat(bestSource.interviewRate) > 0) {
      recommendations.push(
        `Focus on ${bestSource.source}: ${bestSource.interviewRate}% interview rate`,
      );
    }

    const scoreEffective = byScore.find(
      (s) => s.scoreRange === '80-89' || s.scoreRange === '90-100',
    );
    if (scoreEffective && parseFloat(scoreEffective.successRate) > 20) {
      recommendations.push(
        `Match scores ${scoreEffective.scoreRange} have ${scoreEffective.successRate}% success - prioritize high-match jobs`,
      );
    }

    const bestPosition = byPosition.sort(
      (a, b) => parseFloat(b.interviewRate) - parseFloat(a.interviewRate),
    )[0];
    if (bestPosition && parseFloat(bestPosition.interviewRate) > 10) {
      recommendations.push(
        `${bestPosition.positionType} roles show ${bestPosition.interviewRate}% interview rate`,
      );
    }

    if (recommendations.length === 0) {
      recommendations.push(
        'Collect more application data for meaningful insights',
      );
    }

    return recommendations;
  }
}

export default ApplicationAnalytics;
