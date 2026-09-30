import { readFileSync } from 'node:fs';
import path from 'node:path';
import { REPO_ROOT } from './pack.mjs';

export const MISSING_CREDENTIALS_MESSAGE =
  'Cloudflare D1 credentials are missing. Set CONTENT_API_TOKEN (or CLOUDFLARE_API_TOKEN, or ' +
  'CLOUDFLARE_API_KEY with CLOUDFLARE_EMAIL) and CONTENT_ACCOUNT_ID (or CLOUDFLARE_ACCOUNT_ID). ' +
  'To materialize the committed fake fixtures instead, set CONTENT_SOURCE=fixtures explicitly.';

/** Cloudflare API failure; carries the HTTP status and error code but never a body. */
export class D1Error extends Error {
  /**
   * @param {string} message
   * @param {{ status?: number, code?: number }} [details]
   */
  constructor(message, details = {}) {
    super(message);
    this.name = 'D1Error';
    this.status = details.status;
    this.code = details.code;
  }
}

/**
 * First match wins: CONTENT_API_TOKEN, CLOUDFLARE_API_TOKEN, then the global key pair.
 * @param {Record<string, string | undefined>} env
 * @returns {Record<string, string> | null}
 */
export function resolveAuthHeaders(env) {
  const token = env.CONTENT_API_TOKEN || env.CLOUDFLARE_API_TOKEN;
  if (token) return { Authorization: `Bearer ${token}` };
  if (env.CLOUDFLARE_API_KEY && env.CLOUDFLARE_EMAIL) {
    return { 'X-Auth-Key': env.CLOUDFLARE_API_KEY, 'X-Auth-Email': env.CLOUDFLARE_EMAIL };
  }
  return null;
}

/**
 * @param {Record<string, string | undefined>} env
 * @returns {string | null}
 */
export function resolveAccountId(env) {
  return env.CONTENT_ACCOUNT_ID || env.CLOUDFLARE_ACCOUNT_ID || null;
}

/**
 * Parse JSON with comments and trailing commas (wrangler.jsonc).
 * @param {string} text
 * @returns {any}
 */
export function parseJsonc(text) {
  const out = [];
  let inString = false;
  let pendingComma = -1;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (inString) {
      out.push(ch);
      if (ch === '\\') out.push(text[(i += 1)]);
      else if (ch === '"') inString = false;
    } else if (ch === '/' && text[i + 1] === '/') {
      while (i < text.length && text[i] !== '\n') i += 1;
      out.push('\n');
    } else if (ch === '/' && text[i + 1] === '*') {
      i = text.indexOf('*/', i + 2) + 1 || text.length;
    } else {
      if (/\S/.test(ch)) {
        if ((ch === '}' || ch === ']') && pendingComma >= 0) out[pendingComma] = '';
        pendingComma = ch === ',' ? out.length : -1;
      }
      if (ch === '"') inString = true;
      out.push(ch);
    }
  }
  return JSON.parse(out.join(''));
}

/**
 * @param {string} [root]
 * @returns {string}
 */
export function readDatabaseId(root = REPO_ROOT) {
  const config = parseJsonc(readFileSync(path.join(root, 'wrangler.jsonc'), 'utf8'));
  const db = (config.d1_databases ?? []).find((entry) => entry.binding === 'JOB_DB');
  if (!db?.database_id) throw new Error('wrangler.jsonc has no d1_databases entry for JOB_DB');
  return db.database_id;
}

/**
 * @typedef {{ results: Record<string, any>[], meta: Record<string, any> }} D1Result
 * @typedef {{ query: (sql: string, params?: unknown[]) => Promise<D1Result> }} D1Client
 */

/**
 * Create a D1 REST client; throws when credentials are missing (fail closed).
 * @param {{ env?: Record<string, string | undefined>, root?: string, fetchImpl?: typeof fetch }} [options]
 * @returns {D1Client}
 */
export function createD1Client({ env = process.env, root = REPO_ROOT, fetchImpl = fetch } = {}) {
  const auth = resolveAuthHeaders(env);
  const account = resolveAccountId(env);
  if (!auth || !account) throw new D1Error(MISSING_CREDENTIALS_MESSAGE);
  const url = `https://api.cloudflare.com/client/v4/accounts/${account}/d1/database/${readDatabaseId(root)}/query`;
  return {
    async query(sql, params = []) {
      let response;
      try {
        response = await fetchImpl(url, {
          method: 'POST',
          headers: { ...auth, 'Content-Type': 'application/json' },
          body: JSON.stringify({ sql, params }),
        });
      } catch (error) {
        throw new D1Error(
          `D1 request failed: ${error instanceof Error ? error.message : 'unknown'}`
        );
      }
      const json = await response.json().catch(() => null);
      const first = json?.result?.[0];
      if (!response.ok || !json?.success || first?.success === false) {
        const cause = json?.errors?.[0];
        const code = cause?.code ? `, code ${cause.code}` : '';
        throw new D1Error(
          `D1 query failed (HTTP ${response.status}${code}): ${cause?.message ?? 'no error detail'}`,
          {
            status: response.status,
            code: cause?.code,
          }
        );
      }
      return { results: first?.results ?? [], meta: first?.meta ?? {} };
    },
  };
}
