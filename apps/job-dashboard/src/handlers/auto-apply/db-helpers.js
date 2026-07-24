import { getDecisionTrace } from './decision-trace.js';
import { canonicalizeJobUrl } from '../../job-url-canonicalization.js';
import { insertApplicationRecord } from './application-recorder.js';

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
  const sourceUrl = job.sourceUrl || job.url || '';
  const canonicalUrl = canonicalizeJobUrl(sourceUrl);
  const applyResult = serializeJson(result);
  const decisionTrace = serializeJson(getDecisionTrace(job));
  const approvalMetadata = serializeJson(getApprovalMetadata(job));
  const legacyParams = [
    appId,
    String(job.sourceId || job.id),
    source,
    sourceUrl,
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
  const canonicalParams = [
    ...legacyParams.slice(0, 4),
    canonicalUrl,
    ...legacyParams.slice(4),
  ];
  const currentParams = [
    ...canonicalParams,
    runId,
    dryRun ? 1 : 0,
    action,
    job.adapterBacked === true ? 1 : 0,
    decisionTrace,
    approvalMetadata,
    applyResult,
  ];

  await insertApplicationRecord(db, { canonicalParams, currentParams, legacyParams });
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
