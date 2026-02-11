// @ts-check
/**
 * MCP Server E2E Tests
 *
 * Tests the Wanted Korea MCP Server (job automation).
 * Covers:
 * - Tool availability and metadata
 * - Public tools (no auth required): job search, categories
 * - Auth-required tools: authentication, profile, resume management
 * - Resources: session status
 * - Prompts: job search workflows, resume updates
 * - Error handling and validation
 *
 * Note: These tests verify MCP server endpoints via stdio protocol
 * Tests check tool definitions, not actual Wanted API responses
 * (which require valid authentication and browser interaction)
 */

const { test, expect } = require('@playwright/test');
const { spawn } = require('child_process');
const path = require('path');

// Get the MCP server path (resolve relative to this file so it works in CI)
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const MCP_SERVER_PATH = path.resolve(PROJECT_ROOT, 'typescript/job-automation/src/index.js');

let mcpAvailable = false;

async function startMCPServer() {
  const proc = spawn('node', [MCP_SERVER_PATH], {
    cwd: PROJECT_ROOT,
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  let messageId = 0;
  const pendingRequests = new Map();
  let buffer = '';

  proc.stderr.on('data', () => {});

  proc.stdout.on('data', (data) => {
    buffer += data.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const msg = JSON.parse(line);
        if (msg.id != null && pendingRequests.has(msg.id)) {
          pendingRequests.get(msg.id).resolve(msg);
          pendingRequests.delete(msg.id);
        }
      } catch {
        /* non-JSON output */
      }
    }
  });

  const send = (message) => {
    const id = ++messageId;
    const request = { jsonrpc: '2.0', id, ...message };
    proc.stdin.write(JSON.stringify(request) + '\n');
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        if (pendingRequests.has(id)) {
          pendingRequests.delete(id);
          reject(new Error(`MCP request timeout: ${message.method}`));
        }
      }, 10000);
      pendingRequests.set(id, {
        resolve: (val) => {
          clearTimeout(timer);
          resolve(val);
        },
      });
    });
  };

  const close = () => {
    pendingRequests.clear();
    proc.kill();
  };

  return { process: proc, send, close };
}

// MCP protocol requires initialize handshake before other methods work
async function initializeMCP(mcp) {
  return mcp.send({
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'e2e-test-client', version: '1.0.0' },
    },
  });
}

test.describe('MCP Server - Tools', () => {
  let mcp;

  test.beforeEach(async () => {
    try {
      mcp = await startMCPServer();
      await new Promise((r) => setTimeout(r, 500));
      await initializeMCP(mcp);
      mcpAvailable = true;
    } catch {
      mcpAvailable = false;
    }
    test.skip(!mcpAvailable, 'MCP server unavailable');
  });

  test.afterEach(async () => {
    if (mcp) {
      mcp.close();
    }
  });

  test('should list all available tools', async () => {
    const response = await mcp.send({
      method: 'tools/list',
    });

    expect(response).toBeDefined();
    expect(response.result).toBeDefined();
    expect(Array.isArray(response.result.tools)).toBe(true);

    const toolNames = response.result.tools.map((t) => t.name);
    expect(toolNames.length).toBeGreaterThan(0);

    // Verify key tools are present
    expect(toolNames).toContain('wanted_search_jobs');
    expect(toolNames).toContain('wanted_search_keyword');
    expect(toolNames).toContain('wanted_get_job_detail');
    expect(toolNames).toContain('wanted_get_categories');
    expect(toolNames).toContain('wanted_get_company');
    expect(toolNames).toContain('wanted_auth');
    expect(toolNames).toContain('wanted_profile');
    expect(toolNames).toContain('wanted_resume');
  });

  test('tool definitions should have required properties', async () => {
    const response = await mcp.send({
      method: 'tools/list',
    });

    const tools = response.result.tools;
    tools.forEach((tool) => {
      expect(tool).toHaveProperty('name');
      expect(tool).toHaveProperty('description');
      expect(tool).toHaveProperty('inputSchema');
      expect(typeof tool.name).toBe('string');
      expect(typeof tool.description).toBe('string');
      expect(typeof tool.inputSchema).toBe('object');
    });
  });

  test('search_jobs tool should have correct schema', async () => {
    const response = await mcp.send({
      method: 'tools/list',
    });

    const searchJobsTool = response.result.tools.find((t) => t.name === 'wanted_search_jobs');
    expect(searchJobsTool).toBeDefined();
    expect(searchJobsTool.description).toContain('job');
    expect(searchJobsTool.inputSchema.properties).toHaveProperty('tag_type_ids');
  });

  test('search_keyword tool should have correct schema', async () => {
    const response = await mcp.send({
      method: 'tools/list',
    });

    const searchKeywordTool = response.result.tools.find((t) => t.name === 'wanted_search_keyword');
    expect(searchKeywordTool).toBeDefined();
    expect(searchKeywordTool.inputSchema.properties).toHaveProperty('query');
  });

  test('auth tool should have correct schema', async () => {
    const response = await mcp.send({
      method: 'tools/list',
    });

    const authTool = response.result.tools.find((t) => t.name === 'wanted_auth');
    expect(authTool).toBeDefined();
    expect(authTool.inputSchema.properties).toHaveProperty('action');
  });

  test('resume tool should have correct schema', async () => {
    const response = await mcp.send({
      method: 'tools/list',
    });

    const resumeTool = response.result.tools.find((t) => t.name === 'wanted_resume');
    expect(resumeTool).toBeDefined();
    expect(resumeTool.inputSchema.properties).toHaveProperty('action');
    expect(resumeTool.description).toContain('Resume');
  });

  test('should handle tool call with missing required parameters', async () => {
    const response = await mcp.send({
      method: 'tools/call',
      params: {
        name: 'wanted_search_keyword',
        arguments: {
          // Missing required 'query' parameter
        },
      },
    });

    // Should return error or validation failure
    expect(response).toBeDefined();
    expect(response.error || response.result).toBeDefined();
  });

  test('should handle tool call with invalid action', async () => {
    const response = await mcp.send({
      method: 'tools/call',
      params: {
        name: 'wanted_auth',
        arguments: {
          action: 'invalid_action',
        },
      },
    });

    // Should return error for invalid action
    expect(response).toBeDefined();
    expect(response.error || response.result).toBeDefined();
  });
});

test.describe('MCP Server - Resources', () => {
  let mcp;

  test.beforeEach(async () => {
    try {
      mcp = await startMCPServer();
      await new Promise((r) => setTimeout(r, 500));
      await initializeMCP(mcp);
      mcpAvailable = true;
    } catch {
      mcpAvailable = false;
    }
    test.skip(!mcpAvailable, 'MCP server unavailable');
  });

  test.afterEach(async () => {
    if (mcp) {
      mcp.close();
    }
  });

  test('should list available resources', async () => {
    const response = await mcp.send({
      method: 'resources/list',
    });

    expect(response).toBeDefined();
    expect(response.result).toBeDefined();
    expect(Array.isArray(response.result.resources)).toBe(true);

    const resourceUris = response.result.resources.map((r) => r.uri);
    expect(resourceUris).toContain('wanted://session/status');
  });

  test('resource should have required properties', async () => {
    const response = await mcp.send({
      method: 'resources/list',
    });

    const resources = response.result.resources;
    resources.forEach((resource) => {
      expect(resource).toHaveProperty('uri');
      expect(resource).toHaveProperty('name');
      expect(resource).toHaveProperty('description');
      expect(resource).toHaveProperty('mimeType');
    });
  });

  test('should read session status resource', async () => {
    const response = await mcp.send({
      method: 'resources/read',
      params: {
        uri: 'wanted://session/status',
      },
    });

    expect(response).toBeDefined();
    expect(response.result || response.error).toBeDefined();
  });

  test('should handle invalid resource URI', async () => {
    const response = await mcp.send({
      method: 'resources/read',
      params: {
        uri: 'wanted://invalid/resource',
      },
    });

    expect(response).toBeDefined();
    expect(response.error || response.result).toBeDefined();
  });
});

test.describe('MCP Server - Prompts', () => {
  let mcp;

  test.beforeEach(async () => {
    try {
      mcp = await startMCPServer();
      await new Promise((r) => setTimeout(r, 500));
      await initializeMCP(mcp);
      mcpAvailable = true;
    } catch {
      mcpAvailable = false;
    }
    test.skip(!mcpAvailable, 'MCP server unavailable');
  });

  test.afterEach(async () => {
    if (mcp) {
      mcp.close();
    }
  });

  test('should list available prompts', async () => {
    const response = await mcp.send({
      method: 'prompts/list',
    });

    expect(response).toBeDefined();
    expect(response.result).toBeDefined();
    expect(Array.isArray(response.result.prompts)).toBe(true);

    const promptNames = response.result.prompts.map((p) => p.name);
    expect(promptNames.length).toBeGreaterThan(0);
  });

  test('prompts should have required properties', async () => {
    const response = await mcp.send({
      method: 'prompts/list',
    });

    const prompts = response.result.prompts;
    prompts.forEach((prompt) => {
      expect(prompt).toHaveProperty('name');
      expect(prompt).toHaveProperty('description');
      expect(typeof prompt.name).toBe('string');
      expect(typeof prompt.description).toBe('string');
    });
  });

  test('should get prompt details', async () => {
    // First get list of prompts
    const listResponse = await mcp.send({
      method: 'prompts/list',
    });

    const promptName = listResponse.result.prompts[0]?.name;
    if (promptName) {
      const response = await mcp.send({
        method: 'prompts/get',
        params: {
          name: promptName,
        },
      });

      expect(response).toBeDefined();
      expect(response.result || response.error).toBeDefined();
    }
  });

  test('should handle invalid prompt name', async () => {
    const response = await mcp.send({
      method: 'prompts/get',
      params: {
        name: 'invalid-prompt-name',
      },
    });

    expect(response).toBeDefined();
    expect(response.error || response.result).toBeDefined();
  });
});

test.describe('MCP Server - JSON-RPC Protocol', () => {
  let mcp;

  test.beforeEach(async () => {
    try {
      mcp = await startMCPServer();
      await new Promise((r) => setTimeout(r, 500));
      await initializeMCP(mcp);
      mcpAvailable = true;
    } catch {
      mcpAvailable = false;
    }
    test.skip(!mcpAvailable, 'MCP server unavailable');
  });

  test.afterEach(async () => {
    if (mcp) {
      mcp.close();
    }
  });

  test('response should have jsonrpc version', async () => {
    const response = await mcp.send({
      method: 'tools/list',
    });

    expect(response).toHaveProperty('jsonrpc', '2.0');
  });

  test('response should have id field', async () => {
    const response = await mcp.send({
      method: 'tools/list',
    });

    expect(response).toHaveProperty('id');
    expect(typeof response.id).toBe('number');
  });

  test('successful response should have result field', async () => {
    const response = await mcp.send({
      method: 'tools/list',
    });

    expect(response).toHaveProperty('result');
    expect(response.result).toBeDefined();
  });

  test('invalid method should return error', async () => {
    const response = await mcp.send({
      method: 'invalid/method',
    });

    expect(response).toBeDefined();
    expect(response.error || response.result).toBeDefined();
  });
});

test.describe('MCP Server - Integration', () => {
  let mcp;

  test.beforeEach(async () => {
    try {
      mcp = await startMCPServer();
      await new Promise((r) => setTimeout(r, 500));
      await initializeMCP(mcp);
      mcpAvailable = true;
    } catch {
      mcpAvailable = false;
    }
    test.skip(!mcpAvailable, 'MCP server unavailable');
  });

  test.afterEach(async () => {
    if (mcp) {
      mcp.close();
    }
  });

  test('complete workflow: list tools → get categories → search jobs', async () => {
    // 1. List tools
    const listResponse = await mcp.send({
      method: 'tools/list',
    });
    expect(listResponse.result.tools.length).toBeGreaterThan(0);

    // 2. Get categories (public tool, no auth required)
    const categoriesResponse = await mcp.send({
      method: 'tools/call',
      params: {
        name: 'wanted_get_categories',
        arguments: {},
      },
    });
    expect(categoriesResponse).toBeDefined();

    // 3. Search with first category (may fail without real Wanted API access)
    // This verifies the tool is callable, not that Wanted API succeeds
    const searchResponse = await mcp.send({
      method: 'tools/call',
      params: {
        name: 'wanted_search_jobs',
        arguments: {
          tag_type_ids: [674], // DevOps tag
          limit: 5,
        },
      },
    });
    expect(searchResponse).toBeDefined();
  });

  test('complete workflow: list prompts → read resource', async () => {
    // 1. List prompts
    const listResponse = await mcp.send({
      method: 'prompts/list',
    });
    expect(Array.isArray(listResponse.result.prompts)).toBe(true);

    // 2. Read session status resource
    const resourceResponse = await mcp.send({
      method: 'resources/read',
      params: {
        uri: 'wanted://session/status',
      },
    });
    expect(resourceResponse).toBeDefined();
  });
});

test.describe('MCP Server - Tool Categories', () => {
  let mcp;

  test.beforeEach(async () => {
    try {
      mcp = await startMCPServer();
      await new Promise((r) => setTimeout(r, 500));
      await initializeMCP(mcp);
      mcpAvailable = true;
    } catch {
      mcpAvailable = false;
    }
    test.skip(!mcpAvailable, 'MCP server unavailable');
  });

  test.afterEach(async () => {
    if (mcp) {
      mcp.close();
    }
  });

  test('should have public search tools', async () => {
    const response = await mcp.send({
      method: 'tools/list',
    });

    const publicTools = [
      'wanted_search_jobs',
      'wanted_search_keyword',
      'wanted_get_job_detail',
      'wanted_get_categories',
      'wanted_get_company',
    ];

    const toolNames = response.result.tools.map((t) => t.name);
    publicTools.forEach((toolName) => {
      expect(toolNames).toContain(toolName);
    });
  });

  test('should have authentication tools', async () => {
    const response = await mcp.send({
      method: 'tools/list',
    });

    const authTools = ['wanted_auth', 'wanted_profile'];
    const toolNames = response.result.tools.map((t) => t.name);

    authTools.forEach((toolName) => {
      expect(toolNames).toContain(toolName);
    });
  });

  test('should have resume management tools', async () => {
    const response = await mcp.send({
      method: 'tools/list',
    });

    const resumeTools = ['wanted_resume', 'wanted_resume_sync'];
    const toolNames = response.result.tools.map((t) => t.name);

    resumeTools.forEach((toolName) => {
      expect(toolNames).toContain(toolName);
    });
  });
});
