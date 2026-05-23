import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const PROJECT_ROOT = join(__dirname, '..', '..', '..', '..');
export const RESUME_DATA_PATH = join(PROJECT_ROOT, 'packages/data/resumes/master/resume_data.json');
export const PROPOSALS_DIR = join(PROJECT_ROOT, 'packages/data/proposals');

const PROPOSAL_VERSION = 1;
const SKILL_CATEGORY_KEYWORDS = [
  ['observability', ['grafana', 'prometheus', 'loki', 'opentelemetry', 'elastic', 'kibana', 'splunk', 'tempo']],
  ['cloud', ['aws', 'gcp', 'azure', 'cloudflare', 'docker', 'kubernetes', 'k8s', 'helm', 'linux', 'terraform', 'proxmox']],
  ['devops', ['github actions', 'gitlab ci', 'jenkins', 'ansible', 'argocd', 'ci/cd', 'gitops', 'packer']],
  ['security', ['siem', 'soar', 'fortigate', 'waf', 'iam', 'zero trust', 'nac', 'ids', 'ips', 'vulnerability']],
  ['backend', ['node.js', 'nodejs', 'python', 'go', 'postgresql', 'redis', 'api', 'worker', 'typescript']],
];

const KNOWN_SKILLS = [
  'Ansible', 'Argo CD', 'AWS', 'Azure', 'Cloudflare Workers', 'Docker', 'Elasticsearch/Kibana',
  'FortiGate', 'GitHub Actions', 'GitLab CI/CD', 'Go', 'Grafana', 'Helm', 'IAM', 'Jenkins',
  'Kubernetes', 'Linux', 'Loki', 'n8n', 'Node.js', 'OpenTelemetry', 'PostgreSQL', 'Prometheus',
  'Python', 'Redis', 'SIEM', 'SOAR', 'Splunk', 'Terraform', 'TypeScript', 'WAF', 'Zero Trust',
];

export function loadResumeData(path = RESUME_DATA_PATH) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

export function generateProposalsFromCrawlerResult(crawlerResult, options = {}) {
  const resume = options.resumeData || loadResumeData(options.resumePath || RESUME_DATA_PATH);
  const jobs = normalizeJobs(crawlerResult);
  const existingSkills = collectExistingSkills(resume);
  const now = options.timestamp || new Date().toISOString();

  return jobs.flatMap((job) => buildSkillProposals(job, existingSkills, now, options));
}

export function writeProposalFiles(proposals, options = {}) {
  const targetDir = options.proposalsDir || PROPOSALS_DIR;
  ensureProposalDirectories(targetDir);

  return proposals.map((proposal) => {
    const filePath = join(targetDir, `${proposal.id}.proposal.json`);
    writeFileSync(filePath, `${JSON.stringify(proposal, null, 2)}\n`);
    return filePath;
  });
}

export function ensureProposalDirectories(baseDir = PROPOSALS_DIR) {
  for (const dir of [baseDir, join(baseDir, 'approved'), join(baseDir, 'rejected'), join(baseDir, 'applied')]) {
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

function buildSkillProposals(job, existingSkills, timestamp, options) {
  const source = normalizeSource(job, options);
  const terms = extractSkillTerms(job).filter((term) => !existingSkills.has(normalizeSkillName(term)));
  const uniqueTerms = [...new Map(terms.map((term) => [normalizeSkillName(term), term])).values()];

  return uniqueTerms.map((term) => {
    const category = inferSkillCategory(term, job);
    const targetPath = `/skills/${category}/items/-`;
    const confidence = scoreSkillConfidence(term, job);
    const proposalId = createProposalId(source, targetPath, term);

    return {
      version: PROPOSAL_VERSION,
      id: proposalId,
      status: 'pending',
      createdAt: timestamp,
      source,
      target: {
        resumePath: 'packages/data/resumes/master/resume_data.json',
        path: targetPath,
        operation: 'add',
      },
      proposedValue: {
        name: canonicalSkillName(term),
        level: 'beginner',
      },
      currentValue: null,
      confidence,
      evidence: [buildEvidence(term, job)],
      notes: 'Generated from crawler output. Human review is required before applying to SSoT.',
    };
  });
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

function collectExistingSkills(resume) {
  const values = new Set();
  for (const category of Object.values(resume.skills || {})) {
    for (const item of category.items || []) {
      values.add(normalizeSkillName(item.name));
    }
  }
  return values;
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
    if (keywords.some((keyword) => text.includes(keyword))) {
      return category;
    }
  }
  return 'devops';
}

function scoreSkillConfidence(term, job) {
  let score = 0.55;
  const explicit = [job.skills, job.skillTags, job.techStack, job.technologies, job.stacks]
    .some((value) => Array.isArray(value) && value.some((item) => normalizeSkillName(item?.name || item?.title || item) === normalizeSkillName(term)));
  if (explicit) score += 0.25;
  if (job.url || job.link) score += 0.1;
  if (job.description || job.requirements || job.preferred) score += 0.1;
  return Math.min(1, Number(score.toFixed(2)));
}

function buildEvidence(term, job) {
  const snippetSource = [job.description, job.requirements, job.preferred, job.position, job.title]
    .filter(Boolean)
    .join('\n');
  return {
    type: 'crawler-output',
    text: snippetForTerm(snippetSource, term) || `Crawler output included ${canonicalSkillName(term)}.`,
    url: job.url || job.link || null,
    capturedAt: new Date().toISOString(),
  };
}

function snippetForTerm(text, term) {
  if (!text) return null;
  const index = text.toLowerCase().indexOf(String(term).toLowerCase());
  if (index < 0) return text.slice(0, 220);
  return text.slice(Math.max(0, index - 90), Math.min(text.length, index + term.length + 130)).trim();
}

function createProposalId(source, targetPath, value) {
  const stable = [source.platform, source.jobId, targetPath, normalizeSkillName(value)].filter(Boolean).join(':');
  const hash = Buffer.from(stable).toString('base64url').slice(0, 18);
  return `proposal-${hash || randomUUID()}`;
}

function canonicalSkillName(term) {
  const normalized = normalizeSkillName(term);
  return KNOWN_SKILLS.find((skill) => normalizeSkillName(skill) === normalized) || String(term).trim();
}

function normalizeSkillName(term) {
  return String(term || '').toLowerCase().replace(/[.\s_-]+/g, '').trim();
}

export default {
  generateProposalsFromCrawlerResult,
  writeProposalFiles,
  ensureProposalDirectories,
  loadResumeData,
};
