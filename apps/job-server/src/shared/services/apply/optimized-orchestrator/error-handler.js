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

export function getTodayApplicationCount(appManager) {
  if (!appManager) return 0;

  const today = new Date().toISOString().split('T')[0];
  const apps = appManager.listApplications({ fromDate: today });
  return apps.filter((a) => a.status === 'applied').length;
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
