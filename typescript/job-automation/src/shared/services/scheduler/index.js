/**
 * @typedef {Object} SchedulerJob
 * @property {string} name
 * @property {string} cron
 * @property {(context: { scheduledAt: Date, now: Date }) => Promise<unknown>} handler
 * @property {boolean} running
 * @property {Date|null} lastRunAt
 */

const FIELD_RANGES = {
  minute: [0, 59],
  hour: [0, 23],
  dayOfMonth: [1, 31],
  month: [1, 12],
  dayOfWeek: [0, 6],
};

/**
 * In-process cron scheduler with overlap protection and execution logs.
 */
export class CronScheduler {
  /**
   * @param {{ logger?: Pick<Console, 'info'|'warn'|'error'>, now?: () => Date }} [options]
   */
  constructor(options = {}) {
    this.logger = options.logger || console;
    this.now = options.now || (() => new Date());
    /** @type {Map<string, SchedulerJob>} */
    this.jobs = new Map();
    /** @type {Array<{ name: string, level: 'info'|'warn'|'error', message: string, at: string }>} */
    this.logs = [];
  }

  /**
   * Register a cron job.
   *
   * @param {string} name
   * @param {string} cron
   * @param {(context: { scheduledAt: Date, now: Date }) => Promise<unknown>} handler
   */
  register(name, cron, handler) {
    if (this.jobs.has(name)) {
      throw new Error(`Job already exists: ${name}`);
    }

    this.validateCron(cron);

    this.jobs.set(name, {
      name,
      cron,
      handler,
      running: false,
      lastRunAt: null,
    });

    this.addLog(name, 'info', `Registered cron job (${cron})`);
  }

  /**
   * Execute all jobs that match the current minute.
   * Prevents overlapping runs of the same job.
   *
   * @param {Date} [scheduledAt]
   * @returns {Promise<void>}
   */
  async tick(scheduledAt = this.now()) {
    const runs = [];

    for (const job of this.jobs.values()) {
      if (!this.matchesCron(job.cron, scheduledAt)) {
        continue;
      }

      if (job.running) {
        this.addLog(job.name, 'warn', 'Conflict detected: previous run still active, skipping');
        continue;
      }

      runs.push(this.runJob(job, scheduledAt));
    }

    await Promise.all(runs);
  }

  /**
   * Return execution logs.
   * @param {number} [limit=100]
   */
  getLogs(limit = 100) {
    return this.logs.slice(-Math.max(1, limit));
  }

  /**
   * @private
   * @param {SchedulerJob} job
   * @param {Date} scheduledAt
   */
  async runJob(job, scheduledAt) {
    job.running = true;
    this.addLog(job.name, 'info', `Execution started at ${scheduledAt.toISOString()}`);

    try {
      await job.handler({ scheduledAt, now: this.now() });
      job.lastRunAt = scheduledAt;
      this.addLog(job.name, 'info', 'Execution completed');
    } catch (error) {
      this.addLog(job.name, 'error', `Execution failed: ${error.message}`);
      this.logger.error?.(`[CronScheduler] ${job.name} failed`, error);
    } finally {
      job.running = false;
    }
  }

  /**
   * @private
   * @param {string} name
   * @param {'info'|'warn'|'error'} level
   * @param {string} message
   */
  addLog(name, level, message) {
    const event = {
      name,
      level,
      message,
      at: this.now().toISOString(),
    };

    this.logs.push(event);
    if (this.logs.length > 1000) {
      this.logs.shift();
    }

    const line = `[CronScheduler] ${name}: ${message}`;
    this.logger[level]?.(line);
  }

  /**
   * @private
   * @param {string} cron
   */
  validateCron(cron) {
    const fields = cron.trim().split(/\s+/);
    if (fields.length !== 5) {
      throw new Error(`Invalid cron expression: ${cron}`);
    }

    const [minute, hour, dayOfMonth, month, dayOfWeek] = fields;
    this.validateField(minute, FIELD_RANGES.minute, 'minute');
    this.validateField(hour, FIELD_RANGES.hour, 'hour');
    this.validateField(dayOfMonth, FIELD_RANGES.dayOfMonth, 'dayOfMonth');
    this.validateField(month, FIELD_RANGES.month, 'month');
    this.validateField(dayOfWeek, FIELD_RANGES.dayOfWeek, 'dayOfWeek');
  }

  /**
   * @private
   * @param {string} field
   * @param {[number, number]} range
   * @param {string} label
   */
  validateField(field, range, label) {
    const segments = field.split(',');
    for (const segment of segments) {
      this.parseSegment(segment, range, label);
    }
  }

  /**
   * @private
   * @param {string} cron
   * @param {Date} date
   */
  matchesCron(cron, date) {
    const fields = cron.trim().split(/\s+/);
    const values = {
      minute: date.getUTCMinutes(),
      hour: date.getUTCHours(),
      dayOfMonth: date.getUTCDate(),
      month: date.getUTCMonth() + 1,
      dayOfWeek: date.getUTCDay(),
    };

    return (
      this.matchesField(fields[0], values.minute, FIELD_RANGES.minute, 'minute') &&
      this.matchesField(fields[1], values.hour, FIELD_RANGES.hour, 'hour') &&
      this.matchesField(fields[2], values.dayOfMonth, FIELD_RANGES.dayOfMonth, 'dayOfMonth') &&
      this.matchesField(fields[3], values.month, FIELD_RANGES.month, 'month') &&
      this.matchesField(fields[4], values.dayOfWeek, FIELD_RANGES.dayOfWeek, 'dayOfWeek')
    );
  }

  /**
   * @private
   * @param {string} field
   * @param {number} value
   * @param {[number, number]} range
   * @param {string} label
   */
  matchesField(field, value, range, label) {
    return field.split(',').some((segment) => {
      const matcher = this.parseSegment(segment, range, label);
      return matcher(value);
    });
  }

  /**
   * @private
   * @param {string} segment
   * @param {[number, number]} range
   * @param {string} label
   * @returns {(value: number) => boolean}
   */
  parseSegment(segment, range, label) {
    const [min, max] = range;

    if (segment === '*') {
      return () => true;
    }

    if (segment.includes('/')) {
      const [base, stepRaw] = segment.split('/');
      const step = Number(stepRaw);
      if (!Number.isInteger(step) || step <= 0) {
        throw new Error(`Invalid step in ${label}: ${segment}`);
      }

      const baseMatcher = base === '*' ? () => true : this.parseSegment(base, range, label);
      return (value) => baseMatcher(value) && (value - min) % step === 0;
    }

    if (segment.includes('-')) {
      const [startRaw, endRaw] = segment.split('-');
      const start = Number(startRaw);
      const end = Number(endRaw);

      if (!Number.isInteger(start) || !Number.isInteger(end) || start > end) {
        throw new Error(`Invalid range in ${label}: ${segment}`);
      }

      if (start < min || end > max) {
        throw new Error(`Out of range in ${label}: ${segment}`);
      }

      return (value) => value >= start && value <= end;
    }

    const point = Number(segment);
    if (!Number.isInteger(point) || point < min || point > max) {
      throw new Error(`Invalid value in ${label}: ${segment}`);
    }

    return (value) => value === point;
  }
}

export default CronScheduler;
