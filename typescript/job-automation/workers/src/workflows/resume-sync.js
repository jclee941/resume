import { WorkflowEntrypoint } from 'cloudflare:workers';
import {
  getMasterResumeData,
  exportFromPlatform,
  calculateDiff,
  syncToPlatform,
  notifyPreview,
  sendSlackNotification,
} from './resume-sync-helpers.js';

/**
 * Resume Sync Workflow
 *
 * Synchronizes resume data across platforms (Wanted, LinkedIn, Remember).
 * Export → Diff → Sync → Verify pipeline with rollback capability.
 *
 * @param {Object} params
 * @param {string} params.resumeId - Resume ID to sync
 * @param {string[]} params.platforms - Target platforms
 * @param {boolean} params.dryRun - Preview changes without applying
 */
export class ResumeSyncWorkflow extends WorkflowEntrypoint {
  async run(event, step) {
    const { resumeId, platforms = ['wanted'], dryRun = false, sections = [] } = event.payload;

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
    const masterData = await step.do(
      'export-master',
      {
        retries: { limit: 2, delay: '5 seconds' },
        timeout: '1 minute',
      },
      async () => {
        // Master resume data from local JSON (SSoT)
        const data = await getMasterResumeData(this.env, resumeId);
        if (!data) {
          throw new Error(`Master resume not found: ${resumeId}`);
        }
        return data;
      }
    );

    sync.steps.push({ step: 'export-master', status: 'completed' });

    // Step 2: Export current state from each platform
    const platformStates = {};
    for (const platform of platforms) {
      const platformData = await step.do(
        `export-${platform}`,
        {
          retries: { limit: 3, delay: '10 seconds', backoff: 'exponential' },
          timeout: '2 minutes',
        },
        async () => {
          return await exportFromPlatform(this.env, platform, resumeId);
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
      async () => {
        const backupId = `backup-${Date.now()}`;
        await this.env.SESSIONS.put(
          `resume:backup:${backupId}`,
          JSON.stringify({ platforms: platformStates, createdAt: new Date().toISOString() }),
          { expirationTtl: 86400 * 30 } // 30 days
        );
        return { backupId };
      }
    );

    sync.backupId = backup.backupId;
    sync.steps.push({ step: 'create-backup', status: 'completed' });

    // Step 5: Apply changes to each platform
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
          return await syncToPlatform(this.env, platform, resumeId, diff);
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
      async () => {
        const results = {};
        for (const platform of platforms) {
          if (syncResults[platform].status === 'no-changes') {
            results[platform] = { verified: true, reason: 'no-changes' };
            continue;
          }

          const currentState = await exportFromPlatform(this.env, platform, resumeId);
          const verifyDiff = calculateDiff(masterData, currentState, sections);

          results[platform] = {
            verified:
              verifyDiff.additions.length === 0 &&
              verifyDiff.updates.length === 0 &&
              verifyDiff.deletions.length === 0,
            remainingDiff: verifyDiff,
          };
        }
        return results;
      }
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
      async () => {
        await this.env.DB.prepare(
          `
          INSERT INTO resume_sync_history (
            id, resume_id, platforms, changes, status, backup_id, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
        `
        )
          .bind(
            sync.id,
            resumeId,
            JSON.stringify(platforms),
            JSON.stringify(sync.changes),
            'completed',
            backup.backupId
          )
          .run();
      }
    );

    sync.steps.push({ step: 'record-history', status: 'completed' });

    // Step 8: Send notification
    await step.do(
      'notify-completion',
      {
        retries: { limit: 2, delay: '10 seconds' },
        timeout: '30 seconds',
      },
      async () => {
        const summary = platforms
          .map((p) => {
            const changes = sync.changes[p];
            return `*${p}*: +${changes.additions} ~${changes.updates} -${changes.deletions}`;
          })
          .join('\n');

        await sendSlackNotification(this.env, {
          text: '✅ Resume Sync Complete',
          blocks: [
            {
              type: 'header',
              text: { type: 'plain_text', text: '✅ Resume Sync Complete' },
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*Resume*: ${resumeId}\n*Platforms*:\n${summary}\n*Backup ID*: ${backup.backupId}`,
              },
            },
          ],
        });
      }
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
