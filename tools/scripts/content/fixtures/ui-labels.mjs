import { promises as fs } from 'node:fs';
import path from 'node:path';

const TEMPLATE_DIR = 'apps/portfolio/lib/japanese-template';
const HANGUL_PHRASE = /[가-힣]{2,}(?: [가-힣]{2,})*/g;
// Generic interface labels and role titles that tests and templates address by exact text.
// None of them describes a person: they are the vocabulary of the page chrome.
const STATIC_PHRASES = [
  'Security & Infrastructure Engineer',
  'Security Engineering',
  'AI Engineering',
  'Open navigation',
  'Close navigation',
  'Experience',
  '개 기술',
  '件のスキル',
  '주력',
  '실무 적용',
  '활용 가능',
  '主力',
  'Primary',
  'Primary operating evidence',
  'Applied in project work',
  'Working familiarity',
  'Currently learning',
  '주요 운영 경험',
  '主な運用経験',
  'skill',
  '제약',
];

/**
 * Interface phrases to keep verbatim: the static list plus every Korean fragment the Japanese
 * page builder rewrites (its source strings are page chrome, tracked in the code). Address
 * strings are excluded because they describe where a person lives.
 * @param {string} root
 * @returns {Promise<string[]>}
 */
export async function loadUiPhrases(root) {
  const phrases = new Set(STATIC_PHRASES);
  const dir = path.join(root, TEMPLATE_DIR);
  for (const name of await fs.readdir(dir)) {
    if (!name.endsWith('.js')) continue;
    const source = await fs.readFile(path.join(dir, name), 'utf8');
    for (const line of source.split('\n')) {
      if (/address/i.test(line)) continue;
      for (const [phrase] of line.matchAll(HANGUL_PHRASE)) phrases.add(phrase);
    }
  }
  return [...phrases];
}
