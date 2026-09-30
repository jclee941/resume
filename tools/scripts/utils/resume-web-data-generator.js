const fs = require('fs');
const { WEB_DATA_OVERRIDES_PATH } = require('./resume-data-paths.js');
const {
  careerCardFromSource,
  englishCareerCardFromSource,
  englishProjectCardFromSource,
  projectCardFromSource,
  timelineCareerFromSource,
} = require('./resume-web-data-projections.js');

const RESUME_STATS_BY_INDEX = {
  ko: [
    ['Splunk ES', '탐지·대응', '보안 이벤트 흐름'],
    ['FortiGate HA', '5계층 망분리', '본인가 대응'],
    ['금융DC 운영', '감사 대응', 'Python Runbook'],
    ['NSX-T', '마이크로세그멘테이션', '침입 탐지'],
    ['Ansible Runbook', 'NAC', 'VPN 모니터링'],
    ['Linux 운영', '방화벽 정책', '패치 관리'],
  ],
  en: [
    ['Splunk ES', 'Detection & Response', 'Security Event Flow'],
    ['FortiGate HA', '5-Tier Segmentation', 'FSC Approval'],
    ['Financial DC Ops', 'Audit Response', 'Python Runbooks'],
    ['NSX-T', 'Microsegmentation', 'Intrusion Detection'],
    ['Ansible Runbooks', 'NAC', 'VPN Monitoring'],
    ['Linux Ops', 'Firewall Policy', 'Patch Management'],
  ],
  ja: [
    ['Splunk ES', '検知・対応', 'セキュリティイベントフロー'],
    ['FortiGate HA', '5階層ネットワーク分離', '本認可対応'],
    ['金融DC運用', '監査対応', 'Python Runbook'],
    ['NSX-T', 'マイクロセグメンテーション', '侵入検知'],
    ['Ansible Runbook', 'NAC', 'VPNモニタリング'],
    ['Linux運用', 'ファイアウォールポリシー', 'パッチ管理'],
  ],
};

const PROJECT_EN_OVERRIDES = {
  'Observability Platform': {
    description:
      'Built unified observability for homelab infrastructure to remove the need to switch between per-service consoles by integrating Prometheus, Loki, and Grafana into a single dashboard.',
    tagline: 'Monitoring Platform',
  },
  Automation: {
    description:
      'Centralized scattered automation tasks such as alerts, deployments, and data collection into reusable workflow patterns.',
    tagline: 'Automation',
  },
  'Security Alert System': {
    description:
      'FortiGate security events were scattered across device syslog and Splunk, making operator awareness and response handoff hard to keep consistent. Integrated Splunk Saved Search with Webhooks and implemented an EMS state-tracking pattern to prevent duplicate alerts by sending notifications only on state transitions. Classifies events with maintained FortiGate LogID mappings. When FortiGate syslog events occur, alerts are routed through Splunk Saved Search → Webhook → Slack in a single path.',
    tagline: 'Security Alert Automation',
  },
  'IP Blacklist Platform': {
    description:
      'Built a unified threat intel lookup over Flask and Next.js so analysts query a single interface instead of multiple external feeds.',
    tagline: 'Threat Intelligence',
  },
};

/**
 * Load the content-side display overrides (keyed by source company name).
 * @returns {Record<string, { title?: string, period?: string, description?: string }>}
 */
function loadCareerEnOverrides() {
  if (!fs.existsSync(WEB_DATA_OVERRIDES_PATH)) {
    throw new Error(
      `Missing resume content file: ${WEB_DATA_OVERRIDES_PATH}. ` +
        'Restore the content pack (see docs/adr/0011-content-pack-in-d1.md) before generating web data.'
    );
  }
  return JSON.parse(fs.readFileSync(WEB_DATA_OVERRIDES_PATH, 'utf8')).careerEn;
}

/** @type {Set<string | undefined>} */
const PUBLIC_PORTFOLIO_EXCLUDED_IDS = new Set([
  'mcp-server-hub',
  'idle-outpost',
  'account',
  'meetup-coordinator-mcp',
  'nunchi-translator-mcp',
]);
/** @type {Set<string | undefined>} */
const PUBLIC_PORTFOLIO_UNLINKED_IDS = new Set(['jclee-bot-github-app']);

/**
 * @typedef {Object} ResumeContact
 * @property {string} [email]
 * @property {string} [github]
 * @property {string} [linkedin]
 * @property {string} [velog]
 * @property {string} [website]
 * @property {string} [monitoring]
 * @property {string} [phone]
 * @property {string} [portfolio]
 */

/**
 * @typedef {Object} ResumeSourceSummary
 * @property {unknown} [aboutSection]
 * @property {unknown} [expertise]
 * @property {unknown} [coreCompetencies]
 */

/**
 * @typedef {Object} ResumeSource
 * @property {import('./resume-web-data-projections.js').SourceCareer[]} careers
 * @property {import('./resume-web-data-projections.js').SourceProject[]} [personalProjects]
 * @property {Array<{ id?: string, [key: string]: unknown }>} [infrastructure]
 * @property {ResumeContact} [contact]
 * @property {ResumeSourceSummary | null} [summary]
 * @property {unknown} [certifications]
 * @property {unknown} [skills]
 * @property {unknown} [hero]
 * @property {unknown} [sectionDescriptions]
 * @property {unknown} [achievements]
 * @property {unknown} [education]
 * @property {unknown} [languages]
 * @property {unknown} [awards]
 * @property {unknown} [ossContributions]
 * @property {unknown} [military]
 * @property {unknown} [coverLetter]
 * @property {unknown} [platformVariants]
 */

/**
 * @template {{ id?: string }} T
 * @param {T[] | null | undefined} items
 * @returns {T[]}
 */
function publicPortfolioItems(items) {
  return (items || []).filter((item) => !PUBLIC_PORTFOLIO_EXCLUDED_IDS.has(item.id));
}

/**
 * @param {ResumeContact | null | undefined} contact
 */
function publicContact(contact) {
  const { email, github, linkedin, velog, website, monitoring } = contact || {};
  return { email, github, linkedin, velog, website, monitoring };
}

/**
 * @param {ResumeSource} source
 * @param {string} [language]
 */
function generateWebData(source, language = 'ko') {
  const statsByIndex =
    /** @type {Record<string, string[][]>} */ (RESUME_STATS_BY_INDEX)[language] ||
    RESUME_STATS_BY_INDEX.ko;

  // SSoT → portfolio data contract:
  // - source.careers[] → resume[] (flat career cards: icon, title, description, period, stats, highlight)
  // - source.personalProjects[] → projects[] (showcase cards)
  // INTENTIONALLY EXCLUDED: source.careers[].projects[] (work sub-projects with techStack/achievements)
  //   These are job-application detail consumed by Wanted/JobKorea sync, not portfolio content.
  //   The terminal-themed portfolio shows summarized career cards only.
  //   If sub-projects need to render here, extend the entry below AND update apps/portfolio/lib/cards.js.
  const careerEnOverrides = loadCareerEnOverrides();
  const resume = source.careers.map((career, idx) =>
    careerCardFromSource(career, idx, statsByIndex)
  );
  const resumeEn = source.careers.map((career, idx) =>
    englishCareerCardFromSource(career, idx, RESUME_STATS_BY_INDEX.en, careerEnOverrides)
  );
  const publicProjects = /** @type {import('./resume-web-data-projections.js').SourceProject[]} */ (
    publicPortfolioItems(source.personalProjects).map((project) =>
      PUBLIC_PORTFOLIO_UNLINKED_IDS.has(project.id)
        ? { ...project, githubUrl: null, repoUrl: null }
        : project
    )
  );
  const projects = publicProjects.map(projectCardFromSource);
  const projectsEn = publicProjects.map((project) =>
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
    infrastructure: publicPortfolioItems(source.infrastructure),
    contact: publicContact(source.contact),
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
