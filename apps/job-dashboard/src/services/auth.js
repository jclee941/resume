import {
  ADMIN_SESSION_TTL_MS,
  clearSessionCookie,
  createSessionCookie,
  getCookie,
} from '@resume/shared/session';

const ADMIN_ROUTES = [
  '/api/applications',
  '/api/automation',
  '/api/auto-apply',
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
const ADMIN_SESSION_COOKIE = 'adminToken';
const BEARER_PREFIX = 'Bearer ';

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

export function getLegacyBearerToken(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith(BEARER_PREFIX)) {
    return null;
  }
  return authHeader.slice(BEARER_PREFIX.length);
}

/**
 * Extract admin session token from HttpOnly cookie.
 */
export function getSessionTokenFromCookie(request) {
  return getCookie(request, ADMIN_SESSION_COOKIE);
}

/**
 * @deprecated Prefer `getSessionTokenFromCookie(request)`. This alias remains
 * for older dashboard integrations while callers migrate to the explicit
 * session-token naming.
 */
export const getTokenFromCookie = getSessionTokenFromCookie;

export async function verifyAdminAuth(request, env) {
  if (!env?.ADMIN_TOKEN) {
    return { ok: false, status: 503, error: 'Service misconfigured' };
  }

  let token = getSessionTokenFromCookie(request);

  if (!token) {
    token = getLegacyBearerToken(request);
  }

  if (!token) {
    return { ok: false, status: 401, error: 'Unauthorized' };
  }

  const sessionResult = await verifySessionToken(token, env);
  if (sessionResult.ok) {
    return { ok: true, mode: 'session', exp: sessionResult.exp };
  }

  if (!verifySecret(token, env.ADMIN_TOKEN)) {
    return { ok: false, status: 401, error: 'Unauthorized' };
  }

  return { ok: true, mode: 'legacy-admin-token', deprecated: true };
}

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
export async function mintSessionToken(env, ttlMs = ADMIN_SESSION_TTL_MS) {
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
 * Create Set-Cookie header for admin session-token authentication.
 * HttpOnly + Secure + SameSite=Strict for XSS protection
 */
export function createAuthCookie(token, maxAge = 86400) {
  return createSessionCookie(ADMIN_SESSION_COOKIE, token, { maxAge });
}

/**
 * Create cookie to clear admin authentication
 */
export function clearAuthCookie() {
  return clearSessionCookie(ADMIN_SESSION_COOKIE);
}

export { verifyWebhookSignature } from './auth-webhook-signature.js';
