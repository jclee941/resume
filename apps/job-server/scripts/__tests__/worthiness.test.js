import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { filterWorthy, WORTHY_MIN_SCORE } from '../worthiness.js';

const jobs = [
  { company: 'A', position: 'SRE', url: 'https://x/1', matchPercentage: 82 },
  { company: 'B', position: 'DevOps', url: 'https://x/2', matchPercentage: 60 },
  { company: 'C', position: 'Junior', url: 'https://x/3', matchPercentage: 41 },
  { company: 'D', position: 'NoScore', url: 'https://x/4' }, // no score
  { company: 'E', position: 'BySnakeCase', url: 'https://x/5', match_percentage: 70 },
  { company: 'F', position: 'ByMatchScore', url: 'https://x/6', matchScore: 90 },
];

describe('filterWorthy', () => {
  it('S8: keeps only jobs scoring >= the threshold (지원할만한)', () => {
    const worthy = filterWorthy(jobs, 60);
    const positions = worthy.map((j) => j.position);
    assert.ok(positions.includes('SRE'), '82 kept');
    assert.ok(positions.includes('DevOps'), '60 (== threshold) kept');
    assert.ok(positions.includes('BySnakeCase'), '70 via match_percentage kept');
    assert.ok(positions.includes('ByMatchScore'), '90 via matchScore kept');
    assert.ok(!positions.includes('Junior'), '41 dropped');
    assert.ok(!positions.includes('NoScore'), 'unscored dropped (cannot prove worthiness)');
  });

  it('S8b: sorts worthy jobs by score descending (best first)', () => {
    const worthy = filterWorthy(jobs, 60);
    const scores = worthy.map((j) => j.matchPercentage ?? j.match_percentage ?? j.matchScore);
    const sorted = [...scores].sort((a, b) => b - a);
    assert.deepEqual(scores, sorted, 'must be sorted high→low');
  });

  it('S8c: default threshold is 60', () => {
    assert.equal(WORTHY_MIN_SCORE, 60);
    const worthy = filterWorthy(jobs);
    assert.ok(!worthy.some((j) => j.position === 'Junior'));
  });

  it('S8d: empty/invalid input returns empty array', () => {
    assert.deepEqual(filterWorthy([], 60), []);
    assert.deepEqual(filterWorthy(null, 60), []);
    assert.deepEqual(filterWorthy(undefined), []);
  });
});
