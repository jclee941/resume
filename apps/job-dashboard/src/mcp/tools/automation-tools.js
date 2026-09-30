import { z } from 'zod';
import { READ_ONLY, registerApiTool } from '../tool-kit.js';

const WORKFLOW_TYPES = [
  'job-crawling',
  'application',
  'resume-sync',
  'daily-report',
  'health-check',
  'cleanup',
];

/**
 * Master resume as section names and sizes only; no personal values.
 * @param {unknown} data
 * @returns {unknown}
 */
function summarizeMasterResume(data) {
  const { resume, meta } =
    /** @type {{ resume?: Record<string, unknown>; meta?: Record<string, unknown> }} */ (
      data ?? {}
    );
  const sections = Object.fromEntries(
    Object.entries(resume ?? {}).map(([key, value]) => {
      if (Array.isArray(value)) return [key, { type: 'array', count: value.length }];
      if (value !== null && typeof value === 'object') {
        return [key, { type: 'object', keys: Object.keys(value).length }];
      }
      return [key, { type: typeof value }];
    })
  );
  const { id, targetResumeId, source, createdAt, updatedAt } = meta ?? {};
  return {
    success: true,
    mode: 'summary',
    meta: { id, targetResumeId, source, createdAt, updatedAt },
    sections,
  };
}

/**
 * Read-only tools over auto-apply state, workflows, profile sync and the master resume.
 * @param {import('@modelcontextprotocol/server').McpServer} server
 * @param {import('../internal-api.js').InternalApi} api
 */
export function registerAutomationTools(server, api) {
  registerApiTool(server, {
    name: 'get_auto_apply_status',
    title: 'Auto-apply status',
    description: 'Auto-apply enablement, daily budget, supported platforms and pending approvals.',
    inputSchema: z.object({}),
    annotations: READ_ONLY,
    run: () => api.call('GET', '/api/auto-apply/status'),
  });

  registerApiTool(server, {
    name: 'get_auto_apply_config',
    title: 'Auto-apply configuration',
    description: 'Stored auto-apply configuration (read only; nothing is changed).',
    inputSchema: z.object({}),
    annotations: READ_ONLY,
    run: () => api.call('GET', '/api/auto-apply/config'),
  });

  registerApiTool(server, {
    name: 'get_workflow_instance',
    title: 'Workflow instance status',
    description: 'Status and output of a Cloudflare Workflow instance started by a start_* tool.',
    inputSchema: z.object({
      workflowType: z.enum(WORKFLOW_TYPES),
      instanceId: z.string().min(1).max(128),
    }),
    annotations: READ_ONLY,
    run: ({ workflowType, instanceId }) =>
      api.call('GET', `/api/workflows/${workflowType}/${encodeURIComponent(instanceId)}`),
  });

  registerApiTool(server, {
    name: 'list_profile_sync_history',
    title: 'Profile sync history',
    description: 'Most recent profile sync runs, newest first.',
    inputSchema: z.object({ limit: z.number().int().min(1).max(50).default(10) }),
    annotations: READ_ONLY,
    run: ({ limit }) =>
      api.call('GET', '/api/automation/profile-sync/history', { query: { limit } }),
  });

  registerApiTool(server, {
    name: 'get_master_resume',
    title: 'Master resume',
    description:
      "Master resume. 'summary' (default) returns section names and counts only; 'full' returns the whole document, including personal data.",
    inputSchema: z.object({ mode: z.enum(['summary', 'full']).default('summary') }),
    annotations: READ_ONLY,
    run: async ({ mode }) => {
      const result = await api.call('GET', '/api/resume/master');
      return result.ok && mode === 'summary'
        ? { ...result, data: summarizeMasterResume(result.data) }
        : result;
    },
  });
}
