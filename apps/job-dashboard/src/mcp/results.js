/**
 * MCP tool result shapes. Every result carries `structuredContent` plus the
 * same JSON as a text block, so clients that only read `content` still work.
 *
 * @typedef {import('@modelcontextprotocol/server').CallToolResult} ToolResult
 */

/**
 * `structuredContent` must be an object; wrap arrays and scalars.
 * @param {unknown} data
 * @returns {Record<string, unknown>}
 */
function asRecord(data) {
  if (data !== null && typeof data === 'object' && !Array.isArray(data)) {
    return /** @type {Record<string, unknown>} */ (data);
  }
  return { result: data ?? null };
}

/**
 * @param {unknown} data
 * @param {boolean} [isError]
 * @returns {ToolResult}
 */
export function toolResult(data, isError = false) {
  const structuredContent = asRecord(data);
  /** @type {ToolResult} */
  const result = {
    content: [{ type: 'text', text: JSON.stringify(structuredContent) }],
    structuredContent,
  };
  return isError ? { ...result, isError: true } : result;
}

/**
 * @param {string} message
 * @param {unknown} [details]
 * @returns {ToolResult}
 */
export function toolError(message, details) {
  return toolResult(details === undefined ? { error: message } : { error: message, details }, true);
}
