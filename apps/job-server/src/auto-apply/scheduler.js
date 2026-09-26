import { EventEmitter } from 'events';
import { notifications } from '../shared/services/notifications/index.js';
import { DEFAULT_SCHEDULER_CONFIG, parseCronExpression, findNextRun } from './scheduler-utils.js';
import {
  createDefaultAutoApplierFactory,
  createInitialStats,
  recordRunHistory,
  buildSchedulerStatus,
  updateSchedulerConfig,
  executeScheduledRun,
  handleScheduledRunError,
} from './scheduler-runner.js';

export class AutoApplyScheduler extends EventEmitter {
  constructor(options = {}) {
    super();
    this.logger = options.logger ?? console;
    this.d1Client = options.d1Client ?? null;
    this.notificationService = options.notificationService ?? notifications;
    this.autoApplierFactory = options.autoApplierFactory ?? createDefaultAutoApplierFactory();

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
    this.stats = createInitialStats();
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
      const runOutcome = await executeScheduledRun({
        autoApplierFactory: this.autoApplierFactory,
        notificationService: this.notificationService,
        d1Client: this.d1Client,
        config: this.config,
        options,
        source,
        startedAt: this.currentRunStartedAt,
      });

      const { result, duration } = runOutcome;
      runRecord = runOutcome.runRecord;
      this.lastResult = result;

      recordRunHistory(
        this.stats,
        this.history,
        source,
        result,
        duration,
        result?.success === false ? 'failed' : 'completed'
      );

      this.emit(result?.success === false ? 'failed' : 'completed', {
        ...runContext,
        result,
        duration,
      });

      return result;
    } catch (error) {
      const duration = this.currentRunStartedAt ? Date.now() - this.currentRunStartedAt : 0;
      this.lastError = error.message;
      this.lastResult = await handleScheduledRunError({
        d1Client: this.d1Client,
        notificationService: this.notificationService,
        runRecord,
        error,
        duration,
      });
      recordRunHistory(this.stats, this.history, source, this.lastResult, duration, 'failed');

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
    const updated = updateSchedulerConfig(this.config, updates);
    this.cronMatcher = updated.cronMatcher;
    this.config = updated.config;

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
    return buildSchedulerStatus(this);
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
}

export default AutoApplyScheduler;
