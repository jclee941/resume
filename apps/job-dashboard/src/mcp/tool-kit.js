import { toolError, toolResult } from './results.js';

/** Annotations for tools that only read state. */
export const READ_ONLY = Object.freeze({
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
});

/**
 * Annotations for tools that change state. `destructive` marks external side
 * effects (real submissions, platform writes, workflow runs) so clients ask first.
 * @param {{ destructive?: boolean; idempotent?: boolean; external?: boolean }} [options]
 */
export function writeHints({ destructive = false, idempotent = false, external = false } = {}) {
  return {
    readOnlyHint: false,
    destructiveHint: destructive,
    idempotentHint: idempotent,
    openWorldHint: external,
  };
}

/**
 * Registers one tool whose `run` returns the internal API result. Non-2xx
 * results and thrown errors become `isError` tool results, never protocol errors.
 *
 * @template {import('zod').ZodObject} Schema
 * @param {import('@modelcontextprotocol/server').McpServer} server
 * @param {{
 *   name: string;
 *   title: string;
 *   description: string;
 *   inputSchema: Schema;
 *   annotations: ReturnType<typeof writeHints>;
 *   run: (args: import('zod').infer<Schema>) => Promise<import('./internal-api.js').ApiResult>;
 * }} spec
 */
export function registerApiTool(server, spec) {
  const { name, title, description, inputSchema, annotations, run } = spec;
  // The SDK validates arguments against `inputSchema` before calling this, so `args` matches it.
  /** @type {(args: unknown) => Promise<import('./results.js').ToolResult>} */
  const callback = async (args) => {
    try {
      const result = await run(/** @type {import('zod').infer<Schema>} */ (args));
      if (!result.ok) return toolError(`${name} failed with HTTP ${result.status}`, result.data);
      return toolResult(result.data);
    } catch (error) {
      return toolError(`${name} failed`, error instanceof Error ? error.message : String(error));
    }
  };
  // Widen the generic schema so the SDK resolves its callback overload.
  const schema = /** @type {import('zod').ZodObject} */ (inputSchema);
  server.registerTool(name, { title, description, inputSchema: schema, annotations }, callback);
}
