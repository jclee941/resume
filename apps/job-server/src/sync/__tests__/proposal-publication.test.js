import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { generateProposalsFromCrawlerResult, writeProposalFiles } from '../proposal-generator.js';

const resumeData = { skills: { backend: { items: [] } } };
const timestamp = '2026-07-23T00:00:00.000Z';

function generate(job) {
  return generateProposalsFromCrawlerResult({ jobs: [job] }, { resumeData, timestamp });
}

test('merges equivalent proposal evidence across proposal generation runs', () => {
  const proposalsDir = mkdtempSync(join(tmpdir(), 'proposal-publication-'));
  const options = { proposalsDir };

  try {
    writeProposalFiles(
      generate({ id: 'wanted-123', source: 'wanted', position: 'Backend Engineer', techStack: ['Go'] }),
      options
    );
    writeProposalFiles(
      generate({ id: 'wanted-456', source: 'wanted', position: 'Platform Engineer', techStack: ['Go'] }),
      options
    );

    const files = readdirSync(proposalsDir).filter((file) => file.endsWith('.proposal.json'));
    assert.equal(files.length, 1);
    const persisted = JSON.parse(readFileSync(join(proposalsDir, files[0]), 'utf8'));
    assert.equal(persisted.evidence.length, 2);
    assert.deepEqual(
      persisted.sourceRefs.map((sourceRef) => sourceRef.jobId).sort(),
      ['wanted-123', 'wanted-456']
    );
  } finally {
    rmSync(proposalsDir, { force: true, recursive: true });
  }
});

test('rejects a conflicting proposal that reuses an existing proposal ID', () => {
  const proposalsDir = mkdtempSync(join(tmpdir(), 'proposal-publication-'));
  const [proposal] = generate({
    id: 'wanted-123',
    source: 'wanted',
    position: 'Backend Engineer',
    techStack: ['Go'],
  });

  try {
    writeProposalFiles([proposal], { proposalsDir });

    assert.throws(() =>
      writeProposalFiles(
        [{ ...proposal, proposedValue: { level: 'beginner', name: 'Rust' } }],
        { proposalsDir }
      )
    );
  } finally {
    rmSync(proposalsDir, { force: true, recursive: true });
  }
});
