import {
  hostHeaderValidationResponse,
  originValidationResponse,
} from '@modelcontextprotocol/server';
import { verifyAdminAuth } from '../services/auth.js';

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
 * Host/Origin -> method -> admin Bearer, in that order. Only the Authorization
 * header is forwarded to the shared admin check: the admin session cookie must
 * never authenticate this endpoint (and so no CSRF token is involved).
 *
 * @param {Request} request
 * @param {Parameters<typeof verifyAdminAuth>[1]} env
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

  const bearerOnly = new Request(request.url, {
    headers: { Authorization: request.headers.get('Authorization') ?? '' },
  });
  const auth = await verifyAdminAuth(bearerOnly, env);
  if (!auth.ok) {
    /** @type {Record<string, string>} */
    const challenge = auth.status === 401 ? { 'WWW-Authenticate': 'Bearer' } : {};
    return { response: errorResponse(auth.error, auth.status, challenge) };
  }
  return { authInfo: { token: 'redacted', clientId: 'admin', scopes: ['admin'] } };
}
