import { EventEmitter } from 'events';
import { AutoApplier } from './auto-applier.js';
import { notifications } from '../shared/services/notifications/index.js';
import {
  DEFAULT_SCHEDULER_CONFIG,
  parseCronExpression,
  findNextRun,
  withTimeout,
  markRunFailed,
} from './scheduler-utils.js';

export class AutoApplyScheduler extends EventEmitter {
  constructor(options = {}) {
    super();
    this.logger = options.logger ?? console;
    this.d1Client = options.d1Client ?? null;
    this.notificationService = options.notificationService ?? notifications;
    this.autoApplierFactory =
      options.autoApplierFactory ??
      ((runOptions) =>
        new AutoApplier({
          dryRun: runOptions.dryRun !== false,
          autoApply: runOptions.dryRun === false,
          maxDailyApplications: runOptions.maxApplications ?? 10,
        }));

    this.config = { ...DEFAULT_SCHEDULER_CONFIG, ...(options.config || {}) };
    this.cronMatcher = parseCronExpression(this.config.cron);
    this.timer = null;
    this.started = false;
    this.running = false;
    this.currentRunStartedAt = null;
    this.lastRunAt = null;
    this.lastResult = null;
    this.lastError = null;
    this.nextRun = null;
    this.history = [];
    this.stats = {
      totalRuns: 0,
      successRuns: 0,
      failedRuns: 0,
      skippedOverlaps: 0,
      manualTriggers: 0,
      averageDurationMs: 0,
      lastDurationMs: null,
    };
  }

  start() {
    if (this.started) {
      return this.getStatus();
    }
    this.started = true;
    this.#scheduleNext();
    return this.getStatus();
  }

  stop() {
    this.started = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.nextRun = null;
    return this.getStatus();
  }

  async trigger({ source = 'manual', options = {} } = {}) {
    if (source === 'manual' || source === 'api') {
      this.stats.manualTriggers += 1;
    }

    if (this.running && this.config.preventOverlapping) {
      this.stats.skippedOverlaps += 1;
      return { success: false, skipped: true, reason: 'already_running' };
    }

    this.running = true;
    this.currentRunStartedAt = Date.now();
    this.lastError = null;
    this.lastRunAt = new Date().toISOString();

    const runContext = { source, startedAt: this.lastRunAt, config: { ...this.config } };
    this.emit('started', runContext);

    let runRecord = null;
    try {
      await this.notificationService?.notifyJobStarted?.('auto-apply', {
        source,
        cron: this.config.cron,
        timezone: this.config.timezone,
      });

      if (this.d1Client?.createAutomationRun) {
        runRecord = await this.d1Client.createAutomationRun({
          run_type: 'auto-apply',
          platform: 'all',
          config: {
            source,
            schedule: { cron: this.config.cron, timezone: this.config.timezone },
            options,
          },
        });
      }

      const runOptions = {
        keywords: ['시니어 엔지니어', '클라우드 엔지니어', 'SRE'],
        maxApplications: 10,
        ...options,
      };

      const result = await withTimeout(
        this.autoApplierFactory(runOptions).run(runOptions),
        this.config.timeout
      );
      this.lastResult = result;

      const duration = Date.now() - this.currentRunStartedAt;
      this.#recordRun(source, result, duration, result?.success === false ? 'failed' : 'completed');

      if (runRecord?.id && this.d1Client?.completeAutomationRun && result?.success !== false) {
        await this.d1Client.completeAutomationRun(runRecord.id, {
          jobs_found: result?.results?.searched ?? 0,
          jobs_matched: result?.results?.matched ?? 0,
          jobs_applied: result?.results?.applied ?? 0,
          ...result,
        });
      }

      if (runRecord?.id && result?.success === false) {
        await markRunFailed(this.d1Client, runRecord.id, result?.error || 'run_failed', result);
      }

      await this.notificationService?.notifyJobCompleted?.('auto-apply', result, duration);
      this.emit(result?.success === false ? 'failed' : 'completed', {
        ...runContext,
        result,
        duration,
      });

      return result;
    } catch (error) {
      const duration = this.currentRunStartedAt ? Date.now() - this.currentRunStartedAt : 0;
      this.lastError = error.message;
      this.lastResult = { success: false, error: error.message };
      this.#recordRun(source, this.lastResult, duration, 'failed');

      if (runRecord?.id) {
        await markRunFailed(this.d1Client, runRecord.id, error.message, this.lastResult);
      }

      await this.notificationService?.notifyJobCompleted?.('auto-apply', this.lastResult, duration);
      this.emit('failed', { ...runContext, error: error.message, duration });
      throw error;
    } finally {
      this.running = false;
      this.currentRunStartedAt = null;
      if (this.started) {
        this.#scheduleNext();
      }
    }
  }

  updateConfig(updates = {}) {
    const nextConfig = { ...this.config, ...updates };
    if (typeof nextConfig.cron !== 'string' || nextConfig.cron.trim().length === 0) {
      throw new Error('Invalid cron expression');
    }

    this.cronMatcher = parseCronExpression(nextConfig.cron);
    this.config = nextConfig;

    if (this.started) {
      if (this.config.enabled) {
        this.#scheduleNext();
      } else {
        this.nextRun = null;
        if (this.timer) {
          clearTimeout(this.timer);
          this.timer = null;
        }
      }
    }

    return this.getStatus();
  }

  getNextRun() {
    if (!this.config.enabled) {
      return null;
    }
    return findNextRun(this.cronMatcher, this.config.timezone);
  }

  getStatus() {
    return {
      schedule: { ...this.config },
      started: this.started,
      running: this.running,
      nextRun: this.nextRun,
      lastRun: this.lastRunAt,
      lastResult: this.lastResult,
      lastError: this.lastError,
      currentRunStartedAt: this.currentRunStartedAt
        ? new Date(this.currentRunStartedAt).toISOString()
        : null,
      stats: { ...this.stats },
      history: [...this.history],
    };
  }

  isRunning() {
    return this.running;
  }

  #scheduleNext() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    if (!this.started || !this.config.enabled) {
      this.nextRun = null;
      return;
    }

    const next = this.getNextRun();
    this.nextRun = next ? next.toISOString() : null;
    if (!next) {
      this.logger.error('Unable to calculate next auto-apply schedule');
      return;
    }

    const delay = Math.max(0, next.getTime() - Date.now());
    this.timer = setTimeout(() => {
      this.emit('scheduled', {
        nextRun: this.nextRun,
        triggeredAt: new Date().toISOString(),
      });

      this.trigger({ source: 'scheduled' }).catch((error) => {
        this.logger.error({ err: error }, 'Scheduled auto-apply run failed');
      });
    }, delay);
  }

  #recordRun(source, result, duration, status) {
    this.stats.totalRuns += 1;
    this.stats.successRuns += status === 'completed' ? 1 : 0;
    this.stats.failedRuns += status === 'failed' ? 1 : 0;
    this.stats.lastDurationMs = duration;

    const total = this.stats.totalRuns;
    const prevAvg = this.stats.averageDurationMs;
    this.stats.averageDurationMs =
      total === 1 ? duration : Math.round((prevAvg * (total - 1) + duration) / total);

    this.history.unshift({
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

    this.history = this.history.slice(0, 50);
  }
}

export default AutoApplyScheduler;
