import { randomUUID } from 'crypto';
import { existsSync, linkSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

import { mergeEquivalentProposals } from './proposal-provenance.js';
import { buildSkillProposals, collectExistingSkills } from './proposal-skills.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const PROJECT_ROOT = join(__dirname, '..', '..', '..', '..');
export const RESUME_DATA_PATH = join(PROJECT_ROOT, 'packages/data/resumes/master/resume_data.json');
export const PROPOSALS_DIR = join(PROJECT_ROOT, 'packages/data/proposals');

export function loadResumeData(path = RESUME_DATA_PATH) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

export function generateProposalsFromCrawlerResult(crawlerResult, options = {}) {
  const resume = options.resumeData || loadResumeData(options.resumePath || RESUME_DATA_PATH);
  const jobs = normalizeJobs(crawlerResult);
  const existingSkills = collectExistingSkills(resume);
  const timestamp = options.timestamp || new Date().toISOString();

  const proposalsById = new Map();
  for (const job of jobs) {
    const proposals = buildSkillProposals(job, existingSkills, timestamp, resume, options);
    for (const proposal of proposals) {
      const existing = proposalsById.get(proposal.id);
      if (!existing) {
        proposalsById.set(proposal.id, proposal);
        continue;
      }
      const merged = mergeEquivalentProposals(existing, proposal);
      if (!merged) throw new Error(`proposal ID collision for ${proposal.id}`);
      proposalsById.set(proposal.id, merged);
    }
  }
  return [...proposalsById.values()];
}

export function writeProposalFiles(proposals, options = {}) {
  const targetDir = options.proposalsDir || PROPOSALS_DIR;
  ensureProposalDirectories(targetDir);

  return proposals.map((proposal) => publishProposalFile(targetDir, proposal));
}

export function ensureProposalDirectories(baseDir = PROPOSALS_DIR) {
  for (const dir of [
    baseDir,
    join(baseDir, 'approved'),
    join(baseDir, 'rejected'),
    join(baseDir, 'applied'),
  ]) {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }
}

function normalizeJobs(input) {
  if (Array.isArray(input)) return input;
  if (Array.isArray(input?.jobs)) return input.jobs;
  if (Array.isArray(input?.data?.jobs)) return input.data.jobs;
  return [];
}

function publishProposalFile(targetDir, proposal) {
  const filePath = join(targetDir, `${proposal.id}.proposal.json`);
  const temporaryPath = join(targetDir, `.${proposal.id}.${randomUUID()}.tmp`);
  try {
    writeFileSync(temporaryPath, `${JSON.stringify(proposal, null, 2)}\n`, { flag: 'wx' });
    linkSync(temporaryPath, filePath);
    return filePath;
  } catch (error) {
    if (error?.code !== 'EEXIST') throw error;
    const existing = JSON.parse(readFileSync(filePath, 'utf8'));
    const merged = mergeEquivalentProposals(existing, proposal);
    if (!merged) {
      throw new Error(`proposal ID collision for ${proposal.id}`, { cause: error });
    }
    writeProposalFileAtomically(filePath, merged);
    return filePath;
  } finally {
    rmSync(temporaryPath, { force: true });
  }
}

function writeProposalFileAtomically(filePath, proposal) {
  const temporaryPath = `${filePath}.${randomUUID()}.tmp`;
  try {
    writeFileSync(temporaryPath, `${JSON.stringify(proposal, null, 2)}\n`, { flag: 'wx' });
    renameSync(temporaryPath, filePath);
  } finally {
    rmSync(temporaryPath, { force: true });
  }
}

export default {
  generateProposalsFromCrawlerResult,
  writeProposalFiles,
  ensureProposalDirectories,
  loadResumeData,
};
