import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { mapToWantedFormat } from '../format-mapper.js';

describe('mapToWantedFormat', () => {
  it('sends the education degree as one of the Wanted degree enum values', () => {
    const { educations } = mapToWantedFormat({
      education: {
        school: '예시대학교',
        major: '컴퓨터공학과',
        startDate: '2023.03',
        endDate: '2026.08',
        status: '졸업',
      },
    });

    assert.equal(educations[0].degree, 'BACHELOR');
  });
});
