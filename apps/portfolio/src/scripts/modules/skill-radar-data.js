const SKILL_DATA_FALLBACK = {
  securityAutomation: {
    title: 'Security Response',
    skills: [
      {
        name: 'Splunk ES (SIEM/SOAR)',
        level: 95,
        evidence: 'Designed custom detection rules and alert response pipeline',
      },
      {
        name: 'FortiGate/FortiManager',
        level: 90,
        evidence: 'Designed and operated firewall policies for financial enterprise',
      },
      {
        name: 'NSX-T Microsegmentation',
        level: 75,
        evidence: 'Implemented zero-trust microsegmentation in vSphere environment',
      },
      { name: 'Wazuh (EDR)', level: 80, evidence: 'Deployed EDR solution with custom detection rules' },
      {
        name: 'NAC/DLP',
        level: 70,
        evidence: 'Configured network access control and data loss prevention',
      },
    ],
  },
  cloudEdge: {
    title: 'Cloud & Edge',
    skills: [
      {
        name: 'Cloudflare Workers',
        level: 90,
        evidence: 'Portfolio deployed on Workers, edge-optimized rendering',
      },
      {
        name: 'Cloudflare Pages',
        level: 85,
        evidence: 'Static assets served via Pages with edge functions',
      },
      { name: 'Terraform', level: 85, evidence: 'IaC managed via Terraform for cloud infrastructure' },
    ],
  },
  observability: {
    title: 'Observability',
    skills: [
      { name: 'Grafana', level: 90, evidence: 'Built monitoring stack on Synology NAS, public dashboards' },
      { name: 'Prometheus', level: 85, evidence: 'Metrics collection and alerting for infrastructure' },
      { name: 'Splunk Dashboards', level: 88, evidence: 'Custom SPL queries and executive dashboards' },
    ],
  },
  infrastructureAsCode: {
    title: 'Infrastructure as Code',
    skills: [
      { name: 'Terraform', level: 85, evidence: 'Standardized firewall configs with Ansible Role' },
      { name: 'Ansible', level: 82, evidence: 'Configuration management across the node fleet' },
      { name: 'Docker', level: 78, evidence: 'Containerized applications for local development and CI/CD' },
    ],
  },
  cicdAutomation: {
    title: 'CI/CD & Workflow',
    skills: [
      { name: 'GitHub Actions', level: 88, evidence: 'Resume sync to JobKorea and CI/CD pipelines' },
      { name: 'Workflow Tooling', level: 85, evidence: 'Workflow tooling for job applications and data sync' },
      { name: 'Python scripting', level: 82, evidence: 'Custom scripts for data processing' },
    ],
  },
  backendApi: {
    title: 'Backend & API',
    skills: [
      { name: 'Node.js', level: 80, evidence: 'Built API clients for job portal workflows' },
      { name: 'Python', level: 85, evidence: 'Backend services and operational scripts' },
      { name: 'PostgreSQL', level: 78, evidence: 'DB query tuning and schema design' },
    ],
  },
};

const SKILL_DATA_INJECTED =
  typeof __SKILL_DATA__ !== 'undefined' && __SKILL_DATA__ && Object.keys(__SKILL_DATA__).length > 0
    ? __SKILL_DATA__
    : SKILL_DATA_FALLBACK;

const RADAR_LEVEL_MAP = { expert: 95, advanced: 80, intermediate: 60, beginner: 35 };

function radarFromLocaleSkills(skills) {
  if (!skills || typeof skills !== 'object') return null;
  const out = {};
  for (const [category, data] of Object.entries(skills)) {
    if (!data || !Array.isArray(data.items) || data.items.length === 0) continue;
    out[category] = {
      title: String(data.title || category),
      skills: data.items.map((item) => {
        const levelKey = String(item.level || 'intermediate').toLowerCase();
        return {
          name: String(item.name || 'Unknown'),
          level: RADAR_LEVEL_MAP[levelKey] != null ? RADAR_LEVEL_MAP[levelKey] : 60,
          evidence: `${levelKey.charAt(0).toUpperCase()}${levelKey.slice(1)} proficiency`,
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
