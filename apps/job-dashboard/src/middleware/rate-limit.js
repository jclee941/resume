const RATE_LIMIT_POLICIES = {
  auth: { limit: 10, windowSec: 60 },
  webhook: { limit: 20, windowSec: 60 },
  api: { limit: 80, windowSec: 60 },
  dashboard: { limit: 180, windowSec: 60 },
};

const STRIKE_TTL_SEC = 300;
const BLOCK_TTL_SEC = 60;

function getClientIp(request) {
  const cfIp = request.headers.get('cf-connecting-ip');
  if (cfIp) return cfIp;

  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();

  return 'unknown';
}

function getRateLimitPolicy(pathname) {
  if (pathname.startsWith('/api/auth')) return ['auth', RATE_LIMIT_POLICIES.auth];
  if (pathname.startsWith('/api/slack/interactions')) {
    return ['webhook', RATE_LIMIT_POLICIES.webhook];
  }
  if (pathname.startsWith('/api/')) return ['api', RATE_LIMIT_POLICIES.api];
  return ['dashboard', RATE_LIMIT_POLICIES.dashboard];
}

function normalizeEndpoint(pathname) {
  const normalized = pathname
    .replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, ':id')
    .replace(/\/\d+(?=\/|$)/g, '/:id');
  return normalized || '/';
}

function getHeaderSet(policy, remaining, resetAt) {
  return {
    'X-RateLimit-Limit': String(policy.limit),
    'X-RateLimit-Remaining': String(Math.max(remaining, 0)),
    'X-RateLimit-Reset': String(resetAt),
  };
}

export async function checkRateLimit(request, pathname, env) {
  if (!env?.RATE_LIMIT_KV) {
    return { ok: true };
  }

  const [policyName, policy] = getRateLimitPolicy(pathname);
  const endpoint = normalizeEndpoint(pathname);
  const ip = getClientIp(request);
  const baseKey = `ratelimit:v2:${policyName}:${ip}:${endpoint}`;

  try {
    const now = Math.floor(Date.now() / 1000);
    const blockKey = `${baseKey}:block`;
    const blockState = await env.RATE_LIMIT_KV.get(blockKey, { type: 'json' });

    if (blockState?.until && blockState.until > now) {
      const retryAfter = blockState.until - now;
      return {
        ok: false,
        status: 429,
        error: 'Too many requests - temporarily blocked',
        headers: {
          'Retry-After': String(retryAfter),
          ...getHeaderSet(policy, 0, blockState.until),
          'X-RateLimit-Blocked': 'true',
          'X-RateLimit-Violation': '3',
        },
      };
    }

    const windowStart = Math.floor(now / policy.windowSec) * policy.windowSec;
    const resetAt = windowStart + policy.windowSec;
    const windowKey = `${baseKey}:window:${windowStart}`;
    const current = await env.RATE_LIMIT_KV.get(windowKey, { type: 'json' });
    const count = current?.count || 0;

    if (count + 1 <= policy.limit) {
      await env.RATE_LIMIT_KV.put(windowKey, JSON.stringify({ count: count + 1 }), {
        expirationTtl: policy.windowSec + 5,
      });

      return {
        ok: true,
        headers: getHeaderSet(policy, policy.limit - count - 1, resetAt),
      };
    }

    const strikeKey = `${baseKey}:strikes`;
    const strikeState = await env.RATE_LIMIT_KV.get(strikeKey, { type: 'json' });
    const strikes = (strikeState?.count || 0) + 1;
    await env.RATE_LIMIT_KV.put(strikeKey, JSON.stringify({ count: strikes }), {
      expirationTtl: STRIKE_TTL_SEC,
    });

    if (strikes === 1) {
      return {
        ok: true,
        headers: {
          ...getHeaderSet(policy, 0, resetAt),
          'X-RateLimit-Warn': 'true',
          'X-RateLimit-Violation': '1',
        },
      };
    }

    if (strikes === 2) {
      return {
        ok: false,
        status: 429,
        error: 'Too many requests',
        headers: {
          'Retry-After': String(resetAt - now),
          ...getHeaderSet(policy, 0, resetAt),
          'X-RateLimit-Violation': '2',
        },
      };
    }

    const blockedUntil = now + BLOCK_TTL_SEC;
    await env.RATE_LIMIT_KV.put(blockKey, JSON.stringify({ until: blockedUntil }), {
      expirationTtl: BLOCK_TTL_SEC,
    });

    return {
      ok: false,
      status: 429,
      error: 'Too many requests - temporarily blocked',
      headers: {
        'Retry-After': String(BLOCK_TTL_SEC),
        ...getHeaderSet(policy, 0, blockedUntil),
        'X-RateLimit-Blocked': 'true',
        'X-RateLimit-Violation': '3',
      },
    };
  } catch (error) {
    console.error('Rate limit KV error:', error);
    return { ok: true };
  }
}

/**
 * Add rate limit headers to response
 * @param {Response} response
 * @param {Object} headers
 * @returns {Response}
 */
export function addRateLimitHeaders(response, headers) {
  if (!headers) return response;

  const newHeaders = new Headers(response.headers);
  for (const [key, value] of Object.entries(headers)) {
    newHeaders.set(key, value);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}
