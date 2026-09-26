import { getDecisionTrace } from './decision-trace.js';
import { canonicalizeJobUrl } from '../../job-url-canonicalization.js';
import { insertApplicationRecord } from './application-recorder.js';

/**
 * @typedef {{
 *   prepare(query: string): {
 *     bind(...values: unknown[]): {
 *       all(): Promise<{ results?: Array<{ key: string; value: string }> }>;
 *       first(): Promise<{ count?: number; id?: string | number } | null>;
 *       run(): Promise<unknown>;
 *     };
 *   };
 * }} D1DatabaseLike
 *
 * @typedef {{
 *   JOB_DB?: D1DatabaseLike;
 *   DB?: D1DatabaseLike;
 *   [key: string]: unknown;
 * }} DbEnv
 *
 * @typedef {{
 *   id?: string | number;
 *   sourceId?: string | number;
 *   sourceUrl?: string;
 *   url?: string;
 *   position?: string;
 *   title?: string;
 *   company?: string;
 *   location?: string;
 *   matchScore?: number;
 *   adapterBacked?: boolean;
 *   workflowApprovalMetadata?: unknown;
 *   approvalMetadata?: unknown;
 *   humanApproval?: unknown;
 *   decisionTrace?: unknown[];
 *   [key: string]: unknown;
 * }} AutoApplyJob
 *
 * @typedef {{
 *   job: AutoApplyJob;
 *   source: string;
 *   status: string;
 *   result?: unknown;
 *   runId?: string | null;
 *   dryRun?: boolean;
 *   action?: string | null;
 * }} ApplicationData
 *
 * @typedef {{
 *   autoApplyEnabled: boolean;
 *   maxDailyApplications: number;
 *   reviewThreshold?: number;
 *   autoApplyThreshold?: number;
 *   minMatchScore: number;
 *   keywords: string[];
 * }} AutoApplyConfig
 */

const DEFAULT_KEYWORDS = ['DevOps', 'SRE', 'Platform Engineer', '보안'];

/**
 * @param {DbEnv | null | undefined} env
 * @returns {D1DatabaseLike | undefined}
 */
function getDb(env) {
  return env?.JOB_DB || env?.DB;
}

/**
 * @param {DbEnv | null | undefined} env
 * @returns {Promise<AutoApplyConfig>}
 */
export async function getConfig(env) {
  const db = getDb(env);
  if (!db) {
    return {
      autoApplyEnabled: false,
      maxDailyApplications: 10,
      reviewThreshold: 60,
      autoApplyThreshold: 75,
      minMatchScore: 60,
      keywords: DEFAULT_KEYWORDS,
    };
  }

  const rows = await db
    .prepare('SELECT key, value FROM config WHERE key IN (?, ?, ?, ?)')
    .bind('auto_apply_enabled', 'max_daily_applications', 'min_match_score', 'auto_apply_keywords')
    .all();

  /** @type {Record<string, string>} */
  const config = {};
  for (const row of rows.results || []) {
    config[row.key] = row.value;
  }

  let keywords = DEFAULT_KEYWORDS;
  if (config.auto_apply_keywords) {
    try {
      const parsedKeywords = JSON.parse(config.auto_apply_keywords);
      if (
        Array.isArray(parsedKeywords) &&
        parsedKeywords.every((keyword) => typeof keyword === 'string')
      ) {
        keywords = parsedKeywords;
      }
    } catch {
      keywords = DEFAULT_KEYWORDS;
    }
  }

  return {
    autoApplyEnabled: config.auto_apply_enabled === 'true',
    maxDailyApplications: parseInt(config.max_daily_applications) || 10,
    minMatchScore: parseInt(config.min_match_score) || 60,
    keywords,
  };
}

/**
 * @param {DbEnv | null | undefined} env
 * @param {string | null} [platform]
 * @returns {Promise<number>}
 */
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

/**
 * @param {DbEnv | null | undefined} env
 * @param {string | number | undefined} jobId
 * @param {string} source
 * @returns {Promise<boolean>}
 */
export async function isAlreadyApplied(env, jobId, source) {
  const db = getDb(env);
  if (!db) return false;

  const result = await db
    .prepare('SELECT id FROM applications WHERE job_id = ? AND source = ?')
    .bind(String(jobId), source)
    .first();

  return !!result;
}

/**
 * @param {DbEnv | null | undefined} env
 * @param {ApplicationData} applicationData
 * @returns {Promise<void>}
 */
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
  const canonicalParams = [...legacyParams.slice(0, 4), canonicalUrl, ...legacyParams.slice(4)];
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

/**
 * @param {AutoApplyJob | null | undefined} job
 * @returns {unknown}
 */
function getApprovalMetadata(job) {
  if (job?.workflowApprovalMetadata) return job.workflowApprovalMetadata;
  if (job?.approvalMetadata) return job.approvalMetadata;
  if (job?.humanApproval) return { humanApproval: job.humanApproval };
  return null;
}

/**
 * @param {unknown} value
 * @returns {string | null}
 */
function serializeJson(value) {
  return value === null || value === undefined ? null : JSON.stringify(value);
}
