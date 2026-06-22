import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { normalizeQueueEntry } from '../../../queue-apply.js';
import { parseWantedJobId } from '../../../strategies/wanted-id.js';
import { buildSubmitQueue } from '../rank.js';

describe('buildSubmitQueue Wanted id preservation', () => {
  it('keeps ranked Wanted ids valid for apply_queue submission', () => {
    const [entry] = buildSubmitQueue([
      {
        id: 'wanted_12345',
        source: 'wanted',
        position: 'Security Engineer',
        company: 'Wanted Co',
        location: 'Seoul',
        sourceUrl: 'https://www.wanted.co.kr/wd/12345',
        matchPercentage: 82,
        tier: 'auto',
      },
    ]);

    const job = normalizeQueueEntry(entry);

    assert.equal(job.id, 'wanted_12345');
    assert.equal(parseWantedJobId(job.id), 12345);
  });
});
