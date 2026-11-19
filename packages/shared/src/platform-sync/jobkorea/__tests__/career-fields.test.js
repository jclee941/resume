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
});
