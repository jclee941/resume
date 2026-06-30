import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { PLATFORMS } from '../config.js';
import { WANTED_ABOUT_LIMIT } from '../../../src/tools/platforms/wanted-sync-operations.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const realSSoT = JSON.parse(
  fs.readFileSync(
    path.resolve(__dirname, '../../../../../packages/data/resumes/master/resume_data.json'),
    'utf8'
  )
);

describe('profile-sync-cli config — Wanted mapData introduction', () => {
  it('uses the Wanted-specific headline for the profile introduction', () => {
    const target = PLATFORMS.wanted.mapData(realSSoT);
    assert.strictEqual(target.introduction, realSSoT.platformVariants.wanted.headline);
  });

  it('keeps introduction within the Wanted 150-char limit', () => {
    const target = PLATFORMS.wanted.mapData(realSSoT);

    assert.ok(
      target.introduction.length <= 150,
      `introduction must be <= 150 chars, got ${target.introduction.length}`
    );
  });

  it('keeps real Wanted about within the resume about limit', () => {
    const about = realSSoT.platformVariants.wanted.about;

    assert.ok(about.length <= WANTED_ABOUT_LIMIT, `about must be <= ${WANTED_ABOUT_LIMIT} chars`);
  });

  it('falls back to truncated profileStatement when Wanted headline is absent', () => {
    const source = realSSoT.summary.profileStatement || '';
    const ssotWithoutHeadline = {
      ...realSSoT,
      platformVariants: { wanted: { about: realSSoT.platformVariants.wanted.about } },
    };
    const target = PLATFORMS.wanted.mapData(ssotWithoutHeadline);

    assert.strictEqual(target.introduction.length, 150);
    assert.ok(target.introduction.endsWith('...'));
    assert.strictEqual(target.introduction, `${source.slice(0, 147)}...`);
  });

  it('leaves short introductions unchanged (no spurious ellipsis)', () => {
    const shortSSoT = {
      ...realSSoT,
      platformVariants: { wanted: {} },
      summary: { ...realSSoT.summary, profileStatement: '짧은 소개' },
    };
    const target = PLATFORMS.wanted.mapData(shortSSoT);
    assert.strictEqual(target.introduction, '짧은 소개');
  });
});
