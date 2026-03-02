/**
 * Wanted Skill Tag ID Mapping
 * Maps skill names to Wanted's internal tagTypeId for Skills API.
 * Source: Extracted from /sns-api/profile | Last Updated: 2026-01-30
 */

export const SKILL_TAG_MAP = {
  AWS: 1698,
  GCP: 3468,
  Docker: 2217,
  Kubernetes: 10268,
  Linux: 1459,
  인프라: 1676,
  DevOps: 1952,
  GitLab: 1413,
  Git: 1411,
  Jenkins: 2020,
  Python: 1554,
  Java: 1540,
  Shell: 1561,
  Bash: 2271,
  SQL: 1562,
  PostgreSQL: 2683,
  MySQL: 1464,
  Redis: 1470,
};

export const SKILL_ALIASES = {
  'AWS EC2': 'AWS',
  'AWS VPC': 'AWS',
  'AWS IAM': 'AWS',
  'AWS S3': 'AWS',
  'AWS EKS': 'AWS',
  VPC: 'AWS',
  IAM: 'AWS',
  S3: 'AWS',
  EKS: 'AWS',
  EC2: 'AWS',
  'Cloudflare Workers': 'Cloudflare',
  'GitLab CI/CD': 'GitLab',
  'Container Registry': 'Docker',
  'Docker Compose': 'Docker',
  'API Integration': 'Python',
};

export function getTagTypeId(skillName) {
  if (SKILL_TAG_MAP[skillName]) {
    return SKILL_TAG_MAP[skillName];
  }

  const alias = SKILL_ALIASES[skillName];
  if (alias && SKILL_TAG_MAP[alias]) {
    return SKILL_TAG_MAP[alias];
  }

  const lowerName = skillName.toLowerCase();
  for (const [key, value] of Object.entries(SKILL_TAG_MAP)) {
    if (key.toLowerCase() === lowerName) {
      return value;
    }
  }

  return null;
}

export function flattenSkills(skillsObj) {
  if (!skillsObj) return [];

  const skills = [];
  for (const category of Object.values(skillsObj)) {
    if (Array.isArray(category)) {
      skills.push(...category);
    }
  }
  return [...new Set(skills)];
}

export function normalizeSkillName(name) {
  const alias = SKILL_ALIASES[name];
  if (alias) return alias;

  if (name.startsWith('AWS ')) return 'AWS';

  return name;
}

export function diffSkills(ssotSkills, wantedSkills) {
  const wantedNames = new Set(wantedSkills.map((s) => s.name));
  const normalizedSsot = ssotSkills.map((s) => normalizeSkillName(s));
  const normalizedSet = new Set(normalizedSsot);

  const toAdd = [];
  const unmapped = [];
  const toDelete = [];
  const unchanged = [];

  for (const skill of ssotSkills) {
    const normalized = normalizeSkillName(skill);

    if (wantedNames.has(normalized)) {
      unchanged.push(normalized);
    } else {
      const tagTypeId = getTagTypeId(skill);
      if (tagTypeId) {
        toAdd.push({ name: normalized, tagTypeId, original: skill });
      } else {
        unmapped.push(skill);
      }
    }
  }

  for (const wantedSkill of wantedSkills) {
    if (!normalizedSet.has(wantedSkill.name)) {
      toDelete.push(wantedSkill);
    }
  }

  return {
    toAdd: [...new Map(toAdd.map((s) => [s.tagTypeId, s])).values()],
    toDelete,
    unchanged: [...new Set(unchanged)],
    unmapped: [...new Set(unmapped)],
  };
}

export default {
  SKILL_TAG_MAP,
  SKILL_ALIASES,
  getTagTypeId,
  flattenSkills,
  normalizeSkillName,
  diffSkills,
};
