import {
  hostHeaderValidationResponse,
  originValidationResponse,
} from '@modelcontextprotocol/server';
import { verifySecret } from '../services/auth.js';

const BEARER_PREFIX = 'Bearer ';

/**
 * @typedef {import('@modelcontextprotocol/server').AuthInfo} AuthInfo
 * @typedef {{ response: Response; authInfo?: undefined } | { authInfo: AuthInfo; response?: undefined }} GuardResult
 */

/**
 * @param {string} message
 * @param {number} status
 * @param {Record<string, string>} [headers]
 * @returns {Response}
 */
function errorResponse(message, status, headers = {}) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

/**
 * Host/Origin -> method -> admin Bearer, in that order. Only a Bearer value equal to
 * ADMIN_TOKEN authenticates: neither the admin session cookie nor an HMAC session token
 * sent as Bearer is accepted (and so no CSRF token is involved).
 *
 * @param {Request} request
 * @param {{ ADMIN_TOKEN?: string } | null | undefined} env
 * @returns {Promise<GuardResult>}
 */
export async function guardMcpRequest(request, env) {
  const allowedHostnames = [new URL(request.url).hostname];
  const rejected =
    hostHeaderValidationResponse(request, allowedHostnames) ??
    originValidationResponse(request, allowedHostnames);
  if (rejected) return { response: rejected };

  if (request.method !== 'POST') {
    return { response: errorResponse('Method not allowed', 405, { Allow: 'POST' }) };
  }

  if (!env?.ADMIN_TOKEN) {
    return { response: errorResponse('Service misconfigured', 503) };
  }
  const header = request.headers.get('Authorization') ?? '';
  const provided = header.startsWith(BEARER_PREFIX) ? header.slice(BEARER_PREFIX.length) : '';
  if (!verifySecret(provided, env.ADMIN_TOKEN)) {
    return { response: errorResponse('Unauthorized', 401, { 'WWW-Authenticate': 'Bearer' }) };
  }
  return { authInfo: { token: 'redacted', clientId: 'admin', scopes: ['admin'] } };
}
