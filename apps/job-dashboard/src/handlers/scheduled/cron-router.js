import { settleWithin } from '../../services/browser-session.js';
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
 * A scheduled event gets 15 minutes of wall time. Protocol calls on a stalled page can hang for
 * minutes, so the cron waits at most 9 for the session refresh; whatever it has not finished by
 * then is left behind (not cancelled), and the history sync and the workflow starts still run.
 */
export const SESSION_REFRESH_BUDGET_MS = 9 * 60_000;
/**
 * The resume-sync cron's preflight (the session refresh, then the history sync with its D1 writes
 * and sync_logs row) closes this long after the scheduled event starts. The history sync gets the
 * deadline: the cron stops waiting for it there, and no write batch or log row starts after it,
 * while a fetch, batch or log row already under way is left to finish, not cancelled. The
 * remaining 3 of the 15 minutes are kept for the auto-apply config read and the workflow starts.
 */
export const PREFLIGHT_BUDGET_MS = 12 * 60_000;
/** The discovery start's D1 config read; if it has not answered by then, only that start is skipped. */
export const CONFIG_READ_BUDGET_MS = 60_000;

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
 * @param {CronEnv} env
 * @param {(env: CronEnv) => Promise<void>} refresh
 * @param {number} budgetMs
 * @returns {Promise<void>}
 */
async function refreshWithinBudget(env, refresh, budgetMs) {
  const finished = await settleWithin(
    refresh(env).then(() => true),
    budgetMs
  );
  if (!finished) {
    console.warn(
      `[cron] session refresh not finished within ${budgetMs} ms; continuing without it`
    );
  }
}

/**
 * Pulls Wanted/JobKorea application history into D1 so the auto-apply approval gate that runs
 * next already sees what was applied elsewhere. The sync itself stops writing at the preflight
 * deadline; a failure, or a write batch still in flight at the deadline, is logged and never
 * blocks a start.
 * @param {CronEnv} env
 * @param {typeof syncApplicationHistory} sync
 * @param {number} deadline epoch ms
 * @param {() => number} clock
 * @returns {Promise<void>}
 */
async function syncHistoryBestEffort(env, sync, deadline, clock) {
  const outcome = await settleWithin(
    sync(env, { timeoutMs: HISTORY_SYNC_TIMEOUT_MS, deadline, clock }).then(
      (summary) => ({ summary }),
      (error) => ({ error })
    ),
    Math.max(0, deadline - clock())
  );
  if (outcome === null) {
    console.warn('[cron] application history sync still running at the preflight deadline');
  } else if ('error' in outcome) {
    console.warn('[cron] application history sync failed:', describeReason(outcome.error));
  } else {
    const { summary } = outcome;
    console.info(
      '[cron] application history sync',
      summary.status,
      JSON.stringify(summary.platforms)
    );
  }
}

/**
 * @typedef {{
 *   sync: typeof syncApplicationHistory;
 *   refresh: (env: CronEnv) => Promise<void>;
 *   refreshBudgetMs: number;
 *   preflightBudgetMs: number;
 *   configBudgetMs: number;
 *   clock: () => number;
 * }} CronSteps
 */

/**
 * @param {CronEnv} env
 * @param {CronSteps} steps
 * @returns {Promise<WorkflowStart[]>}
 */
async function resumeSyncStarts(env, steps) {
  const { sync, refresh, refreshBudgetMs, preflightBudgetMs, configBudgetMs, clock } = steps;
  const deadline = clock() + preflightBudgetMs;
  if (env.RESUME_SYNC_WORKFLOW) {
    await refreshWithinBudget(env, refresh, Math.min(refreshBudgetMs, preflightBudgetMs));
  }
  await syncHistoryBestEffort(env, sync, deadline, clock);
  const dryRun = String(env.RESUME_SYNC_CRON_DRY_RUN ?? 'true').toLowerCase() !== 'false';
  const discovery = await settleWithin(planAutoApplyStart(env), configBudgetMs);
  if (discovery === null) {
    console.warn(
      `[cron] auto-apply config not read within ${configBudgetMs} ms; discovery skipped`
    );
  }
  return [
    { binding: 'RESUME_SYNC_WORKFLOW', params: { dryRun, source: 'cron' } },
    { binding: 'CLEANUP_WORKFLOW', params: { source: 'cron' } },
    ...(discovery ?? []),
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
 * @param {CronSteps} steps
 * @returns {Promise<WorkflowStart[]>}
 */
async function planStarts(cron, env, scheduledTime, steps) {
  if (cron === RESUME_SYNC_CRON) return resumeSyncStarts(env, steps);
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
 *   after a best-effort Wanted/JobKorea session refresh (bounded by SESSION_REFRESH_BUDGET_MS)
 *   and application-history sync, which
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
 * @param {{ syncApplicationHistory?: typeof syncApplicationHistory; refreshSessions?: CronSteps['refresh']; refreshBudgetMs?: number; preflightBudgetMs?: number; configBudgetMs?: number; clock?: () => number }} [deps]
 * @returns {Promise<void>}
 */
export async function scheduled(controller, env, ctx, deps = {}) {
  const steps = {
    sync: deps.syncApplicationHistory ?? syncApplicationHistory,
    refresh: deps.refreshSessions ?? refreshPlatformSessions,
    refreshBudgetMs: deps.refreshBudgetMs ?? SESSION_REFRESH_BUDGET_MS,
    preflightBudgetMs: deps.preflightBudgetMs ?? PREFLIGHT_BUDGET_MS,
    configBudgetMs: deps.configBudgetMs ?? CONFIG_READ_BUDGET_MS,
    clock: deps.clock ?? Date.now,
  };
  const starts = await planStarts(controller?.cron, env, controller?.scheduledTime, steps);
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
