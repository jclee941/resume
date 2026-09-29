import { WorkflowEntrypoint } from 'cloudflare:workers';
import {
  RESUME_SYNC_PLATFORMS,
  syncResumePlatform,
} from '../services/resume-platform-sync/index.js';
import { getMasterResumeRecord } from './resume-sync-data.js';
import { recordSyncHistory } from './resume-sync-steps.js';
import { notifyResumeSyncOutcome } from './resume-sync-notifications.js';

/**
 * @typedef {import('./resume-sync-data.js').ResumeSyncEnv
 *   & import('../services/resume-platform-sync/index.js').ResumePlatformSyncEnv
 *   & import('../services/notifications.js').NotificationEnv} ResumeSyncWorkflowEnv
 *
 * @typedef {{
 *   resumeId?: string;
 *   targetResumeId?: string;
 *   platforms?: string[];
 *   dryRun?: boolean;
 *   sections?: string[];
 *   source?: string;
 * }} ResumeSyncParams
 *
 * @typedef {import('../services/resume-platform-sync/index.js').PlatformSyncOutcome} PlatformSyncOutcome
 */

/**
 * Resume Sync Workflow
 *
 * Syncs the JOB_DB master resume to job platforms from inside the Worker, one
 * step per platform, with platform sessions read from KV (`auth:<platform>`).
 * Platform sync steps never throw, so one platform failing is reported without
 * retrying writes that may have partially landed.
 *
 * @extends {WorkflowEntrypoint<ResumeSyncWorkflowEnv, ResumeSyncParams>}
 */
export class ResumeSyncWorkflow extends WorkflowEntrypoint {
  /**
   * @param {import('cloudflare:workers').WorkflowEvent<ResumeSyncParams>} event
   * @param {import('cloudflare:workers').WorkflowStep} step
   */
  async run(event, step) {
    // Cron and queue producers omit resumeId; 'master' is the canonical master key.
    const {
      resumeId = 'master',
      targetResumeId,
      platforms = [...RESUME_SYNC_PLATFORMS],
      dryRun = false,
    } = event.payload || {};

    const master = await step.do(
      'export-master',
      { retries: { limit: 2, delay: '5 seconds' }, timeout: '1 minute' },
      async () => {
        const record = await getMasterResumeRecord(this.env, resumeId);
        if (!record) {
          throw new Error(`Master resume not found: ${resumeId}`);
        }
        return record;
      }
    );
    // Platform APIs address the stored target resume, never the master key.
    const platformResumeId = targetResumeId || master.targetResumeId;

    /** @type {Record<string, PlatformSyncOutcome>} */
    const results = {};
    for (const platform of platforms) {
      results[platform] = await step.do(
        `sync-${platform}`,
        { retries: { limit: 0, delay: '1 second' }, timeout: '5 minutes' },
        () =>
          syncResumePlatform(this.env, platform, master.data, {
            dryRun,
            targetResumeId: platformResumeId,
          })
      );
    }

    const success = Object.values(results).every((result) => result.success);
    await step.do(
      'record-history',
      { retries: { limit: 2, delay: '5 seconds' }, timeout: '30 seconds' },
      () =>
        recordSyncHistory(this.env, {
          syncId: event.instanceId,
          resumeId,
          platforms,
          results,
          success,
          dryRun,
        })
    );
    await step.do(
      'notify-completion',
      { retries: { limit: 2, delay: '10 seconds' }, timeout: '30 seconds' },
      () => notifyResumeSyncOutcome(this.env, { resumeId, dryRun, results })
    );

    return { success, dryRun, resumeId, platforms, results };
  }
}
