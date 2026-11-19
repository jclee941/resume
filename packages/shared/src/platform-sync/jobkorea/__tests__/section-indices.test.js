import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { deriveJobKoreaSectionIndices } from '../section-indices.js';

describe('deriveJobKoreaSectionIndices', () => {
  it('keys the self-introduction to the stored row, skipping the template placeholder', () => {
    const indices = deriveJobKoreaSectionIndices([
      { name: 'ResumeProfile.Index', value: 'c539' },
      { name: 'ResumeProfile.Index', value: '<%=cid%>' },
    ]);

    assert.deepEqual(indices.intro, ['c539']);
  });
});
