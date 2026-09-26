import { WorkflowEntrypoint } from 'cloudflare:workers';

/**
 * Only plaintext JSON session records carry an inspectable expiry. Encrypted
 * platform sessions and cookie headers are opaque here and expire through
 * their KV TTL, so the sweep never deletes them.
 * @param {unknown} raw
 * @param {number} now
 * @returns {boolean}
 */
function isExpiredSessionRecord(raw, now) {
  if (typeof raw !== 'string' || !raw.trimStart().startsWith('{')) return false;
  try {
    const expiresAt = JSON.parse(raw)?.expiresAt;
    return Boolean(expiresAt) && new Date(expiresAt).getTime() < now;
  } catch {
    return false; // malformed JSON is left to its KV TTL like any opaque value
  }
}

/**
 * @typedef {Object} D1Result
 * @property {{ changes: number }} meta
 */

/**
 * @typedef {Object} D1PreparedStatement
 * @property {(...params: unknown[]) => D1PreparedStatement} bind
 * @property {() => Promise<Record<string, number> | null>} first
 * @property {() => Promise<D1Result>} run
 */

/**
 * @typedef {Object} D1Database
 * @property {(query: string) => D1PreparedStatement} prepare
 */

/**
 * @typedef {Object} CleanupEnv
 * @property {string} SESSION_MAX_AGE
 * @property {string} LOG_MAX_AGE
 * @property {{ list(options?: { prefix?: string }): Promise<{ keys: Array<{ name: string }> }>, get(key: string): Promise<string | null>, delete(key: { name: string } | string): Promise<void> }} SESSIONS
 * @property {D1Database} JOB_DB
 * @property {{ list(): Promise<{ keys: Array<{ name: string, expiration?: number }> }>, delete(key: string): Promise<void> }} RATE_LIMIT_KV
 */

/**
 * @typedef {Object} CleanupParams
 * @property {number} [sessionMaxAge] - Days before sessions expire (default: 7, from env SESSION_MAX_AGE)
 * @property {number} [logMaxAge] - Days before job results expire (default: 30, from env LOG_MAX_AGE)
 * @property {boolean} [dryRun] - Preview deletions without executing (default: false)
 */

/**
 * Cleanup Workflow
 *
 * Removes expired sessions, old job results, and stale rate limit entries.
 * Supports dry-run mode to preview deletions without executing them.
 *
 * @extends {WorkflowEntrypoint<CleanupEnv, CleanupParams>}
 */
export class CleanupWorkflow extends WorkflowEntrypoint {
  /**
   * @param {import('cloudflare:workers').WorkflowEvent<CleanupParams>} event
   * @param {import('cloudflare:workers').WorkflowStep} step
   */
  async run(event, step) {
    // Read retention config from env vars or use defaults
    const DEFAULT_SESSION_MAX_AGE = parseInt(this.env.SESSION_MAX_AGE) || 7;
    const DEFAULT_LOG_MAX_AGE = parseInt(this.env.LOG_MAX_AGE) || 30;

    const {
      sessionMaxAge = DEFAULT_SESSION_MAX_AGE,
      logMaxAge = DEFAULT_LOG_MAX_AGE,
      dryRun = false,
    } = event.payload || {};

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
          const value = await this.env.SESSIONS.get(key.name);
          if (isExpiredSessionRecord(value, now)) {
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
          const count = await this.env.JOB_DB.prepare(
            `
            SELECT COUNT(*) as count FROM job_search_results 
            WHERE created_at < datetime('now', '-${logMaxAge} days')
          `
          ).first();
          return { found: count?.count || 0, deleted: 0 };
        }

        const result = await this.env.JOB_DB.prepare(
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
          const count = await this.env.JOB_DB.prepare(
            `
            SELECT COUNT(*) as count FROM health_checks 
            WHERE checked_at < datetime('now', '-${sessionMaxAge} days')
          `
          ).first();
          return { found: count?.count || 0, deleted: 0 };
        }

        const result = await this.env.JOB_DB.prepare(
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

        await this.env.JOB_DB.prepare(
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
