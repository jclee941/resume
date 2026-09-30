/**
 * Calls the dashboard's own route table with an internal Request, so every MCP
 * tool runs the same handler (and the same safety gates) as its REST endpoint.
 * The request never leaves the Worker and skips the HTTP-edge gates (CORS,
 * CSRF) because the MCP guard has already authenticated the caller.
 */

const INTERNAL_ORIGIN = 'https://mcp.internal';

/**
 * @typedef {{ ok: boolean; status: number; data: unknown }} ApiResult
 *
 * @typedef {{
 *   call(
 *     method: string,
 *     path: string,
 *     options?: { query?: Record<string, string | number | undefined>; body?: unknown }
 *   ): Promise<ApiResult>;
 * }} InternalApi
 */

/**
 * @param {string} text
 * @returns {unknown}
 */
function parseBody(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

/**
 * @param {{
 *   router: Pick<import('../router.js').Router, 'handle'>;
 *   log?: Parameters<import('../router.js').Router['handle']>[2];
 * }} deps
 * @returns {InternalApi}
 */
export function createInternalApi({ router, log }) {
  return {
    async call(method, path, { query = {}, body } = {}) {
      const url = new URL(path, INTERNAL_ORIGIN);
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined) url.searchParams.set(key, String(value));
      }
      /** @type {RequestInit} */
      const init = { method, headers: { 'content-type': 'application/json' } };
      if (body !== undefined) init.body = JSON.stringify(body);
      const response = await router.handle(new Request(url, init), url, log);
      if (!response) return { ok: false, status: 404, data: { error: 'Not found' } };
      return { ok: response.ok, status: response.status, data: parseBody(await response.text()) };
    },
  };
}
