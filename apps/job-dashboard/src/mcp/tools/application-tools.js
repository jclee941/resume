import { z } from 'zod';
import { VALID_STATUSES } from '../../handlers/applications/statuses.js';
import { READ_ONLY, registerApiTool } from '../tool-kit.js';

const ID = z.string().min(1).max(128).describe('Application id');

/**
 * Read-only tools over applications, stats and reports.
 * @param {import('@modelcontextprotocol/server').McpServer} server
 * @param {import('../internal-api.js').InternalApi} api
 */
export function registerApplicationTools(server, api) {
  registerApiTool(server, {
    name: 'get_status',
    title: 'Worker status',
    description: 'Worker health: status, version and the tracked application count.',
    inputSchema: z.object({}),
    annotations: READ_ONLY,
    run: () => api.call('GET', '/api/status'),
  });

  registerApiTool(server, {
    name: 'list_applications',
    title: 'List applications',
    description: 'List tracked job applications, newest first, with optional filters.',
    inputSchema: z.object({
      status: z.enum(VALID_STATUSES).optional().describe('Application status filter'),
      platform: z.string().min(1).max(64).optional().describe('Source platform, e.g. wanted'),
      limit: z.number().int().min(1).max(200).default(50),
      offset: z.number().int().min(0).default(0),
    }),
    annotations: READ_ONLY,
    run: ({ status, platform, limit, offset }) =>
      api.call('GET', '/api/applications', { query: { status, source: platform, limit, offset } }),
  });

  registerApiTool(server, {
    name: 'get_application',
    title: 'Get application',
    description: 'One application with its status timeline.',
    inputSchema: z.object({ id: ID }),
    annotations: READ_ONLY,
    run: ({ id }) => api.call('GET', `/api/applications/${encodeURIComponent(id)}`),
  });

  registerApiTool(server, {
    name: 'get_stats',
    title: 'Application statistics',
    description: 'Overall statistics and the last seven days.',
    inputSchema: z.object({}),
    annotations: READ_ONLY,
    run: async () => {
      const [overall, weekly] = await Promise.all([
        api.call('GET', '/api/stats'),
        api.call('GET', '/api/stats/weekly'),
      ]);
      if (!overall.ok) return overall;
      if (!weekly.ok) return weekly;
      return { ok: true, status: 200, data: { overall: overall.data, weekly: weekly.data } };
    },
  });

  registerApiTool(server, {
    name: 'get_report',
    title: 'Application report',
    description:
      'Daily report (optionally for one date) or the weekly report with recommendations.',
    inputSchema: z.object({
      period: z.enum(['daily', 'weekly']).default('daily'),
      date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional()
        .describe('YYYY-MM-DD, daily only'),
    }),
    annotations: READ_ONLY,
    run: ({ period, date }) =>
      period === 'weekly'
        ? api.call('GET', '/api/report/weekly')
        : api.call('GET', '/api/report', { query: { date } }),
  });
}
