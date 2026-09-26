import { WorkflowEntrypoint } from 'cloudflare:workers';
import {
  getMasterResumeRecord,
  exportFromPlatform,
  calculateDiff,
  syncToPlatform,
  notifyPreview,
} from './resume-sync-helpers.js';
import { createResumeBackup, recordSyncHistory, verifyPlatformSync } from './resume-sync-steps.js';
import { notifySyncCompletion } from './resume-sync-notifications.js';

/**
 * @typedef {import('./resume-sync-steps.js').ResumeSyncEnv
 *   & import('./resume-sync-platforms.js').PlatformSyncEnv
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
 * @typedef {{
 *   id: string;
 *   resumeId: string;
 *   platforms: string[];
 *   dryRun: boolean;
 *   startedAt: string;
 *   status: string;
 *   steps: Array<{ step: string; status: string; error?: string }>;
 *   changes: Record<string, import('./resume-sync-notifications.js').SyncPlatformChanges>;
 *   completedAt?: string;
 *   backupId?: string;
 *   verification?: Record<string, import('./resume-sync-steps.js').PlatformVerification>;
 * }} ResumeSyncRecord
 */

/**
 * Resume Sync Workflow
 *
 * Synchronizes resume data across platforms (Wanted, LinkedIn, Remember).
 * Export → Diff → Sync → Verify pipeline with rollback capability.
 *
 * @param {Object} params
 * @param {string} [params.resumeId='master'] - Master resume key in JOB_DB `resumes`
 * @param {string} [params.targetResumeId] - Wanted resume ID (defaults to the stored target)
 * @param {string[]} params.platforms - Target platforms
 * @param {boolean} params.dryRun - Preview changes without applying
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
      platforms = ['wanted'],
      dryRun = false,
      sections = [],
    } = event.payload || {};

    /** @type {ResumeSyncRecord} */
    const sync = {
      id: event.instanceId,
      resumeId,
      platforms,
      dryRun,
      startedAt: new Date().toISOString(),
      status: 'running',
      steps: [],
      changes: {},
    };

    // Step 1: Export current state from master source
    const master = await step.do(
      'export-master',
      {
        retries: { limit: 2, delay: '5 seconds' },
        timeout: '1 minute',
      },
      async () => {
        // Master resume data from local JSON (SSoT)
        const record = await getMasterResumeRecord(this.env, resumeId);
        if (!record) {
          throw new Error(`Master resume not found: ${resumeId}`);
        }
        return record;
      }
    );
    const masterData = master.data;
    // Platform APIs address the stored target resume, never the master key.
    const platformResumeId = targetResumeId || master.targetResumeId;

    sync.steps.push({ step: 'export-master', status: 'completed' });

    // Step 2: Export current state from each platform
    /** @type {Record<string, Record<string, import('./resume-sync-diff.js').ResumeItem[]>>} */
    const platformStates = {};
    for (const platform of platforms) {
      const platformData = await step.do(
        `export-${platform}`,
        {
          retries: { limit: 3, delay: '10 seconds', backoff: 'exponential' },
          timeout: '2 minutes',
        },
        async () => {
          return await exportFromPlatform(this.env, platform, platformResumeId);
        }
      );

      platformStates[platform] = platformData;
      sync.steps.push({ step: `export-${platform}`, status: 'completed' });

      // Rate limit between platforms
      if (platforms.indexOf(platform) < platforms.length - 1) {
        await step.sleep(`pause-after-${platform}`, '10 seconds');
      }
    }

    // Step 3: Calculate diff for each platform
    /** @type {Record<string, import('./resume-sync-diff.js').ResumeDiff>} */
    const diffs = {};
    for (const platform of platforms) {
      const diff = await step.do(
        `diff-${platform}`,
        {
          retries: { limit: 2, delay: '5 seconds' },
          timeout: '1 minute',
        },
        async () => {
          return calculateDiff(masterData, platformStates[platform], sections);
        }
      );

      diffs[platform] = diff;
      sync.changes[platform] = {
        additions: diff.additions.length,
        updates: diff.updates.length,
        deletions: diff.deletions.length,
      };
      sync.steps.push({ step: `diff-${platform}`, status: 'completed' });
    }

    // If dry run, return preview
    if (dryRun) {
      sync.status = 'preview';
      sync.completedAt = new Date().toISOString();

      await notifyPreview(this.env, sync, diffs);

      return {
        success: true,
        dryRun: true,
        sync,
        diffs,
      };
    }

    // Step 4: Create backup before sync
    const backup = await step.do(
      'create-backup',
      {
        retries: { limit: 2, delay: '5 seconds' },
        timeout: '1 minute',
      },
      async () => createResumeBackup(this.env, platformStates)
    );

    sync.backupId = backup.backupId;
    sync.steps.push({ step: 'create-backup', status: 'completed' });

    // Step 5: Apply changes to each platform
    /** @type {Record<string, import('./resume-sync-steps.js').PlatformSyncResult>} */
    const syncResults = {};
    for (const platform of platforms) {
      const diff = diffs[platform];

      // Skip if no changes
      if (diff.additions.length === 0 && diff.updates.length === 0 && diff.deletions.length === 0) {
        syncResults[platform] = { status: 'no-changes' };
        continue;
      }

      const result = await step.do(
        `sync-${platform}`,
        {
          retries: { limit: 3, delay: '30 seconds', backoff: 'exponential' },
          timeout: '5 minutes',
        },
        async () => {
          return await syncToPlatform(this.env, platform, platformResumeId, diff);
        }
      );

      syncResults[platform] = result;
      sync.steps.push({
        step: `sync-${platform}`,
        status: result.success ? 'completed' : 'failed',
        error: result.error,
      });

      // Rate limit between platforms
      if (platforms.indexOf(platform) < platforms.length - 1) {
        await step.sleep(`pause-after-sync-${platform}`, '15 seconds');
      }
    }

    // Step 6: Verify sync
    const verification = await step.do(
      'verify-sync',
      {
        retries: { limit: 2, delay: '10 seconds' },
        timeout: '2 minutes',
      },
      async () =>
        verifyPlatformSync(this.env, {
          platforms,
          syncResults,
          masterData,
          platformResumeId,
          sections,
        })
    );

    sync.verification = verification;
    sync.steps.push({ step: 'verify-sync', status: 'completed' });

    // Step 7: Record sync history
    await step.do(
      'record-history',
      {
        retries: { limit: 2, delay: '5 seconds' },
        timeout: '30 seconds',
      },
      async () =>
        recordSyncHistory(this.env, {
          syncId: sync.id,
          resumeId,
          platforms,
          changes: sync.changes,
          backupId: backup.backupId,
        })
    );

    sync.steps.push({ step: 'record-history', status: 'completed' });

    // Step 8: Send notification
    await step.do(
      'notify-completion',
      {
        retries: { limit: 2, delay: '10 seconds' },
        timeout: '30 seconds',
      },
      async () =>
        notifySyncCompletion(this.env, {
          resumeId,
          platforms,
          changes: sync.changes,
          backupId: backup.backupId,
        })
    );

    sync.status = 'completed';
    sync.completedAt = new Date().toISOString();

    return {
      success: true,
      sync,
      verification,
    };
  }
}
