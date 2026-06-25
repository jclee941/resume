import { getDecisionTrace } from './decision-trace.js';

const DEFAULT_KEYWORDS = ['DevOps', 'SRE', 'Platform Engineer', '보안'];

function getDb(env) {
  return env?.DB || env?.JOB_DB;
}

export async function getConfig(env) {
  const db = getDb(env);
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
  const db = getDb(env);
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
  const db = getDb(env);
  if (!db) return false;

  const result = await db
    .prepare('SELECT id FROM applications WHERE job_id = ? AND source = ?')
    .bind(String(jobId), source)
    .first();

  return !!result;
}

export async function recordApplication(env, applicationData) {
  const db = getDb(env);
  if (!db) return;

  const {
    job,
    source,
    status,
    result = null,
    runId = null,
    dryRun = false,
    action = null,
  } = applicationData;
  const now = new Date().toISOString();
  const appId = `${source}_${job.sourceId || job.id}`;
  const applyResult = serializeJson(result);
  const decisionTrace = serializeJson(getDecisionTrace(job));
  const approvalMetadata = serializeJson(getApprovalMetadata(job));
  const legacyParams = [
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
    applyResult,
    now,
    now,
    status === 'applied' ? now : null,
  ];
  const currentParams = [
    ...legacyParams,
    runId,
    dryRun ? 1 : 0,
    action,
    job.adapterBacked === true ? 1 : 0,
    decisionTrace,
    approvalMetadata,
    applyResult,
  ];

  try {
    await insertApplicationWithAutoApplyMetadata(db, currentParams);
  } catch (error) {
    if (!isMissingAutoApplyColumn(error)) throw error;
    await insertLegacyApplication(db, legacyParams);
  }
}

async function insertApplicationWithAutoApplyMetadata(db, params) {
  await db
    .prepare(
      `INSERT INTO applications
        (
          id, job_id, source, source_url, position, company, location, match_score,
          status, priority, notes, created_at, updated_at, applied_at,
          auto_apply_run_id, auto_apply_dry_run, auto_apply_action, adapter_backed,
          decision_trace, approval_metadata, apply_result
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          status = excluded.status,
          updated_at = excluded.updated_at,
          applied_at = excluded.applied_at,
          notes = excluded.notes,
          auto_apply_run_id = excluded.auto_apply_run_id,
          auto_apply_dry_run = excluded.auto_apply_dry_run,
          auto_apply_action = excluded.auto_apply_action,
          adapter_backed = excluded.adapter_backed,
          decision_trace = excluded.decision_trace,
          approval_metadata = excluded.approval_metadata,
          apply_result = excluded.apply_result`
    )
    .bind(...params)
    .run();
}

async function insertLegacyApplication(db, params) {
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
    .bind(...params)
    .run();
}

function getApprovalMetadata(job) {
  if (job?.workflowApprovalMetadata) return job.workflowApprovalMetadata;
  if (job?.approvalMetadata) return job.approvalMetadata;
  if (job?.humanApproval) return { humanApproval: job.humanApproval };
  return null;
}

function serializeJson(value) {
  return value === null || value === undefined ? null : JSON.stringify(value);
}

function isMissingAutoApplyColumn(error) {
  const message = String(error?.message || error);
  return /no such column|has no column named|unknown column/i.test(message);
}
