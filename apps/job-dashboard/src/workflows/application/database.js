import { canonicalizeJobUrl } from '../../job-url-canonicalization.js';

/**
 * @typedef {{
 *   prepare(query: string): {
 *     bind(...values: unknown[]): {
 *       run(): Promise<unknown>;
 *       first(): Promise<{ [key: string]: unknown; status?: string; count?: number } | null>;
 *     };
 *   };
 * }} D1DatabaseLike
 */

/**
 * @typedef {Object} WorkflowContext
 * @property {{ JOB_DB: D1DatabaseLike }} env
 */

/**
 * @typedef {Object} WorkflowState
 * @property {string} id
 * @property {string} status
 * @property {string} [triggerType]
 * @property {{ jobsFound: number; jobsApproved: number; jobsApplied: number; jobsFailed: number }} stats
 * @property {string} startedAt
 * @property {string | null} [completedAt]
 * @property {unknown} [steps]
 * @property {unknown} [errors]
 */

/**
 * Scored job handed to the approval-request insert. Scoring passes the crawled
 * record through, so only the columns the insert reads are declared.
 * @typedef {{
 *   id?: string | number;
 *   position?: unknown;
 *   company?: unknown;
 *   source?: string;
 *   [key: string]: unknown;
 * }} ApplicationJob
 */

/**
 * @typedef {Object} ApprovalRequestParams
 * @property {string} requestId
 * @property {string} workflowId
 * @property {ApplicationJob} job
 * @property {string} status
 * @property {number} matchScore
 * @property {string | null} metadataJson
 */

/**
 * @typedef {Object} ApplicationRecord
 * @property {string} workflowId
 * @property {string} jobId
 * @property {string} platform
 * @property {string} sourceUrl
 * @property {string} company
 * @property {string} position
 * @property {string | null} resumeId
 * @property {string | null} coverLetter
 * @property {number} matchScore
 * @property {boolean} [appliedNow] false when the platform reported the job already applied: its
 *   application time is unknown, so applied_at stays empty for the history sync to fill
 */

/**
 * @param {WorkflowContext} ctx
 * @param {WorkflowState} workflow
 * @returns {Promise<void>}
 */
export async function saveWorkflowState(ctx, workflow) {
  await ctx.env.JOB_DB.prepare(
    `
      INSERT INTO application_workflows (
        id, status, trigger_type, jobs_found, jobs_approved, jobs_applied,
        jobs_failed, started_at, completed_at, data
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT (id) DO UPDATE SET
        status = excluded.status,
        jobs_found = excluded.jobs_found,
        jobs_approved = excluded.jobs_approved,
        jobs_applied = excluded.jobs_applied,
        jobs_failed = excluded.jobs_failed,
        completed_at = excluded.completed_at,
        data = excluded.data,
        updated_at = datetime('now')
      `
  )
    .bind(
      workflow.id,
      workflow.status,
      workflow.triggerType,
      workflow.stats.jobsFound,
      workflow.stats.jobsApproved,
      workflow.stats.jobsApplied,
      workflow.stats.jobsFailed,
      workflow.startedAt,
      workflow.completedAt ?? null,
      JSON.stringify({ steps: workflow.steps, errors: workflow.errors })
    )
    .run();
}

/**
 * @param {WorkflowContext} ctx
 * @param {string} workflowId
 * @param {string} stepName
 * @param {string} status
 * @param {Record<string, unknown>} [details]
 * @returns {Promise<void>}
 */
export async function logWorkflowStep(ctx, workflowId, stepName, status, details = {}) {
  await ctx.env.JOB_DB.prepare(
    `
      INSERT INTO workflow_logs (
        id, workflow_id, step_name, status, details, created_at
      ) VALUES (?, ?, ?, ?, ?, datetime('now'))
      `
  )
    .bind(
      `${workflowId}-${stepName}-${Date.now()}`,
      workflowId,
      stepName,
      status,
      JSON.stringify(details)
    )
    .run();
}

/**
 * @param {WorkflowContext} ctx
 * @param {string} workflowId
 * @param {ApplicationJob} job
 * @param {string} status
 * @param {number} matchScore
 * @param {Record<string, unknown> | null} [approvalMetadata]
 * @returns {Promise<string>}
 */
export async function createApprovalRequest(
  ctx,
  workflowId,
  job,
  status,
  matchScore,
  approvalMetadata = null
) {
  const requestId = `approval-${workflowId}-${job.id}`;
  const metadataJson = approvalMetadata === null ? null : JSON.stringify(approvalMetadata);

  await insertApprovalRequest(ctx, {
    requestId,
    workflowId,
    job,
    status,
    matchScore,
    metadataJson,
  });

  return requestId;
}

/**
 * @param {WorkflowContext} ctx
 * @param {ApprovalRequestParams} params
 * @returns {Promise<void>}
 */
async function insertApprovalRequest(ctx, params) {
  await ctx.env.JOB_DB.prepare(
    `
      INSERT INTO approval_requests (
        id, workflow_id, job_id, job_title, company, platform,
        match_score, status, approval_metadata, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT (id) DO UPDATE SET
        status = excluded.status,
        approval_metadata = excluded.approval_metadata,
        updated_at = datetime('now')
      `
  )
    .bind(...approvalRequestParams(params))
    .run();
}

/**
 * @param {ApprovalRequestParams} params
 * @returns {unknown[]}
 */
function approvalRequestParams({ requestId, workflowId, job, status, matchScore, metadataJson }) {
  return [
    requestId,
    workflowId,
    job.id,
    job.position,
    job.company,
    job.source,
    matchScore,
    status,
    metadataJson,
  ];
}

/**
 * @param {WorkflowContext} ctx
 * @param {string} requestId
 * @returns {Promise<string>}
 */
export async function getApprovalStatus(ctx, requestId) {
  const result = await ctx.env.JOB_DB.prepare('SELECT status FROM approval_requests WHERE id = ?')
    .bind(requestId)
    .first();

  return result?.status || 'pending';
}

/**
 * Records the job as applied: an existing row for the same (source, job_id), such as one the
 * application-history sync wrote, is promoted in place, so a job never gets a second row. An
 * existing application time is kept; a new one is the submission time, or none when the job was
 * found already applied.
 * @param {WorkflowContext} ctx
 * @param {ApplicationRecord} record
 * @returns {Promise<void>}
 */
export async function recordApplication(ctx, record) {
  const { workflowId, jobId, platform, sourceUrl, company, position } = record;
  const { resumeId, coverLetter, matchScore, appliedNow = true } = record;
  const now = appliedNow ? 1 : 0;
  const db = ctx.env.JOB_DB;
  await db
    .prepare(
      `
      UPDATE applications SET
        status = CASE WHEN status IN ('pending', 'saved') THEN 'applied' ELSE status END,
        applied_at = COALESCE(applied_at, CASE WHEN ? THEN datetime('now') END),
        updated_at = datetime('now')
      WHERE source = ? AND job_id = ?
      `
    )
    .bind(now, platform, jobId)
    .run();

  await db
    .prepare(
      `
      INSERT INTO applications (
        id, workflow_id, job_id, source, source_url, canonical_url, company, position,
        match_score, status, resume_id, cover_letter, applied_at, created_at, updated_at
      )
      SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
        CASE WHEN ? THEN datetime('now') END, datetime('now'), datetime('now')
      WHERE NOT EXISTS (SELECT 1 FROM applications WHERE source = ? AND job_id = ?)
      `
    )
    .bind(
      `${workflowId}-${jobId}`,
      workflowId,
      jobId,
      platform,
      sourceUrl,
      canonicalizeJobUrl(sourceUrl),
      company,
      position,
      matchScore,
      'applied',
      resumeId,
      coverLetter,
      now,
      platform,
      jobId
    )
    .run();
}

/**
 * @param {WorkflowContext} ctx
 * @param {string} date
 * @returns {Promise<number>}
 */
export async function getDailyApplicationCount(ctx, date) {
  const result = await ctx.env.JOB_DB.prepare(
    `
      SELECT COUNT(*) as count FROM applications
      WHERE date(applied_at) = ? AND status = 'applied'
      `
  )
    .bind(date)
    .first();

  return result?.count || 0;
}
