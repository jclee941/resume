import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  DEFAULT_DATA_DIR,
  decodeCursor,
  encodeCursor,
  ensureFileParentSync,
  toBuffer,
} from './common.js';

export class MockKVNamespace {
  constructor(options = {}) {
    this.filePath = options.filePath || resolve(DEFAULT_DATA_DIR, 'kv.json');
    ensureFileParentSync(this.filePath);
    this.store = new Map();
    this.#load();
  }

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

  async put(key, value, options = {}) {
    const nowSec = Math.floor(Date.now() / 1000);
    const expiration =
      typeof options.expiration === 'number'
        ? options.expiration
        : typeof options.expirationTtl === 'number'
          ? nowSec + Math.max(0, Math.floor(options.expirationTtl))
          : null;

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

  async delete(key) {
    this.store.delete(key);
    this.#persist();
  }

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

    return {
      keys,
      list_complete: nextOffset >= all.length,
      cursor: nextOffset >= all.length ? '' : encodeCursor(nextOffset),
    };
  }

  #load() {
    if (!existsSync(this.filePath)) return;
    try {
      const data = JSON.parse(readFileSync(this.filePath, 'utf8'));
      for (const [key, value] of Object.entries(data)) {
        this.store.set(key, value);
      }
      this.#purgeExpired();
    } catch {
      this.store.clear();
    }
  }

  #persist() {
    writeFileSync(this.filePath, JSON.stringify(Object.fromEntries(this.store.entries()), null, 2));
  }

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

  #decodeText(item) {
    return item.encoding === 'base64'
      ? Buffer.from(item.value, 'base64').toString('utf8')
      : item.value;
  }
}
