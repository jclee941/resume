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
const LOCALES = ['resume_data.json', 'resume_data_en.json', 'resume_data_ja.json'];

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
  for (const file of LOCALES) {
    const filePath = path.join(MASTER_DIR, file);

    describe(file, () => {
      let strings;
      beforeAll(() => {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
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
    });
  }
});
