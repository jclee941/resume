import { refreshJobKoreaSession } from '../jobkorea/mint-session.js';
import { syncApplicationHistory } from '../../services/application-history/sync.js';
import { refreshWantedSession } from '../wanted/mint-session.js';
import { planAutoApplyStart } from './auto-apply-start.js';

export const RESUME_SYNC_CRON = '0 21 * * *';
export const HEALTH_CHECK_CRON = '0 * * * *';
const HISTORY_SYNC_TIMEOUT_MS = 120_000;
/**
 * JobKorea's login page has slow spells lasting a minute or two, during which even an immediate
 * retry times out; the daily cron can afford to wait them out before the history sync needs the
 * session (4 tries at most, 90 s apart, well inside the scheduled-event limit).
 */
export const JOBKOREA_CRON_REFRESH = Object.freeze({ attempts: 4, retryDelayMs: 90_000 });

/**
 * @typedef {{ create(options: { params: unknown }): Promise<unknown> }} WorkflowStarter
 * @typedef {'RESUME_SYNC_WORKFLOW' | 'CLEANUP_WORKFLOW' | 'APPLICATION_WORKFLOW' | 'HEALTH_CHECK_WORKFLOW' | 'DAILY_REPORT_WORKFLOW'} WorkflowBindingName
 * @typedef {Parameters<typeof refreshWantedSession>[0] & Parameters<typeof refreshJobKoreaSession>[0] & Parameters<typeof planAutoApplyStart>[0] & Parameters<typeof syncApplicationHistory>[0] & {
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
    refreshJobKoreaSession(env, JOBKOREA_CRON_REFRESH),
  ]);
  if (!wanted.ok) console.warn('[cron] Wanted session refresh failed:', wanted.error);
  if (!jobkorea.ok) console.warn('[cron] JobKorea session refresh failed:', jobkorea.error);
}

/**
 * Pulls Wanted/JobKorea application history into D1 so the auto-apply approval gate that runs
 * next already sees what was applied elsewhere. A failure is logged and never blocks a start.
 * @param {CronEnv} env
 * @param {typeof syncApplicationHistory} sync
 * @returns {Promise<void>}
 */
async function syncHistoryBestEffort(env, sync) {
  try {
    const summary = await sync(env, { timeoutMs: HISTORY_SYNC_TIMEOUT_MS });
    console.info(
      '[cron] application history sync',
      summary.status,
      JSON.stringify(summary.platforms)
    );
  } catch (error) {
    console.warn('[cron] application history sync failed:', describeReason(error));
  }
}

/**
 * @param {CronEnv} env
 * @param {typeof syncApplicationHistory} sync
 * @returns {Promise<WorkflowStart[]>}
 */
async function resumeSyncStarts(env, sync) {
  if (env.RESUME_SYNC_WORKFLOW) await refreshPlatformSessions(env);
  await syncHistoryBestEffort(env, sync);
  const dryRun = String(env.RESUME_SYNC_CRON_DRY_RUN ?? 'true').toLowerCase() !== 'false';
  return [
    { binding: 'RESUME_SYNC_WORKFLOW', params: { dryRun, source: 'cron' } },
    { binding: 'CLEANUP_WORKFLOW', params: { source: 'cron' } },
    ...(await planAutoApplyStart(env)),
  ];
}

/**
 * The weekly report rides the hourly trigger instead of a Cron Trigger of its own.
 * @param {number | undefined} scheduledTime
 * @returns {boolean}
 */
function isWeeklyReportHour(scheduledTime) {
  if (typeof scheduledTime !== 'number') return false;
  const at = new Date(scheduledTime);
  return at.getUTCDay() === 1 && at.getUTCHours() === 0;
}

/**
 * @param {string | undefined} cron
 * @param {CronEnv} env
 * @param {number | undefined} scheduledTime
 * @param {typeof syncApplicationHistory} sync
 * @returns {Promise<WorkflowStart[]>}
 */
async function planStarts(cron, env, scheduledTime, sync) {
  if (cron === RESUME_SYNC_CRON) return resumeSyncStarts(env, sync);
  if (cron === HEALTH_CHECK_CRON) {
    /** @type {WorkflowStart[]} */
    const starts = [{ binding: 'HEALTH_CHECK_WORKFLOW', params: { source: 'cron' } }];
    if (isWeeklyReportHour(scheduledTime)) {
      starts.push({ binding: 'DAILY_REPORT_WORKFLOW', params: { type: 'weekly', source: 'cron' } });
    }
    return starts;
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
 *   after a best-effort Wanted/JobKorea session refresh and application-history sync, which
 *   runs before the discovery start so the approval gate dedupes against it) plus CleanupWorkflow, plus a dry-run
 *   ApplicationWorkflow discovery run for Wanted unless auto-apply is disabled in D1 config
 *   or AUTO_APPLY_CRON_ENABLED=false.
 * - HEALTH_CHECK_CRON  -> HealthCheckWorkflow, plus DailyReportWorkflow with type 'weekly'
 *   when the scheduled time is Monday 00:00 UTC.
 * - anything else      -> logged and ignored.
 * Every start is attempted; if any rejects (or its binding is missing) the run throws
 * after all have settled so Cloudflare records the cron invocation as failed.
 * @param {{ cron?: string; scheduledTime?: number } | undefined} controller
 * @param {CronEnv} env
 * @param {CronContext} ctx
 * @param {{ syncApplicationHistory?: typeof syncApplicationHistory }} [deps]
 * @returns {Promise<void>}
 */
export async function scheduled(controller, env, ctx, deps = {}) {
  const sync = deps.syncApplicationHistory ?? syncApplicationHistory;
  const starts = await planStarts(controller?.cron, env, controller?.scheduledTime, sync);
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

export default { scheduled, RESUME_SYNC_CRON, HEALTH_CHECK_CRON };
