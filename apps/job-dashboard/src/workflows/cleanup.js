import { WorkflowEntrypoint } from 'cloudflare:workers';

const DEFAULT_JOB_RESULTS_MAX_AGE_DAYS = 30;
const DEFAULT_HEALTH_CHECK_MAX_AGE_DAYS = 7;

const PRUNE_SQL = {
  jobResults: {
    count: "SELECT COUNT(*) as count FROM job_search_results WHERE created_at < datetime('now', ?)",
    remove: "DELETE FROM job_search_results WHERE created_at < datetime('now', ?)",
  },
  healthChecks: {
    count:
      "SELECT COUNT(*) as count FROM health_check_details WHERE created_at < datetime('now', ?)",
    remove: "DELETE FROM health_check_details WHERE created_at < datetime('now', ?)",
  },
};

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
 * @param {unknown} days
 * @param {number} fallback
 * @returns {string} SQLite datetime modifier such as '-30 days'
 */
function retentionModifier(days, fallback) {
  const value = Number(days);
  return `-${Number.isInteger(value) && value > 0 ? value : fallback} days`;
}

/**
 * @param {D1Database} db
 * @param {{ count: string; remove: string }} sql
 * @param {string} cutoff
 * @param {boolean} dryRun
 * @returns {Promise<{ found: number; deleted: number }>}
 */
async function pruneRows(db, sql, cutoff, dryRun) {
  if (dryRun) {
    const row = await db.prepare(sql.count).bind(cutoff).first();
    return { found: row?.count || 0, deleted: 0 };
  }
  const result = await db.prepare(sql.remove).bind(cutoff).run();
  return { found: result.meta.changes, deleted: result.meta.changes };
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
 * @property {{ list(options?: { prefix?: string }): Promise<{ keys: Array<{ name: string }> }>, get(key: string): Promise<string | null>, delete(key: { name: string } | string): Promise<void> }} SESSIONS
 * @property {D1Database} JOB_DB
 * @property {{ list(): Promise<{ keys: Array<{ name: string, expiration?: number }> }>, delete(key: string): Promise<void> }} RATE_LIMIT_KV
 */

/**
 * @typedef {Object} CleanupParams
 * @property {number} [jobResultsMaxAge] - Days to keep job search results (default 30)
 * @property {number} [healthCheckMaxAge] - Days to keep health-check history (default 7)
 * @property {boolean} [dryRun] - Preview deletions without executing (default: false)
 * @property {string} [source]
 */

/**
 * Cleanup Workflow
 *
 * Removes expired plaintext sessions, old job search results, old health-check
 * history, and stale rate limit entries. The workflow output is the run record.
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
    const { jobResultsMaxAge, healthCheckMaxAge, dryRun = false } = event.payload || {};
    const jobResultsCutoff = retentionModifier(jobResultsMaxAge, DEFAULT_JOB_RESULTS_MAX_AGE_DAYS);
    const healthCheckCutoff = retentionModifier(
      healthCheckMaxAge,
      DEFAULT_HEALTH_CHECK_MAX_AGE_DAYS
    );
    const startedAt = new Date().toISOString();

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

    const jobResultsCleanup = await step.do(
      'cleanup-old-job-results',
      {
        retries: { limit: 2, delay: '5 seconds' },
        timeout: '2 minutes',
      },
      () => pruneRows(this.env.JOB_DB, PRUNE_SQL.jobResults, jobResultsCutoff, dryRun)
    );

    const healthChecksCleanup = await step.do(
      'cleanup-old-health-checks',
      {
        retries: { limit: 2, delay: '5 seconds' },
        timeout: '2 minutes',
      },
      () => pruneRows(this.env.JOB_DB, PRUNE_SQL.healthChecks, healthCheckCutoff, dryRun)
    );

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

    return {
      success: true,
      dryRun,
      deleted: {
        sessions: sessionCleanup.deleted,
        jobResults: jobResultsCleanup.deleted,
        healthChecks: healthChecksCleanup.deleted,
        rateLimits: rateLimitCleanup.deleted,
      },
      timestamp: startedAt,
      completedAt: new Date().toISOString(),
    };
  }
}
