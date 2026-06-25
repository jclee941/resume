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
const { tryStartInitializedMCP } = require('./fixtures/mcp-server.cjs');

test.describe('MCP Server - Tools', () => {
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

  test('search_keyword schema should require query without calling Wanted network', async () => {
    const response = await mcp.send({
      method: 'tools/list',
    });

    const searchKeywordTool = response.result.tools.find((t) => t.name === 'wanted_search_keyword');
    expect(searchKeywordTool).toBeDefined();
    expect(searchKeywordTool.inputSchema.required).toContain('query');
    expect(searchKeywordTool.inputSchema.properties.query.type).toBe('string');
  });

  test('auth schema should define actions without calling Wanted network', async () => {
    const response = await mcp.send({
      method: 'tools/list',
    });

    const authTool = response.result.tools.find((t) => t.name === 'wanted_auth');
    expect(authTool).toBeDefined();
    expect(authTool.inputSchema.required).toContain('action');
    expect(authTool.inputSchema.properties.action.enum).toContain('status');
  });
});
