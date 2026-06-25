function getReportDateFilter(type) {
  return type === 'weekly' ? "date('now', '-7 days')" : "date('now', '-1 day')";
}

export async function getApplicationStats(env, type) {
  const dateFilter = getReportDateFilter(type);

  const stats = await env.JOB_DB.prepare(
    `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'saved' THEN 1 ELSE 0 END) as saved,
        SUM(CASE WHEN status = 'applied' THEN 1 ELSE 0 END) as applied,
        SUM(CASE WHEN status = 'viewed' THEN 1 ELSE 0 END) as viewed,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN status = 'interview' THEN 1 ELSE 0 END) as interview,
        SUM(CASE WHEN status = 'offer' THEN 1 ELSE 0 END) as offer,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
        SUM(CASE WHEN status = 'withdrawn' THEN 1 ELSE 0 END) as withdrawn,
        SUM(CASE WHEN status = 'expired' THEN 1 ELSE 0 END) as expired
      FROM applications
      WHERE date(created_at) >= ${dateFilter}
    `
  ).first();

  return {
    total: stats?.total || 0,
    pending: stats?.pending || 0,
    saved: stats?.saved || 0,
    applied: stats?.applied || 0,
    viewed: stats?.viewed || 0,
    in_progress: stats?.in_progress || 0,
    interview: stats?.interview || 0,
    offer: stats?.offer || 0,
    rejected: stats?.rejected || 0,
    withdrawn: stats?.withdrawn || 0,
    expired: stats?.expired || 0,
  };
}

export async function getPlatformStats(env, type) {
  const dateFilter = getReportDateFilter(type);

  const results = await env.JOB_DB.prepare(
    `
      SELECT 
        platform,
        COUNT(*) as count,
        SUM(CASE WHEN status = 'interview' OR status = 'offer' THEN 1 ELSE 0 END) as success
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

export async function getSearchStats(env, type) {
  const dateFilter = getReportDateFilter(type);

  const stats = await env.JOB_DB.prepare(
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

export async function calculateTrends(env, currentStats, type) {
  const prevFilter =
    type === 'weekly'
      ? "date('now', '-14 days') AND date('now', '-7 days')"
      : "date('now', '-2 days') AND date('now', '-1 day')";

  const prevStats = await env.JOB_DB.prepare(
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
