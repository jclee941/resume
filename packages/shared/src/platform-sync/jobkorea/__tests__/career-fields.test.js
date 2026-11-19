import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { mapCareersToFormFields } from '../sections/career-fields.js';

/**
 * @param {Array<{ name: string, value: string }>} fields
 * @param {string} name
 */
function valueOf(fields, name) {
  return fields.find((field) => field.name === name)?.value;
}

describe('mapCareersToFormFields', () => {
  it('marks a current career as employed, ending in the current Korean month', () => {
    const fields = mapCareersToFormFields(
      {
        careers: [
          { company: 'A', period: '2026.07 ~ 현재' },
          { company: 'B', period: '2025.03 ~ 2026.02' },
        ],
      },
      ['c7', 'c8'],
      Date.parse('2026-11-30T16:00:00Z')
    );

    assert.equal(valueOf(fields, 'Career[c7].RetireSt'), '3');
    assert.equal(valueOf(fields, 'Career[c7].CEYM'), '202612');
    assert.equal(valueOf(fields, 'Career[c8].RetireSt'), '2');
    assert.equal(valueOf(fields, 'Career[c8].CEYM'), '202602');
  });

  it('sends the recorded rank as the 직급 code and clears the legacy one-character field', () => {
    const fields = mapCareersToFormFields(
      {
        careers: [
          { company: 'A', period: '2025.03 ~ 2026.02', role: '보안 인프라 엔지니어', rank: '대리' },
          { company: 'B', period: '2013.03 ~ 2014.10', role: '엔지니어' },
        ],
      },
      ['c7', 'c8']
    );

    assert.equal(valueOf(fields, 'Career[c7].Rank_Sub_Code'), '5');
    assert.equal(valueOf(fields, 'Career[c7].M_MainJob_Jikwi'), '');
    assert.equal(valueOf(fields, 'Career[c8].Rank_Sub_Code'), '');
  });
});
