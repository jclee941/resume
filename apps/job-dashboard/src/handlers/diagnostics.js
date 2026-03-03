/**
 * DiagnosticsHandler - Runtime diagnostics for Cloudflare Workers bindings and features
 *
 * Provides endpoint to check all bindings are properly configured and accessible.
 */

export class DiagnosticsHandler {
  constructor(env) {
    this.env = env;
  }

  jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  async checkBindings() {
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
    const d1Checks = ['DB', 'JOB_DB'];
    for (const name of d1Checks) {
      const binding = this.env[name];
      result.checks.d1[name] = await this.checkD1(binding, name);
      result.totalChecks++;
      if (result.checks.d1[name].status === 'ok') result.passed++;
      else if (result.checks.d1[name].status === 'missing') result.missing++;
      else result.failed++;
    }

    // KV Namespaces
    const kvChecks = ['SESSIONS', 'RATE_LIMIT_KV', 'NONCE_KV'];
    for (const name of kvChecks) {
      const binding = this.env[name];
      result.checks.kv[name] = await this.checkKv(binding, name);
      result.totalChecks++;
      if (result.checks.kv[name].status === 'ok') result.passed++;
      else if (result.checks.kv[name].status === 'missing') result.missing++;
      else result.failed++;
    }

    // Queue
    const queueBinding = this.env.CRAWL_TASKS;
    result.checks.queue.CRAWL_TASKS = this.checkQueue(queueBinding);
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
      const binding = this.env[name];
      result.checks.workflows[name] = this.checkWorkflow(binding);
      result.totalChecks++;
      if (result.checks.workflows[name].status === 'ok') result.passed++;
      else if (result.checks.workflows[name].status === 'missing') result.missing++;
      else result.failed++;
    }

    // Assets
    const assetsBinding = this.env.ASSETS;
    result.checks.assets.ASSETS = this.checkAssets(assetsBinding);
    result.totalChecks++;
    if (result.checks.assets.ASSETS.status === 'ok') result.passed++;
    else if (result.checks.assets.ASSETS.status === 'missing') result.missing++;
    else result.failed++;

    // Web Crypto features
    result.checks.crypto.subtle_digest = await this.checkSubtleDigest();
    result.totalChecks++;
    if (result.checks.crypto.subtle_digest.status === 'ok') result.passed++;
    else result.failed++;

    result.checks.crypto.randomUUID = this.checkRandomUUID();
    result.totalChecks++;
    if (result.checks.crypto.randomUUID.status === 'ok') result.passed++;
    else result.failed++;

    // nodejs_compat features
    result.checks.nodejs_compat.Buffer = this.checkBuffer();
    result.totalChecks++;
    if (result.checks.nodejs_compat.Buffer.status === 'ok') result.passed++;
    else if (result.checks.nodejs_compat.Buffer.status === 'missing') result.missing++;
    else result.failed++;

    result.checks.nodejs_compat.process = this.checkProcess();
    result.totalChecks++;
    if (result.checks.nodejs_compat.process.status === 'ok') result.passed++;
    else if (result.checks.nodejs_compat.process.status === 'missing') result.missing++;
    else result.failed++;

    return this.jsonResponse(result);
  }

  async checkD1(binding, name) {
    const start = performance.now();
    try {
      if (!binding) {
        return { status: 'missing', detail: `${name} binding not configured` };
      }
      await binding.prepare('SELECT 1 AS ok').first();
      return { status: 'ok', latencyMs: Math.round((performance.now() - start) * 10) / 10 };
    } catch (err) {
      return {
        status: 'error',
        detail: err.message,
        latencyMs: Math.round((performance.now() - start) * 10) / 10,
      };
    }
  }

  async checkKv(binding, name) {
    const start = performance.now();
    try {
      if (!binding) {
        return { status: 'missing', detail: `${name} binding not configured` };
      }
      const testKey = '_diag_test';
      await binding.put(testKey, 'ok', { expirationTtl: 60 });
      const value = await binding.get(testKey);
      await binding.delete(testKey);
      if (value !== 'ok') {
        return {
          status: 'error',
          detail: 'KV read/write verification failed',
          latencyMs: Math.round((performance.now() - start) * 10) / 10,
        };
      }
      return { status: 'ok', latencyMs: Math.round((performance.now() - start) * 10) / 10 };
    } catch (err) {
      return {
        status: 'error',
        detail: err.message,
        latencyMs: Math.round((performance.now() - start) * 10) / 10,
      };
    }
  }

  checkQueue(binding) {
    try {
      if (!binding) {
        return { status: 'missing', detail: 'CRAWL_TASKS binding not configured' };
      }
      if (typeof binding.send !== 'function') {
        return { status: 'error', detail: 'Queue binding missing send method' };
      }
      return { status: 'ok', detail: 'binding present' };
    } catch (err) {
      return { status: 'error', detail: err.message };
    }
  }

  checkWorkflow(binding) {
    try {
      if (!binding) {
        return { status: 'missing', detail: 'Workflow binding not configured' };
      }
      if (typeof binding.create !== 'function') {
        return { status: 'error', detail: 'Workflow binding missing create method' };
      }
      return { status: 'ok' };
    } catch (err) {
      return { status: 'error', detail: err.message };
    }
  }

  checkAssets(binding) {
    try {
      if (!binding) {
        return { status: 'missing', detail: 'ASSETS binding not configured' };
      }
      if (typeof binding.get !== 'function') {
        return { status: 'error', detail: 'Assets binding missing get method' };
      }
      return { status: 'ok' };
    } catch (err) {
      return { status: 'error', detail: err.message };
    }
  }

  async checkSubtleDigest() {
    const start = performance.now();
    try {
      if (!crypto || !crypto.subtle) {
        return { status: 'error', detail: 'crypto.subtle not available' };
      }
      const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('diagnostic'));
      if (!(hash instanceof ArrayBuffer)) {
        return { status: 'error', detail: 'crypto.subtle.digest did not return ArrayBuffer' };
      }
      return { status: 'ok', latencyMs: Math.round((performance.now() - start) * 10) / 10 };
    } catch (err) {
      return {
        status: 'error',
        detail: err.message,
        latencyMs: Math.round((performance.now() - start) * 10) / 10,
      };
    }
  }

  checkRandomUUID() {
    try {
      if (!crypto || typeof crypto.randomUUID !== 'function') {
        return { status: 'error', detail: 'crypto.randomUUID not available' };
      }
      const uuid = crypto.randomUUID();
      if (typeof uuid !== 'string' || uuid.length !== 36) {
        return { status: 'error', detail: 'crypto.randomUUID did not return valid UUID' };
      }
      return { status: 'ok' };
    } catch (err) {
      return { status: 'error', detail: err.message };
    }
  }

  checkBuffer() {
    try {
      if (typeof Buffer === 'undefined') {
        return {
          status: 'missing',
          detail: 'Buffer global not available (nodejs_compat not enabled)',
        };
      }
      const encoded = Buffer.from('diagnostic').toString('base64');
      if (encoded !== 'ZGlhZ25vc3RpYw==') {
        return { status: 'error', detail: 'Buffer encoding verification failed' };
      }
      return { status: 'ok' };
    } catch (err) {
      return { status: 'error', detail: err.message };
    }
  }

  checkProcess() {
    try {
      if (typeof process === 'undefined') {
        return { status: 'missing', detail: 'not available in Workers' };
      }
      const version = process.version || process.env.NODE_VERSION || 'unknown';
      return { status: 'ok', detail: `version: ${version}` };
    } catch (err) {
      return { status: 'error', detail: err.message };
    }
  }
}
