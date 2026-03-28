import Database from 'better-sqlite3';
import { createHash, randomUUID } from 'node:crypto';
import {
  mkdirSync,
  existsSync,
  readFileSync,
  writeFileSync,
  readdirSync,
  statSync,
  rmSync,
  unlinkSync,
} from 'node:fs';
import { readFile, writeFile, rm } from 'node:fs/promises';
import { dirname, join, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DEFAULT_DATA_DIR = resolve(__dirname, 'data');

/**
 * Ensure a directory exists.
 *
 * @param {string} dirPath - Directory path.
 * @returns {void}
 */
function ensureDirSync(dirPath) {
  mkdirSync(dirPath, { recursive: true });
}

/**
 * Ensure parent directory exists for file path.
 *
 * @param {string} filePath - Target file path.
 * @returns {void}
 */
function ensureFileParentSync(filePath) {
  ensureDirSync(dirname(filePath));
}

/**
 * Convert unknown binary-ish input to Buffer.
 *
 * @param {unknown} value - Input value.
 * @returns {Promise<Buffer>} Buffer representation.
 */
async function toBuffer(value) {
  if (value == null) {
    return Buffer.alloc(0);
  }

  if (Buffer.isBuffer(value)) {
    return value;
  }

  if (typeof value === 'string') {
    return Buffer.from(value);
  }

  if (value instanceof ArrayBuffer) {
    return Buffer.from(value);
  }

  if (ArrayBuffer.isView(value)) {
    return Buffer.from(value.buffer, value.byteOffset, value.byteLength);
  }

  if (value instanceof ReadableStream) {
    const chunks = [];
    const reader = value.getReader();
    while (true) {
      const { done, value: chunk } = await reader.read();
      if (done) break;
      chunks.push(await toBuffer(chunk));
    }
    return Buffer.concat(chunks);
  }

  return Buffer.from(JSON.stringify(value));
}

/**
 * Build ETag from bytes.
 *
 * @param {Buffer} buffer - Object bytes.
 * @returns {string} Hash-based ETag.
 */
function makeEtag(buffer) {
  return createHash('sha1').update(buffer).digest('hex');
}

/**
 * Build a cursor string from list offset.
 *
 * @param {number} offset - List offset.
 * @returns {string} Cursor token.
 */
function encodeCursor(offset) {
  return Buffer.from(String(offset), 'utf8').toString('base64url');
}

/**
 * Parse a cursor string into offset.
 *
 * @param {string|undefined} cursor - Cursor token.
 * @returns {number} Offset value.
 */
function decodeCursor(cursor) {
  if (!cursor) return 0;
  try {
    const decoded = Buffer.from(cursor, 'base64url').toString('utf8');
    const parsed = Number.parseInt(decoded, 10);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  } catch {
    return 0;
  }
}

/**
 * Map Cloudflare-style bind values to better-sqlite3 parameters.
 *
 * Supports ?1, ?2 style placeholders and unnamed ? placeholders.
 *
 * @param {string} sql - SQL text.
 * @param {unknown[]} bound - Bound parameters.
 * @returns {unknown[]|Record<string, unknown>} Parameters for better-sqlite3.
 */
function toSqliteParams(sql, bound) {
  if (bound.length === 0) {
    return [];
  }

  if (/\?\d+/.test(sql)) {
    const mapped = {};
    for (let i = 0; i < bound.length; i += 1) {
      mapped[i + 1] = bound[i];
    }
    return mapped;
  }

  return bound;
}

/**
 * Mock Cloudflare D1 prepared statement.
 */
class MockD1PreparedStatement {
  /**
   * @param {Database.Database} db - SQLite handle.
   * @param {string} sql - SQL statement.
   */
  constructor(db, sql) {
    this.db = db;
    this.sql = sql;
    this.bound = [];
  }

  /**
   * Bind positional parameters.
   *
   * @param {...unknown} values - Parameters.
   * @returns {MockD1PreparedStatement} Same statement for chaining.
   */
  bind(...values) {
    this.bound = values;
    return this;
  }

  /**
   * Execute statement and return metadata.
   *
   * @returns {Promise<{success: true, meta: {changes: number, last_row_id: number, duration: number}}>}
   */
  async run() {
    const stmt = this.db.prepare(this.sql);
    const start = Date.now();
    const result = stmt.run(toSqliteParams(this.sql, this.bound));
    const duration = Date.now() - start;
    return {
      success: true,
      meta: {
        changes: Number(result.changes || 0),
        last_row_id: Number(result.lastInsertRowid || 0),
        duration,
      },
    };
  }

  /**
   * Fetch first row.
   *
   * @param {string} [column] - Optional column selector.
   * @returns {Promise<Record<string, unknown>|unknown|null>} Row, selected column, or null.
   */
  async first(column) {
    const stmt = this.db.prepare(this.sql);
    const row = stmt.get(toSqliteParams(this.sql, this.bound)) || null;
    if (!row) return null;
    if (column) {
      return Object.prototype.hasOwnProperty.call(row, column) ? row[column] : null;
    }
    return row;
  }

  /**
   * Fetch all rows.
   *
   * @returns {Promise<{results: Array<Record<string, unknown>>, success: true, meta: {duration: number, changes: number}}>}
   */
  async all() {
    const stmt = this.db.prepare(this.sql);
    const start = Date.now();
    const results = stmt.all(toSqliteParams(this.sql, this.bound));
    const duration = Date.now() - start;
    return {
      results,
      success: true,
      meta: {
        duration,
        changes: 0,
      },
    };
  }

  /**
   * Fetch raw rows.
   *
   * @param {{ columnNames?: boolean }} [options] - Raw output options.
   * @returns {Promise<Array<unknown[]|unknown>>} Raw values.
   */
  async raw(options = {}) {
    const stmt = this.db.prepare(this.sql);
    const rows = stmt.raw(true).all(toSqliteParams(this.sql, this.bound));
    if (options.columnNames) {
      return [stmt.columns().map((c) => c.name), ...rows];
    }
    return rows;
  }
}

/**
 * SQLite-backed mock for Cloudflare D1Database.
 */
export class MockD1Database {
  /**
   * @param {{ filePath?: string }} [options] - D1 mock options.
   */
  constructor(options = {}) {
    this.filePath = options.filePath || resolve(DEFAULT_DATA_DIR, 'd1.sqlite');
    ensureFileParentSync(this.filePath);
    this.db = new Database(this.filePath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
  }

  /**
   * Create a prepared statement.
   *
   * @param {string} sql - SQL statement.
   * @returns {MockD1PreparedStatement} Prepared statement.
   */
  prepare(sql) {
    return new MockD1PreparedStatement(this.db, sql);
  }

  /**
   * Execute one or more SQL statements directly.
   *
   * @param {string} sql - SQL script.
   * @returns {Promise<{count: number, duration: number}>} Execution summary.
   */
  async exec(sql) {
    const start = Date.now();
    this.db.exec(sql);
    const duration = Date.now() - start;
    const count = sql
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean).length;
    return { count, duration };
  }

  /**
   * Execute a batch of prepared statements transactionally.
   *
   * @param {Array<MockD1PreparedStatement>} statements - Statements from prepare().
   * @returns {Promise<Array<{success: true, meta: {changes: number, last_row_id: number, duration: number}}>>}
   */
  async batch(statements) {
    /** @type {Array<{success: true, meta: {changes: number, last_row_id: number, duration: number}}>} */
    const results = [];
    const tx = this.db.transaction(() => {
      for (const statement of statements) {
        const stmt = this.db.prepare(statement.sql);
        const start = Date.now();
        const result = stmt.run(toSqliteParams(statement.sql, statement.bound));
        const duration = Date.now() - start;
        results.push({
          success: true,
          meta: {
            changes: Number(result.changes || 0),
            last_row_id: Number(result.lastInsertRowid || 0),
            duration,
          },
        });
      }
    });
    tx();
    return results;
  }

  /**
   * Dump SQLite database bytes.
   *
   * @returns {Promise<ArrayBuffer>} Database snapshot bytes.
   */
  async dump() {
    this.db.pragma('wal_checkpoint(FULL)');
    const bytes = readFileSync(this.filePath);
    return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  }

  /**
   * Close underlying SQLite handle.
   *
   * @returns {void}
   */
  close() {
    this.db.close();
  }
}

/**
 * @typedef {Object} KVStoredValue
 * @property {'text'|'json'|'base64'} encoding - Stored encoding.
 * @property {string} value - Serialized value.
 * @property {number|null} expiration - Expiration epoch seconds.
 * @property {Record<string, unknown>|null} metadata - Optional metadata.
 */

/**
 * In-memory + JSON-persisted mock for Cloudflare KVNamespace.
 */
export class MockKVNamespace {
  /**
   * @param {{ filePath?: string }} [options] - KV mock options.
   */
  constructor(options = {}) {
    this.filePath = options.filePath || resolve(DEFAULT_DATA_DIR, 'kv.json');
    ensureFileParentSync(this.filePath);
    /** @type {Map<string, KVStoredValue>} */
    this.store = new Map();
    this.#load();
  }

  /**
   * Read value from KV.
   *
   * @param {string} key - Key.
   * @param {'text'|'json'|'arrayBuffer'|'stream'|{type?: 'text'|'json'|'arrayBuffer'|'stream'}|undefined} [type]
   * @returns {Promise<string|Record<string, unknown>|ArrayBuffer|ReadableStream|null>} Parsed value.
   */
  async get(key, type) {
    this.#purgeExpired();
    const item = this.store.get(key);
    if (!item) return null;

    const resolvedType = typeof type === 'string' ? type : type?.type;
    const asText = this.#decodeText(item);

    if (resolvedType === 'json') {
      return JSON.parse(asText);
    }
    if (resolvedType === 'arrayBuffer') {
      const buffer = Buffer.from(asText);
      return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    }
    if (resolvedType === 'stream') {
      const bytes = Buffer.from(asText);
      return new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array(bytes));
          controller.close();
        },
      });
    }

    return asText;
  }

  /**
   * Write value to KV.
   *
   * @param {string} key - Key.
   * @param {unknown} value - Value.
   * @param {{expiration?: number, expirationTtl?: number, metadata?: Record<string, unknown>}} [options]
   * @returns {Promise<void>}
   */
  async put(key, value, options = {}) {
    const nowSec = Math.floor(Date.now() / 1000);
    const expiration =
      typeof options.expiration === 'number'
        ? options.expiration
        : typeof options.expirationTtl === 'number'
          ? nowSec + Math.max(0, Math.floor(options.expirationTtl))
          : null;

    /** @type {KVStoredValue} */
    let stored;
    if (typeof value === 'string') {
      stored = {
        encoding: 'text',
        value,
        expiration,
        metadata: options.metadata || null,
      };
    } else if (
      value instanceof ArrayBuffer ||
      ArrayBuffer.isView(value) ||
      Buffer.isBuffer(value)
    ) {
      const bytes = await toBuffer(value);
      stored = {
        encoding: 'base64',
        value: bytes.toString('base64'),
        expiration,
        metadata: options.metadata || null,
      };
    } else {
      stored = {
        encoding: 'json',
        value: JSON.stringify(value),
        expiration,
        metadata: options.metadata || null,
      };
    }

    this.store.set(key, stored);
    this.#persist();
  }

  /**
   * Delete key from KV.
   *
   * @param {string} key - Key.
   * @returns {Promise<void>}
   */
  async delete(key) {
    this.store.delete(key);
    this.#persist();
  }

  /**
   * List keys in KV.
   *
   * @param {{ prefix?: string, limit?: number, cursor?: string }} [options] - List options.
   * @returns {Promise<{keys: Array<{name: string, expiration?: number, metadata?: Record<string, unknown>}>, list_complete: boolean, cursor: string}>}
   */
  async list(options = {}) {
    this.#purgeExpired();
    const prefix = options.prefix || '';
    const limit = Math.max(1, Math.min(1000, options.limit || 1000));
    const offset = decodeCursor(options.cursor);

    const all = [...this.store.entries()]
      .filter(([key]) => key.startsWith(prefix))
      .sort(([a], [b]) => a.localeCompare(b));

    const slice = all.slice(offset, offset + limit);
    const keys = slice.map(([name, value]) => ({
      name,
      ...(value.expiration ? { expiration: value.expiration } : {}),
      ...(value.metadata ? { metadata: value.metadata } : {}),
    }));

    const nextOffset = offset + slice.length;
    const listComplete = nextOffset >= all.length;
    return {
      keys,
      list_complete: listComplete,
      cursor: listComplete ? '' : encodeCursor(nextOffset),
    };
  }

  /**
   * Load persisted KV data from disk.
   *
   * @returns {void}
   */
  #load() {
    if (!existsSync(this.filePath)) return;

    try {
      const raw = readFileSync(this.filePath, 'utf8');
      /** @type {Record<string, KVStoredValue>} */
      const data = JSON.parse(raw);
      for (const [key, value] of Object.entries(data)) {
        this.store.set(key, value);
      }
      this.#purgeExpired();
    } catch {
      this.store.clear();
    }
  }

  /**
   * Persist KV data to JSON file.
   *
   * @returns {void}
   */
  #persist() {
    const obj = Object.fromEntries(this.store.entries());
    writeFileSync(this.filePath, JSON.stringify(obj, null, 2), 'utf8');
  }

  /**
   * Remove expired KV keys.
   *
   * @returns {void}
   */
  #purgeExpired() {
    const nowSec = Math.floor(Date.now() / 1000);
    let changed = false;
    for (const [key, value] of this.store.entries()) {
      if (value.expiration && value.expiration <= nowSec) {
        this.store.delete(key);
        changed = true;
      }
    }
    if (changed) this.#persist();
  }

  /**
   * Decode persisted value as text.
   *
   * @param {KVStoredValue} item - Stored value.
   * @returns {string} Decoded string.
   */
  #decodeText(item) {
    if (item.encoding === 'base64') {
      return Buffer.from(item.value, 'base64').toString('utf8');
    }
    return item.value;
  }
}

/**
 * Mock R2 object wrapper with Cloudflare-like body helpers.
 */
class MockR2ObjectBody {
  /**
   * @param {Buffer} bytes - Object bytes.
   */
  constructor(bytes) {
    this.bytes = bytes;
  }

  /**
   * Get object body as text.
   *
   * @returns {Promise<string>} UTF-8 text.
   */
  async text() {
    return this.bytes.toString('utf8');
  }

  /**
   * Get object body parsed as JSON.
   *
   * @returns {Promise<unknown>} Parsed JSON.
   */
  async json() {
    return JSON.parse(this.bytes.toString('utf8'));
  }

  /**
   * Get object body as ArrayBuffer.
   *
   * @returns {Promise<ArrayBuffer>} Binary payload.
   */
  async arrayBuffer() {
    return this.bytes.buffer.slice(
      this.bytes.byteOffset,
      this.bytes.byteOffset + this.bytes.byteLength
    );
  }
}

/**
 * Local filesystem-backed mock for Cloudflare R2Bucket.
 */
export class MockR2Bucket {
  /**
   * @param {{ baseDir?: string }} [options] - R2 mock options.
   */
  constructor(options = {}) {
    this.baseDir = options.baseDir || resolve(DEFAULT_DATA_DIR, 'r2');
    ensureDirSync(this.baseDir);
  }

  /**
   * Read object from bucket.
   *
   * @param {string} key - Object key.
   * @returns {Promise<(MockR2ObjectBody & {key: string, size: number, etag: string, uploaded: Date, httpMetadata: Record<string, unknown>|null, customMetadata: Record<string, unknown>|null})|null>}
   */
  async get(key) {
    const filePath = this.#resolveKeyPath(key);
    if (!existsSync(filePath)) return null;

    const bytes = await readFile(filePath);
    const meta = this.#readMeta(filePath);
    const body = new MockR2ObjectBody(bytes);

    return Object.assign(body, {
      key,
      size: bytes.byteLength,
      etag: meta.etag || makeEtag(bytes),
      uploaded: new Date(meta.uploaded || statSync(filePath).mtimeMs),
      httpMetadata: meta.httpMetadata || null,
      customMetadata: meta.customMetadata || null,
    });
  }

  /**
   * Store object in bucket.
   *
   * @param {string} key - Object key.
   * @param {unknown} value - Object body.
   * @param {{ httpMetadata?: Record<string, unknown>, customMetadata?: Record<string, unknown> }} [options]
   * @returns {Promise<{key: string, etag: string, uploaded: Date, size: number}>}
   */
  async put(key, value, options = {}) {
    const filePath = this.#resolveKeyPath(key);
    ensureFileParentSync(filePath);

    const bytes = await toBuffer(value);
    await writeFile(filePath, bytes);

    const etag = makeEtag(bytes);
    const uploaded = new Date();
    this.#writeMeta(filePath, {
      key,
      etag,
      uploaded: uploaded.toISOString(),
      httpMetadata: options.httpMetadata || null,
      customMetadata: options.customMetadata || null,
    });

    return {
      key,
      etag,
      uploaded,
      size: bytes.byteLength,
    };
  }

  /**
   * Delete object from bucket.
   *
   * @param {string} key - Object key.
   * @returns {Promise<void>}
   */
  async delete(key) {
    const filePath = this.#resolveKeyPath(key);
    await rm(filePath, { force: true });
    await rm(this.#metaPath(filePath), { force: true });
  }

  /**
   * List objects.
   *
   * @param {{ prefix?: string, limit?: number, cursor?: string, delimiter?: string }} [options] - List options.
   * @returns {Promise<{objects: Array<{key: string, size: number, etag: string, uploaded: Date, httpMetadata: Record<string, unknown>|null, customMetadata: Record<string, unknown>|null}>, truncated: boolean, cursor: string, delimitedPrefixes: string[]}>}
   */
  async list(options = {}) {
    const prefix = options.prefix || '';
    const limit = Math.max(1, Math.min(1000, options.limit || 1000));
    const offset = decodeCursor(options.cursor);
    const delimiter = options.delimiter;

    /** @type {string[]} */
    const files = [];
    this.#walkFiles(this.baseDir, files);

    const allKeys = files
      .map((filePath) => relative(this.baseDir, filePath).replaceAll('\\', '/'))
      .filter((key) => !key.endsWith('.meta.json'))
      .filter((key) => key.startsWith(prefix))
      .sort();

    /** @type {Set<string>} */
    const delimitedPrefixes = new Set();
    let filteredKeys = allKeys;

    if (delimiter) {
      filteredKeys = [];
      for (const key of allKeys) {
        const remaining = key.slice(prefix.length);
        const pos = remaining.indexOf(delimiter);
        if (pos >= 0) {
          const p = `${prefix}${remaining.slice(0, pos + delimiter.length)}`;
          delimitedPrefixes.add(p);
          continue;
        }
        filteredKeys.push(key);
      }
    }

    const page = filteredKeys.slice(offset, offset + limit);
    const objects = page.map((key) => {
      const filePath = this.#resolveKeyPath(key);
      const st = statSync(filePath);
      const bytes = readFileSync(filePath);
      const meta = this.#readMeta(filePath);
      return {
        key,
        size: st.size,
        etag: meta.etag || makeEtag(bytes),
        uploaded: new Date(meta.uploaded || st.mtimeMs),
        httpMetadata: meta.httpMetadata || null,
        customMetadata: meta.customMetadata || null,
      };
    });

    const nextOffset = offset + page.length;
    const truncated = nextOffset < filteredKeys.length;
    return {
      objects,
      truncated,
      cursor: truncated ? encodeCursor(nextOffset) : '',
      delimitedPrefixes: [...delimitedPrefixes],
    };
  }

  /**
   * Resolve object key to safe filesystem path.
   *
   * @param {string} key - R2 key.
   * @returns {string} Absolute file path.
   */
  #resolveKeyPath(key) {
    const clean = key.replace(/^\/+/, '');
    const target = resolve(this.baseDir, clean);
    if (!target.startsWith(this.baseDir)) {
      throw new Error(`Invalid R2 key path: ${key}`);
    }
    return target;
  }

  /**
   * Build metadata sidecar file path.
   *
   * @param {string} filePath - Data file path.
   * @returns {string} Metadata file path.
   */
  #metaPath(filePath) {
    return `${filePath}.meta.json`;
  }

  /**
   * Persist metadata sidecar.
   *
   * @param {string} filePath - Data file path.
   * @param {Record<string, unknown>} payload - Metadata payload.
   * @returns {void}
   */
  #writeMeta(filePath, payload) {
    const metaPath = this.#metaPath(filePath);
    ensureFileParentSync(metaPath);
    writeFileSync(metaPath, JSON.stringify(payload, null, 2), 'utf8');
  }

  /**
   * Read metadata sidecar.
   *
   * @param {string} filePath - Data file path.
   * @returns {Record<string, unknown>} Metadata object.
   */
  #readMeta(filePath) {
    const metaPath = this.#metaPath(filePath);
    if (!existsSync(metaPath)) return {};
    try {
      return JSON.parse(readFileSync(metaPath, 'utf8'));
    } catch {
      return {};
    }
  }

  /**
   * Recursively walk files.
   *
   * @param {string} dirPath - Directory path.
   * @param {string[]} out - Collected file paths.
   * @returns {void}
   */
  #walkFiles(dirPath, out) {
    if (!existsSync(dirPath)) return;
    const entries = readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const p = join(dirPath, entry.name);
      if (entry.isDirectory()) {
        this.#walkFiles(p, out);
      } else {
        out.push(p);
      }
    }
  }
}

/**
 * @typedef {Object} MockQueueMessage
 * @property {string} id - Message ID.
 * @property {unknown} body - Message body.
 * @property {number} attempts - Attempt count.
 * @property {(options?: {delaySeconds?: number}) => void} retry - Retry message.
 * @property {() => void} ack - Acknowledge message.
 */

/**
 * In-memory Cloudflare Queue mock with optional worker simulation.
 */
export class MockQueue {
  /**
   * @param {{ name?: string, worker?: (batch: {queue: string, messages: MockQueueMessage[]}) => Promise<void>|void }} [options]
   */
  constructor(options = {}) {
    this.name = options.name || 'mock-queue';
    this.worker = options.worker || null;
    /** @type {Array<{id: string, body: unknown, attempts: number, availableAt: number}>} */
    this.messages = [];
    this.processing = false;
  }

  /**
   * Send one message.
   *
   * @param {unknown} body - Message body.
   * @param {{ delaySeconds?: number }} [options] - Send options.
   * @returns {Promise<void>}
   */
  async send(body, options = {}) {
    const delayMs = Math.max(0, Math.floor((options.delaySeconds || 0) * 1000));
    this.messages.push({
      id: randomUUID(),
      body,
      attempts: 1,
      availableAt: Date.now() + delayMs,
    });
    await this.#schedule();
  }

  /**
   * Send message batch.
   *
   * @param {Array<unknown|{body: unknown, delaySeconds?: number}>} batch - Messages.
   * @returns {Promise<void>}
   */
  async sendBatch(batch) {
    for (const item of batch) {
      if (item && typeof item === 'object' && 'body' in item) {
        // @ts-expect-error runtime guard handles shape
        await this.send(item.body, { delaySeconds: item.delaySeconds || 0 });
      } else {
        await this.send(item);
      }
    }
  }

  /**
   * Process currently available messages using assigned worker.
   *
   * @returns {Promise<void>}
   */
  async processNow() {
    if (!this.worker || this.processing) return;
    this.processing = true;
    try {
      const now = Date.now();
      const ready = this.messages.filter((m) => m.availableAt <= now);
      this.messages = this.messages.filter((m) => m.availableAt > now);
      if (ready.length === 0) return;

      /** @type {Array<{id: string, body: unknown, attempts: number, acked: boolean, retriedWithDelay: number|null}>} */
      const state = ready.map((m) => ({
        id: m.id,
        body: m.body,
        attempts: m.attempts,
        acked: false,
        retriedWithDelay: null,
      }));

      /** @type {MockQueueMessage[]} */
      const messages = state.map((s) => ({
        id: s.id,
        body: s.body,
        attempts: s.attempts,
        ack: () => {
          s.acked = true;
        },
        retry: (options = {}) => {
          s.retriedWithDelay = Math.max(0, Math.floor((options.delaySeconds || 0) * 1000));
        },
      }));

      await this.worker({
        queue: this.name,
        messages,
      });

      for (const s of state) {
        if (s.retriedWithDelay != null) {
          this.messages.push({
            id: s.id,
            body: s.body,
            attempts: s.attempts + 1,
            availableAt: Date.now() + s.retriedWithDelay,
          });
        }
      }
    } finally {
      this.processing = false;
      if (this.messages.some((m) => m.availableAt <= Date.now())) {
        await this.#schedule();
      }
    }
  }

  /**
   * Clear in-memory queue messages.
   *
   * @returns {void}
   */
  clear() {
    this.messages = [];
  }

  /**
   * Schedule background processing for available messages.
   *
   * @returns {Promise<void>}
   */
  async #schedule() {
    if (!this.worker) return;
    queueMicrotask(() => {
      void this.processNow();
    });
  }
}

/**
 * Create a local mock Cloudflare env object.
 *
 * Default bindings include:
 * - DB (D1)
 * - SESSIONS, RATE_LIMIT_KV, NONCE_KV (KV)
 * - R2 (R2)
 * - CRAWL_TASKS (Queue)
 *
 * @param {{
 *   dataDir?: string,
 *   queueWorker?: (batch: {queue: string, messages: MockQueueMessage[]}) => Promise<void>|void,
 *   kvBindings?: string[],
 *   includeDefaultAliases?: boolean,
 * }} [options] - Environment creation options.
 * @returns {Record<string, unknown> & {
 *   DB: MockD1Database,
 *   SESSIONS: MockKVNamespace,
 *   RATE_LIMIT_KV: MockKVNamespace,
 *   NONCE_KV: MockKVNamespace,
 *   R2: MockR2Bucket,
 *   CRAWL_TASKS: MockQueue,
 * }} Mock env bindings.
 */
export function createMockEnv(options = {}) {
  const dataDir = options.dataDir || DEFAULT_DATA_DIR;
  ensureDirSync(dataDir);

  const db = new MockD1Database({ filePath: resolve(dataDir, 'd1.sqlite') });
  const sessionsKv = new MockKVNamespace({ filePath: resolve(dataDir, 'kv-sessions.json') });
  const rateLimitKv = new MockKVNamespace({ filePath: resolve(dataDir, 'kv-rate-limit.json') });
  const nonceKv = new MockKVNamespace({ filePath: resolve(dataDir, 'kv-nonce.json') });
  const r2 = new MockR2Bucket({ baseDir: resolve(dataDir, 'r2') });
  const queue = new MockQueue({ name: 'crawl-tasks', worker: options.queueWorker });

  /** @type {Record<string, unknown>} */
  const env = {
    DB: db,
    SESSIONS: sessionsKv,
    RATE_LIMIT_KV: rateLimitKv,
    NONCE_KV: nonceKv,
    R2: r2,
    CRAWL_TASKS: queue,
  };

  const customKvBindings = options.kvBindings || [];
  for (const bindingName of customKvBindings) {
    if (!env[bindingName]) {
      env[bindingName] = new MockKVNamespace({
        filePath: resolve(dataDir, `kv-${bindingName.toLowerCase()}.json`),
      });
    }
  }

  if (options.includeDefaultAliases !== false) {
    env.job_dashboard_db = db;
    env.JOB_DASHBOARD_DB = db;
    env.BUCKET = r2;
  }

  return /** @type {any} */ (env);
}

/**
 * Reset persisted mock data directory.
 *
 * @param {string} [dataDir] - Data directory path.
 * @returns {void}
 */
export function resetMockData(dataDir = DEFAULT_DATA_DIR) {
  if (!existsSync(dataDir)) return;
  const entries = readdirSync(dataDir, { withFileTypes: true });
  for (const entry of entries) {
    const target = join(dataDir, entry.name);
    if (entry.isDirectory()) {
      rmSync(target, { recursive: true, force: true });
    } else {
      unlinkSync(target);
    }
  }
}

export default {
  MockD1Database,
  MockKVNamespace,
  MockR2Bucket,
  MockQueue,
  createMockEnv,
  resetMockData,
};
