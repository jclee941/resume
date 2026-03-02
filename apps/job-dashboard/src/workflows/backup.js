import { WorkflowEntrypoint } from 'cloudflare:workers';

/**
 * Backup Workflow
 *
 * Exports D1 database tables to KV storage with retention management.
 * Supports selective table backup and automatic cleanup of old backups.
 *
 * @param {Object} params
 * @param {string[]} params.tables - Tables to backup (defaults to core tables)
 * @param {number} params.retention - Days to keep backups (default: 7)
 */
export class BackupWorkflow extends WorkflowEntrypoint {
  async run(event, step) {
    const { tables = ['applications', 'job_search_results', 'config'], retention = 7 } =
      event.payload || {};

    const startedAt = new Date().toISOString();
    const dateKey = new Date().toISOString().split('T')[0];
    const results = {
      tables: [],
      totalRows: 0,
      errors: [],
    };

    // Step 1: Validate tables exist
    const validatedTables = await step.do(
      'list-tables',
      {
        retries: { limit: 2, delay: '5 seconds' },
        timeout: '30 seconds',
      },
      async () => {
        const existingTables = await this.env.DB.prepare(
          `
          SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'
        `
        ).all();

        const tableNames = existingTables.results.map((t) => t.name);
        const validated = tables.filter((t) => tableNames.includes(t));
        const missing = tables.filter((t) => !tableNames.includes(t));

        if (missing.length > 0) {
          results.errors.push({ step: 'list-tables', missing });
        }

        return validated;
      }
    );

    // Step 2: Export each table
    for (const table of validatedTables) {
      const exportResult = await step.do(
        `export-${table}`,
        {
          retries: { limit: 2, delay: '5 seconds' },
          timeout: '5 minutes',
        },
        async () => {
          try {
            const data = await this.env.DB.prepare(`SELECT * FROM ${table}`).all();
            return {
              table,
              rows: data.results,
              count: data.results.length,
              success: true,
            };
          } catch (error) {
            return {
              table,
              rows: [],
              count: 0,
              success: false,
              error: error.message,
            };
          }
        }
      );

      if (exportResult.success) {
        results.tables.push({
          name: table,
          count: exportResult.count,
        });
        results.totalRows += exportResult.count;

        // Store in KV
        await step.do(
          `store-${table}`,
          {
            retries: { limit: 2, delay: '5 seconds' },
            timeout: '2 minutes',
          },
          async () => {
            const key = `backup:${dateKey}:${table}`;
            const ttl = retention * 86400;

            await this.env.SESSIONS.put(key, JSON.stringify(exportResult.rows), {
              expirationTtl: ttl,
              metadata: {
                table,
                date: dateKey,
                count: exportResult.count,
                createdAt: startedAt,
              },
            });

            return { key, stored: true };
          }
        );
      } else {
        results.errors.push({
          table,
          error: exportResult.error,
        });
      }
    }

    // Step 3: Cleanup old backups
    const cleanupResult = await step.do(
      'cleanup-old-backups',
      {
        retries: { limit: 2, delay: '5 seconds' },
        timeout: '2 minutes',
      },
      async () => {
        const list = await this.env.SESSIONS.list({ prefix: 'backup:' });
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - retention);
        const cutoffStr = cutoffDate.toISOString().split('T')[0];

        let deleted = 0;
        for (const key of list.keys) {
          const datePart = key.name.split(':')[1];
          if (datePart && datePart < cutoffStr) {
            await this.env.SESSIONS.delete(key.name);
            deleted++;
          }
        }

        return { deleted };
      }
    );

    // Step 4: Send notification
    await step.do(
      'notify',
      {
        retries: { limit: 2, delay: '10 seconds' },
        timeout: '30 seconds',
      },
      async () => {
        const webhookUrl = this.env.SLACK_WEBHOOK_URL;
        if (!webhookUrl) {
          return { notified: false, reason: 'No webhook configured' };
        }

        const tablesSummary = results.tables.map((t) => `• ${t.name}: ${t.count} rows`).join('\n');

        const hasErrors = results.errors.length > 0;
        const emoji = hasErrors ? '⚠️' : '✅';

        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `${emoji} Backup Complete: ${results.totalRows} rows backed up`,
            blocks: [
              {
                type: 'header',
                text: { type: 'plain_text', text: `${emoji} Database Backup Complete` },
              },
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: `*Date*: ${dateKey}\n*Tables Backed Up*:\n${tablesSummary}\n*Total Rows*: ${results.totalRows}\n*Old Backups Cleaned*: ${cleanupResult.deleted}`,
                },
              },
            ],
          }),
        });

        return { notified: true };
      }
    );

    return {
      success: results.errors.length === 0,
      backedUp: results.tables.map((t) => t.name),
      totalRows: results.totalRows,
      timestamp: startedAt,
      retention,
      cleanedUp: cleanupResult.deleted,
      errors: results.errors.length > 0 ? results.errors : undefined,
    };
  }
}
