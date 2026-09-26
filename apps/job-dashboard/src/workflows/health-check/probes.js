const HEALTH_CHECK_USER_AGENT = 'HealthCheckWorkflow/1.0';
const HTTP_TIMEOUT_MS = 25000;
const KV_TEST_KEY = 'jd:health:check';
const KV_TEST_TTL_SECONDS = 60;

/**
 * @param {string[]} services
 * @returns {Promise<Array<{ url: string, status: number, latencyMs: number, healthy: boolean, error?: string }>>}
 */
export async function checkServices(services) {
  return Promise.all(services.map(checkService));
}

/**
 * @param {string} url
 * @returns {Promise<{ url: string, status: number, latencyMs: number, healthy: boolean, error?: string }>}
 */
async function checkService(url) {
  const start = Date.now();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), HTTP_TIMEOUT_MS);

    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'User-Agent': HEALTH_CHECK_USER_AGENT,
      },
    });

    clearTimeout(timeoutId);

    return {
      url,
      status: response.status,
      latencyMs: Date.now() - start,
      healthy: response.status === 200,
    };
  } catch (error) {
    return {
      url,
      status: 0,
      latencyMs: Date.now() - start,
      healthy: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * @typedef {Object} D1HealthBinding
 * @property {(query: string) => { first: () => Promise<unknown> }} prepare
 */

/**
 * @typedef {Object} KVHealthBinding
 * @property {(key: string, value: string, options?: { expirationTtl?: number }) => Promise<void>} put
 * @property {(key: string) => Promise<string | null>} get
 */

/**
 * @typedef {Object} HealthCheckEnv
 * @property {D1HealthBinding} JOB_DB
 * @property {KVHealthBinding} SESSIONS
 */

/**
 * @typedef {Object} ProbeResult
 * @property {boolean} healthy
 * @property {number} latencyMs
 * @property {string} [error]
 */

/**
 * @param {HealthCheckEnv} env
 * @returns {Promise<{ d1: ProbeResult, kv: ProbeResult }>}
 */
export async function checkBindings(env) {
  const checks = {
    d1: await checkD1(env),
    kv: await checkKV(env),
  };

  return checks;
}

/**
 * @param {HealthCheckEnv} env
 * @returns {Promise<ProbeResult>}
 */
async function checkD1(env) {
  const start = Date.now();

  try {
    await env.JOB_DB.prepare('SELECT 1 AS ok').first();
    return { healthy: true, latencyMs: Date.now() - start };
  } catch (error) {
    return {
      healthy: false,
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * @param {HealthCheckEnv} env
 * @returns {Promise<ProbeResult>}
 */
async function checkKV(env) {
  const start = Date.now();

  try {
    const testValue = Date.now().toString();
    await env.SESSIONS.put(KV_TEST_KEY, testValue, { expirationTtl: KV_TEST_TTL_SECONDS });
    const readBack = await env.SESSIONS.get(KV_TEST_KEY);

    return {
      healthy: readBack === testValue,
      latencyMs: Date.now() - start,
      error: readBack !== testValue ? 'Read-back mismatch' : undefined,
    };
  } catch (error) {
    return {
      healthy: false,
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
