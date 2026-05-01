const HEALTH_CHECK_USER_AGENT = 'HealthCheckWorkflow/1.0';
const HTTP_TIMEOUT_MS = 25000;
const KV_TEST_KEY = '_health_check';
const KV_TEST_TTL_SECONDS = 60;

export async function checkServices(services) {
  return Promise.all(services.map(checkService));
}

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
      error: error.message,
    };
  }
}

export async function checkBindings(env) {
  const checks = {};

  checks.d1 = await checkD1(env);
  checks.kv = await checkKV(env);

  return checks;
}

async function checkD1(env) {
  const start = Date.now();

  try {
    await env.JOB_DB.prepare('SELECT 1 AS ok').first();
    return { healthy: true, latencyMs: Date.now() - start };
  } catch (error) {
    return { healthy: false, latencyMs: Date.now() - start, error: error.message };
  }
}

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
    return { healthy: false, latencyMs: Date.now() - start, error: error.message };
  }
}
