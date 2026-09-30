import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { sha256Hex } from '../pack.mjs';

export const CREDS = { CONTENT_API_TOKEN: 'test-token', CONTENT_ACCOUNT_ID: 'acct123' };
const WRANGLER =
  '{\n  // comment\n  "d1_databases": [{ "binding": "JOB_DB", "database_id": "db-test-id", },],\n}\n';

/** @returns {string} a temp repo root holding only a wrangler.jsonc */
export function makeRoot() {
  const root = mkdtempSync(path.join(os.tmpdir(), 'content-test-'));
  writeFileSync(path.join(root, 'wrangler.jsonc'), WRANGLER);
  return root;
}

/**
 * @param {string} root
 * @param {string} repoPath
 * @param {string | Buffer} content
 */
export function put(root, repoPath, content) {
  const target = path.join(root, repoPath);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, content);
}

/**
 * In-memory D1 that answers the SQL the content CLI issues over the REST shape.
 * @param {{ masterRow?: boolean }} [options]
 */
export function fakeD1({ masterRow = true } = {}) {
  /** @type {Map<string, { body: Buffer, sha256: string, size: number }>} */
  const files = new Map();
  const calls = [];
  const seed = (repoPath, bytes, sha256 = sha256Hex(bytes)) =>
    files.set(repoPath, { body: Buffer.from(bytes), sha256, size: bytes.length });
  const answer = (sql, params) => {
    if (sql.startsWith('SELECT path, sha256 FROM content_files')) {
      return { results: [...files].map(([p, f]) => ({ path: p, sha256: f.sha256 })), meta: {} };
    }
    if (sql.includes('hex(body)')) {
      const page = [...files]
        .filter(([p]) => p > params[0])
        .sort(([a], [b]) => (a < b ? -1 : 1))
        .slice(0, params[1])
        .map(([p, f]) => ({
          path: p,
          body_hex: f.body.toString('hex').toUpperCase(),
          sha256: f.sha256,
          size: f.size,
        }));
      return { results: page, meta: {} };
    }
    if (sql.startsWith('INSERT INTO content_files')) {
      const [p, hex, sha256, size] = params;
      files.set(p, { body: Buffer.from(hex, 'hex'), sha256, size });
      return { results: [], meta: { changes: 1 } };
    }
    if (sql.startsWith('DELETE FROM content_files')) {
      return { results: [], meta: { changes: files.delete(params[0]) ? 1 : 0 } };
    }
    if (sql.startsWith('UPDATE resumes'))
      return { results: [], meta: { changes: masterRow ? 1 : 0 } };
    return null;
  };
  const fetchImpl = async (url, init) => {
    const { sql, params } = JSON.parse(init.body);
    calls.push({ url, headers: init.headers, sql, params });
    const result = answer(sql, params);
    const body = result
      ? { success: true, errors: [], result: [{ success: true, ...result }] }
      : { success: false, errors: [{ code: 7500, message: 'unsupported statement' }], result: [] };
    return new Response(JSON.stringify(body), { status: result ? 200 : 400 });
  };
  return { files, calls, seed, fetchImpl };
}
