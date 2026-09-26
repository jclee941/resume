import { refreshWantedSession } from '../wanted/mint-session.js';

// CF-native migration Wave 1: the resume-sync Cron Trigger.
// MUST stay in sync with the `triggers.crons` entry in wrangler.jsonc
// (enforced by tests/unit/scheduled-cron-wiring.test.js).
export const RESUME_SYNC_CRON = '0 21 * * *';

/**
 * Route a Cloudflare scheduled() invocation by its matched cron expression.
 * - RESUME_SYNC_CRON  -> ResumeSyncWorkflow (already invocable via HTTP route + queue).
 *   Defaults to dryRun so a scheduled run never pushes to job platforms until the
 *   owner opts in via RESUME_SYNC_CRON_DRY_RUN=false. Refreshes the Wanted
 *   `auth:wanted` KV session first (best-effort — a mint failure is logged but
 *   must not abort workflow creation; export-wanted then fails with the reason).
 * - anything else     -> logged and ignored; wrangler.jsonc declares no other cron.
 */
export async function scheduled(controller, env, ctx) {
  if (controller?.cron === RESUME_SYNC_CRON) {
    if (!env.RESUME_SYNC_WORKFLOW) return;
    const refresh = await refreshWantedSession(env);
    if (!refresh.ok) console.warn('[cron] Wanted session refresh failed:', refresh.error);
    const dryRun = String(env.RESUME_SYNC_CRON_DRY_RUN ?? 'true').toLowerCase() !== 'false';
    const run = env.RESUME_SYNC_WORKFLOW.create({
      params: { sections: ['all'], dryRun, source: 'cron' },
    });
    ctx.waitUntil(run);
    await run;
    return;
  }
  console.warn('[cron] No scheduled handler for cron:', controller?.cron);
}

export default { scheduled, RESUME_SYNC_CRON };
