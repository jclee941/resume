import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { readFile, rm, writeFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';

import {
  DEFAULT_DATA_DIR,
  decodeCursor,
  encodeCursor,
  ensureDirSync,
  ensureFileParentSync,
  makeEtag,
  toBuffer,
} from './common.js';
import { MockR2ObjectBody } from './r2-object.js';

export class MockR2Bucket {
  constructor(options = {}) {
    this.baseDir = options.baseDir || resolve(DEFAULT_DATA_DIR, 'r2');
    ensureDirSync(this.baseDir);
  }

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

  async delete(key) {
    const filePath = this.#resolveKeyPath(key);
    await rm(filePath, { force: true });
    await rm(this.#metaPath(filePath), { force: true });
  }

  async list(options = {}) {
    const prefix = options.prefix || '';
    const limit = Math.max(1, Math.min(1000, options.limit || 1000));
    const offset = decodeCursor(options.cursor);
    const delimiter = options.delimiter;
    const files = [];
    this.#walkFiles(this.baseDir, files);

    const allKeys = files
      .map((filePath) => relative(this.baseDir, filePath).replaceAll('\\', '/'))
      .filter((key) => !key.endsWith('.meta.json'))
      .filter((key) => key.startsWith(prefix))
      .sort();

    const delimitedPrefixes = new Set();
    let filteredKeys = allKeys;

    if (delimiter) {
      filteredKeys = [];
      for (const key of allKeys) {
        const remaining = key.slice(prefix.length);
        const pos = remaining.indexOf(delimiter);
        if (pos >= 0) {
          delimitedPrefixes.add(`${prefix}${remaining.slice(0, pos + delimiter.length)}`);
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

    return {
      objects,
      truncated: nextOffset < filteredKeys.length,
      cursor: nextOffset < filteredKeys.length ? encodeCursor(nextOffset) : '',
      delimitedPrefixes: [...delimitedPrefixes],
    };
  }

  #resolveKeyPath(key) {
    const clean = key.replace(/^\/+/, '');
    const target = resolve(this.baseDir, clean);
    if (!target.startsWith(this.baseDir)) {
      throw new Error(`Invalid R2 key path: ${key}`);
    }
    return target;
  }

  #metaPath(filePath) {
    return `${filePath}.meta.json`;
  }

  #writeMeta(filePath, payload) {
    const metaPath = this.#metaPath(filePath);
    ensureFileParentSync(metaPath);
    writeFileSync(metaPath, JSON.stringify(payload, null, 2), 'utf8');
  }

  #readMeta(filePath) {
    const metaPath = this.#metaPath(filePath);
    if (!existsSync(metaPath)) return {};
    try {
      return JSON.parse(readFileSync(metaPath, 'utf8'));
    } catch {
      return {};
    }
  }

  #walkFiles(dirPath, out) {
    if (!existsSync(dirPath)) return;
    const entries = readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const nextPath = join(dirPath, entry.name);
      if (entry.isDirectory()) {
        this.#walkFiles(nextPath, out);
      } else {
        out.push(nextPath);
      }
    }
  }
}
