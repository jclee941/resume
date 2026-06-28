import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { getJobKoreaApplyKey } from '../pipeline/apply-jobkorea.js';
import { getDedupKey } from '../pipeline/dedup-cache.js';
import { scoreJobKorea } from '../pipeline/search.js';

describe('pipeline dedup cache keys', () => {
  it('deduplicates JobKorea search results by posting id before URL', () => {
    const first = {
      id: 'jobkorea_49427046',
      source: 'jobkorea',
      sourceId: '49427046',
      sourceUrl: 'https://www.jobkorea.co.kr/Recruit/GI_Read/49427046?stext=보안',
    };
    const second = {
      ...first,
      sourceUrl: 'https://www.jobkorea.co.kr/Recruit/GI_Read/49427046?stext=클라우드',
    };

    assert.equal(getDedupKey(first), getDedupKey(second));
  });

  it('keeps JobKorea posting ids distinct from Wanted numeric ids', () => {
    assert.notEqual(
      getDedupKey({ source: 'wanted', id: '49427046' }),
      getDedupKey({ source: 'jobkorea', id: 'jobkorea_49427046', sourceId: '49427046' })
    );
  });

  it('preserves JobKorea posting id through scoring for cross-run dedup', async () => {
    const scored = await scoreJobKorea({
      id: 'jobkorea_49427046',
      sourceId: '49427046',
      position: '클라우드 SA 운영 Kubernetes 경험자',
      company: '우나프론트',
      sourceUrl: 'https://www.jobkorea.co.kr/Recruit/GI_Read/49427046?stext=보안',
    });

    assert.equal(scored.sourceId, '49427046');
  });

  it('uses the same in-run apply key for duplicate JobKorea URL variants', () => {
    const first = {
      id: 'jobkorea_49427046',
      sourceId: '49427046',
      url: 'https://www.jobkorea.co.kr/Recruit/GI_Read/49427046?stext=보안',
    };
    const second = {
      ...first,
      url: 'https://www.jobkorea.co.kr/Recruit/GI_Read/49427046?stext=클라우드',
    };

    assert.equal(getJobKoreaApplyKey(first), getJobKoreaApplyKey(second));
  });
});
