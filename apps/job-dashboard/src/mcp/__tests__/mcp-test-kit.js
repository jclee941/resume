import { Router } from '../../router.js';
import { AuthHandler } from '../../handlers/auth.js';
import { ApplicationsHandler } from '../../handlers/applications/index.js';
import { StatsHandler } from '../../handlers/stats.js';
import { WebhookHandler } from '../../handlers/webhooks.js';
import { AutoApplyHandler } from '../../handlers/auto-apply/handler.js';
import { DiagnosticsHandler } from '../../handlers/diagnostics.js';
import { ResumeMasterHandler } from '../../handlers/resume-master-handler.js';
import {
  registerApplicationsRoutes,
  registerAutomationRoutes,
  registerHealthRoutes,
  registerStatsRoutes,
  registerWorkflowRoutes,
  registerAdminRoutes,
} from '../../routes/index.js';
import { handleMcpRequest } from '../handler.js';

export const ADMIN_TOKEN = 'test-admin-token';
export const MCP_URL = 'https://resume.jclee.me/job/mcp';
const PROTOCOL_VERSION = '2026-07-28';

/**
 * D1 stub: records every statement; `route(sql, args, mode)` answers it.
 * @param {(sql: string, args: unknown[], mode: 'first' | 'all' | 'run') => unknown} route
 */
export function makeDb(route) {
  /** @type {Array<{ sql: string; args: unknown[] }>} */
  const statements = [];
  const db = {
    prepare(/** @type {string} */ sql) {
      const run = (/** @type {unknown[]} */ args) => ({
        first: async () => (statements.push({ sql, args }), route(sql, args, 'first') ?? null),
        all: async () => (
          statements.push({ sql, args }),
          { results: route(sql, args, 'all') ?? [] }
        ),
        run: async () => (
          statements.push({ sql, args }),
          route(sql, args, 'run') ?? { meta: { changes: 1 } }
        ),
      });
      return { ...run([]), bind: (/** @type {unknown[]} */ ...args) => run(args) };
    },
  };
  return { db, statements };
}

/** Workflow binding stub that records create() params. */
export function makeWorkflow(status = { status: 'running', output: null }) {
  /** @type {unknown[]} */
  const created = [];
  return {
    created,
    binding: {
      create: async (/** @type {{ params?: unknown }} */ options) => (
        created.push(options?.params),
        { id: 'wf-1' }
      ),
      get: async () => ({ status: async () => status }),
    },
  };
}

/** Real router with the dashboard's real handlers, composed like src/index.js. */
export function buildDeps(env) {
  const router = new Router();
  const auth = new AuthHandler(env);
  const routeCtx = {
    env,
    apps: new ApplicationsHandler(env.JOB_DB, auth),
    stats: new StatsHandler(env.JOB_DB),
    auth,
    webhooks: new WebhookHandler(env, auth),
    autoApply: new AutoApplyHandler(env),
    diagnostics: new DiagnosticsHandler(env),
    resumeMaster: new ResumeMasterHandler(env, auth),
    log: { error: async () => {} },
  };
  registerHealthRoutes(router, routeCtx);
  registerApplicationsRoutes(router, routeCtx);
  registerStatsRoutes(router, routeCtx);
  registerAutomationRoutes(router, routeCtx);
  registerWorkflowRoutes(router, routeCtx);
  registerAdminRoutes(router, routeCtx);
  return { router, log: routeCtx.log };
}

/** @param {Record<string, unknown>} env */
export function mcpClient(env) {
  const deps = buildDeps(env);
  const send = (/** @type {RequestInit & { headers?: Record<string, string> }} */ init = {}) =>
    handleMcpRequest(new Request(MCP_URL, init), env, deps);
  const authed = (/** @type {Record<string, string>} */ extra = {}) => ({
    host: 'resume.jclee.me',
    authorization: `Bearer ${ADMIN_TOKEN}`,
    ...extra,
  });
  const rpc = (
    /** @type {string} */ method,
    /** @type {Record<string, unknown>} */ params = {},
    /** @type {string | undefined} */ name
  ) =>
    send({
      method: 'POST',
      headers: authed({
        'content-type': 'application/json',
        accept: 'application/json, text/event-stream',
        'mcp-protocol-version': PROTOCOL_VERSION,
        'mcp-method': method,
        ...(name ? { 'mcp-name': name } : {}),
      }),
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method,
        params: {
          ...params,
          _meta: {
            'io.modelcontextprotocol/protocolVersion': PROTOCOL_VERSION,
            'io.modelcontextprotocol/clientCapabilities': {},
          },
        },
      }),
    });
  const callTool = async (
    /** @type {string} */ name,
    /** @type {Record<string, unknown>} */ args = {}
  ) => {
    const response = await rpc('tools/call', { name, arguments: args }, name);
    return { status: response.status, body: await response.json() };
  };
  return { send, authed, rpc, callTool };
}
