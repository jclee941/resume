/**
 * DiagnosticsHandler - Runtime diagnostics for Cloudflare Workers bindings and features
 *
 * Provides endpoint to check all bindings are properly configured and accessible.
 */

import {
  checkD1,
  checkKv,
  checkQueue,
  checkWorkflow,
  checkAssets,
  checkSubtleDigest,
  checkRandomUUID,
  checkBuffer,
  checkProcess,
} from './diagnostics-probes.js';

/**
 * @typedef {{
 *   d1: Record<string, import('./diagnostics-probes.js').DiagnosticProbeResult>;
 *   kv: Record<string, import('./diagnostics-probes.js').DiagnosticProbeResult>;
 *   queue: Record<string, import('./diagnostics-probes.js').DiagnosticProbeResult>;
 *   workflows: Record<string, import('./diagnostics-probes.js').DiagnosticProbeResult>;
 *   assets: Record<string, import('./diagnostics-probes.js').DiagnosticProbeResult>;
 *   crypto: Record<string, import('./diagnostics-probes.js').DiagnosticProbeResult>;
 *   nodejs_compat: Record<string, import('./diagnostics-probes.js').DiagnosticProbeResult>;
 * }} DiagnosticChecks
 *
 * @typedef {{
 *   timestamp: string;
 *   totalChecks: number;
 *   passed: number;
 *   failed: number;
 *   missing: number;
 *   checks: DiagnosticChecks;
 * }} DiagnosticResult
 *
 * @typedef {{
 *   DB?: import('./diagnostics-probes.js').D1CheckBinding;
 *   SESSIONS?: import('./diagnostics-probes.js').KvCheckBinding;
 *   RATE_LIMIT_KV?: import('./diagnostics-probes.js').KvCheckBinding;
 *   NONCE_KV?: import('./diagnostics-probes.js').KvCheckBinding;
 *   CRAWL_TASKS?: import('./diagnostics-probes.js').QueueCheckBinding;
 *   ASSETS?: import('./diagnostics-probes.js').AssetsCheckBinding;
 *   JOB_CRAWLING_WORKFLOW?: import('./diagnostics-probes.js').WorkflowCheckBinding;
 *   APPLICATION_WORKFLOW?: import('./diagnostics-probes.js').WorkflowCheckBinding;
 *   RESUME_SYNC_WORKFLOW?: import('./diagnostics-probes.js').WorkflowCheckBinding;
 *   DAILY_REPORT_WORKFLOW?: import('./diagnostics-probes.js').WorkflowCheckBinding;
 *   HEALTH_CHECK_WORKFLOW?: import('./diagnostics-probes.js').WorkflowCheckBinding;
 *   BACKUP_WORKFLOW?: import('./diagnostics-probes.js').WorkflowCheckBinding;
 *   CLEANUP_WORKFLOW?: import('./diagnostics-probes.js').WorkflowCheckBinding;
 *   [key: string]: unknown;
 * }} DiagnosticsEnv
 */

export class DiagnosticsHandler {
  /**
   * @param {DiagnosticsEnv} env
   */
  constructor(env) {
    /** @type {DiagnosticsEnv} */
    this.env = env;
  }

  /**
   * @param {unknown} data
   * @param {number} [status]
   * @returns {Response}
   */
  jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  async checkBindings() {
    /** @type {DiagnosticResult} */
    const result = {
      timestamp: new Date().toISOString(),
      totalChecks: 0,
      passed: 0,
      failed: 0,
      missing: 0,
      checks: {
        d1: {},
        kv: {},
        queue: {},
        workflows: {},
        assets: {},
        crypto: {},
        nodejs_compat: {},
      },
    };

    // D1 Databases
    const d1Checks = ['DB'];
    for (const name of d1Checks) {
      const binding = /** @type {import('./diagnostics-probes.js').D1CheckBinding} */ (
        this.env[name]
      );
      result.checks.d1[name] = await checkD1(binding, name);
      result.totalChecks++;
      if (result.checks.d1[name].status === 'ok') result.passed++;
      else if (result.checks.d1[name].status === 'missing') result.missing++;
      else result.failed++;
    }

    // KV Namespaces
    const kvChecks = ['SESSIONS', 'RATE_LIMIT_KV', 'NONCE_KV'];
    for (const name of kvChecks) {
      const binding = /** @type {import('./diagnostics-probes.js').KvCheckBinding} */ (
        this.env[name]
      );
      result.checks.kv[name] = await checkKv(binding, name);
      result.totalChecks++;
      if (result.checks.kv[name].status === 'ok') result.passed++;
      else if (result.checks.kv[name].status === 'missing') result.missing++;
      else result.failed++;
    }

    // Queue
    const queueBinding = this.env.CRAWL_TASKS;
    result.checks.queue.CRAWL_TASKS = checkQueue(queueBinding);
    result.totalChecks++;
    if (result.checks.queue.CRAWL_TASKS.status === 'ok') result.passed++;
    else if (result.checks.queue.CRAWL_TASKS.status === 'missing') result.missing++;
    else result.failed++;

    // Workflows (existence check only)
    const workflowChecks = [
      'JOB_CRAWLING_WORKFLOW',
      'APPLICATION_WORKFLOW',
      'RESUME_SYNC_WORKFLOW',
      'DAILY_REPORT_WORKFLOW',
      'HEALTH_CHECK_WORKFLOW',
      'BACKUP_WORKFLOW',
      'CLEANUP_WORKFLOW',
    ];
    for (const name of workflowChecks) {
      const binding = /** @type {import('./diagnostics-probes.js').WorkflowCheckBinding} */ (
        this.env[name]
      );
      result.checks.workflows[name] = checkWorkflow(binding);
      result.totalChecks++;
      if (result.checks.workflows[name].status === 'ok') result.passed++;
      else if (result.checks.workflows[name].status === 'missing') result.missing++;
      else result.failed++;
    }

    // Assets
    const assetsBinding = this.env.ASSETS;
    result.checks.assets.ASSETS = checkAssets(assetsBinding);
    result.totalChecks++;
    if (result.checks.assets.ASSETS.status === 'ok') result.passed++;
    else if (result.checks.assets.ASSETS.status === 'missing') result.missing++;
    else result.failed++;

    // Web Crypto features
    result.checks.crypto.subtle_digest = await checkSubtleDigest();
    result.totalChecks++;
    if (result.checks.crypto.subtle_digest.status === 'ok') result.passed++;
    else result.failed++;

    result.checks.crypto.randomUUID = checkRandomUUID();
    result.totalChecks++;
    if (result.checks.crypto.randomUUID.status === 'ok') result.passed++;
    else result.failed++;

    // nodejs_compat features
    result.checks.nodejs_compat.Buffer = checkBuffer();
    result.totalChecks++;
    if (result.checks.nodejs_compat.Buffer.status === 'ok') result.passed++;
    else if (result.checks.nodejs_compat.Buffer.status === 'missing') result.missing++;
    else result.failed++;

    result.checks.nodejs_compat.process = checkProcess();
    result.totalChecks++;
    if (result.checks.nodejs_compat.process.status === 'ok') result.passed++;
    else if (result.checks.nodejs_compat.process.status === 'missing') result.missing++;
    else result.failed++;

    return this.jsonResponse(result);
  }
}
