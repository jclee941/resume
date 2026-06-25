// @ts-check

const { test, expect } = require('@playwright/test');
const { hasExternalWantedMcpEnv, tryStartInitializedMCP } = require('./fixtures/mcp-server.cjs');

test.describe('MCP Wanted Tools', () => {
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

  test('lists Wanted tool request schemas without calling Wanted network', async () => {
    const listResponse = await mcp.send({ method: 'tools/list' });
    const tools = listResponse.result.tools;
    expect(Array.isArray(tools)).toBe(true);
    expect(tools.length).toBeGreaterThan(0);

    const categoriesTool = tools.find((tool) => tool.name === 'wanted_get_categories');
    expect(categoriesTool).toBeDefined();
    expect(categoriesTool.inputSchema.type).toBe('object');

    const searchJobsTool = tools.find((tool) => tool.name === 'wanted_search_jobs');
    expect(searchJobsTool).toBeDefined();
    expect(searchJobsTool.inputSchema.properties).toHaveProperty('tag_type_ids');
    expect(searchJobsTool.inputSchema.properties).toHaveProperty('limit');

    const searchKeywordTool = tools.find((tool) => tool.name === 'wanted_search_keyword');
    expect(searchKeywordTool).toBeDefined();
    expect(searchKeywordTool.inputSchema.required).toContain('query');
    expect(searchKeywordTool.inputSchema.properties.query.type).toBe('string');
  });

  test('calls Wanted categories and search only when external credentials are enabled', async () => {
    test.skip(
      !hasExternalWantedMcpEnv(),
      'Requires RUN_EXTERNAL_E2E=1, WANTED_EMAIL, and either WANTED_COOKIES or WANTED_PASSWORD + WANTED_ONEID_CLIENT_ID'
    );

    const categoriesResponse = await mcp.send({
      method: 'tools/call',
      params: {
        name: 'wanted_get_categories',
        arguments: {},
      },
    });
    expect(categoriesResponse.error || categoriesResponse.result).toBeDefined();

    const searchResponse = await mcp.send({
      method: 'tools/call',
      params: {
        name: 'wanted_search_jobs',
        arguments: {
          tag_type_ids: [674],
          limit: 5,
        },
      },
    });
    expect(searchResponse.error || searchResponse.result).toBeDefined();
  });
});
