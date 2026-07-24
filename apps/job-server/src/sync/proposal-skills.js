import { createHash } from 'crypto';

import { buildProposalProvenance, stableJson } from './proposal-provenance.js';
import { KNOWN_SKILLS, SKILL_CATEGORY_KEYWORDS } from './proposal-skill-catalog.js';

const PROPOSAL_VERSION = 1;

export function buildSkillProposals(job, existingSkills, timestamp, resume, options) {
  const source = normalizeSource(job, options);
  const terms = extractSkillTerms(job).filter(
    (term) => !existingSkills.has(normalizeSkillName(term))
  );
  const uniqueTerms = [...new Map(terms.map((term) => [normalizeSkillName(term), term])).values()];

  return uniqueTerms.map((term) => {
    const category = inferSkillCategory(term, job);
    const target = {
      resumePath: 'packages/data/resumes/master/resume_data.json',
      path: `/skills/${category}/items/-`,
      operation: 'add',
    };
    const proposedValue = { name: canonicalSkillName(term), level: 'beginner' };
    return buildProposalProvenance(
      {
        version: PROPOSAL_VERSION,
        id: createProposalId(target, proposedValue),
        status: 'pending',
        createdAt: timestamp,
        source,
        target,
        proposedValue,
        currentValue: null,
        confidence: scoreSkillConfidence(term, job),
        evidence: [buildEvidence(term, job, timestamp)],
        notes: 'Generated from crawler output. Human review is required before applying to SSoT.',
      },
      resume
    );
  });
}

export function collectExistingSkills(resume) {
  const values = new Set();
  for (const category of Object.values(resume.skills || {})) {
    for (const item of category.items || []) values.add(normalizeSkillName(item.name));
  }
  return values;
}

function normalizeSource(job, options) {
  return {
    crawler: options.crawler || 'unified-job-crawler',
    platform: job.source || options.platform || 'unknown',
    jobId: String(job.id || job.jobId || job.position_id || job.url || 'unknown'),
    jobTitle: job.position || job.title || job.name || null,
    company: job.company || job.companyName || null,
    url: job.url || job.link || null,
  };
}

function extractSkillTerms(job) {
  const explicit = [job.skills, job.skillTags, job.techStack, job.technologies, job.stacks]
    .flatMap((value) => (Array.isArray(value) ? value : []))
    .map((value) => (typeof value === 'string' ? value : value?.name || value?.title))
    .filter(Boolean);
  const haystack = [job.position, job.title, job.description, job.requirements, job.preferred, job.main_tasks]
    .filter(Boolean)
    .join('\n');
  const detected = KNOWN_SKILLS.filter((skill) => haystack.toLowerCase().includes(skill.toLowerCase()));
  return [...explicit, ...detected]
    .map((term) => String(term).trim())
    .filter((term) => term.length >= 2 && term.length <= 60);
}

function inferSkillCategory(term, job) {
  const text = `${term} ${job.position || ''} ${job.title || ''} ${job.description || ''}`.toLowerCase();
  for (const [category, keywords] of SKILL_CATEGORY_KEYWORDS) {
    if (keywords.some((keyword) => text.includes(keyword))) return category;
  }
  return 'devops';
}

function scoreSkillConfidence(term, job) {
  let score = 0.55;
  const explicit = [job.skills, job.skillTags, job.techStack, job.technologies, job.stacks].some(
    (value) => Array.isArray(value) && value.some((item) => normalizeSkillName(item?.name || item?.title || item) === normalizeSkillName(term))
  );
  if (explicit) score += 0.25;
  if (job.url || job.link) score += 0.1;
  if (job.description || job.requirements || job.preferred) score += 0.1;
  return Math.min(1, Number(score.toFixed(2)));
}

function buildEvidence(term, job, capturedAt) {
  const snippetSource = [job.description, job.requirements, job.preferred, job.position, job.title]
    .filter(Boolean)
    .join('\n');
  return {
    type: 'crawler-output',
    text: snippetForTerm(snippetSource, term) || `Crawler output included ${canonicalSkillName(term)}.`,
    url: job.url || job.link || null,
    capturedAt,
  };
}

function snippetForTerm(text, term) {
  if (!text) return null;
  const index = text.toLowerCase().indexOf(String(term).toLowerCase());
  if (index < 0) return text.slice(0, 220);
  return text.slice(Math.max(0, index - 90), Math.min(text.length, index + term.length + 130)).trim();
}

function createProposalId(target, proposedValue) {
  const identity = stableJson({ proposedValue, target });
  return `proposal-${createHash('sha256').update(identity).digest('hex')}`;
}

function canonicalSkillName(term) {
  const normalized = normalizeSkillName(term);
  return KNOWN_SKILLS.find((skill) => normalizeSkillName(skill) === normalized) || String(term).trim();
}

function normalizeSkillName(term) {
  return String(term || '').toLowerCase().replace(/[.\s_-]+/g, '').trim();
}
