const SKILL_DATA_FALLBACK = {
  securityAutomation: {
    title: 'Security Response',
    skills: [
      {
        name: 'Splunk ES (SIEM/SOAR)',
        level: 95,
        evidence: 'SIEM detection and alert-response workflow evidence',
      },
      {
        name: 'FortiGate/FortiManager',
        level: 90,
        evidence: 'Firewall policy operations in financial infrastructure',
      },
      {
        name: 'NSX-T Microsegmentation',
        level: 75,
        evidence: 'NSX-T microsegmentation project evidence',
      },
      { name: 'Wazuh (EDR)', level: 80, evidence: 'Host-level monitoring project evidence' },
      {
        name: 'NAC/DLP',
        level: 70,
        evidence: 'Network access and DLP operations evidence',
      },
    ],
  },
  cloudEdge: {
    title: 'Cloud & Edge',
    skills: [
      {
        name: 'Cloudflare Workers',
        level: 90,
        evidence: 'This portfolio runs on Cloudflare Workers',
      },
      {
        name: 'Cloudflare Pages',
        level: 85,
        evidence: 'Static asset and edge route operations evidence',
      },
      { name: 'Terraform', level: 85, evidence: 'IaC practice across edge and homelab operations' },
    ],
  },
  observability: {
    title: 'Observability',
    skills: [
      { name: 'Grafana', level: 90, evidence: 'Operational dashboard evidence' },
      { name: 'Prometheus', level: 85, evidence: 'Metrics collection and alerting evidence' },
      { name: 'Splunk Dashboards', level: 88, evidence: 'SPL query and SIEM dashboard evidence' },
    ],
  },
  infrastructureAsCode: {
    title: 'Infrastructure as Code',
    skills: [
      { name: 'Terraform', level: 85, evidence: 'Reviewable infrastructure-change evidence' },
      { name: 'Ansible', level: 82, evidence: 'Security appliance setup procedure evidence' },
      { name: 'Docker', level: 78, evidence: 'Containerized operations tooling evidence' },
    ],
  },
  cicdAutomation: {
    title: 'CI/CD & Workflow',
    skills: [
      {
        name: 'GitHub Actions',
        level: 88,
        evidence: 'CI and repository policy automation evidence',
      },
      { name: 'Workflow Tooling', level: 85, evidence: 'Repeatable operations workflow evidence' },
      { name: 'Python scripting', level: 82, evidence: 'Operational script evidence' },
    ],
  },
  backendApi: {
    title: 'Backend & API',
    skills: [
      { name: 'Node.js', level: 80, evidence: 'Worker and API tooling evidence' },
      { name: 'Python', level: 85, evidence: 'Operational scripts and API lookup evidence' },
      { name: 'PostgreSQL', level: 78, evidence: 'DB access-control query tuning evidence' },
    ],
  },
};

const SKILL_DATA_INJECTED =
  typeof __SKILL_DATA__ !== 'undefined' && __SKILL_DATA__ && Object.keys(__SKILL_DATA__).length > 0
    ? __SKILL_DATA__
    : SKILL_DATA_FALLBACK;

const RADAR_LEVEL_MAP = { expert: 95, advanced: 80, intermediate: 60, beginner: 35 };
const RADAR_EVIDENCE_LABELS_BY_LOCALE = {
  ko: {
    expert: '주요 운영 경험',
    advanced: '프로젝트 적용 경험',
    intermediate: '실무 활용 가능',
    beginner: '학습 중',
  },
  en: {
    expert: 'Primary operating evidence',
    advanced: 'Applied in project work',
    intermediate: 'Working familiarity',
    beginner: 'Currently learning',
  },
  ja: {
    expert: '主な運用経験',
    advanced: 'プロジェクト適用経験',
    intermediate: '実務活用可能',
    beginner: '学習中',
  },
};

function radarEvidenceLabels() {
  const lang =
    typeof document !== 'undefined' && document.documentElement
      ? (document.documentElement.lang || 'ko').toLowerCase()
      : 'ko';
  if (lang.startsWith('en')) return RADAR_EVIDENCE_LABELS_BY_LOCALE.en;
  if (lang.startsWith('ja')) return RADAR_EVIDENCE_LABELS_BY_LOCALE.ja;
  return RADAR_EVIDENCE_LABELS_BY_LOCALE.ko;
}

function radarFromLocaleSkills(skills) {
  if (!skills || typeof skills !== 'object') return null;
  const out = {};
  for (const [category, data] of Object.entries(skills)) {
    if (!data || !Array.isArray(data.items) || data.items.length === 0) continue;
    out[category] = {
      title: String(data.title || category),
      skills: data.items.map((item) => {
        const levelKey = String(item.level || 'intermediate').toLowerCase();
        const evidenceLabels = radarEvidenceLabels();
        return {
          name: String(item.name || 'Unknown'),
          level: RADAR_LEVEL_MAP[levelKey] != null ? RADAR_LEVEL_MAP[levelKey] : 60,
          evidence: evidenceLabels[levelKey] || evidenceLabels.intermediate,
        };
      }),
    };
  }
  return Object.keys(out).length > 0 ? out : null;
}

export function resolveSkillData() {
  const injected =
    typeof window !== 'undefined' && window.__RESUME_CHAT_DATA__
      ? window.__RESUME_CHAT_DATA__.skills
      : null;
  return radarFromLocaleSkills(injected) || SKILL_DATA_INJECTED;
}
