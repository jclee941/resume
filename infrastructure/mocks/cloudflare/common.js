import { createHash } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const moduleDir = dirname(fileURLToPath(import.meta.url));

export const DEFAULT_DATA_DIR = resolve(moduleDir, '..', 'data');

export function ensureDirSync(dirPath) {
  mkdirSync(dirPath, { recursive: true });
}

export function ensureFileParentSync(filePath) {
  ensureDirSync(dirname(filePath));
}

export async function toBuffer(value) {
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

export function makeEtag(buffer) {
  return createHash('sha1').update(buffer).digest('hex');
}

export function encodeCursor(offset) {
  return Buffer.from(String(offset), 'utf8').toString('base64url');
}

export function decodeCursor(cursor) {
  if (!cursor) return 0;
  try {
    const decoded = Buffer.from(cursor, 'base64url').toString('utf8');
    const parsed = Number.parseInt(decoded, 10);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  } catch {
    return 0;
  }
}
