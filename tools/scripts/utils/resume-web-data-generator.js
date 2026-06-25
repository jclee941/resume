const {
  careerCardFromSource,
  englishCareerCardFromSource,
  englishProjectCardFromSource,
  projectCardFromSource,
  timelineCareerFromSource,
} = require('./resume-web-data-projections.js');

const RESUME_STATS_BY_INDEX = {
  ko: [
    ['Splunk ES', '탐지·대응', '보안 자동화'],
    ['FortiGate HA', '5계층 망분리', '본인가 대응'],
    ['금융DC 운영', '감사 대응', 'Python 자동화'],
    ['NSX-T', '마이크로세그멘테이션', '침입 탐지'],
    ['Ansible 자동화', 'NAC', 'VPN 모니터링'],
    ['Linux 운영', '방화벽 정책', '패치 관리'],
  ],
  en: [
    ['Splunk ES', 'Detection & Response', 'Security Automation'],
    ['FortiGate HA', '5-Tier Segmentation', 'FSC Approval'],
    ['Financial DC Ops', 'Audit Response', 'Python Automation'],
    ['NSX-T', 'Microsegmentation', 'Intrusion Detection'],
    ['Ansible Automation', 'NAC', 'VPN Monitoring'],
    ['Linux Ops', 'Firewall Policy', 'Patch Management'],
  ],
  ja: [
    ['Splunk ES', '検知・対応', 'セキュリティ自動化'],
    ['FortiGate HA', '5階層ネットワーク分離', '本認可対応'],
    ['金融DC運用', '監査対応', 'Python自動化'],
    ['NSX-T', 'マイクロセグメンテーション', '侵入検知'],
    ['Ansible自動化', 'NAC', 'VPNモニタリング'],
    ['Linux運用', 'ファイアウォールポリシー', 'パッチ管理'],
  ],
};

const CAREER_EN_OVERRIDES = {
  '(주)아이티센 CTS': {
    title: 'ITCEN CTS Co., Ltd.',
    period: '2025.03 ~ 2026.02',
    description:
      'Built integrated security operations by connecting Splunk ES with Slack through alert workflows and developing a FortiManager API-based firewall policy lookup tool.',
  },
  '(주)가온누리정보시스템': {
    title: 'Gaonnuri Information Systems Co., Ltd.',
    description:
      'Eliminated single points of failure for a financial trading system by configuring FortiGate HA and standardized security appliance setup with Ansible Role to reduce the handoff cost from build to operations phases.',
  },
  '(주)콴텍투자일임': {
    title: 'Quantec Investment Management Co., Ltd.',
    description:
      'Established change traceability and auditability for cloud infrastructure by codifying VPC/Subnet/SG with Terraform, and resolved the difficulty of correlating distributed security logs through integrated CloudTrail and GuardDuty analysis.',
  },
  '(주)조인트리': {
    title: 'Jointree Co., Ltd.',
    description:
      'Resolved east-west traffic blind spots from perimeter-based security by applying NSX-T micro-segmentation, and built centralized security policy management at the VDS level.',
  },
  '(주)메타넷엠플랫폼': {
    title: 'Metanet M Platform Co., Ltd.',
    description:
      'Solved server configuration consistency and remote-access visibility for a large-scale remote work environment by building Python and Ansible automation, and operated FortiGate VPN infrastructure for new contact-center sites.',
  },
  '(주)엠티데이타': {
    title: 'MT Data Co., Ltd.',
    description:
      'Established a routine log analysis cadence and adhered to security audit guidelines to identify hardware failure indicators early in a closed network environment.',
  },
};

const PROJECT_EN_OVERRIDES = {
  'Observability Platform': {
    description:
      'Built unified observability for homelab infrastructure to remove the need to switch between per-service consoles by integrating Prometheus, Loki, and Grafana into a single dashboard.',
    tagline: 'Monitoring Platform',
  },
  'Automation': {
    description:
      'Centralized scattered automation tasks such as alerts, deployments, and data collection into reusable workflow patterns.',
    tagline: 'Automation',
  },
  'Security Alert System': {
    description:
      'FortiGate security events were scattered across device syslog and Splunk, causing delays from event occurrence to responder awareness. Integrated Splunk Saved Search with Webhooks and implemented an EMS state-tracking pattern to prevent duplicate alerts by sending notifications only on state transitions. Classifies events with maintained FortiGate LogID mappings. When FortiGate syslog events occur, alerts are routed through Splunk Saved Search → Webhook → Slack/Telegram in a single path.',
    tagline: 'Security Alert Automation',
  },
  'IP Blacklist Platform': {
    description:
      'Built a unified threat intel lookup over Flask and Next.js so analysts query a single interface instead of multiple external feeds.',
    tagline: 'Threat Intelligence',
  },
};

function generateWebData(source, language = 'ko') {
  const statsByIndex = RESUME_STATS_BY_INDEX[language] || RESUME_STATS_BY_INDEX.ko;

  // SSoT → portfolio data contract:
  // - source.careers[] → resume[] (flat career cards: icon, title, description, period, stats, highlight)
  // - source.personalProjects[] → projects[] (showcase cards)
  // INTENTIONALLY EXCLUDED: source.careers[].projects[] (work sub-projects with techStack/achievements)
  //   These are job-application detail consumed by Wanted/JobKorea sync, not portfolio content.
  //   The terminal-themed portfolio shows summarized career cards only.
  //   If sub-projects need to render here, extend the entry below AND update apps/portfolio/lib/cards.js.
  const resume = source.careers.map((career, idx) =>
    careerCardFromSource(career, idx, statsByIndex)
  );
  const resumeEn = source.careers.map((career, idx) =>
    englishCareerCardFromSource(career, idx, RESUME_STATS_BY_INDEX.en, CAREER_EN_OVERRIDES)
  );
  const projects = (source.personalProjects || []).map(projectCardFromSource);
  const projectsEn = (source.personalProjects || []).map((project) =>
    englishProjectCardFromSource(project, PROJECT_EN_OVERRIDES)
  );

  // SSoT careers[] → top-level careers[] for the client timeline module.
  // Preserves the data fields apps/portfolio/src/scripts/modules/timeline.js renders
  // (company, companyUrl, period, role, myRole, description) so the timeline reads from
  // build-injected window.__RESUME_CHAT_DATA__.careers instead of a hardcoded fallback.
  // `achievements` is flattened from the SSoT work sub-projects (career.projects[].achievements)
  // so the timeline "Impact" text + expanded list stay sourced from the SSoT (no drift).
  // UI-only metadata (phase/status) is NOT part of the SSoT and is attached in timeline.js.
  const careers = source.careers.map(timelineCareerFromSource);

  return {
    resumeDownload: {
      pdfUrl: 'https://resume.jclee.me/resume.pdf',
      docxUrl:
        'https://raw.githubusercontent.com/jclee941/resume/master/packages/data/resumes/archive/versions/resume_final.docx',
      mdUrl:
        'https://raw.githubusercontent.com/jclee941/resume/master/packages/data/resumes/master/resume_final.md',
    },
    resume,
    careers,
    resumeEn,
    projects,
    projectsEn,
    certifications: source.certifications,
    skills: source.skills,
    hero: source.hero,
    sectionDescriptions: source.sectionDescriptions,
    achievements: source.achievements,
    infrastructure: source.infrastructure,
    contact: source.contact,
    aboutSection:
      source.summary && source.summary.aboutSection ? source.summary.aboutSection : null,
    expertise: source.summary && source.summary.expertise ? source.summary.expertise : null,
    coreCompetencies:
      source.summary && source.summary.coreCompetencies ? source.summary.coreCompetencies : null,
    education: source.education || null,
    languages: source.languages || null,
    awards: source.awards || null,
    ossContributions: source.ossContributions || null,
    military: source.military || null,
    coverLetter: source.coverLetter || null,
    platformVariants: source.platformVariants || null,
  };
}

module.exports = {
  generateWebData,
};
