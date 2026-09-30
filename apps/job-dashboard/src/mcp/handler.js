import { createMcpHandler } from '@modelcontextprotocol/server';
import { guardMcpRequest } from './guard.js';
import { createInternalApi } from './internal-api.js';
import { createJobMcpServer } from './server.js';

/**
 * Serves `POST /job/mcp` (path `/mcp` after the dashboard prefix strip): a
 * stateless Streamable HTTP MCP endpoint (no tool emits mid-call messages, so
 * modern requests are answered with one JSON body). The caller has already applied rate
 * limiting; this guards, then hands the request to the SDK handler.
 *
 * @param {Request} request
 * @param {Parameters<typeof guardMcpRequest>[1] & Parameters<typeof createJobMcpServer>[1]} env
 * @param {{
 *   router: Parameters<typeof createInternalApi>[0]['router'];
 *   log: Parameters<typeof createInternalApi>[0]['log'] & { error(message: string, error: unknown): unknown };
 * }} deps
 * @returns {Promise<Response>}
 */
export async function handleMcpRequest(request, env, { router, log }) {
  const guarded = await guardMcpRequest(request, env);
  if (guarded.response) return guarded.response;

  const api = createInternalApi({ router, log });
  const handler = createMcpHandler(() => createJobMcpServer(api, env));
  try {
    return await handler.fetch(request, { authInfo: guarded.authInfo });
  } catch (error) {
    await log.error('MCP request failed', error);
    return Response.json(
      { jsonrpc: '2.0', id: null, error: { code: -32603, message: 'Internal error' } },
      { status: 500 }
    );
  }
}
