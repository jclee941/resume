import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateJobHash,
  isDuplicate,
  markSeen,
  deduplicateJobs,
  purgeExpired,
  getDeduplicationStats,
  clearAll,
} from '../job-deduplicator.js';

describe('job-deduplicator', () => {
  beforeEach(() => {
    clearAll();
    mock.restoreAll();
  });

  it('generates consistent hashes for same input', () => {
    const job = { url: 'https://example.com/job/1', title: 'Engineer', company: 'Acme' };

    const first = generateJobHash(job);
    const second = generateJobHash(job);

    assert.equal(first, second);
  });

  it('normalizes case and whitespace when generating hash', () => {
    const a = {
      url: '  HTTPS://EXAMPLE.COM/JOB/1  ',
      title: '  Senior Engineer  ',
      company: '  ACME  ',
    };
    const b = {
      url: 'https://example.com/job/1',
      title: 'senior engineer',
      company: 'acme',
    };

    assert.equal(generateJobHash(a), generateJobHash(b));
  });

  it('handles missing fields in hash generation', () => {
    const hash = generateJobHash({});

    assert.match(hash, /^[a-f0-9]{16}$/);
  });

  it('returns a 16-character hex hash', () => {
    const hash = generateJobHash({
      url: 'https://example.com/job/2',
      title: 'Developer',
      company: 'Beta',
    });

    assert.equal(hash.length, 16);
    assert.match(hash, /^[a-f0-9]{16}$/);
  });

  it('reports duplicate status before and after markSeen', () => {
    const job = { url: 'https://example.com/job/3', title: 'Ops', company: 'Gamma' };

    assert.equal(isDuplicate(job), false);
    const hash = markSeen(job);
    assert.equal(typeof hash, 'string');
    assert.equal(hash.length, 16);
    assert.equal(isDuplicate(job), true);
  });

  it('uses default source when marking seen without source', () => {
    markSeen({ url: 'https://example.com/job/4', title: 'SRE', company: 'Delta' });

    assert.deepEqual(getDeduplicationStats(), {
      totalTracked: 1,
      bySource: { unknown: 1 },
    });
  });

  it('deduplicates jobs and marks unseen jobs as seen', () => {
    const jobs = [
      { url: 'https://example.com/job/5', title: 'A', company: 'Acme', source: 'wanted' },
      { url: 'https://example.com/job/5', title: 'A', company: 'Acme', source: 'wanted' },
      { url: 'https://example.com/job/6', title: 'B', company: 'Beta', source: 'saramin' },
    ];

    const unique = deduplicateJobs(jobs);

    assert.equal(unique.length, 2);
    assert.equal(isDuplicate(jobs[0]), true);
    assert.equal(isDuplicate(jobs[2]), true);
  });

  it('returns empty array when deduplicating an empty list', () => {
    assert.deepEqual(deduplicateJobs([]), []);
  });

  it('returns empty array when all jobs are duplicates', () => {
    const job = {
      url: 'https://example.com/job/7',
      title: 'Dev',
      company: 'Acme',
      source: 'wanted',
    };
    markSeen(job);

    const unique = deduplicateJobs([job, { ...job }]);

    assert.deepEqual(unique, []);
  });

  it('purges expired entries using default TTL and keeps fresh ones', () => {
    let now = 10_000_000;
    const nowMock = mock.method(Date, 'now', () => now);

    markSeen({ url: 'https://example.com/old', title: 'Old', company: 'Acme', source: 'wanted' });
    now += 7 * 24 * 60 * 60 * 1000 + 1;
    markSeen({ url: 'https://example.com/new', title: 'New', company: 'Acme', source: 'saramin' });

    const purged = purgeExpired();

    assert.equal(purged, 1);
    assert.deepEqual(getDeduplicationStats(), {
      totalTracked: 1,
      bySource: { saramin: 1 },
    });
    nowMock.mock.restore();
  });

  it('purges entries with custom ttl and returns purged count', () => {
    let now = 1_000;
    const nowMock = mock.method(Date, 'now', () => now);

    markSeen({ url: 'https://example.com/job/8', title: 'Old1', company: 'A', source: 'wanted' });
    now += 200;
    markSeen({ url: 'https://example.com/job/9', title: 'Old2', company: 'B', source: 'wanted' });
    now += 200;
    markSeen({
      url: 'https://example.com/job/10',
      title: 'Fresh',
      company: 'C',
      source: 'jobkorea',
    });

    const purged = purgeExpired(250);

    assert.equal(purged, 1);
    assert.deepEqual(getDeduplicationStats(), {
      totalTracked: 2,
      bySource: { wanted: 1, jobkorea: 1 },
    });
    nowMock.mock.restore();
  });

  it('returns zero purged when no entries are expired', () => {
    let now = 5_000;
    const nowMock = mock.method(Date, 'now', () => now);

    markSeen({
      url: 'https://example.com/job/11',
      title: 'Fresh',
      company: 'Keep',
      source: 'wanted',
    });
    now += 100;

    const purged = purgeExpired(10_000);

    assert.equal(purged, 0);
    assert.equal(getDeduplicationStats().totalTracked, 1);
    nowMock.mock.restore();
  });

  it('returns empty stats after clearAll and supports grouped stats', () => {
    markSeen({ url: 'https://example.com/job/12', title: 'One', company: 'A', source: 'wanted' });
    markSeen({ url: 'https://example.com/job/13', title: 'Two', company: 'B', source: 'wanted' });
    markSeen({
      url: 'https://example.com/job/14',
      title: 'Three',
      company: 'C',
      source: 'saramin',
    });

    assert.deepEqual(getDeduplicationStats(), {
      totalTracked: 3,
      bySource: { wanted: 2, saramin: 1 },
    });

    clearAll();

    assert.deepEqual(getDeduplicationStats(), {
      totalTracked: 0,
      bySource: {},
    });
  });
});
