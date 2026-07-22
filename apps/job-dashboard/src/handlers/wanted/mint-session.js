/**
 * @fileoverview Mints a Wanted OneID session cookie and stores it in KV as
 * `auth:wanted` — the credential the worker's Wanted sync/crawl paths read
 * directly as a Cookie header (see workflows/resume-sync-platforms.js
 * `wantedApiRequest`). Ported from apps/job-server/scripts/ci-resume-sync.js
 * `mintWantedCookies` so the Cloudflare Worker can self-mint on a schedule.
 * @module handlers/wanted/mint-session
 */

export const WANTED_TOKEN_URL = 'https://id-api.wanted.co.kr/v1/auth/token';
export const AUTH_WANTED_KEY = 'auth:wanted';
export const WANTED_SESSION_TTL_S = 60 * 60 * 12; // 12h

function buildWantedOneIdLoginUrl(clientId) {
  const url = new URL('https://id.wanted.co.kr/login');
  url.searchParams.set('service', 'wanted');
  url.searchParams.set('before_url', 'https://www.wanted.co.kr/');
  url.searchParams.set('client_id', clientId);
  return url.toString();
}

/**
 * Mint a fresh Wanted OneID session cookie via the password grant.
 * @param {{WANTED_EMAIL?: string, WANTED_PASSWORD?: string, WANTED_ONEID_CLIENT_ID?: string}} env
 * @param {{fetchImpl?: typeof fetch}} [opts]
 * @returns {Promise<string>} cookie string `WWW_ONEID_ACCESS_TOKEN=<token>`
 */
export async function mintWantedSession(env, { fetchImpl = fetch } = {}) {
  const email = env?.WANTED_EMAIL;
  const password = env?.WANTED_PASSWORD;
  const clientId = env?.WANTED_ONEID_CLIENT_ID;

  if (!email) throw new Error('WANTED_EMAIL is required to mint a Wanted session');
  if (!password) throw new Error('WANTED_PASSWORD is required to mint a Wanted session');
  if (!clientId) throw new Error('WANTED_ONEID_CLIENT_ID is required to mint a Wanted session');

  const response = await fetchImpl(WANTED_TOKEN_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Origin: 'https://id.wanted.co.kr',
      Referer: buildWantedOneIdLoginUrl(clientId),
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'oneid-agent': 'web',
    },
    body: JSON.stringify({
      grant_type: 'password',
      email,
      password,
      client_id: clientId,
      beforeUrl: 'https://www.wanted.co.kr/',
      redirect_url: null,
      stay_signed_in: true,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`OneID token request failed (${response.status}): ${body.slice(0, 300)}`);
  }

  const payload = await response.json();
  const token = payload?.token;
  if (typeof token !== 'string' || token.length === 0) {
    throw new Error('OneID token response did not include a usable token');
  }

  return `WWW_ONEID_ACCESS_TOKEN=${token}`;
}

/**
 * Mint a Wanted session and store it in KV as `auth:wanted`. Never throws —
 * callers (admin route, scheduled cron) get a plain result back either way.
 * @param {{SESSIONS: {put: Function}}} env
 * @param {{fetchImpl?: typeof fetch}} [opts]
 * @returns {Promise<{ok:true,key:string,length:number}|{ok:false,error:string}>}
 */
export async function refreshWantedSession(env, opts = {}) {
  try {
    const cookie = await mintWantedSession(env, opts);
    await env.SESSIONS.put(AUTH_WANTED_KEY, cookie, { expirationTtl: WANTED_SESSION_TTL_S });
    return { ok: true, key: AUTH_WANTED_KEY, length: cookie.length };
  } catch (err) {
    return { ok: false, error: err?.message || String(err) };
  }
}
