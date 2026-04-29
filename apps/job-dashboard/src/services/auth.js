const ADMIN_ROUTES = [
  '/api/applications',
  '/api/automation',
  '/api/auth',
  '/api/config',
  '/api/cleanup',
  '/api/resume',
  '/api/workflows',
  '/api/stats',
  '/api/report',
];

const NO_AUTH_ROUTES = [
  '/api/auth/sync',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/profile',
];

const WEBHOOK_ROUTES = [];

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
export async function verifyAdminAuth(request, env) {
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

  // First try short-lived HMAC session token (preferred path).
  const sessionResult = await verifySessionToken(token, env);
  if (sessionResult.ok) {
    return { ok: true, mode: 'session', exp: sessionResult.exp };
  }

  // Fall back to legacy long-lived ADMIN_TOKEN bearer for backward compat.
  if (!verifySecret(token, env.ADMIN_TOKEN)) {
    return { ok: false, status: 401, error: 'Unauthorized' };
  }

  return { ok: true };
}

// HMAC session tokens (P1-5 fix from MONOREPO_REVIEW_2026-04-29.md).
//
// Format: `${expiryMs}.${randomHex}.${hmacHex}` where the HMAC covers
// `${expiryMs}.${randomHex}` keyed by env.ADMIN_TOKEN. Tokens expire after
// `SESSION_MAX_AGE_MS` (4 hours by default) and bind their own expiry.
// Verifying does NOT require KV — the token is self-describing.
//
// Migration path: when issuing a new admin login, callers should prefer
// `mintSessionToken(env)` over storing the raw ADMIN_TOKEN in a cookie.
// Existing long-lived bearer tokens still verify until ADMIN_TOKEN is rotated.
const SESSION_MAX_AGE_MS = 4 * 60 * 60 * 1000;

async function hmacHex(key, message) {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Create a short-lived HMAC-signed session token. */
export async function mintSessionToken(env, ttlMs = SESSION_MAX_AGE_MS) {
  if (!env?.ADMIN_TOKEN) {
    throw new Error('ADMIN_TOKEN not configured');
  }
  const exp = Date.now() + ttlMs;
  const nonce = Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  const payload = `${exp}.${nonce}`;
  const sig = await hmacHex(env.ADMIN_TOKEN, payload);
  return `${payload}.${sig}`;
}

/**
 * Verify an HMAC session token. Returns `{ ok: true, exp }` on success,
 * `{ ok: false }` on shape mismatch / signature mismatch / expiry.
 */
export async function verifySessionToken(token, env) {
  if (!token || typeof token !== 'string' || !env?.ADMIN_TOKEN) {
    return { ok: false };
  }
  const parts = token.split('.');
  if (parts.length !== 3) return { ok: false };
  const [expStr, nonce, providedSig] = parts;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp <= Date.now()) return { ok: false };
  const expectedSig = await hmacHex(env.ADMIN_TOKEN, `${expStr}.${nonce}`);
  if (!constantTimeCompare(providedSig, expectedSig)) return { ok: false };
  return { ok: true, exp };
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
