import { WorkflowEntrypoint } from 'cloudflare:workers';

/**
 * Daily Report Workflow
 *
 * Generates and sends daily/weekly job application reports.
 * Aggregates stats, formats report, sends to Slack.
 *
 * @param {Object} params
 * @param {string} params.type - Report type: 'daily' or 'weekly'
 * @param {string} params.date - Report date (optional, defaults to today)
 */
export class DailyReportWorkflow extends WorkflowEntrypoint {
  async run(event, step) {
    const { type = 'daily', date } = event.payload;

    const report = {
      id: event.instanceId,
      type,
      generatedAt: new Date().toISOString(),
      date: date || new Date().toISOString().split('T')[0],
      status: 'running',
    };

    // Step 1: Gather application statistics
    const appStats = await step.do(
      'gather-app-stats',
      {
        retries: { limit: 2, delay: '5 seconds' },
        timeout: '1 minute',
      },
      async () => {
        return await this.getApplicationStats(type, report.date);
      }
    );

    report.applications = appStats;

    // Step 2: Gather platform-specific stats
    const platformStats = await step.do(
      'gather-platform-stats',
      {
        retries: { limit: 2, delay: '5 seconds' },
        timeout: '1 minute',
      },
      async () => {
        return await this.getPlatformStats(type, report.date);
      }
    );

    report.platforms = platformStats;

    // Step 3: Gather job search stats
    const searchStats = await step.do(
      'gather-search-stats',
      {
        retries: { limit: 2, delay: '5 seconds' },
        timeout: '1 minute',
      },
      async () => {
        return await this.getSearchStats(type, report.date);
      }
    );

    report.searches = searchStats;

    // Step 4: Calculate trends
    const trends = await step.do(
      'calculate-trends',
      {
        retries: { limit: 2, delay: '5 seconds' },
        timeout: '1 minute',
      },
      async () => {
        return await this.calculateTrends(appStats, type);
      }
    );

    report.trends = trends;

    // Step 5: Generate report content
    const content = await step.do(
      'generate-content',
      {
        retries: { limit: 2, delay: '5 seconds' },
        timeout: '1 minute',
      },
      async () => {
        return this.generateReportContent(report);
      }
    );

    report.content = content;

    // Step 6: Save report to database
    await step.do(
      'save-report',
      {
        retries: { limit: 2, delay: '5 seconds' },
        timeout: '30 seconds',
      },
      async () => {
        await this.env.DB.prepare(
          `
          INSERT INTO reports (id, type, date, data, created_at)
          VALUES (?, ?, ?, ?, datetime('now'))
          ON CONFLICT (type, date) DO UPDATE SET data = excluded.data, updated_at = datetime('now')
        `
        )
          .bind(report.id, type, report.date, JSON.stringify(report))
          .run();
      }
    );

    // Step 7: Send to Slack
    await step.do(
      'send-notification',
      {
        retries: { limit: 3, delay: '10 seconds', backoff: 'exponential' },
        timeout: '30 seconds',
      },
      async () => {
        await this.sendSlackReport(content, type);
      }
    );

    report.status = 'completed';
    report.completedAt = new Date().toISOString();

    return {
      success: true,
      report,
    };
  }

  async getApplicationStats(type, _date) {
    const dateFilter = type === 'weekly' ? "date('now', '-7 days')" : "date('now', '-1 day')";

    const stats = await this.env.DB.prepare(
      `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'applied' THEN 1 ELSE 0 END) as applied,
        SUM(CASE WHEN status = 'interviewing' THEN 1 ELSE 0 END) as interviewing,
        SUM(CASE WHEN status = 'offered' THEN 1 ELSE 0 END) as offered,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending
      FROM applications
      WHERE date(created_at) >= ${dateFilter}
    `
    ).first();

    return {
      total: stats?.total || 0,
      applied: stats?.applied || 0,
      interviewing: stats?.interviewing || 0,
      offered: stats?.offered || 0,
      rejected: stats?.rejected || 0,
      pending: stats?.pending || 0,
    };
  }

  async getPlatformStats(type, _date) {
    const dateFilter = type === 'weekly' ? "date('now', '-7 days')" : "date('now', '-1 day')";

    const results = await this.env.DB.prepare(
      `
      SELECT 
        platform,
        COUNT(*) as count,
        SUM(CASE WHEN status = 'interviewing' OR status = 'offered' THEN 1 ELSE 0 END) as success
      FROM applications
      WHERE date(created_at) >= ${dateFilter}
      GROUP BY platform
      ORDER BY count DESC
    `
    ).all();

    const platforms = {};
    for (const row of results.results || []) {
      platforms[row.platform] = {
        count: row.count,
        success: row.success,
        rate: row.count > 0 ? ((row.success / row.count) * 100).toFixed(1) : 0,
      };
    }

    return platforms;
  }

  async getSearchStats(type, _date) {
    const dateFilter = type === 'weekly' ? "date('now', '-7 days')" : "date('now', '-1 day')";

    const stats = await this.env.DB.prepare(
      `
      SELECT 
        COUNT(*) as total_jobs,
        AVG(match_score) as avg_score,
        MAX(match_score) as max_score
      FROM job_search_results
      WHERE date(created_at) >= ${dateFilter}
    `
    ).first();

    return {
      totalJobs: stats?.total_jobs || 0,
      avgScore: Math.round(stats?.avg_score || 0),
      maxScore: stats?.max_score || 0,
    };
  }

  async calculateTrends(currentStats, type) {
    // Compare with previous period
    const prevFilter =
      type === 'weekly'
        ? "date('now', '-14 days') AND date('now', '-7 days')"
        : "date('now', '-2 days') AND date('now', '-1 day')";

    const prevStats = await this.env.DB.prepare(
      `
      SELECT COUNT(*) as total
      FROM applications
      WHERE date(created_at) BETWEEN ${prevFilter.split(' AND ')[0]} AND ${prevFilter.split(' AND ')[1]}
    `
    ).first();

    const prev = prevStats?.total || 0;
    const current = currentStats.total;

    let trend = 'stable';
    let change = 0;

    if (prev > 0) {
      change = ((current - prev) / prev) * 100;
      if (change > 10) trend = 'up';
      else if (change < -10) trend = 'down';
    }

    return {
      trend,
      change: Math.round(change),
      previous: prev,
      current,
    };
  }

  generateReportContent(report) {
    const { type, applications, platforms, searches, trends } = report;
    const periodLabel = type === 'weekly' ? '주간' : '일간';

    // Status emoji mapping
    const statusEmoji = {
      applied: '📝',
      interviewing: '💼',
      offered: '🎉',
      rejected: '❌',
      pending: '⏳',
    };

    // Trend emoji
    const trendEmoji = trends.trend === 'up' ? '📈' : trends.trend === 'down' ? '📉' : '➡️';

    // Platform breakdown
    const platformBreakdown = Object.entries(platforms)
      .map(([name, stats]) => `• ${name}: ${stats.count}건 (성공률 ${stats.rate}%)`)
      .join('\n');

    return {
      title: `${periodLabel} 채용 리포트`,
      date: report.date,
      summary: {
        total: applications.total,
        trend: `${trendEmoji} ${trends.change > 0 ? '+' : ''}${trends.change}%`,
      },
      sections: [
        {
          title: '지원 현황',
          content: `${statusEmoji.applied} 지원: ${applications.applied}건
${statusEmoji.interviewing} 면접: ${applications.interviewing}건
${statusEmoji.offered} 합격: ${applications.offered}건
${statusEmoji.rejected} 불합격: ${applications.rejected}건
${statusEmoji.pending} 대기: ${applications.pending}건`,
        },
        {
          title: '플랫폼별 현황',
          content: platformBreakdown || '데이터 없음',
        },
        {
          title: '채용공고 검색',
          content: `• 총 검색: ${searches.totalJobs}건
• 평균 매칭: ${searches.avgScore}%
• 최고 매칭: ${searches.maxScore}%`,
        },
      ],
    };
  }

  async sendSlackReport(content, _type) {
    const blocks = [
      {
        type: 'header',
        text: { type: 'plain_text', text: `📊 ${content.title}` },
      },
      {
        type: 'context',
        elements: [{ type: 'mrkdwn', text: `${content.date} | ${content.summary.trend}` }],
      },
      { type: 'divider' },
    ];

    for (const section of content.sections) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${section.title}*\n${section.content}`,
        },
      });
    }

    blocks.push(
      { type: 'divider' },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `<https://job.jclee.me|대시보드 보기> | 총 ${content.summary.total}건 지원`,
          },
        ],
      }
    );

    await this.sendSlackNotification({
      text: content.title,
      blocks,
    });
  }

  async sendSlackNotification(message) {
    const webhookUrl = this.env.SLACK_WEBHOOK_URL;
    if (!webhookUrl) return;

    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });
  }
}
