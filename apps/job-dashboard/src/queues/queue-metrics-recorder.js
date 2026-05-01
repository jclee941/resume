export class QueueMetricsRecorder {
  constructor(env, logger, stats) {
    this.env = env;
    this.logger = logger;
    this.stats = stats;
  }

  /**
   * Record batch processing metrics in D1 for monitoring.
   * @param {string} queueName
   * @param {number} duration - Processing time in ms
   */
  async record(queueName, duration) {
    try {
      if (!this.env.JOB_DB) return;

      await this.env.JOB_DB.prepare(
        `INSERT INTO sync_logs (id, sync_type, status, started_at, completed_at, details)
         VALUES (?, ?, ?, datetime('now', ?), datetime('now'), ?)`
      )
        .bind(
          crypto.randomUUID(),
          'queue_batch',
          this.stats.failed > 0 ? 'partial' : 'success',
          `-${Math.round(duration / 1000)} seconds`,
          JSON.stringify({
            queue: queueName,
            duration,
            ...this.stats,
          })
        )
        .run();
    } catch (err) {
      this.logger.warn('Failed to record queue metrics', { error: err.message });
    }
  }
}
