import { toSafeString } from './cover-letter-normalization.js';

export const FOREIGN_COMPANY_PACKET_PATH =
  'packages/data/resumes/applications/foreign-company/foreign_company_security_sre_packet.json';

const REQUIRED_PACKET_KEYS = ['name', 'language', 'audience', 'targetRoles', 'sourcePolicy'];
const REQUIRED_TOP_KEYS = [
  'packet',
  'personal',
  'summary',
  'careers',
  'projects',
  'skills',
  'certifications',
];
const REQUIRED_PERSONAL_KEYS = ['name', 'email', 'phone'];
const CLAIM_TEXT_KEYS = new Set([
  'audience',
  'description',
  'headline',
  'profile',
  'role',
  'roleFit',
  'sourcePolicy',
  'targetRoles',
  'workingPreferences',
]);
const NUMBER_WORD =
  '(?:zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million|billion)';
const WORD_QUANTITY = `${NUMBER_WORD}(?:[-\\s]+${NUMBER_WORD})*`;
const METRIC_TERM =
  '(?:percent|percentage|ratio|headcounts?|requests?|tickets?|alerts?|servers?|endpoints?|incidents?|minutes?|hours?|days?|ms|milliseconds?|seconds?)';
const PERFORMANCE_TERM =
  '(?:reduced|improved|increased|decreased|cut|saved|lowered|accelerated|processed|supported|managed)';
const RATIO_QUANTITY = `(?:\\d+|${WORD_QUANTITY})\\s*(?::|\\s+to\\s+|[-\\s]+to[-\\s]+)\\s*(?:\\d+|${WORD_QUANTITY})`;
const QUANTIFIED_CLAIM_PATTERNS = [
  /\b\d+(?:\.\d+)?\s?%/,
  /\b\d+\s*(?:x|times|fold)\b/i,
  /\b\d+\s*:\s*\d+\b/,
  /\b\d+\s*(?:percent|percentage|ratio|headcounts?|requests?|tickets?|alerts?|servers?|endpoints?|incidents?|minutes?|hours?|days?|ms|milliseconds|seconds?)\b/i,
  /\b(?:reduced|improved|increased|decreased|cut|saved|lowered|accelerated|processed|supported|managed)\b[^.:\n;]{0,80}\b\d+\b/i,
  new RegExp(`\\b${WORD_QUANTITY}\\s+${METRIC_TERM}\\b`, 'i'),
  new RegExp(`\\b${PERFORMANCE_TERM}\\b[^.:\n;]{0,80}\\b${RATIO_QUANTITY}\\b`, 'i'),
  new RegExp(`\\b${METRIC_TERM}\\b[^.:\n;]{0,80}\\b${RATIO_QUANTITY}\\b`, 'i'),
];

export function selectEnglishApplicationPacket(data) {
  validateEnglishPacketData(data);
  return {
    packetId: 'foreign-company/security-sre',
    language: data.packet.language,
    source: {
      type: 'hand-crafted',
      path: FOREIGN_COMPANY_PACKET_PATH,
    },
    metadata: {
      name: data.packet.name,
      audience: data.packet.audience,
      targetRoles: [...data.packet.targetRoles],
      locationPreferences: [...(data.packet.locationPreferences ?? [])],
      workingPreferences: [...(data.packet.workingPreferences ?? [])],
      sourcePolicy: data.packet.sourcePolicy,
    },
    resume: {
      personal: data.personal,
      summary: data.summary,
      careers: data.careers,
      projects: data.projects,
      skills: data.skills,
      certifications: data.certifications,
    },
    coverLetter: buildPacketCoverLetter(data),
    validation: {
      noQuantifiedClaims: true,
      checked: 'packet prose and deterministic cover letter',
    },
  };
}

function validateEnglishPacketData(data) {
  requireObject(data, 'root');
  requirePresent(data, REQUIRED_TOP_KEYS, 'root');
  requireObject(data.packet, 'packet');
  requireObject(data.personal, 'personal');
  requireObject(data.summary, 'summary');
  requireObject(data.skills, 'skills');
  requireFields(data.packet, REQUIRED_PACKET_KEYS, 'packet');
  requireFields(data.personal, REQUIRED_PERSONAL_KEYS, 'personal');
  requireFields(data.summary, ['headline', 'profile'], 'summary');
  requireArrayFields(data, ['careers', 'projects', 'certifications']);
  requireCoverLetterInterpolatedText(data);
  if (data.packet.language !== 'en') throw new Error('English application packet must use en');
  const claimTexts = [...collectClaimText(data), buildPacketCoverLetter(data)];
  if (findQuantifiedClaim(claimTexts)) {
    throw new Error('quantified performance claim detected in English application packet');
  }
}

function requireArrayFields(data, fields) {
  for (const field of fields) {
    if (!Array.isArray(data[field])) throw new Error(`missing required packet fields: ${field}`);
  }
}

function requireCoverLetterInterpolatedText(data) {
  requireNonEmptyStringArrayField(data.packet, 'targetRoles', 'packet');
  requireOptionalStringArrayField(data.summary, 'roleFit', 'summary');
  for (const [index, project] of data.projects.entries()) {
    if (!project || typeof project !== 'object' || Array.isArray(project)) {
      throw new Error(`invalid packet fields: projects.${index} must be an object`);
    }
    if (project.description === undefined || project.description === null) continue;
    if (typeof project.description !== 'string' || !project.description.trim()) {
      throw new Error(
        `invalid packet fields: projects.${index}.description must be a non-empty string`
      );
    }
  }
}

function requireNonEmptyStringArrayField(source, field, label) {
  const value = source?.[field];
  if (!Array.isArray(value) || value.length === 0 || hasBlankOrNonStringEntry(value)) {
    throw new Error(`invalid packet fields: ${label}.${field} must be a non-empty string array`);
  }
}

function requireOptionalStringArrayField(source, field, label) {
  const value = source?.[field];
  if (value === undefined || value === null) return;
  if (!Array.isArray(value) || hasBlankOrNonStringEntry(value)) {
    throw new Error(`invalid packet fields: ${label}.${field} must be a string array`);
  }
}

function hasBlankOrNonStringEntry(value) {
  return value.some((entry) => typeof entry !== 'string' || !entry.trim());
}

function requireObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`missing required packet fields: ${label}`);
  }
}

function requirePresent(source, fields, label) {
  const missing = fields.filter(
    (field) => source?.[field] === undefined || source?.[field] === null
  );
  if (missing.length > 0) {
    throw new Error(`missing required packet fields: ${label}.${missing.join(',')}`);
  }
}

function requireFields(source, fields, label) {
  const missing = fields.filter((field) => {
    const value = source?.[field];
    return Array.isArray(value) ? value.length === 0 : !toSafeString(value).trim();
  });
  if (missing.length > 0) {
    throw new Error(`missing required packet fields: ${label}.${missing.join(',')}`);
  }
}

function collectClaimText(value, key = '') {
  if (typeof value === 'string') return CLAIM_TEXT_KEYS.has(key) ? [value] : [];
  if (Array.isArray(value)) return value.flatMap((entry) => collectClaimText(entry, key));
  if (!value || typeof value !== 'object') return [];
  return Object.entries(value).flatMap(([childKey, child]) => collectClaimText(child, childKey));
}

function findQuantifiedClaim(texts) {
  return texts.find((text) => QUANTIFIED_CLAIM_PATTERNS.some((pattern) => pattern.test(text)));
}

function buildPacketCoverLetter(data) {
  const roles = data.packet.targetRoles.join(', ');
  const focus = data.summary.roleFit?.slice(0, 2).join(' ');
  const projects = data.projects
    ?.filter((project) => project && typeof project === 'object' && !Array.isArray(project))
    .map((project) => project.description)
    .filter(Boolean)
    .join(' ');
  return [
    'Dear Hiring Team,',
    '',
    `I am interested in English-language ${roles} opportunities for foreign-company teams.`,
    data.summary.profile,
    focus,
    projects,
    'I would bring a practical security-operations mindset, clear technical writing, and steady ownership of runbooks, automation, and observable platform workflows.',
    '',
    'Sincerely,',
    data.personal.name,
  ]
    .filter(Boolean)
    .join('\n');
}
