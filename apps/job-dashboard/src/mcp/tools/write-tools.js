import { z } from 'zod';
import { VALID_STATUSES } from '../../handlers/applications/statuses.js';
import { RESUME_SYNC_PLATFORMS } from '../../services/resume-platform-sync/index.js';
import { registerApiTool, writeHints } from '../tool-kit.js';

const INSTANCE_ID = z.string().min(1).max(128).describe('Application workflow instance id');
const SESSION_PLATFORMS = ['wanted', 'jobkorea'];

/**
 * Tools that change state. Each one calls the same route as its REST endpoint,
 * so the real-submit gate, approval rules and validation are not re-implemented.
 * @param {import('@modelcontextprotocol/server').McpServer} server
 * @param {import('../internal-api.js').InternalApi} api
 */
export function registerWriteTools(server, api) {
  registerApiTool(server, {
    name: 'run_auto_apply',
    title: 'Run auto-apply',
    description:
      'Run auto-apply (POST /api/auto-apply/run). dryRun defaults to true and only previews. A real submit (dryRun false) is rejected unless it carries exactly one explicit candidate, explicitSubmit, submitOptIn and an approvalId matching that candidate.',
    inputSchema: z.object({
      dryRun: z.boolean().default(true),
      platforms: z.array(z.string().min(1)).max(10).optional(),
      keywords: z.array(z.string().min(1)).max(20).optional(),
      maxApplications: z.number().int().min(1).max(50).optional(),
      candidates: z.array(z.record(z.string(), z.unknown())).max(20).optional(),
      explicitSubmit: z.boolean().optional(),
      submitOptIn: z.boolean().optional(),
      approvalId: z.string().min(1).max(128).optional(),
    }),
    annotations: writeHints({ destructive: true, external: true }),
    run: (args) => api.call('POST', '/api/auto-apply/run', { body: args }),
  });

  registerApiTool(server, {
    name: 'approve_application',
    title: 'Approve application workflow',
    description:
      'Record an approval for the pending approval requests of an application workflow instance. This authorizes a later real submission.',
    inputSchema: z.object({ instanceId: INSTANCE_ID }),
    annotations: writeHints({ destructive: true, idempotent: true }),
    run: ({ instanceId }) =>
      api.call('POST', `/api/workflows/application/${encodeURIComponent(instanceId)}/approve`),
  });

  registerApiTool(server, {
    name: 'reject_application',
    title: 'Reject application workflow',
    description:
      'Record a rejection for the pending approval requests of an application workflow instance.',
    inputSchema: z.object({ instanceId: INSTANCE_ID }),
    annotations: writeHints({ idempotent: true }),
    run: ({ instanceId }) =>
      api.call('POST', `/api/workflows/application/${encodeURIComponent(instanceId)}/reject`),
  });

  registerApiTool(server, {
    name: 'update_application_status',
    title: 'Set application status',
    description: 'Set the status of one application and append a timeline entry.',
    inputSchema: z.object({
      id: z.string().min(1).max(128).describe('Application id'),
      status: z.enum(VALID_STATUSES),
      note: z.string().max(1000).optional(),
    }),
    annotations: writeHints({ idempotent: true }),
    run: ({ id, status, note }) =>
      api.call('PUT', `/api/applications/${encodeURIComponent(id)}/status`, {
        body: { status, note },
      }),
  });

  registerApiTool(server, {
    name: 'start_resume_sync',
    title: 'Start resume sync',
    description:
      'Start the resume sync workflow (master resume to Wanted/JobKorea). dryRun defaults to true and writes nothing to the platforms. Returns the workflow instance id.',
    inputSchema: z.object({
      dryRun: z.boolean().default(true),
      platforms: z.array(z.enum(RESUME_SYNC_PLATFORMS)).min(1).optional(),
    }),
    annotations: writeHints({ destructive: true, external: true }),
    run: (args) => api.call('POST', '/api/workflows/resume-sync', { body: args }),
  });

  registerApiTool(server, {
    name: 'start_job_crawl',
    title: 'Start job crawl',
    description:
      'Start the job crawling workflow. dryRun defaults to true. Returns the workflow instance id; poll it with get_workflow_instance.',
    inputSchema: z.object({
      dryRun: z.boolean().default(true),
      platforms: z.array(z.string().min(1)).min(1).max(10).optional(),
      keywords: z.array(z.string().min(1)).max(20).optional(),
    }),
    annotations: writeHints({ destructive: true, external: true }),
    run: ({ dryRun, platforms, keywords }) =>
      api.call('POST', '/api/workflows/job-crawling', {
        body: { dryRun, platforms, searchCriteria: keywords ? { keywords } : undefined },
      }),
  });

  registerApiTool(server, {
    name: 'refresh_platform_session',
    title: 'Refresh platform session',
    description: 'Mint a fresh login session for a job platform and store it in KV.',
    inputSchema: z.object({ platform: z.enum(SESSION_PLATFORMS) }),
    annotations: writeHints({ destructive: true, external: true }),
    run: ({ platform }) => api.call('POST', `/api/${platform}/refresh-session`),
  });
}
