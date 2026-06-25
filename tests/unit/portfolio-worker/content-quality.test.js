/**
 * Content quality regression guards for the resume SSoT data.
 *
 * These pin against AI-generated copy defects (duplicated phrases, circular
 * "X via X" phrasing) that surfaced on resume.jclee.me. The SSoT lives in
 * packages/data/resumes/master/resume_data*.json and is propagated to the
 * portfolio via `npm run sync:data`, so we assert on the SSoT directly.
 */
const fs = require('fs');
const path = require('path');

const MASTER_DIR = path.resolve(__dirname, '../../../packages/data/resumes/master');
const PORTFOLIO_DIR = path.resolve(__dirname, '../../../apps/portfolio');
const DATA_FILES = [
  { dir: MASTER_DIR, file: 'resume_data.json' },
  { dir: MASTER_DIR, file: 'resume_data_en.json' },
  { dir: MASTER_DIR, file: 'resume_data_ja.json' },
  { dir: PORTFOLIO_DIR, file: 'data.json' },
  { dir: PORTFOLIO_DIR, file: 'data_en.json' },
  { dir: PORTFOLIO_DIR, file: 'data_ja.json' },
];

/** Collect every string value in a nested JSON structure. */
function collectStrings(node, out = []) {
  if (typeof node === 'string') {
    out.push(node);
  } else if (Array.isArray(node)) {
    for (const item of node) collectStrings(item, out);
  } else if (node && typeof node === 'object') {
    for (const value of Object.values(node)) collectStrings(value, out);
  }
  return out;
}

/**
 * Detect an immediately repeated 3+ word phrase within one sentence, where the
 * two occurrences are adjacent or near-adjacent (separated by <=2 filler words
 * like "and standardized"). This targets AI copy defects such as
 * "...operator response flow and standardized operator response flow" without
 * flagging legitimate distant repetition across a long sentence.
 */
function findRepeatedPhrase(text) {
  const m = text.match(/\b((?:[\w-]+\s+){2,}[\w-]+)\b(?:\s+\w+){0,2}\s+\1\b/i);
  return m ? m[1] : null;
}

/**
 * Detect circular "<phrase> <connector> <same phrase> <restating word>"
 * phrasing where the object merely restates the verb/noun, e.g.
 * "Tuned DB access-control queries via DB access-control query tuning" or
 * "reviewed DB access-control queries with DB access-control query tuning".
 * Connector is via|with|by; requires the repeated span to immediately follow it.
 */
function findCircularViaPhrase(text) {
  const m = text.match(/\b([\w-]+(?:\s+[\w-]+){1,3})\s+\w+\s+(?:via|with|by)\s+\1\b/i);
  return m ? m[1] : null;
}

describe('SSoT content quality', () => {
  for (const { dir, file } of DATA_FILES) {
    const filePath = path.join(dir, file);

    describe(file, () => {
      let strings;
      let data;
      beforeAll(() => {
        data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        strings = collectStrings(data);
      });

      test('has no immediately repeated phrases', () => {
        const offenders = strings
          .map((s) => ({ s, dup: findRepeatedPhrase(s) }))
          .filter((x) => x.dup);
        expect(offenders.map((o) => o.dup)).toEqual([]);
      });

      test('has no circular "X via X" phrasing', () => {
        const offenders = strings
          .map((s) => ({ s, dup: findCircularViaPhrase(s) }))
          .filter((x) => x.dup);
        expect(offenders.map((o) => o.dup)).toEqual([]);
      });

      test('has no content-production work markers like [課題] in any string', () => {
        // Bracketed problem-framing markers ([課題]=issue, [解決]=solution, etc.)
        // are authoring scaffolds and must never reach rendered copy.
        const markerRe = /\[(課題|解決|成果|問題|과제|해결|성과|Problem|Solution|Outcome)\]/;
        const offenders = strings.filter((s) => markerRe.test(s));
        expect(offenders).toEqual([]);
      });

      test('certifications expose acquisition date only (no expiry note/status/field)', () => {
        const certs = (data && data.certifications) || [];
        // No parenthetical expiry note baked into the date string.
        const dateOffenders = certs.filter((c) => typeof c.date === 'string' && /\(/.test(c.date));
        expect(dateOffenders.map((c) => `${c.name}: ${c.date}`)).toEqual([]);
        // No 'expired' status and no populated expirationDate.
        const statusOffenders = certs.filter(
          (c) => String(c.status || '').toLowerCase() === 'expired'
        );
        expect(statusOffenders.map((c) => c.name)).toEqual([]);
        const expiryOffenders = certs.filter((c) => c.expirationDate);
        expect(expiryOffenders.map((c) => c.name)).toEqual([]);
      });

      test('Japanese reconnaissance term is not the typo \u507a\u5bdf', () => {
        const offenders = strings.filter((s) => s.includes('\u507a\u5bdf'));
        expect(offenders).toEqual([]);
      });
    });
  }
});
