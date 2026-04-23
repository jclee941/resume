import { toIsoDate } from './tracker-normalizers.js';

export async function getStats(
  { repository, enableAnalytics, normalizeTimeRange, queryOne },
  timeRange = {}
) {
  if (!enableAnalytics) {
    return { enabled: false };
  }

  const baseStats = await repository.getStats();
  const range = normalizeTimeRange(timeRange);
  const rangeSummary = await queryOne(
    `
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed,
        AVG(COALESCE(match_score, 0)) AS averageMatchScore
      FROM applications
      WHERE date(created_at) BETWEEN date(?) AND date(?)
    `,
    [range.from, range.to]
  );

  return {
    ...baseStats,
    range,
    rangeTotal: Number(rangeSummary?.total || 0),
    rangeCompleted: Number(rangeSummary?.completed || 0),
    rangeAverageMatchScore: Number(rangeSummary?.averageMatchScore || 0),
  };
}

export async function getDailyStats({ enableAnalytics, queryOne }, date = new Date()) {
  if (!enableAnalytics) {
    return { enabled: false };
  }

  const targetDate = toIsoDate(date);
  const summary = await queryOne(
    `
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'submitted' THEN 1 ELSE 0 END) AS submitted,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed,
        AVG(COALESCE(match_score, 0)) AS averageMatchScore
      FROM applications
      WHERE date(created_at) = date(?)
    `,
    [targetDate]
  );

  return {
    date: targetDate,
    total: Number(summary?.total || 0),
    submitted: Number(summary?.submitted || 0),
    completed: Number(summary?.completed || 0),
    averageMatchScore: Number(summary?.averageMatchScore || 0),
  };
}

export async function getWeeklyStats({ repository, enableAnalytics }) {
  if (!enableAnalytics) {
    return { enabled: false };
  }

  const rows = await repository.d1Client.query(
    `
      SELECT
        date(created_at) AS day,
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed,
        SUM(CASE WHEN status = 'submitted' THEN 1 ELSE 0 END) AS submitted
      FROM applications
      WHERE date(created_at) >= date('now', '-6 days')
      GROUP BY day
      ORDER BY day ASC
    `
  );

  return rows.map((row) => ({
    day: row.day,
    total: Number(row.total || 0),
    completed: Number(row.completed || 0),
    submitted: Number(row.submitted || 0),
  }));
}

export async function getSuccessRate({ enableAnalytics, queryOne }) {
  if (!enableAnalytics) {
    return { enabled: false };
  }

  const row = await queryOne(
    `
      SELECT
        SUM(CASE WHEN status IN ('completed', 'approved') THEN 1 ELSE 0 END) AS success,
        SUM(CASE WHEN status IN ('completed', 'approved', 'rejected', 'failed') THEN 1 ELSE 0 END) AS terminal
      FROM applications
    `
  );

  const success = Number(row?.success || 0);
  const terminal = Number(row?.terminal || 0);

  return {
    success,
    terminal,
    rate: terminal === 0 ? 0 : Number(((success / terminal) * 100).toFixed(2)),
  };
}

export async function getAverageMatchScore({ enableAnalytics, queryOne }) {
  if (!enableAnalytics) {
    return { enabled: false };
  }

  const row = await queryOne(
    `
      SELECT AVG(COALESCE(match_score, 0)) AS average
      FROM applications
      WHERE status IN ('submitted', 'completed', 'approved', 'rejected')
    `
  );

  return Number(row?.average || 0);
}

export async function getTopCompanies({ repository, enableAnalytics }, limit = 10) {
  if (!enableAnalytics) {
    return { enabled: false };
  }

  const rows = await repository.d1Client.query(
    `
      SELECT company, COUNT(*) AS count
      FROM applications
      GROUP BY company
      ORDER BY count DESC, company ASC
      LIMIT ?
    `,
    [Number(limit) || 10]
  );

  return rows.map((row) => ({
    company: row.company,
    count: Number(row.count || 0),
  }));
}

export async function getPlatformBreakdown({ repository, enableAnalytics }) {
  if (!enableAnalytics) {
    return { enabled: false };
  }

  const rows = await repository.d1Client.query(
    `
      SELECT source AS platform, COUNT(*) AS count
      FROM applications
      GROUP BY source
      ORDER BY count DESC, platform ASC
    `
  );

  return rows.map((row) => ({
    platform: row.platform,
    count: Number(row.count || 0),
  }));
}
