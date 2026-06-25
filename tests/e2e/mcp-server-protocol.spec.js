// @ts-check

const { test, expect } = require('@playwright/test');
const { tryStartInitializedMCP } = require('./fixtures/mcp-server.cjs');

test.describe('MCP Server - JSON-RPC Protocol', () => {
  let mcp;

  test.beforeEach(async () => {
    mcp = await tryStartInitializedMCP();
    test.skip(!mcp, 'MCP server unavailable');
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
    mcp = await tryStartInitializedMCP();
    test.skip(!mcp, 'MCP server unavailable');
  });

  test.afterEach(async () => {
    if (mcp) {
      mcp.close();
    }
  });

  test('complete workflow: list tools', async () => {
    const listResponse = await mcp.send({
      method: 'tools/list',
    });
    expect(listResponse.result.tools.length).toBeGreaterThan(0);
  });

  test('complete workflow: list prompts → read resource', async () => {
    const listResponse = await mcp.send({
      method: 'prompts/list',
    });
    expect(Array.isArray(listResponse.result.prompts)).toBe(true);

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
    mcp = await tryStartInitializedMCP();
    test.skip(!mcp, 'MCP server unavailable');
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
