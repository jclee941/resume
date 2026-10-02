import { getConfig } from '../auto-apply/db-helpers.js';

/**
 * @typedef {import('../auto-apply/db-helpers.js').DbEnv & {
 *   AUTO_APPLY_CRON_ENABLED?: string;
 * }} AutoApplyStartEnv
 * @typedef {{ binding: 'APPLICATION_WORKFLOW'; params: Record<string, unknown> }} AutoApplyStart
 */

/**
 * Wanted and Remember have API discovery and API submission; JobKorea has no discovery step
 * and Saramin is intentionally disabled.
 */
const AUTO_APPLY_CRON_PLATFORMS = ['wanted', 'remember'];

/**
 * @param {string} reason
 * @param {Record<string, unknown>} [detail]
 * @returns {void}
 */
function logSkipped(reason, detail = {}) {
  console.info('[cron] auto-apply start skipped', { reason, ...detail });
}

/**
 * Plan the daily auto-apply run for the 21:00 UTC cron: a live ApplicationWorkflow
 * that searches, scores, and submits every posting at or above the D1
 * min_match_score without waiting for approval (owner decision, 2026-10-02), up to
 * max_daily_applications. Postings or companies already applied to and jobs the
 * owner rejected are skipped by the approval gate. Returns no start when the switch
 * is off or D1 config is unreadable, so the other starts in the plan are never blocked.
 * @param {AutoApplyStartEnv} env
 * @returns {Promise<AutoApplyStart[]>}
 */
export async function planAutoApplyStart(env) {
  if (String(env.AUTO_APPLY_CRON_ENABLED ?? '').toLowerCase() === 'false') {
    logSkipped('AUTO_APPLY_CRON_ENABLED is false');
    return [];
  }
  try {
    const config = await getConfig(env);
    if (!config.autoApplyEnabled) {
      logSkipped('D1 config auto_apply_enabled is false');
      return [];
    }
    return [
      {
        binding: 'APPLICATION_WORKFLOW',
        params: {
          triggerType: 'cron-auto-apply',
          source: 'cron',
          platforms: AUTO_APPLY_CRON_PLATFORMS,
          searchCriteria: { keywords: config.keywords, keyword: config.keywords[0] },
          minMatchScore: config.minMatchScore,
          maxDailyApplications: config.maxDailyApplications,
          dryRun: false,
          autoApprove: true,
          autoApproveThreshold: config.minMatchScore,
        },
      },
    ];
  } catch (error) {
    logSkipped('D1 config read failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}
