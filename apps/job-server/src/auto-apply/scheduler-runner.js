import { withTimeout, markRunFailed, parseCronExpression } from './scheduler-utils.js';
import { AutoApplier } from './auto-applier.js';

export function createDefaultAutoApplierFactory() {
  return (runOptions) =>
    new AutoApplier({
      dryRun: runOptions.dryRun !== false,
      autoApply: runOptions.dryRun === false,
      maxDailyApplications: runOptions.maxApplications ?? 10,
    });
}

export function createInitialStats() {
  return {
    totalRuns: 0,
    successRuns: 0,
    failedRuns: 0,
    skippedOverlaps: 0,
    manualTriggers: 0,
    averageDurationMs: 0,
    lastDurationMs: null,
  };
}

export function recordRunHistory(stats, history, source, result, duration, status) {
  stats.totalRuns += 1;
  stats.successRuns += status === 'completed' ? 1 : 0;
  stats.failedRuns += status === 'failed' ? 1 : 0;
  stats.lastDurationMs = duration;

  const total = stats.totalRuns;
  const prevAvg = stats.averageDurationMs;
  stats.averageDurationMs =
    total === 1 ? duration : Math.round((prevAvg * (total - 1) + duration) / total);

  history.unshift({
    source,
    status,
    duration,
    timestamp: new Date().toISOString(),
    success: result?.success !== false,
    error: result?.error || null,
    summary: {
      searched: result?.results?.searched ?? null,
      matched: result?.results?.matched ?? null,
      applied: result?.results?.applied ?? null,
      failed: result?.results?.failed ?? null,
    },
  });

  if (history.length > 50) {
    history.length = 50;
  }
}

export function buildSchedulerStatus({
  config,
  started,
  running,
  nextRun,
  lastRunAt,
  lastResult,
  lastError,
  currentRunStartedAt,
  stats,
  history,
}) {
  return {
    schedule: { ...config },
    started,
    running,
    nextRun,
    lastRun: lastRunAt,
    lastResult,
    lastError,
    currentRunStartedAt: currentRunStartedAt ? new Date(currentRunStartedAt).toISOString() : null,
    stats: { ...stats },
    history: [...history],
  };
}

export function updateSchedulerConfig(currentConfig, updates) {
  const nextConfig = { ...currentConfig, ...updates };
  if (typeof nextConfig.cron !== 'string' || nextConfig.cron.trim().length === 0) {
    throw new Error('Invalid cron expression');
  }
  return {
    config: nextConfig,
    cronMatcher: parseCronExpression(nextConfig.cron),
  };
}

export async function executeScheduledRun({
  autoApplierFactory,
  notificationService,
  d1Client,
  config,
  options = {},
  source = 'manual',
  startedAt,
}) {
  let runRecord = null;
  await notificationService?.notifyJobStarted?.('auto-apply', {
    source,
    cron: config.cron,
    timezone: config.timezone,
  });

  if (d1Client?.createAutomationRun) {
    runRecord = await d1Client.createAutomationRun({
      run_type: 'auto-apply',
      platform: 'all',
      config: {
        source,
        schedule: { cron: config.cron, timezone: config.timezone },
        options,
      },
    });
  }

  const runOptions = {
    keywords: ['보안 운영', '보안 인프라', 'SIEM'],
    maxApplications: 10,
    ...options,
  };

  const result = await withTimeout(autoApplierFactory(runOptions).run(runOptions), config.timeout);

  const duration = Date.now() - startedAt;

  if (runRecord?.id && d1Client?.completeAutomationRun && result?.success !== false) {
    await d1Client.completeAutomationRun(runRecord.id, {
      jobs_found: result?.results?.searched ?? 0,
      jobs_matched: result?.results?.matched ?? 0,
      jobs_applied: result?.results?.applied ?? 0,
      ...result,
    });
  }

  if (runRecord?.id && result?.success === false) {
    await markRunFailed(d1Client, runRecord.id, result?.error || 'run_failed', result);
  }

  await notificationService?.notifyJobCompleted?.('auto-apply', result, duration);

  return { result, duration, runRecord };
}

export async function handleScheduledRunError({
  d1Client,
  notificationService,
  runRecord,
  error,
  duration,
}) {
  const result = { success: false, error: error.message };
  if (runRecord?.id) {
    await markRunFailed(d1Client, runRecord.id, error.message, result);
  }
  await notificationService?.notifyJobCompleted?.('auto-apply', result, duration);
  return result;
}
