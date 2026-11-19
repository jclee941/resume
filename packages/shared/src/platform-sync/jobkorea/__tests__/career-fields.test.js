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
  it('marks a current career as employed with no end month', () => {
    const fields = mapCareersToFormFields(
      {
        careers: [
          { company: 'A', period: '2026.07 ~ 현재' },
          { company: 'B', period: '2025.03 ~ 2026.02' },
        ],
      },
      ['c7', 'c8']
    );

    assert.equal(valueOf(fields, 'Career[c7].RetireSt'), '3');
    assert.equal(valueOf(fields, 'Career[c7].CEYM'), '');
    assert.equal(valueOf(fields, 'Career[c8].RetireSt'), '2');
    assert.equal(valueOf(fields, 'Career[c8].CEYM'), '202602');
  });
});
