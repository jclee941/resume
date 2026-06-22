import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeQueueEntry,
  assessQueueEntry,
  planQueueApply,
  runQueueApply,
} from '../queue-apply.js';

const validHealth = { valid: true };
const invalidHealth = { valid: false, reason: 'no_session' };

const queue = [
  { company: 'A', position: 'SRE', source: 'jobkorea', url: 'https://www.jobkorea.co.kr/wd/1' },
  { company: 'B', position: '보안', source: 'saramin', url: 'https://www.saramin.co.kr/2' },
  { id: 'wanted_3', company: 'C', position: 'DevOps', source: 'wanted', url: 'https://www.wanted.co.kr/wd/3' },
  { company: 'D', position: 'nourl', source: 'jobkorea', url: '' },
  { company: 'E', position: 'eng', source: 'linkedin', url: 'https://www.linkedin.com/jobs/5' },
];

function fakeRead() {
  return JSON.stringify(queue);
}

describe('normalizeQueueEntry', () => {
  it('maps curated queue fields to strategy job shape', () => {
    const job = normalizeQueueEntry(queue[0]);
    assert.equal(job.source, 'jobkorea');
    assert.equal(job.title, 'SRE');
    assert.equal(job.company, 'A');
    assert.equal(job.sourceUrl, 'https://www.jobkorea.co.kr/wd/1');
  });

  it('reconstructs Wanted URLs from validated Wanted ids', () => {
    const job = normalizeQueueEntry({
      id: 'wanted_123',
      company: 'C',
      position: 'DevOps',
      source: 'wanted',
      url: 'https://evil.example/apply',
    });
    assert.equal(job.id, 'wanted_123');
    assert.equal(job.sourceUrl, 'https://www.wanted.co.kr/wd/123');
  });
});

describe('assessQueueEntry', () => {
  it('blocks unsupported platforms (linkedin has no curated submit path here)', () => {
    const job = normalizeQueueEntry(queue[4]);
    const v = assessQueueEntry(job, { checkHealth: () => validHealth });
    assert.equal(v.ok, false);
    assert.match(v.reason, /unsupported_platform:linkedin/);
  });

  it('supports saramin (approved scope, has applyToSaramin strategy)', () => {
    const job = normalizeQueueEntry(queue[1]);
    const v = assessQueueEntry(job, { checkHealth: () => validHealth });
    assert.equal(v.ok, true);
  });

  it('blocks supported platform with no valid session', () => {
    const job = normalizeQueueEntry(queue[0]);
    const v = assessQueueEntry(job, { checkHealth: () => invalidHealth });
    assert.equal(v.ok, false);
    assert.match(v.reason, /no_valid_session:jobkorea/);
  });

  it('blocks entry missing url even with valid session', () => {
    const job = normalizeQueueEntry(queue[3]);
    const v = assessQueueEntry(job, { checkHealth: () => validHealth });
    assert.equal(v.ok, false);
    assert.match(v.reason, /missing_url/);
  });

  it('passes supported platform with valid session and url', () => {
    const job = normalizeQueueEntry(queue[0]);
    const v = assessQueueEntry(job, { checkHealth: () => validHealth });
    assert.equal(v.ok, true);
  });

  it('blocks Wanted queue entries without a valid Wanted id', () => {
    const job = normalizeQueueEntry({
      id: 'wanted_bad',
      company: 'C',
      position: 'DevOps',
      source: 'wanted',
      url: 'https://www.wanted.co.kr/wd/bad',
    });
    const v = assessQueueEntry(job, { checkHealth: () => validHealth });
    assert.equal(v.ok, false);
    assert.match(v.reason, /invalid_wanted_id/);
  });
});

describe('planQueueApply', () => {
  it('separates submittable from blocked with reasons', () => {
    const plan = planQueueApply('queue.json', {
      readFile: fakeRead,
      checkHealth: (p) => (p === 'jobkorea' ? validHealth : invalidHealth),
    });
    // jobkorea#1 valid+url => submittable; saramin no-session; wanted no-session;
    // jobkorea#4 no url; linkedin unsupported
    assert.equal(plan.submittable.length, 1);
    assert.equal(plan.submittable[0].source, 'jobkorea');
    assert.equal(plan.blocked.length, 4);
    const reasons = plan.blocked.map((b) => b.reason).join(',');
    assert.match(reasons, /no_valid_session:saramin/);
    assert.match(reasons, /no_valid_session:wanted/);
    assert.match(reasons, /missing_url/);
    assert.match(reasons, /unsupported_platform:linkedin/);
  });
});

describe('runQueueApply', () => {
  it('dry-run never calls applyToJob and reports plan', async () => {
    let calls = 0;
    const applier = {
      applyToJob: async () => {
        calls += 1;
        return { success: true };
      },
    };
    const res = await runQueueApply(
      { queuePath: 'q.json', applier, dryRun: true, logger: { info() {} } },
      { readFile: fakeRead, checkHealth: () => validHealth }
    );
    assert.equal(calls, 0);
    assert.equal(res.dryRun, true);
    // all 3 with urls + supported are submittable when every session is valid
    assert.equal(res.submittable >= 1, true);
    assert.equal(res.applied.length, 0);
  });

  it('real run submits only submittable entries via applyToJob', async () => {
    const calledWith = [];
    const applier = {
      applyToJob: async (job) => {
        calledWith.push(job.source);
        return { success: true };
      },
    };
    const res = await runQueueApply(
      { queuePath: 'q.json', applier, dryRun: false, logger: { info() {} } },
      { readFile: fakeRead, checkHealth: (p) => (p === 'jobkorea' ? validHealth : invalidHealth) }
    );
    // only the single valid jobkorea entry should be submitted
    assert.deepEqual(calledWith, ['jobkorea']);
    assert.equal(res.applied.length, 1);
    assert.equal(res.applied[0].success, true);
    assert.equal(res.blocked.length, 4);
  });

  it('respects max limit', async () => {
    const applier = { applyToJob: async () => ({ success: true }) };
    const res = await runQueueApply(
      { queuePath: 'q.json', applier, dryRun: false, max: 0, logger: { info() {} } },
      { readFile: fakeRead, checkHealth: () => validHealth }
    );
    assert.equal(res.applied.length, 0);
  });

  it('rejects negative max limits', async () => {
    const applier = { applyToJob: async () => ({ success: true }) };
    await assert.rejects(
      runQueueApply(
        { queuePath: 'q.json', applier, dryRun: false, max: -1, logger: { info() {} } },
        { readFile: fakeRead, checkHealth: () => validHealth }
      ),
      /max must be non-negative/
    );
  });
});
