import assert from 'node:assert/strict';
import test from 'node:test';

import { generateProposalsFromCrawlerResult } from '../proposal-generator.js';

test('emits source-aware proposal records', () => {
  // Given
  const resumeData = {
    skills: {
      backend: { items: [] },
    },
  };
  const crawlerResult = {
    jobs: [
      {
        id: 'wanted-123',
        source: 'wanted',
        company: 'Example Co',
        position: 'Backend Engineer',
        techStack: ['Go'],
        url: 'https://www.wanted.co.kr/wd/123',
      },
    ],
  };
  const options = { resumeData, timestamp: '2026-07-23T00:00:00.000Z' };

  // When
  const [proposal] = generateProposalsFromCrawlerResult(crawlerResult, options);
  const [repeatedProposal] = generateProposalsFromCrawlerResult(crawlerResult, options);

  // Then
  assert.match(proposal.masterRevision, /^[a-f0-9]{64}$/);
  assert.deepEqual(proposal.sourceRefs, [
    {
      crawler: 'unified-job-crawler',
      jobId: 'wanted-123',
      platform: 'wanted',
      type: 'crawler-job',
      url: 'https://www.wanted.co.kr/wd/123',
    },
  ]);
  assert.deepEqual(proposal.allowedChanges, [
    {
      proposedValue: { level: 'beginner', name: 'Go' },
      target: {
        operation: 'add',
        path: '/skills/backend/items/-',
        resumePath: 'packages/data/resumes/master/resume_data.json',
      },
    },
  ]);
  assert.deepEqual(proposal.rejectedChanges, []);
  assert.match(proposal.proposalHash, /^[a-f0-9]{64}$/);
  assert.equal(proposal.proposalHash, repeatedProposal.proposalHash);
});

test('deduplicates skill additions across a crawler batch', () => {
  // Given
  const resumeData = {
    skills: {
      backend: { items: [] },
    },
  };
  const crawlerResult = {
    jobs: [
      {
        id: 'wanted-123',
        source: 'wanted',
        position: 'Backend Engineer',
        techStack: ['Go'],
      },
      {
        id: 'wanted-456',
        source: 'wanted',
        position: 'Platform Engineer',
        techStack: ['Go'],
      },
    ],
  };

  // When
  const proposals = generateProposalsFromCrawlerResult(crawlerResult, {
    resumeData,
    timestamp: '2026-07-23T00:00:00.000Z',
  });

  // Then
  assert.deepEqual(
    proposals.map((proposal) => proposal.proposedValue.name),
    ['Go']
  );
});

test('creates distinct proposal IDs for distinct skills from the same job', () => {
  // Given
  const resumeData = { skills: { backend: { items: [] } } };
  const crawlerResult = {
    jobs: [
      {
        id: 'wanted-123',
        source: 'wanted',
        position: 'Platform Engineer',
        techStack: ['Go', 'Python'],
      },
    ],
  };

  // When
  const proposals = generateProposalsFromCrawlerResult(crawlerResult, {
    resumeData,
    timestamp: '2026-07-23T00:00:00.000Z',
  });

  // Then
  assert.equal(proposals.length, 2);
  assert.equal(new Set(proposals.map((proposal) => proposal.id)).size, 2);
});

test('merges evidence for an equivalent skill proposal across a crawler batch', () => {
  // Given
  const resumeData = { skills: { backend: { items: [] } } };
  const crawlerResult = {
    jobs: [
      { id: 'wanted-123', source: 'wanted', position: 'Backend Engineer', techStack: ['Go'] },
      { id: 'wanted-456', source: 'wanted', position: 'Platform Engineer', techStack: ['Go'] },
    ],
  };

  // When
  const proposals = generateProposalsFromCrawlerResult(crawlerResult, {
    resumeData,
    timestamp: '2026-07-23T00:00:00.000Z',
  });

  // Then
  assert.equal(proposals.length, 1);
  assert.equal(proposals[0].evidence.length, 2);
  assert.deepEqual(
    proposals[0].sourceRefs.map((sourceRef) => sourceRef.jobId).sort(),
    ['wanted-123', 'wanted-456']
  );
});
