#!/usr/bin/env node
/**
 * Wanted Korea MCP Server (원티드 MCP 서버)
 * Version: 1.2.0
 *
 * MCP Server for job search and resume management on Wanted Korea platform.
 *
 * Features:
 * - 5 Public Tools: Search jobs, keyword search, job details, categories, company info
 * - 3 Auth Tools: Authentication, profile view, resume management
 *   - Resume: 20 actions (careers, educations, skills, activities, language_certs)
 * - 1 Resource: Session status
 * - 3 Prompts: Job search workflow, resume update workflow
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

/**
 * Structured stderr logger for MCP server.
 * stdout is reserved for JSON-RPC protocol — all logging goes to stderr.
 * @param {'debug'|'info'|'warn'|'error'} level
 * @param {string} message
 * @param {Record<string, unknown>} [context]
 */
function logToStderr(level, message, context = {}) {
  const entry = {
    '@timestamp': new Date().toISOString(),
    'log.level': level,
    message,
    'service.name': 'mcp-server',
    ...context,
  };
  process.stderr.write(JSON.stringify(entry) + '\n');
}

import searchJobsTool from './tools/search-jobs.js';
import searchKeywordTool from './tools/search-keyword.js';
import getJobDetailTool from './tools/get-job-detail.js';
import getCategoriesTool from './tools/get-categories.js';
import getCompanyTool from './tools/get-company.js';
import authTool from './tools/auth.js';
import platformAuthTool from './tools/auth-integrated.js';
import profileTool from './tools/profile.js';
import resumeTool from './tools/resume/index.js';
import resumeSyncTool from './tools/resume-sync.js';
import resumeGeneratorTool from './tools/resume-generator.js';
import jobMatcherTool from './tools/job-matcher.js';

// Tool registry
const tools = {
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
};

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');
const SESSION_FILE = join(PROJECT_ROOT, '.data', 'sessions.json');

// Resource definitions
const resources = [
  {
    uri: 'wanted://session/status',
    name: 'Session Status',
    description: 'Current Wanted authentication session status',
    mimeType: 'application/json',
  },
];

// Prompt definitions
const prompts = [
  {
    name: 'search-devops-jobs',
    description: 'Search for DevOps/Infrastructure jobs on Wanted Korea',
    arguments: [
      {
        name: 'experience',
        description: 'Years of experience (e.g., 5)',
        required: false,
      },
      {
        name: 'location',
        description: 'Location preference (e.g., seoul)',
        required: false,
      },
    ],
  },
  {
    name: 'update-resume-career',
    description: 'Update career information in your Wanted resume',
    arguments: [
      {
        name: 'resume_id',
        description: 'Resume ID from list_resumes',
        required: true,
      },
      { name: 'career_id', description: 'Career ID to update', required: true },
    ],
  },
  {
    name: 'full-job-search',
    description: 'Complete job search workflow: categories → search → details',
    arguments: [
      {
        name: 'keyword',
        description: 'Search keyword (company, tech, position)',
        required: true,
      },
    ],
  },
];

// Create MCP server
const server = new Server(
  {
    name: 'wanted-mcp',
    version: '1.2.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
      prompts: {},
    },
  }
);

// Handle list tools request
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: Object.values(tools).map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    })),
  };
});

// Handle tool execution request
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  const tool = tools[name];
  if (!tool) {
    logToStderr('warn', `Unknown tool requested: ${name}`, { tool: name });
    throw new Error(`Unknown tool: ${name}`);
  }

  try {
    logToStderr('debug', `Executing tool: ${name}`, { tool: name, args: Object.keys(args || {}) });
    const result = await tool.execute(args || {});
    logToStderr('debug', `Tool completed: ${name}`, { tool: name, success: true });
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    logToStderr('error', `Tool failed: ${name}`, {
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
});

// Handle list resources request
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return { resources };
});

// Handle read resource request
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  if (uri === 'wanted://session/status') {
    let sessionData = { authenticated: false, email: null, expires: null };

    if (existsSync(SESSION_FILE)) {
      try {
        const allSessions = JSON.parse(readFileSync(SESSION_FILE, 'utf-8'));
        const data = allSessions.wanted || {}; // Access 'wanted' key for unified format

        const expiresAt = data.timestamp ? new Date(data.timestamp + 24 * 60 * 60 * 1000) : null;
        const isValid = expiresAt && expiresAt > new Date();

        sessionData = {
          authenticated: isValid && !!(data.token || data.cookies),
          email: data.email || null,
          expires: expiresAt ? expiresAt.toISOString() : null,
          hasToken: !!data.token,
          hasCookies: !!data.cookies,
        };
      } catch (e) {
        logToStderr('warn', 'Failed to read session file', {
          'error.message': e.message,
          file: SESSION_FILE,
        });
        sessionData.error = e.message;
      }
    }

    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(sessionData, null, 2),
        },
      ],
    };
  }

  throw new Error(`Unknown resource: ${uri}`);
});

// Handle list prompts request
server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return { prompts };
});

// Handle get prompt request
server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === 'search-devops-jobs') {
    const exp = args?.experience || '5';
    const loc = args?.location || 'all';
    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Search for DevOps and Infrastructure Engineer jobs on Wanted Korea.

Experience level: ${exp} years
Location: ${loc}

Steps:
1. Use wanted_search_jobs with tag_type_ids [674] (DevOps) and [672] (Security)
2. Filter results by experience level
3. For interesting positions, use wanted_get_job_detail to get full details
4. Summarize the top 5 matching positions with company info and requirements`,
          },
        },
      ],
    };
  }

  if (name === 'update-resume-career') {
    const resumeId = args?.resume_id || '[REQUIRED]';
    const careerId = args?.career_id || '[REQUIRED]';
    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Update career information in my Wanted resume.

Resume ID: ${resumeId}
Career ID: ${careerId}

Steps:
1. First, use wanted_resume with action="get_resume" to see current career details
2. Ask me what changes I want to make
3. Use wanted_resume with action="update_career" to apply changes
4. Use wanted_resume with action="save_resume" to save and regenerate PDF
5. Confirm the update was successful`,
          },
        },
      ],
    };
  }

  if (name === 'full-job-search') {
    const keyword = args?.keyword || '[REQUIRED]';
    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Complete job search on Wanted Korea for: ${keyword}

Steps:
1. Use wanted_search_keyword to search for "${keyword}"
2. Show me the top 10 results with company name, position, and tech stack
3. For the most relevant 3 positions, use wanted_get_job_detail to get:
   - Full job description
   - Requirements and qualifications
   - Company benefits and culture
4. Use wanted_get_company to get company information
5. Summarize which positions best match my profile (8+ years DevOps/Security experience)`,
          },
        },
      ],
    };
  }

  throw new Error(`Unknown prompt: ${name}`);
});

// Start server with stdio transport
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logToStderr('info', 'Wanted MCP Server started', { version: '1.2.0' });
}

main().catch((error) => {
  logToStderr('error', 'Server fatal error', {
    'error.type': error.constructor.name,
    'error.message': error.message,
    'error.stack_trace': (error.stack || '').slice(0, 2000),
  });
  process.exit(1);
});
