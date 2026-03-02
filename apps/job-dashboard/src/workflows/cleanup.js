import { WorkflowEntrypoint } from 'cloudflare:workers';

/**
 * Cleanup Workflow
 *
 * Removes expired sessions, old job results, and stale rate limit entries.
 * Supports dry-run mode to preview deletions without executing them.
 *
 * @param {Object} params
 * @param {number} params.sessionMaxAge - Days before sessions expire (default: 7)
 * @param {number} params.logMaxAge - Days before job results expire (default: 30)
 * @param {boolean} params.dryRun - Preview deletions without executing (default: false)
 */
export class CleanupWorkflow extends WorkflowEntrypoint {
  async run(event, step) {
    const { sessionMaxAge = 7, logMaxAge = 30, dryRun = false } = event.payload || {};

    const startedAt = new Date().toISOString();
    const deletedCounts = {
      sessions: 0,
      jobResults: 0,
      healthChecks: 0,
      rateLimits: 0,
    };

    // Step 1: Cleanup expired sessions
    const sessionCleanup = await step.do(
      'cleanup-expired-sessions',
      {
        retries: { limit: 2, delay: '5 seconds' },
        timeout: '2 minutes',
      },
      async () => {
        const list = await this.env.SESSIONS.list({ prefix: 'auth:' });
        const now = Date.now();
        let deleted = 0;
        const toDelete = [];

        for (const key of list.keys) {
          try {
            const value = await this.env.SESSIONS.get(key.name, { type: 'json' });
            if (value?.expiresAt && new Date(value.expiresAt).getTime() < now) {
              toDelete.push(key.name);
            }
          } catch {
            toDelete.push(key.name);
          }
        }

        if (!dryRun) {
          for (const key of toDelete) {
            await this.env.SESSIONS.delete(key);
            deleted++;
          }
        }

        return { found: toDelete.length, deleted: dryRun ? 0 : deleted };
      }
    );
    deletedCounts.sessions = sessionCleanup.deleted;

    // Step 2: Cleanup old job search results
    const jobResultsCleanup = await step.do(
      'cleanup-old-job-results',
      {
        retries: { limit: 2, delay: '5 seconds' },
        timeout: '2 minutes',
      },
      async () => {
        if (dryRun) {
          const count = await this.env.DB.prepare(
            `
            SELECT COUNT(*) as count FROM job_search_results 
            WHERE created_at < datetime('now', '-${logMaxAge} days')
          `
          ).first();
          return { found: count?.count || 0, deleted: 0 };
        }

        const result = await this.env.DB.prepare(
          `
          DELETE FROM job_search_results 
          WHERE created_at < datetime('now', '-${logMaxAge} days')
        `
        ).run();

        return { found: result.meta.changes, deleted: result.meta.changes };
      }
    );
    deletedCounts.jobResults = jobResultsCleanup.deleted;

    // Step 3: Cleanup old health checks
    const healthChecksCleanup = await step.do(
      'cleanup-old-health-checks',
      {
        retries: { limit: 2, delay: '5 seconds' },
        timeout: '2 minutes',
      },
      async () => {
        if (dryRun) {
          const count = await this.env.DB.prepare(
            `
            SELECT COUNT(*) as count FROM health_checks 
            WHERE checked_at < datetime('now', '-${sessionMaxAge} days')
          `
          ).first();
          return { found: count?.count || 0, deleted: 0 };
        }

        const result = await this.env.DB.prepare(
          `
          DELETE FROM health_checks 
          WHERE checked_at < datetime('now', '-${sessionMaxAge} days')
        `
        ).run();

        return { found: result.meta.changes, deleted: result.meta.changes };
      }
    );
    deletedCounts.healthChecks = healthChecksCleanup.deleted;

    // Step 4: Cleanup expired rate limit keys
    const rateLimitCleanup = await step.do(
      'cleanup-rate-limit-keys',
      {
        retries: { limit: 2, delay: '5 seconds' },
        timeout: '2 minutes',
      },
      async () => {
        const list = await this.env.RATE_LIMIT_KV.list();
        let deleted = 0;
        const toDelete = [];

        for (const key of list.keys) {
          if (key.expiration && key.expiration * 1000 < Date.now()) {
            toDelete.push(key.name);
          }
        }

        if (!dryRun) {
          for (const key of toDelete) {
            await this.env.RATE_LIMIT_KV.delete(key);
            deleted++;
          }
        }

        return { found: toDelete.length, deleted: dryRun ? 0 : deleted };
      }
    );
    deletedCounts.rateLimits = rateLimitCleanup.deleted;

    // Step 5: Log cleanup summary
    await step.do(
      'log-cleanup',
      {
        retries: { limit: 2, delay: '5 seconds' },
        timeout: '30 seconds',
      },
      async () => {
        if (dryRun) {
          return { logged: false, reason: 'Dry run mode' };
        }

        await this.env.DB.prepare(
          `
          INSERT INTO cleanup_logs (sessions_deleted, results_deleted, checks_deleted, rate_limits_deleted, ran_at)
          VALUES (?, ?, ?, ?, datetime('now'))
        `
        )
          .bind(
            deletedCounts.sessions,
            deletedCounts.jobResults,
            deletedCounts.healthChecks,
            deletedCounts.rateLimits
          )
          .run();

        return { logged: true };
      }
    );

    return {
      success: true,
      dryRun,
      deleted: deletedCounts,
      timestamp: startedAt,
      completedAt: new Date().toISOString(),
    };
  }
}
