import { refreshJobKoreaSession } from '../jobkorea/mint-session.js';
import { refreshWantedSession } from '../wanted/mint-session.js';

export const RESUME_SYNC_CRON = '0 21 * * *';
export const HEALTH_CHECK_CRON = '0 * * * *';
export const WEEKLY_REPORT_CRON = '0 0 * * 1';

/**
 * @typedef {{ create(options: { params: unknown }): Promise<unknown> }} WorkflowStarter
 * @typedef {'RESUME_SYNC_WORKFLOW' | 'CLEANUP_WORKFLOW' | 'HEALTH_CHECK_WORKFLOW' | 'DAILY_REPORT_WORKFLOW'} WorkflowBindingName
 * @typedef {Parameters<typeof refreshWantedSession>[0] & Parameters<typeof refreshJobKoreaSession>[0] & {
 *   RESUME_SYNC_CRON_DRY_RUN?: string;
 * } & { [Name in WorkflowBindingName]?: WorkflowStarter }} CronEnv
 * @typedef {{ waitUntil(promise: Promise<unknown>): void }} CronContext
 * @typedef {{ binding: WorkflowBindingName; params: unknown }} WorkflowStart
 */

/**
 * @param {CronEnv} env
 * @returns {Promise<void>}
 */
async function refreshPlatformSessions(env) {
  const [wanted, jobkorea] = await Promise.all([
    refreshWantedSession(env),
    refreshJobKoreaSession(env),
  ]);
  if (!wanted.ok) console.warn('[cron] Wanted session refresh failed:', wanted.error);
  if (!jobkorea.ok) console.warn('[cron] JobKorea session refresh failed:', jobkorea.error);
}

/**
 * @param {CronEnv} env
 * @returns {Promise<WorkflowStart[]>}
 */
async function resumeSyncStarts(env) {
  if (env.RESUME_SYNC_WORKFLOW) await refreshPlatformSessions(env);
  const dryRun = String(env.RESUME_SYNC_CRON_DRY_RUN ?? 'true').toLowerCase() !== 'false';
  return [
    { binding: 'RESUME_SYNC_WORKFLOW', params: { dryRun, source: 'cron' } },
    { binding: 'CLEANUP_WORKFLOW', params: { source: 'cron' } },
  ];
}

/**
 * @param {string | undefined} cron
 * @param {CronEnv} env
 * @returns {Promise<WorkflowStart[]>}
 */
async function planStarts(cron, env) {
  if (cron === RESUME_SYNC_CRON) return resumeSyncStarts(env);
  if (cron === HEALTH_CHECK_CRON) {
    return [{ binding: 'HEALTH_CHECK_WORKFLOW', params: { source: 'cron' } }];
  }
  if (cron === WEEKLY_REPORT_CRON) {
    return [{ binding: 'DAILY_REPORT_WORKFLOW', params: { type: 'weekly', source: 'cron' } }];
  }
  console.warn('[cron] No scheduled handler for cron:', cron);
  return [];
}

/**
 * @param {CronEnv} env
 * @param {WorkflowStart} start
 * @returns {Promise<unknown>}
 */
async function startWorkflow(env, { binding, params }) {
  const workflow = env[binding];
  if (!workflow) throw new Error('binding is missing');
  return workflow.create({ params });
}

/**
 * @param {unknown} reason
 * @returns {string}
 */
function describeReason(reason) {
  return reason instanceof Error ? reason.message : String(reason);
}

/**
 * Route a Cloudflare scheduled() invocation by its matched cron expression.
 * - RESUME_SYNC_CRON   -> ResumeSyncWorkflow (dryRun unless RESUME_SYNC_CRON_DRY_RUN=false,
 *   after a best-effort Wanted/JobKorea session refresh) plus CleanupWorkflow.
 * - HEALTH_CHECK_CRON  -> HealthCheckWorkflow.
 * - WEEKLY_REPORT_CRON -> DailyReportWorkflow with type 'weekly'.
 * - anything else      -> logged and ignored.
 * Every start is attempted; if any rejects (or its binding is missing) the run throws
 * after all have settled so Cloudflare records the cron invocation as failed.
 * @param {{ cron?: string } | undefined} controller
 * @param {CronEnv} env
 * @param {CronContext} ctx
 * @returns {Promise<void>}
 */
export async function scheduled(controller, env, ctx) {
  const starts = await planStarts(controller?.cron, env);
  const runs = starts.map((start) => {
    const run = startWorkflow(env, start);
    ctx.waitUntil(run);
    return run;
  });
  const results = await Promise.allSettled(runs);
  const failures = starts.flatMap((start, index) => {
    const result = results[index];
    return result.status === 'rejected'
      ? [`${start.binding} (${describeReason(result.reason)})`]
      : [];
  });
  if (failures.length > 0) {
    throw new Error(`Cron "${controller?.cron}" failed to start: ${failures.join(', ')}`);
  }
}

export default { scheduled, RESUME_SYNC_CRON, HEALTH_CHECK_CRON, WEEKLY_REPORT_CRON };
