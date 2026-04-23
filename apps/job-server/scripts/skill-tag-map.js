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
  JavaScript: 1541,
  TypeScript: 1564,
  Terraform: 10498,
  Prometheus: 10497,
  Grafana: 10496,
  'Node.js': 1547,
  React: 1469,
  Go: 1702,
  Nginx: 3498,
  MongoDB: 1462,
  Azure: 1441,
  Helm: 10648,
  RabbitMQ: 3569,
};

export const SKILL_ALIASES = {
  // These are approximate routings; real tagTypeIds require a manual probe against Wanted's
  // /sns-api/profile skill-search endpoint (see docs/guides/wanted-skill-probe.md — TODO)
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
  'AWS (EC2, VPC, EKS, S3)': 'AWS',
  'Cloudflare Workers': 'Cloudflare',
  'GitLab CI/CD': 'GitLab',
  'Container Registry': 'Docker',
  'Docker Compose': 'Docker',
  'API Integration': 'Python',
  // --- Alias routing for unmapped skills (workaround until real tagTypeId probe) ---
  Loki: 'Prometheus',
  Splunk: 'Prometheus',
  'Splunk ES': 'Prometheus',
  'Splunk Enterprise Security': 'Prometheus',
  'GitHub Actions': 'GitLab',
  Ansible: 'DevOps',
  n8n: 'DevOps',
  FortiGate: '인프라',
  'FortiGate HA': '인프라',
  FortiManager: '인프라',
  FortiAnalyzer: '인프라',
  'Infrastructure as Code': 'IaC',
  'Site Reliability Engineering': 'SRE',
  'Cloud Security Posture Management': 'CSPM',
  'Security Orchestration': 'SOAR',
  'Extended Detection and Response': 'XDR',
  제로트러스트: 'Zero Trust',
  'VMware NSX-T': 'NSX-T',
  vSphere: 'VMware',
  ESXi: 'VMware',
  'Blackbox Exporter': 'Prometheus',
  PromQL: 'Prometheus',
};
export function getTagTypeId(skillName) {
  const direct = SKILL_TAG_MAP[skillName];
  if (direct) {
    return direct;
  }

  const alias = SKILL_ALIASES[skillName];
  if (alias && SKILL_TAG_MAP[alias]) {
    const tagId = SKILL_TAG_MAP[alias];
    if (process.env.SKILL_TAG_DEBUG) {
      console.warn(`[skill-tag-map] routed "${skillName}" via alias -> "${alias}" (tagTypeId=${tagId})`);
    }
    return tagId;
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
    } else if (category && Array.isArray(category.items)) {
      skills.push(...category.items.map((item) => (typeof item === 'string' ? item : item.name)).filter(Boolean));
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
