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
import { log } from './logger.js';
import {
  registerToolHandlers,
  registerResourceHandlers,
  registerPromptHandlers,
} from './handlers/index.js';

// Create MCP server
const server = new Server(
  {
    name: 'apps/job-server',
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

// Register all handlers
registerToolHandlers(server);
registerResourceHandlers(server);
registerPromptHandlers(server);

// Start server with stdio transport
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  log('info', 'Wanted MCP Server started', { version: '1.2.0' });

  let isShuttingDown = false;

  async function gracefulShutdown(signal) {
    if (isShuttingDown) {
      return;
    }
    isShuttingDown = true;
    log('info', `Received ${signal}, shutting down MCP server...`);
    try {
      await transport.close();
      await server.close();
      log('info', 'MCP server closed gracefully');
      process.exit(0);
    } catch (err) {
      log('error', `Error during shutdown: ${err.message}`);
      process.exit(1);
    }
  }

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('uncaughtException', (err) => {
    log('error', `Uncaught exception: ${err.message}`);
    gracefulShutdown('uncaughtException');
  });
  process.on('unhandledRejection', (reason) => {
    log('error', `Unhandled rejection: ${reason}`);
    gracefulShutdown('unhandledRejection');
  });
}

main().catch((error) => {
  log('error', 'Server fatal error', {
    'error.type': error.constructor.name,
    'error.message': error.message,
    'error.stack_trace': (error.stack || '').slice(0, 2000),
  });
  process.exit(1);
});
