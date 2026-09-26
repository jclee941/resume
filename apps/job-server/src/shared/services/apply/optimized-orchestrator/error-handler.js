/**
 * @typedef {{
 *   searched: number;
 *   filtered: number;
 *   applied: number;
 *   skipped: number;
 *   failed: number;
 *   cached: number;
 *   startTime: number | null;
 *   endTime: number | null;
 * }} OptimizedApplyStats
 *
 * @typedef {{
 *   id?: string | number;
 *   source?: string;
 *   company?: string;
 *   title?: string;
 *   [key: string]: unknown;
 * }} OrchestratorJob
 *
 * @typedef {{
 *   measure(name: string, data: Record<string, unknown>): void;
 *   increment(name: string): void;
 *   [key: string]: unknown;
 * }} OrchestratorMetrics
 *
 * @typedef {{
 *   error(message: string): void;
 *   [key: string]: unknown;
 * }} OrchestratorLogger
 */

export function initOptimizedApplyStats() {
  return {
    searched: 0,
    filtered: 0,
    applied: 0,
    skipped: 0,
    failed: 0,
    cached: 0,
    startTime: null,
    endTime: null,
  };
}

/**
 * @param {{
 *   error: Error;
 *   job: OrchestratorJob;
 *   logger: OrchestratorLogger;
 *   metrics: OrchestratorMetrics;
 *   startTime: number;
 *   stats: OptimizedApplyStats;
 * }} options
 */
export function recordApplyFailure({ error, job, logger, metrics, startTime, stats }) {
  const duration = Date.now() - startTime;

  metrics.measure(`apply:job:${job.id}`, {
    source: job.source,
    success: false,
    error: error.message,
    duration,
  });
  metrics.increment('apply.error');
  stats.failed++;

  logger.error(`❌ Apply exception for ${job.company || job.title}: ${error.message}`);
  return { job, success: false, error: error.message, duration };
}

/**
 * @param {{ listApplications(options?: { fromDate?: string }): Array<{ status?: string }> } | null | undefined} appManager
 * @returns {number}
 */
export function getTodayApplicationCount(appManager) {
  if (!appManager) return 0;

  const today = new Date().toISOString().split('T')[0];
  const apps = appManager.listApplications({ fromDate: today });
  return apps.filter((a) => a.status === 'applied').length;
}

/**
 * @param {number} ms
 * @returns {Promise<void>}
 */
export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
