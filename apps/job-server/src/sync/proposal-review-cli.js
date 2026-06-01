#!/usr/bin/env node
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, writeFileSync } from 'fs';
import { basename, join } from 'path';
import { createInterface } from 'readline/promises';
import { stdin as input, stdout as output } from 'process';
import {
  PROPOSALS_DIR,
  RESUME_DATA_PATH,
  ensureProposalDirectories,
  loadResumeData,
} from './proposal-generator.js';

const APPROVED_DIR = join(PROPOSALS_DIR, 'approved');
const REJECTED_DIR = join(PROPOSALS_DIR, 'rejected');

async function main() {
  ensureProposalDirectories(PROPOSALS_DIR);
  const args = parseArgs(process.argv.slice(2));
  const resume = loadResumeData(RESUME_DATA_PATH);
  const proposals = readPendingProposals();

  if (proposals.length === 0) {
    console.log('No pending proposals.');
    return;
  }

  if (args.batchConfidence !== null) {
    const approved = batchApprove(proposals, args.batchConfidence);
    console.log(`Approved ${approved} proposal(s) with confidence >= ${args.batchConfidence}.`);
    return;
  }

  const rl = createInterface({ input, output });
  try {
    for (const proposal of proposals) {
      showProposal(proposal, resume);
      const answer = (
        await rl.question('[a]pprove, [r]eject, [e]dit proposed value, [s]kip, [q]uit: ')
      )
        .trim()
        .toLowerCase();

      if (answer === 'q') break;
      if (answer === 'a') moveProposal(proposal, APPROVED_DIR, 'approved');
      if (answer === 'r') moveProposal(proposal, REJECTED_DIR, 'rejected');
      if (answer === 'e') await editProposal(rl, proposal);
    }
  } finally {
    rl.close();
  }
}

function parseArgs(args) {
  const index = args.findIndex((arg) => arg === '--batch-confidence');
  return {
    batchConfidence: index >= 0 ? Number(args[index + 1]) : null,
  };
}

function readPendingProposals() {
  return readdirSync(PROPOSALS_DIR)
    .filter((file) => file.endsWith('.proposal.json'))
    .map((file) => {
      const filePath = join(PROPOSALS_DIR, file);
      return { ...JSON.parse(readFileSync(filePath, 'utf8')), filePath };
    })
    .sort((a, b) => b.confidence - a.confidence || a.createdAt.localeCompare(b.createdAt));
}

function showProposal(proposal, resume) {
  const currentValue = getJsonPointer(resume, proposal.target.path);
  console.log('\n────────────────────────────────────────');
  console.log(`${proposal.id} (${proposal.confidence})`);
  console.log(
    `${proposal.source.platform} · ${proposal.source.company || 'unknown company'} · ${proposal.source.jobTitle || 'unknown role'}`
  );
  console.log(`Target: ${proposal.target.operation} ${proposal.target.path}`);
  console.log('Current:');
  console.log(formatValue(currentValue ?? proposal.currentValue));
  console.log('Proposed:');
  console.log(formatValue(proposal.proposedValue));
  console.log('Evidence:');
  for (const evidence of proposal.evidence || []) {
    console.log(`- ${evidence.text}${evidence.url ? ` (${evidence.url})` : ''}`);
  }
}

async function editProposal(rl, proposal) {
  console.log('Enter JSON for proposedValue. Leave blank to keep unchanged.');
  const value = await rl.question(`${formatValue(proposal.proposedValue)}\n> `);
  if (!value.trim()) return;
  const edited = {
    ...proposal,
    proposedValue: JSON.parse(value),
    editedAt: new Date().toISOString(),
  };
  delete edited.filePath;
  writeFileSync(proposal.filePath, `${JSON.stringify(edited, null, 2)}\n`);
  console.log('Updated proposal. Review it again before approval.');
}

function batchApprove(proposals, threshold) {
  let count = 0;
  for (const proposal of proposals) {
    if (proposal.confidence >= threshold) {
      moveProposal(proposal, APPROVED_DIR, 'approved');
      count++;
    }
  }
  return count;
}

function moveProposal(proposal, targetDir, status) {
  if (!existsSync(targetDir)) mkdirSync(targetDir, { recursive: true });
  const updated = { ...proposal, status, reviewedAt: new Date().toISOString() };
  delete updated.filePath;
  writeFileSync(proposal.filePath, `${JSON.stringify(updated, null, 2)}\n`);
  renameSync(proposal.filePath, join(targetDir, basename(proposal.filePath)));
  console.log(`${status}: ${proposal.id}`);
}

function getJsonPointer(data, pointer) {
  if (pointer === '') return data;
  return pointer
    .split('/')
    .slice(1)
    .reduce((value, part) => {
      if (value === undefined || value === null || part === '-') return value;
      return value[part.replace(/~1/g, '/').replace(/~0/g, '~')];
    }, data);
}

function formatValue(value) {
  return JSON.stringify(value ?? null, null, 2);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
