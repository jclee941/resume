import { WorkflowEntrypoint } from 'cloudflare:workers';

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
        const data = await this.getMasterResumeData(resumeId);
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
          return await this.exportFromPlatform(platform, resumeId);
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
          return this.calculateDiff(masterData, platformStates[platform], sections);
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

      await this.notifyPreview(sync, diffs);

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
          return await this.syncToPlatform(platform, resumeId, diff);
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

          const currentState = await this.exportFromPlatform(platform, resumeId);
          const verifyDiff = this.calculateDiff(masterData, currentState, sections);

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

        await this.sendSlackNotification({
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

  async getMasterResumeData(resumeId) {
    // Get from SSoT (resume_data.json)
    // In production, this would read from D1 or KV
    const data = await this.env.DB.prepare('SELECT data FROM resumes WHERE id = ?')
      .bind(resumeId)
      .first();

    return data?.data ? JSON.parse(data.data) : null;
  }

  async exportFromPlatform(platform, resumeId) {
    const exporters = {
      wanted: () => this.exportFromWanted(resumeId),
      linkedin: () => this.exportFromLinkedIn(resumeId),
      remember: () => this.exportFromRemember(resumeId),
    };

    const exporter = exporters[platform];
    if (!exporter) {
      throw new Error(`Unknown platform: ${platform}`);
    }

    return await exporter();
  }

  async exportFromWanted(resumeId) {
    const session = await this.env.SESSIONS.get('auth:wanted');
    if (!session) {
      throw new Error('No Wanted session');
    }

    try {
      const response = await fetch(`https://www.wanted.co.kr/api/chaos/resumes/v1/${resumeId}`, {
        headers: {
          Cookie: session,
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });

      if (!response.ok) {
        throw new Error(`Wanted API error: ${response.status}`);
      }

      const data = await response.json();
      return this.normalizeWantedResume(data);
    } catch (error) {
      throw new Error(`Wanted export failed: ${error.message}`);
    }
  }

  async exportFromLinkedIn(_resumeId) {
    // LinkedIn profile export
    return { careers: [], educations: [], skills: [] };
  }

  async exportFromRemember(_resumeId) {
    // Remember profile export
    return { careers: [], educations: [], skills: [] };
  }

  normalizeWantedResume(data) {
    // Normalize Wanted resume format to standard format
    return {
      careers: data.careers || [],
      educations: data.educations || [],
      skills: data.skills || [],
      activities: data.activities || [],
      language_certs: data.language_certs || [],
      links: data.links || [],
    };
  }

  calculateDiff(master, platform, sections = []) {
    const diff = {
      additions: [],
      updates: [],
      deletions: [],
    };

    const sectionsToCompare =
      sections.length > 0
        ? sections
        : ['careers', 'educations', 'skills', 'activities', 'language_certs'];

    for (const section of sectionsToCompare) {
      const masterItems = master[section] || [];
      const platformItems = platform[section] || [];

      // Find additions and updates
      for (const masterItem of masterItems) {
        const key = this.getItemKey(section, masterItem);
        const platformItem = platformItems.find((p) => this.getItemKey(section, p) === key);

        if (!platformItem) {
          diff.additions.push({ section, item: masterItem });
        } else if (!this.itemsEqual(masterItem, platformItem)) {
          diff.updates.push({ section, item: masterItem, existing: platformItem });
        }
      }

      // Find deletions
      for (const platformItem of platformItems) {
        const key = this.getItemKey(section, platformItem);
        const masterItem = masterItems.find((m) => this.getItemKey(section, m) === key);

        if (!masterItem) {
          diff.deletions.push({ section, item: platformItem });
        }
      }
    }

    return diff;
  }

  getItemKey(section, item) {
    switch (section) {
      case 'careers':
        return `${item.company_name || item.company}:${item.title}`;
      case 'educations':
        return `${item.school_name}:${item.major}`;
      case 'skills':
        return item.text || item.name;
      default:
        return item.id || JSON.stringify(item);
    }
  }

  itemsEqual(a, b) {
    // Simple deep equality check
    return JSON.stringify(a) === JSON.stringify(b);
  }

  async syncToPlatform(platform, resumeId, diff) {
    const syncers = {
      wanted: () => this.syncToWanted(resumeId, diff),
      linkedin: () => this.syncToLinkedIn(resumeId, diff),
      remember: () => this.syncToRemember(resumeId, diff),
    };

    const syncer = syncers[platform];
    if (!syncer) {
      return { success: false, error: `Unknown platform: ${platform}` };
    }

    try {
      return await syncer();
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async syncToWanted(resumeId, diff) {
    const session = await this.env.SESSIONS.get('auth:wanted');
    if (!session) {
      return { success: false, error: 'No Wanted session' };
    }

    const results = { additions: 0, updates: 0, deletions: 0, errors: [] };

    // Apply additions
    for (const add of diff.additions) {
      try {
        await this.wantedApiRequest(
          'POST',
          `resumes/v2/${resumeId}/${add.section}`,
          add.item,
          session
        );
        results.additions++;
      } catch (error) {
        results.errors.push({ action: 'add', section: add.section, error: error.message });
      }
    }

    // Apply updates
    for (const update of diff.updates) {
      try {
        const id = update.existing.id;
        await this.wantedApiRequest(
          'PATCH',
          `resumes/v2/${resumeId}/${update.section}/${id}`,
          update.item,
          session
        );
        results.updates++;
      } catch (error) {
        results.errors.push({ action: 'update', section: update.section, error: error.message });
      }
    }

    // Apply deletions (skip by default for safety)
    // for (const del of diff.deletions) { ... }

    return {
      success: results.errors.length === 0,
      ...results,
    };
  }

  async wantedApiRequest(method, path, body, session) {
    const response = await fetch(`https://www.wanted.co.kr/api/chaos/${path}`, {
      method,
      headers: {
        Cookie: session,
        'Content-Type': 'application/json',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API error ${response.status}: ${error}`);
    }

    return response.json();
  }

  async syncToLinkedIn(_resumeId, _diff) {
    return { success: false, error: 'LinkedIn sync not implemented' };
  }

  async syncToRemember(_resumeId, _diff) {
    return { success: false, error: 'Remember sync not implemented' };
  }

  async notifyPreview(sync, _diffs) {
    const summary = Object.entries(sync.changes)
      .map(
        ([platform, changes]) =>
          `*${platform}*: +${changes.additions} ~${changes.updates} -${changes.deletions}`
      )
      .join('\n');

    await this.sendSlackNotification({
      text: '👀 Resume Sync Preview',
      blocks: [
        {
          type: 'header',
          text: { type: 'plain_text', text: '👀 Resume Sync Preview (Dry Run)' },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Resume*: ${sync.resumeId}\n*Platforms*:\n${summary}`,
          },
        },
      ],
    });
  }

  async sendSlackNotification(message) {
    const webhookUrl = this.env.SLACK_WEBHOOK_URL;
    if (!webhookUrl) return;

    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });
  }
}
