export async function checkD1(binding, name) {
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

export async function checkKv(binding, name) {
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

export function checkQueue(binding) {
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

export function checkWorkflow(binding) {
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

export function checkAssets(binding) {
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

export async function checkSubtleDigest() {
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

export function checkRandomUUID() {
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

export function checkBuffer() {
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

export function checkProcess() {
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
