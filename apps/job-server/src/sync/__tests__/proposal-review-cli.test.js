import assert from 'node:assert/strict';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import test from 'node:test';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { updateProposalStatus } from '../proposal-provenance.js';
import { publishReviewedProposal } from '../proposal-review-publication.js';

test('preserves a pending proposal when destination publication rename fails', () => {
  // Given
  const directory = mkdtempSync(join(tmpdir(), 'proposal-review-'));
  const { originalContent, proposal } = writePendingProposal(directory, 'proposal-rename-failure');
  const targetDir = join(directory, 'approved');

  try {
    // When
    assert.throws(
      () => publishReviewedProposal({ proposal, targetDir, status: 'approved', rename: failRename }),
      /forced rename failure/
    );

    // Then
    assert.equal(readFileSync(proposal.filePath, 'utf8'), originalContent);
    assert.equal(existsSync(join(targetDir, 'proposal-rename-failure.proposal.json')), false);
  } finally {
    rmSync(directory, { force: true, recursive: true });
  }
});

test('rejects an existing review destination without overwriting either proposal', () => {
  // Given
  const directory = mkdtempSync(join(tmpdir(), 'proposal-review-'));
  const { originalContent, proposal } = writePendingProposal(directory, 'proposal-collision');
  const targetDir = join(directory, 'rejected');
  const destinationPath = join(targetDir, 'proposal-collision.proposal.json');
  const destinationContent = `${JSON.stringify(
    {
      ...proposal,
      proposalHash: 'previous-review-hash',
      proposedValue: { name: 'Rust' },
      status: 'rejected',
    },
    null,
    2
  )}\n`;
  mkdirSync(targetDir);
  writeFileSync(destinationPath, destinationContent);

  try {
    // When
    assert.throws(
      () => publishReviewedProposal({ proposal, targetDir, status: 'rejected' }),
      /destination exists/
    );

    // Then
    assert.equal(readFileSync(proposal.filePath, 'utf8'), originalContent);
    assert.equal(readFileSync(destinationPath, 'utf8'), destinationContent);
  } finally {
    rmSync(directory, { force: true, recursive: true });
  }
});

test('merges compatible review destination evidence without losing the pending proposal', () => {
  // Given
  const directory = mkdtempSync(join(tmpdir(), 'proposal-review-'));
  const { proposal } = writePendingProposal(directory, 'proposal-compatible-collision');
  const targetDir = join(directory, 'approved');
  const destinationPath = join(targetDir, 'proposal-compatible-collision.proposal.json');
  const existing = {
    ...proposal,
    evidence: [{ text: 'existing evidence' }],
    proposalHash: 'existing-hash',
    sourceRefs: [{ jobId: 'existing-job' }],
    status: 'approved',
  };
  proposal.evidence = [{ text: 'pending evidence' }];
  proposal.sourceRefs = [{ jobId: 'pending-job' }];
  writeFileSync(proposal.filePath, `${JSON.stringify(proposal, null, 2)}\n`);
  mkdirSync(targetDir);
  writeFileSync(destinationPath, `${JSON.stringify(existing, null, 2)}\n`);

  try {
    // When
    publishReviewedProposal({ proposal, targetDir, status: 'approved' });

    // Then
    const published = JSON.parse(readFileSync(destinationPath, 'utf8'));
    assert.equal(existsSync(proposal.filePath), false);
    assert.deepEqual(published.evidence, [{ text: 'existing evidence' }, { text: 'pending evidence' }]);
    assert.deepEqual(published.sourceRefs, [{ jobId: 'existing-job' }, { jobId: 'pending-job' }]);
    assert.notEqual(published.proposalHash, existing.proposalHash);
  } finally {
    rmSync(directory, { force: true, recursive: true });
  }
});

test('restores a compatible destination when moving the pending proposal fails', () => {
  const directory = mkdtempSync(join(tmpdir(), 'proposal-review-'));
  const { proposal } = writePendingProposal(directory, 'proposal-compatible-rollback');
  const targetDir = join(directory, 'approved');
  const destinationPath = join(targetDir, 'proposal-compatible-rollback.proposal.json');
  proposal.evidence = [{ text: 'pending evidence' }];
  const pendingContent = `${JSON.stringify(proposal, null, 2)}\n`;
  const existing = {
    ...proposal,
    evidence: [{ text: 'existing evidence' }],
    proposalHash: 'existing-hash',
    status: 'approved',
  };
  const destinationContent = `${JSON.stringify(existing, null, 2)}\n`;
  writeFileSync(proposal.filePath, pendingContent);
  mkdirSync(targetDir);
  writeFileSync(destinationPath, destinationContent);

  try {
    assert.throws(
      () => publishReviewedProposal({ proposal, targetDir, status: 'approved', rename: failRename }),
      /forced rename failure/
    );
    assert.equal(readFileSync(proposal.filePath, 'utf8'), pendingContent);
    assert.equal(readFileSync(destinationPath, 'utf8'), destinationContent);
    assert.deepEqual(readdirSync(targetDir), ['proposal-compatible-rollback.proposal.json']);
  } finally {
    rmSync(directory, { force: true, recursive: true });
  }
});

test('publishes the reviewed hash and status only after the destination is safe', () => {
  // Given
  const directory = mkdtempSync(join(tmpdir(), 'proposal-review-'));
  const { proposal } = writePendingProposal(directory, 'proposal-approved');
  const targetDir = join(directory, 'approved');

  try {
    // When
    const destinationPath = publishReviewedProposal({ proposal, targetDir, status: 'approved' });

    // Then
    const published = JSON.parse(readFileSync(destinationPath, 'utf8'));
    assert.equal(existsSync(proposal.filePath), false);
    assert.equal(published.status, 'approved');
    assert.equal(published.proposalHash, updateProposalStatus(proposal, 'approved').proposalHash);
  } finally {
    rmSync(directory, { force: true, recursive: true });
  }
});

function writePendingProposal(directory, id) {
  const filePath = join(directory, `${id}.proposal.json`);
  const proposal = {
    allowedChanges: [],
    confidence: 0.8,
    createdAt: '2026-07-23T00:00:00.000Z',
    currentValue: null,
    evidence: [],
    id,
    masterRevision: 'revision',
    notes: 'test proposal',
    proposalHash: 'hash',
    proposedValue: { name: 'Go' },
    rejectedChanges: [],
    source: { crawler: 'test', jobId: id, platform: 'test' },
    sourceRefs: [],
    status: 'pending',
    target: { operation: 'add', path: '/skills/backend/items/-', resumePath: 'resume.json' },
    version: 1,
  };
  const originalContent = `${JSON.stringify(proposal, null, 2)}\n`;
  writeFileSync(filePath, originalContent);
  return { originalContent, proposal: { ...proposal, filePath } };
}

function failRename() {
  throw new Error('forced rename failure');
}
