/**
 * Tool handlers for MCP server.
 */
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { log } from '../logger.js';

import searchJobsTool from '../tools/search-jobs.js';
import searchKeywordTool from '../tools/search-keyword.js';
import getJobDetailTool from '../tools/get-job-detail.js';
import getCategoriesTool from '../tools/get-categories.js';
import getCompanyTool from '../tools/get-company.js';
import authTool from '../tools/auth.js';
import platformAuthTool from '../tools/auth-integrated.js';
import profileTool from '../tools/profile.js';
import resumeTool from '../tools/resume/index.js';
import resumeSyncTool from '../tools/resume-sync.js';
import resumeGeneratorTool from '../tools/resume-generator.js';
import jobMatcherTool from '../tools/job-matcher.js';
import coverLetterTool from '../tools/cover-letter.js';

import autoApplyTool from '../tools/auto-apply.js';
/**
 * Tool registry
 */
export const tools = {
  // Public tools (no auth required)
  [searchJobsTool.name]: searchJobsTool,
  [searchKeywordTool.name]: searchKeywordTool,
  [getJobDetailTool.name]: getJobDetailTool,
  [getCategoriesTool.name]: getCategoriesTool,
  [getCompanyTool.name]: getCompanyTool,
  // Auth-required tools
  [authTool.name]: authTool,
  [platformAuthTool.name]: platformAuthTool,
  [profileTool.name]: profileTool,
  [resumeTool.name]: resumeTool,
  [resumeSyncTool.name]: resumeSyncTool,
  [resumeGeneratorTool.name]: resumeGeneratorTool,
  [jobMatcherTool.name]: jobMatcherTool,
  [coverLetterTool.name]: coverLetterTool,
  [autoApplyTool.name]: autoApplyTool,
};

/**
 * Handle list tools request.
 * @returns {Promise<{tools: Array<{name: string, description: string, inputSchema: unknown}>}>}
 */
export async function handleListTools() {
  return {
    tools: Object.values(tools).map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    })),
  };
}

/**
 * Handle tool execution request.
 * @param {import('@modelcontextprotocol/sdk/types.js').CallToolRequestSchema} request
 * @returns {Promise<{content: Array<{type: string, text: string}>, isError?: boolean}>}
 */
export async function handleCallTool(request) {
  const { name, arguments: args } = request.params;

  const tool = tools[name];
  if (!tool) {
    log('warn', `Unknown tool requested: ${name}`, { tool: name });
    throw new Error(`Unknown tool: ${name}`);
  }

  try {
    log('debug', `Executing tool: ${name}`, { tool: name, args: Object.keys(args || {}) });
    const result = await tool.execute(args || {});
    log('debug', `Tool completed: ${name}`, { tool: name, success: true });
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    log('error', `Tool failed: ${name}`, {
      tool: name,
      'error.type': error.constructor.name,
      'error.message': error.message,
      'error.stack_trace': (error.stack || '').slice(0, 2000),
    });
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: false,
              error: error.message,
            },
            null,
            2
          ),
        },
      ],
      isError: true,
    };
  }
}

/**
 * Register tool handlers with MCP server.
 * @param {import('@modelcontextprotocol/sdk/server/index.js').Server} server
 */
export function registerToolHandlers(server) {
  server.setRequestHandler(ListToolsRequestSchema, handleListTools);
  server.setRequestHandler(CallToolRequestSchema, handleCallTool);
}
