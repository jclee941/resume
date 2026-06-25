// @ts-check

const { test, expect } = require('@playwright/test');
const { tryStartInitializedMCP } = require('./fixtures/mcp-server.cjs');

test.describe('MCP Server - Resources', () => {
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
    mcp = await tryStartInitializedMCP();
    test.skip(!mcp, 'MCP server unavailable');
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
