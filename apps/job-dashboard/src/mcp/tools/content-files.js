import { z } from 'zod';
import { READ_ONLY, registerApiTool } from '../tool-kit.js';

const MAX_FILE_BYTES = 1024 * 1024;
const TEXT_TYPES = new Set([
  'application/json',
  'application/xml',
  'application/yaml',
  'application/x-yaml',
  'application/javascript',
  'image/svg+xml',
]);

/**
 * @typedef {{
 *   prepare(query: string): {
 *     bind(...values: unknown[]): {
 *       all(): Promise<{ results: Array<Record<string, unknown>> }>;
 *       first(): Promise<Record<string, unknown> | null>;
 *     };
 *   };
 * }} ContentDb
 * @typedef {{ JOB_DB: ContentDb }} ContentEnv
 * @typedef {import('../internal-api.js').ApiResult} ApiResult
 */

/**
 * @param {unknown} error
 * @returns {ApiResult}
 */
function contentFailure(error) {
  const message = error instanceof Error ? error.message : String(error);
  if (/no such table/i.test(message)) {
    return {
      ok: false,
      status: 503,
      data: { error: 'content_files table is not available; apply D1 migration 0006' },
    };
  }
  return { ok: false, status: 500, data: { error: message } };
}

/**
 * @param {string} contentType
 * @returns {boolean}
 */
function isTextType(contentType) {
  const base = contentType.split(';')[0].trim().toLowerCase();
  return base.startsWith('text/') || TEXT_TYPES.has(base) || /\+(json|xml)$/.test(base);
}

/**
 * D1 returns BLOB columns as a byte array or an ArrayBuffer depending on the runtime.
 * @param {unknown} body
 * @returns {Uint8Array}
 */
function toBytes(body) {
  if (body instanceof Uint8Array) return body;
  if (body instanceof ArrayBuffer) return new Uint8Array(body);
  if (Array.isArray(body)) return Uint8Array.from(body);
  return new TextEncoder().encode(String(body ?? ''));
}

/**
 * @param {Uint8Array} bytes
 * @returns {string}
 */
function toBase64(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

/**
 * @param {Uint8Array} bytes
 * @param {string} contentType
 * @returns {{ encoding: 'utf-8' | 'base64'; content: string }}
 */
function encodeContent(bytes, contentType) {
  if (isTextType(contentType)) {
    try {
      return {
        encoding: 'utf-8',
        content: new TextDecoder('utf-8', { fatal: true }).decode(bytes),
      };
    } catch {
      // Declared as text but not valid UTF-8: fall through to base64.
    }
  }
  return { encoding: 'base64', content: toBase64(bytes) };
}

/**
 * @param {ContentDb} db
 * @param {{ prefix: string; limit: number }} args
 * @returns {Promise<ApiResult>}
 */
async function listFiles(db, { prefix, limit }) {
  const like = `${prefix.replace(/[\\%_]/g, '\\$&')}%`;
  try {
    const { results } = await db
      .prepare(
        "SELECT path, sha256, size, content_type, updated_at FROM content_files WHERE path LIKE ? ESCAPE '\\' ORDER BY path LIMIT ?"
      )
      .bind(like, limit)
      .all();
    return { ok: true, status: 200, data: { files: results, count: results.length } };
  } catch (error) {
    return contentFailure(error);
  }
}

/**
 * @param {ContentDb} db
 * @param {{ path: string }} args
 * @returns {Promise<ApiResult>}
 */
async function readFile(db, { path }) {
  try {
    const row = await db
      .prepare(
        'SELECT path, sha256, size, content_type, updated_at, CASE WHEN size <= ? THEN body END AS body FROM content_files WHERE path = ?'
      )
      .bind(MAX_FILE_BYTES, path)
      .first();
    if (!row) return { ok: false, status: 404, data: { error: 'File not found', path } };
    const size = Number(row.size);
    const contentType = String(row.content_type);
    const meta = {
      path: row.path,
      sha256: row.sha256,
      size,
      contentType,
      updatedAt: row.updated_at,
    };
    if (size > MAX_FILE_BYTES) {
      return {
        ok: false,
        status: 413,
        data: { error: `File is ${size} bytes; the limit is ${MAX_FILE_BYTES}`, ...meta },
      };
    }
    return {
      ok: true,
      status: 200,
      data: { ...meta, ...encodeContent(toBytes(row.body), contentType) },
    };
  } catch (error) {
    return contentFailure(error);
  }
}

/**
 * Read-only access to the D1 content_files table (personal content kept out of git).
 * @param {import('@modelcontextprotocol/server').McpServer} server
 * @param {ContentEnv} env
 */
export function registerContentFileTools(server, env) {
  registerApiTool(server, {
    name: 'list_content_files',
    title: 'List content files',
    description:
      'List D1 content files (path, sha256, size, content type) under an optional path prefix.',
    inputSchema: z.object({
      prefix: z.string().max(512).default('').describe('Path prefix, e.g. applications/'),
      limit: z.number().int().min(1).max(500).default(100),
    }),
    annotations: READ_ONLY,
    run: (args) => listFiles(env.JOB_DB, args),
  });

  registerApiTool(server, {
    name: 'get_content_file',
    title: 'Get content file',
    description:
      'One D1 content file. Text types return utf-8 text; binaries return base64. Files over 1 MiB are refused.',
    inputSchema: z.object({ path: z.string().min(1).max(512) }),
    annotations: READ_ONLY,
    run: (args) => readFile(env.JOB_DB, args),
  });
}
