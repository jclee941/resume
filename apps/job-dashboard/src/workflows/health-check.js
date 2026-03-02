import { WorkflowEntrypoint } from 'cloudflare:workers';

/**
 * Health Check Workflow
 *
 * Monitors service health with automatic alerting and metrics logging.
 * Parallel health checks with latency tracking and degradation detection.
 *
 * @param {Object} params
 * @param {string[]} params.services - URLs to check (defaults to resume.jclee.me and resume.jclee.me/job)
 * @param {string} params.slackWebhook - Optional Slack webhook override
 */
export class HealthCheckWorkflow extends WorkflowEntrypoint {
  async run(event, step) {
    const {
      services = ['https://resume.jclee.me/health', 'https://resume.jclee.me/job/health'],
      slackWebhook = null,
    } = event.payload || {};

    const startedAt = new Date().toISOString();

    // Step 1: Check all services in parallel
    const results = await step.do(
      'check-services',
      {
        retries: { limit: 3, delay: '10 seconds', backoff: 'exponential' },
        timeout: '30 seconds',
      },
      async () => {
        const checks = await Promise.all(
          services.map(async (url) => {
            const start = Date.now();
            try {
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 25000);

              const response = await fetch(url, {
                method: 'GET',
                signal: controller.signal,
                headers: {
                  'User-Agent': 'HealthCheckWorkflow/1.0',
                },
              });

              clearTimeout(timeoutId);
              const latencyMs = Date.now() - start;

              return {
                url,
                status: response.status,
                latencyMs,
                healthy: response.status === 200,
              };
            } catch (error) {
              return {
                url,
                status: 0,
                latencyMs: Date.now() - start,
                healthy: false,
                error: error.message,
              };
            }
          })
        );
        return checks;
      }
    );

    // Step 2: Check D1 and KV connectivity
    const bindingResults = await step.do(
      'check-bindings',
      {
        retries: { limit: 2, delay: '5 seconds' },
        timeout: '30 seconds',
      },
      async () => {
        const checks = {};

        const d1Start = Date.now();
        try {
          await this.env.DB.prepare('SELECT 1 AS ok').first();
          checks.d1 = { healthy: true, latencyMs: Date.now() - d1Start };
        } catch (err) {
          checks.d1 = { healthy: false, latencyMs: Date.now() - d1Start, error: err.message };
        }

        const kvStart = Date.now();
        try {
          const testKey = '_health_check';
          const testValue = Date.now().toString();
          await this.env.SESSIONS.put(testKey, testValue, { expirationTtl: 60 });
          const readBack = await this.env.SESSIONS.get(testKey);
          checks.kv = {
            healthy: readBack === testValue,
            latencyMs: Date.now() - kvStart,
            error: readBack !== testValue ? 'Read-back mismatch' : undefined,
          };
        } catch (err) {
          checks.kv = { healthy: false, latencyMs: Date.now() - kvStart, error: err.message };
        }

        return checks;
      }
    );

    // Step 3: Evaluate overall health status
    const healthEvaluation = await step.do(
      'evaluate-health',
      {
        retries: { limit: 2, delay: '5 seconds' },
        timeout: '30 seconds',
      },
      async () => {
        const evaluated = results.map((result) => ({
          ...result,
          status_label: this.getStatusLabel(result),
        }));

        const hasDown = evaluated.some((r) => !r.healthy);
        const hasDegraded = evaluated.some((r) => r.healthy && r.latencyMs > 2000);
        const hasBindingFailure = !bindingResults.d1.healthy || !bindingResults.kv.healthy;

        let overallHealth = 'healthy';
        if (hasDown || hasBindingFailure) {
          overallHealth = 'critical';
        } else if (hasDegraded) {
          overallHealth = 'degraded';
        }

        return {
          services: evaluated,
          bindings: bindingResults,
          overallHealth,
          hasDown,
          hasDegraded,
          hasBindingFailure,
        };
      }
    );

    // Step 4: Send notification with escalation
    if (healthEvaluation.overallHealth !== 'healthy') {
      await step.do(
        'notify',
        {
          retries: { limit: 2, delay: '10 seconds' },
          timeout: '30 seconds',
        },
        async () => {
          const consecutiveFailures = await this.getConsecutiveFailures();
          const escalationLevel = this.getEscalationLevel(consecutiveFailures);

          const webhookUrl = slackWebhook || this.env.SLACK_WEBHOOK_URL;
          if (!webhookUrl) {
            return { notified: false, reason: 'No webhook configured' };
          }

          const emojiMap = { warning: '🟡', critical: '🔴', emergency: '🚨' };
          const emoji = emojiMap[escalationLevel] || '🟡';
          const affectedServices = healthEvaluation.services
            .filter((s) => !s.healthy || s.latencyMs > 2000)
            .map((s) => `• ${s.url}: ${s.status_label} (${s.latencyMs}ms)`)
            .join('\n');

          const bindingStatus = [];
          if (healthEvaluation.hasBindingFailure) {
            if (!healthEvaluation.bindings.d1.healthy) {
              bindingStatus.push(`• D1: DOWN (${healthEvaluation.bindings.d1.error})`);
            }
            if (!healthEvaluation.bindings.kv.healthy) {
              bindingStatus.push(`• KV: DOWN (${healthEvaluation.bindings.kv.error})`);
            }
          }

          const blocks = [
            {
              type: 'header',
              text: {
                type: 'plain_text',
                text: `${emoji} Health Check: ${healthEvaluation.overallHealth.toUpperCase()} [${escalationLevel.toUpperCase()}]`,
              },
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: [
                  `*Affected Services*:\n${affectedServices}`,
                  bindingStatus.length ? `\n*Binding Issues*:\n${bindingStatus.join('\n')}` : '',
                  `\n*Consecutive Failures*: ${consecutiveFailures + 1}`,
                  `*Escalation*: ${escalationLevel}`,
                  `*Checked at*: ${startedAt}`,
                ]
                  .filter(Boolean)
                  .join('\n'),
              },
            },
          ];

          await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: `${emoji} Health Check Alert: ${healthEvaluation.overallHealth.toUpperCase()} [${escalationLevel}]`,
              blocks,
            }),
          });

          return { notified: true, escalationLevel, consecutiveFailures: consecutiveFailures + 1 };
        }
      );
    }

    // Step 5: Log metrics and details to D1
    await step.do(
      'log-metrics',
      {
        retries: { limit: 3, delay: '5 seconds' },
        timeout: '2 minutes',
      },
      async () => {
        const healthStmt = this.env.DB.prepare(`
          INSERT INTO health_checks (service_url, status, latency_ms, checked_at)
          VALUES (?, ?, ?, datetime('now'))
        `);

        const detailStmt = this.env.DB.prepare(`
          INSERT INTO health_check_details (check_type, service_name, status, latency_ms, consecutive_failures, escalation_level)
          VALUES (?, ?, ?, ?, ?, ?)
        `);

        const consecutiveFailures =
          healthEvaluation.overallHealth !== 'healthy'
            ? (await this.getConsecutiveFailures()) + 1
            : 0;
        const escalationLevel = this.getEscalationLevel(consecutiveFailures);

        const batch = [
          ...healthEvaluation.services.map((service) =>
            healthStmt.bind(service.url, service.status, service.latencyMs)
          ),
          ...healthEvaluation.services.map((service) =>
            detailStmt.bind(
              'http',
              service.url,
              service.healthy ? 'healthy' : 'down',
              service.latencyMs,
              consecutiveFailures,
              escalationLevel
            )
          ),
          detailStmt.bind(
            'd1',
            'DB',
            healthEvaluation.bindings.d1.healthy ? 'healthy' : 'down',
            healthEvaluation.bindings.d1.latencyMs,
            consecutiveFailures,
            escalationLevel
          ),
          detailStmt.bind(
            'kv',
            'SESSIONS',
            healthEvaluation.bindings.kv.healthy ? 'healthy' : 'down',
            healthEvaluation.bindings.kv.latencyMs,
            consecutiveFailures,
            escalationLevel
          ),
        ];

        await this.env.DB.batch(batch);
        return { logged: batch.length, consecutiveFailures, escalationLevel };
      }
    );

    return {
      success: true,
      health: healthEvaluation.overallHealth,
      services: healthEvaluation.services,
      bindings: healthEvaluation.bindings,
      completedAt: new Date().toISOString(),
    };
  }

  async getConsecutiveFailures() {
    try {
      const row = await this.env.DB.prepare(
        `
        SELECT COUNT(*) as cnt FROM health_check_details
        WHERE check_type = 'http'
        AND status != 'healthy'
        AND created_at > datetime('now', '-1 hour')
      `
      ).first();
      return row?.cnt || 0;
    } catch {
      return 0;
    }
  }

  getEscalationLevel(consecutiveFailures) {
    if (consecutiveFailures >= 6) return 'emergency';
    if (consecutiveFailures >= 3) return 'critical';
    if (consecutiveFailures >= 1) return 'warning';
    return 'none';
  }

  getStatusLabel(result) {
    if (!result.healthy) {
      return result.error ? `down (${result.error})` : `error (${result.status})`;
    }
    if (result.latencyMs > 2000) {
      return 'degraded';
    }
    return 'healthy';
  }
}
