import path from 'node:path';
import { placeholderJpeg, placeholderPdf, placeholderPng, placeholderWebp } from './binaries.mjs';
import { fakeHtml } from './html-faker.mjs';
import { fakeJs } from './js-faker.mjs';
import { fakeJson } from './json-faker.mjs';
import { fakePptx } from './pptx-faker.mjs';
import { fakeText } from './text-faker.mjs';
import { placeholderDocx } from './zip.mjs';

// Objects keyed by an employer, project, or similar identity-bearing name.
const KEY_PARENTS = new Set(['careerEn', 'projectEn', 'publicPortfolio']);
const BINARY = {
  '.png': placeholderPng,
  '.jpg': placeholderJpeg,
  '.jpeg': placeholderJpeg,
  '.webp': placeholderWebp,
  '.pdf': placeholderPdf,
  '.docx': placeholderDocx,
};

/**
 * Produce the fake counterpart of one real pack file: same format and structure, no real text.
 * Binaries become tiny valid placeholders; text formats keep their markup, keys, and code.
 * @param {string} repoPath
 * @param {Buffer} bytes
 * @param {{ enums: Set<string> }} context
 * @returns {Buffer}
 */
export function fakeFile(repoPath, bytes, { enums }) {
  const ext = path.posix.extname(repoPath).toLowerCase();
  if (ext === '.pptx') return fakePptx(bytes);
  if (BINARY[ext]) return BINARY[ext]();
  const text = bytes.toString('utf8');
  switch (ext) {
    case '.json': {
      const faked = fakeJson(JSON.parse(text), { enums, keyParents: KEY_PARENTS });
      return Buffer.from(`${JSON.stringify(faked, null, 2)}\n`);
    }
    case '.html':
      return Buffer.from(fakeHtml(text));
    case '.js':
      return Buffer.from(fakeJs(text));
    case '.md':
    case '.txt':
      return Buffer.from(fakeText(text));
    default:
      throw new Error(`no fixture strategy for ${repoPath}`);
  }
}
