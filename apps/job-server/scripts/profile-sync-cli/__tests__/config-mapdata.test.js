import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { PLATFORMS } from '../config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const realSSoT = JSON.parse(
  fs.readFileSync(
    path.resolve(__dirname, '../../../../../packages/data/resumes/master/resume_data.json'),
    'utf8'
  )
);

describe('profile-sync-cli config — Wanted mapData introduction truncation', () => {
  it('truncates introduction to the Wanted 150-char limit so diff is idempotent with the write', () => {
    // The write path (wanted-sync.js) truncates introduction to 147 + "..." (150 total)
    // because the Wanted API rejects descriptions > 150 chars. The diff target MUST be
    // truncated the same way, otherwise the diff is never idempotent (re-writes every run).
    const target = PLATFORMS.wanted.mapData(realSSoT);
    assert.ok(
      target.introduction.length <= 150,
      `introduction must be <= 150 chars, got ${target.introduction.length}`
    );
  });

  it('ends with "..." ellipsis when the source profileStatement exceeds 150 chars', () => {
    const source = realSSoT.summary.profileStatement || '';
    if (source.length > 150) {
      const target = PLATFORMS.wanted.mapData(realSSoT);
      assert.strictEqual(
        target.introduction.length,
        150,
        'truncated introduction should be exactly 150 chars'
      );
      assert.ok(
        target.introduction.endsWith('...'),
        'truncated introduction should end with "..."'
      );
      assert.strictEqual(
        target.introduction,
        `${source.slice(0, 147)}...`,
        'truncation must match the write path (slice(0,147) + "...")'
      );
    }
  });

  it('leaves short introductions unchanged (no spurious ellipsis)', () => {
    const shortSSoT = {
      ...realSSoT,
      summary: { ...realSSoT.summary, profileStatement: '짧은 소개' },
    };
    const target = PLATFORMS.wanted.mapData(shortSSoT);
    assert.strictEqual(target.introduction, '짧은 소개');
  });
});
