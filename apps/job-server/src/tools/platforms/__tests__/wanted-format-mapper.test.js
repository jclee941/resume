import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { mapToWantedFormat } from '../wanted-sync-operations.js';

describe('mapToWantedFormat career categories', () => {
  it('preserves Wanted security category when career role label is normalized', () => {
    const result = mapToWantedFormat({
      careers: [
        {
          company: '(주)아이티센 CTS',
          role: '보안운영 담당',
          period: '2025.03 ~ 2026.02',
          workType: '프리랜서',
        },
      ],
      education: {},
      skills: {},
      summary: {},
    });

    assert.strictEqual(result.careers[0].job_role, '보안 운영');
    assert.strictEqual(result.careers[0].job_category_id, 672);
  });
});
