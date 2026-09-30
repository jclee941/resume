import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { FIXTURES_DIR, REPO_ROOT, createMatcher, loadPack } from './pack.mjs';

const MOBILE = /(?<!\d)01[016789][-. ]?\d{3,4}[-. ]?\d{4}(?!\d)/g;
const KAKAO = /@kakao\.com/gi;
const FAKE_DIGITS = new Set(['01000000000', '01012345678']);
const MASTER_DIR = 'packages/data/resumes/master';
const LOCALE_FILES = ['resume_data.json', 'resume_data_en.json', 'resume_data_ja.json'];
const MAX_SCAN_BYTES = 8 * 1024 * 1024;

/**
 * @typedef {{ kind: string, value: string }} Identifier
 * @typedef {Record<string, number>} KindCounts
 */

/**
 * Exact identifiers from the materialized master data; empty when the pack is absent.
 * Values stay in memory and are never printed.
 * @param {string} root
 * @returns {Identifier[]}
 */
export function loadIdentifiers(root) {
  const found = new Map();
  const add = (kind, value, minLength) => {
    const text = typeof value === 'string' ? value.trim() : '';
    if (text.length >= minLength) found.set(`${kind}\0${text}`, { kind, value: text });
  };
  for (const file of LOCALE_FILES) {
    let data;
    try {
      data = JSON.parse(readFileSync(path.join(root, MASTER_DIR, file), 'utf8'));
    } catch (error) {
      if (error.code === 'ENOENT') continue;
      throw new Error(`cannot parse ${MASTER_DIR}/${file}`, { cause: error });
    }
    const personal = data.personal ?? {};
    add('name', personal.name, 3);
    add('email', personal.email, 3);
    add('phone', personal.phone, 3);
    for (const career of data.careers ?? []) add('employer', career?.company, 4);
    add('school', data.education?.school, 4);
  }
  return [...found.values()];
}

/**
 * @param {string} text
 * @param {Identifier[]} identifiers
 * @returns {KindCounts}
 */
export function countTokens(text, identifiers) {
  /** @type {KindCounts} */
  const counts = {};
  const bump = (kind, n) => n > 0 && (counts[kind] = (counts[kind] ?? 0) + n);
  for (const match of text.matchAll(MOBILE)) {
    if (!FAKE_DIGITS.has(match[0].replace(/\D/g, ''))) bump('mobile-number', 1);
  }
  bump('kakao-email', [...text.matchAll(KAKAO)].length);
  for (const { kind, value } of identifiers) bump(kind, text.split(value).length - 1);
  return counts;
}

/**
 * @param {string} root
 * @param {string[]} args
 * @returns {Buffer}
 */
function git(root, args) {
  return execFileSync('git', args, {
    cwd: root,
    maxBuffer: 1 << 28,
    stdio: ['ignore', 'pipe', 'ignore'],
  });
}

/**
 * @param {string} root
 * @param {'staged' | 'tracked'} mode
 * @returns {string[]}
 */
export function listPaths(root, mode) {
  const args =
    mode === 'staged'
      ? ['diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z']
      : ['ls-files', '-z'];
  return git(root, args).toString('utf8').split('\0').filter(Boolean);
}

/**
 * @param {string} root
 * @param {'staged' | 'tracked'} mode
 * @param {string} repoPath
 * @returns {string | null} text, or null for binary, oversized, or unreadable files
 */
function readText(root, mode, repoPath) {
  let bytes;
  try {
    bytes =
      mode === 'staged'
        ? git(root, ['show', `:${repoPath}`])
        : readFileSync(path.join(root, repoPath));
  } catch {
    return null;
  }
  if (bytes.length > MAX_SCAN_BYTES || bytes.subarray(0, 8000).includes(0)) return null;
  return bytes.toString('utf8');
}

/**
 * Flag pack paths and personal tokens; only paths, kinds, and counts are reported.
 * @param {{ root?: string, mode?: 'staged' | 'tracked', report?: boolean, out?: (line: string) => void }} [options]
 * @returns {Promise<Map<string, KindCounts>>} flagged files
 */
export async function guard({
  root = REPO_ROOT,
  mode = 'staged',
  report = false,
  out = console.log,
} = {}) {
  const matcher = createMatcher(await loadPack());
  const identifiers = loadIdentifiers(root);
  const hits = new Map();
  for (const repoPath of listPaths(root, mode)) {
    if (repoPath.startsWith(`${FIXTURES_DIR}/`)) continue;
    const counts = matcher.matches(repoPath) ? { 'pack-path': 1 } : {};
    const text = readText(root, mode, repoPath);
    if (text !== null) Object.assign(counts, countTokens(text, identifiers));
    if (Object.keys(counts).length > 0) hits.set(repoPath, counts);
  }
  const totals = {};
  for (const counts of hits.values()) {
    for (const [kind, n] of Object.entries(counts)) totals[kind] = (totals[kind] ?? 0) + n;
  }
  const fmt = (counts) =>
    Object.entries(counts)
      .map(([kind, n]) => (report ? `${kind}=${n}` : kind))
      .join(', ');
  out(`guard (${mode}): ${hits.size} flagged files${hits.size ? ` [${fmt(totals)}]` : ''}`);
  for (const [repoPath, counts] of [...hits].sort(([a], [b]) => a.localeCompare(b))) {
    out(`  ${repoPath}: ${fmt(counts)}`);
  }
  return hits;
}
