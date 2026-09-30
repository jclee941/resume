import { McpServer } from '@modelcontextprotocol/server';
import pkg from '../../package.json' with { type: 'json' };
import { registerApplicationTools } from './tools/application-tools.js';
import { registerAutomationTools } from './tools/automation-tools.js';
import { registerContentFileTools } from './tools/content-files.js';
import { registerWriteTools } from './tools/write-tools.js';

export const SERVER_NAME = 'job-mcp-server';

const INSTRUCTIONS = [
  'Job automation for the resume Worker: read tools report applications, statistics, reports, auto-apply state, workflow instances, profile sync history, the master resume and D1 content files; write tools start dry-run-first workflows, decide approvals, change application status and refresh platform sessions.',
  'Real job applications are only submitted through the existing human approval gate: run_auto_apply defaults to dryRun true, and a real submit needs one explicit candidate, explicitSubmit, submitOptIn and a matching approvalId.',
  'Never invent an approvalId; approval decisions belong to the operator.',
].join(' ');

/**
 * One fresh server per request (the handler is stateless).
 * @param {import('./internal-api.js').InternalApi} api
 * @param {Parameters<typeof registerContentFileTools>[1]} env
 * @returns {McpServer}
 */
export function createJobMcpServer(api, env) {
  const server = new McpServer(
    { name: SERVER_NAME, version: pkg.version },
    { instructions: INSTRUCTIONS }
  );
  registerApplicationTools(server, api);
  registerAutomationTools(server, api);
  registerContentFileTools(server, env);
  registerWriteTools(server, api);
  return server;
}
