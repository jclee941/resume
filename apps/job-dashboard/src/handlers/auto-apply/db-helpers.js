const DEFAULT_KEYWORDS = ['DevOps', 'SRE', 'Platform Engineer', '보안'];

export async function getConfig(env) {
  const db = env?.DB;
  if (!db) {
    return {
      autoApplyEnabled: false,
      maxDailyApplications: 10,
      reviewThreshold: 60,
      autoApplyThreshold: 75,
      keywords: DEFAULT_KEYWORDS,
    };
  }

  const rows = await db
    .prepare('SELECT key, value FROM config WHERE key IN (?, ?, ?, ?)')
    .bind('auto_apply_enabled', 'max_daily_applications', 'min_match_score', 'auto_apply_keywords')
    .all();

  const config = {};
  for (const row of rows.results || []) {
    config[row.key] = row.value;
  }

  return {
    autoApplyEnabled: config.auto_apply_enabled === 'true',
    maxDailyApplications: parseInt(config.max_daily_applications) || 10,
    minMatchScore: parseInt(config.min_match_score) || 70,
    keywords: config.auto_apply_keywords
      ? JSON.parse(config.auto_apply_keywords)
      : DEFAULT_KEYWORDS,
  };
}

export async function getTodayApplicationCount(env, platform = null) {
  const db = env?.DB;
  if (!db) return 0;

  const today = new Date().toISOString().split('T')[0];
  let query;
  let params;

  if (platform) {
    query = 'SELECT COUNT(*) as count FROM applications WHERE DATE(created_at) = ? AND source = ?';
    params = [today, platform];
  } else {
    query = 'SELECT COUNT(*) as count FROM applications WHERE DATE(created_at) = ?';
    params = [today];
  }

  const result = await db
    .prepare(query)
    .bind(...params)
    .first();
  return result?.count || 0;
}

export async function isAlreadyApplied(env, jobId, source) {
  const db = env?.DB;
  if (!db) return false;

  const result = await db
    .prepare('SELECT id FROM applications WHERE job_id = ? AND source = ?')
    .bind(String(jobId), source)
    .first();

  return !!result;
}

export async function recordApplication(env, applicationData) {
  const db = env?.DB;
  if (!db) return;

  const { job, source, status, result = null } = applicationData;
  const now = new Date().toISOString();
  const appId = `${source}_${job.sourceId || job.id}`;

  await db
    .prepare(
      `INSERT INTO applications 
        (id, job_id, source, source_url, position, company, location, match_score, status, priority, notes, created_at, updated_at, applied_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET 
          status = excluded.status,
          updated_at = excluded.updated_at,
          applied_at = excluded.applied_at`
    )
    .bind(
      appId,
      String(job.sourceId || job.id),
      source,
      job.sourceUrl || job.url || '',
      job.position || job.title || '',
      job.company || '',
      job.location || '',
      job.matchScore || 0,
      status,
      'medium',
      result ? JSON.stringify(result) : null,
      now,
      now,
      status === 'applied' ? now : null
    )
    .run();
}
