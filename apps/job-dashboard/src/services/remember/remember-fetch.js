/**
 * @fileoverview Remember's Cloudflare WAF answers 403 to every request from Cloudflare's own
 * IP ranges (Worker fetch and Browser Rendering alike), so the Worker cannot reach Remember
 * directly. When `REMEMBER_PROXY_URL` and `REMEMBER_PROXY_SECRET` are set, Remember requests go
 * through a signed forwarder running on a residential host, which makes the request from an IP
 * Remember accepts and returns the response verbatim. Without them this is a plain `fetch`, so
 * the Remember code path is unchanged until a relay is configured.
 * @module services/remember/remember-fetch
 */
import { signHmacWebCrypto } from '@resume/shared/auth/hmac';

/**
 * @typedef {{ REMEMBER_PROXY_URL?: unknown; REMEMBER_PROXY_SECRET?: unknown }} RememberProxyEnv
 * @typedef {{ status: number; headers: Array<[string, string]>; body: string | null }} RelayReply
 */

/**
 * The fetch the Remember code should use: the signed relay when configured, otherwise `fetch`.
 * @param {RememberProxyEnv} [env]
 * @returns {typeof fetch}
 */
export function rememberFetch(env) {
  const base = String(env?.REMEMBER_PROXY_URL ?? '').trim();
  const secret = String(env?.REMEMBER_PROXY_SECRET ?? '');
  if (!base || !secret) return fetch;
  return /** @type {typeof fetch} */ (
    (url, init = {}) => relayRequest(base, secret, String(url), init)
  );
}

/**
 * @param {string} base
 * @param {string} secret
 * @param {string} url
 * @param {RequestInit} init
 * @returns {Promise<Response>}
 */
async function relayRequest(base, secret, url, init) {
  const envelope = {
    method: init.method ?? 'GET',
    url,
    headers: headerPairs(init.headers),
    body: init.body == null ? null : String(init.body),
  };
  const payload = JSON.stringify(envelope);
  const signature = await signHmacWebCrypto(payload, secret);
  const response = await fetch(base, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Relay-Signature': signature },
    body: payload,
  });
  if (!response.ok) {
    throw new Error(`Remember relay answered ${response.status}`);
  }
  const reply = /** @type {RelayReply} */ (await response.json());
  return new Response(reply.body, { status: reply.status, headers: relayHeaders(reply.headers) });
}

/**
 * @param {HeadersInit | undefined} headers
 * @returns {Array<[string, string]>}
 */
function headerPairs(headers) {
  if (!headers) return [];
  if (headers instanceof Headers) return [...headers];
  if (Array.isArray(headers)) return headers.map(([key, value]) => [key, String(value)]);
  return Object.entries(headers).map(([key, value]) => [key, String(value)]);
}

/**
 * A Response keeps every Set-Cookie (login reads `remember_shared_data` from them), so they are
 * appended one by one rather than collapsed into a single comma-joined header.
 * @param {Array<[string, string]>} pairs
 * @returns {Headers}
 */
function relayHeaders(pairs) {
  const headers = new Headers();
  for (const [key, value] of pairs ?? []) headers.append(key, value);
  return headers;
}
