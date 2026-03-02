const ADMIN_ROUTES = [
  '/api/applications',
  '/api/automation',
  '/api/auth',
  '/api/config',
  '/api/cleanup',
  '/api/workflows',

  '/api/slack/notify',
  '/api/stats',
  '/api/report',
];

const NO_AUTH_ROUTES = [
  '/api/auth/sync',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/profile',
];

const WEBHOOK_ROUTES = ['/api/slack/interactions'];

export function requiresAuth(pathname) {
  if (NO_AUTH_ROUTES.some((route) => pathname === route)) {
    return false;
  }
  return ADMIN_ROUTES.some((route) => pathname.startsWith(route));
}

export function requiresWebhookSignature(pathname) {
  return WEBHOOK_ROUTES.some((route) => pathname.startsWith(route));
}

export function constantTimeCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false;
  }
  if (a.length !== b.length) {
    return false;
  }
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export function verifySecret(provided, expected) {
  if (!provided || !expected) {
    return false;
  }
  return constantTimeCompare(provided, expected);
}

/**
 * Extract admin token from HttpOnly cookie
 */
function getTokenFromCookie(request) {
  const cookieHeader = request.headers.get('Cookie');
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(';').map((c) => c.trim());
  for (const cookie of cookies) {
    const [name, ...valueParts] = cookie.split('=');
    if (name === 'adminToken') {
      return valueParts.join('='); // Handle tokens with '=' in them
    }
  }
  return null;
}

/**
 * Verify admin authentication via:
 * 1. HttpOnly cookie (preferred, XSS-safe)
 * 2. Authorization Bearer header (fallback for API clients)
 */
export function verifyAdminAuth(request, env) {
  if (!env?.ADMIN_TOKEN) {
    return { ok: false, status: 503, error: 'Service misconfigured' };
  }

  // Try HttpOnly cookie first (browser requests)
  let token = getTokenFromCookie(request);

  // Fall back to Authorization header (API clients, legacy)
  if (!token) {
    const authHeader = request.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.slice(7);
    }
  }

  if (!token) {
    return { ok: false, status: 401, error: 'Unauthorized' };
  }

  if (!verifySecret(token, env.ADMIN_TOKEN)) {
    return { ok: false, status: 401, error: 'Unauthorized' };
  }

  return { ok: true };
}

/**
 * Create Set-Cookie header for admin authentication
 * HttpOnly + Secure + SameSite=Strict for XSS protection
 */
export function createAuthCookie(token, maxAge = 86400) {
  const secure = 'Secure'; // Always use Secure for production
  return `adminToken=${token}; HttpOnly; ${secure}; SameSite=Strict; Path=/; Max-Age=${maxAge}`;
}

/**
 * Create cookie to clear admin authentication
 */
export function clearAuthCookie() {
  return 'adminToken=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0';
}

export async function verifyWebhookSignature(request, env) {
  if (!env?.WEBHOOK_SECRET) {
    return { ok: false, status: 503, error: 'Webhook not configured' };
  }

  const signature = request.headers.get('X-Webhook-Signature');
  if (!signature) {
    return { ok: false, status: 403, error: 'Missing signature' };
  }

  const parts = {};
  for (const part of signature.split(',')) {
    const trimmed = part.trim();
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) {
      return { ok: false, status: 403, error: 'Malformed signature part' };
    }
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    if (!key || !value) {
      return {
        ok: false,
        status: 403,
        error: 'Empty key or value in signature',
      };
    }
    parts[key] = value;
  }

  if (!parts.t || !parts.v1) {
    return { ok: false, status: 403, error: 'Invalid signature format' };
  }

  const timestamp = parseInt(parts.t, 10);
  const now = Math.floor(Date.now() / 1000);

  if (Math.abs(now - timestamp) > 300) {
    return { ok: false, status: 403, error: 'Signature expired' };
  }

  const body = await request.clone().text();
  const signedPayload = `${parts.t}.${body}`;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(env.WEBHOOK_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(signedPayload));
  const expectedHmac = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  if (parts.v1.length !== expectedHmac.length) {
    return { ok: false, status: 403, error: 'Invalid signature' };
  }

  let mismatch = 0;
  for (let i = 0; i < expectedHmac.length; i++) {
    mismatch |= parts.v1.charCodeAt(i) ^ expectedHmac.charCodeAt(i);
  }

  if (mismatch !== 0) {
    return { ok: false, status: 403, error: 'Invalid signature' };
  }

  const nonceKey = `webhook:nonce:${parts.t}:${parts.v1.slice(0, 16)}`;
  if (env.NONCE_KV) {
    const existing = await env.NONCE_KV.get(nonceKey);
    if (existing) {
      return { ok: false, status: 403, error: 'Replay detected' };
    }
    await env.NONCE_KV.put(nonceKey, '1', { expirationTtl: 600 });
  }

  return { ok: true };
}
