/**
 * Resume apps/portfolio data transformation utilities.
 */

/**
 * Generate portfolio apps/portfolio data from master resume source data.
 * @param {Object} source - Master resume data.
 * @returns {Object} Portfolio data.json payload.
 */
function generateWebData(source, language = 'ko') {
  // Career stat tags keyed by career INDEX (language-agnostic). Company-name
  // keying breaks for non-KO sources because the English/Japanese SSoT carry
  // localized company names. data-processor.js renders these as <span class="tag">
  // badges from each per-language data_*.json's resume[] array.
  const STATS_BY_INDEX = {
    ko: [
      ['SIEM', '탐지·대응', '자동화'],
      ['FortiGate HA', '망분리', '인허가'],
      ['인프라운영', '자동화', '규제대응'],
      ['NSX-T', '마이크로세그', '네트워크보안'],
      ['Ansible', 'VPN/NAC', '자동화'],
      ['Linux', '서버운영', '방화벽'],
    ],
    en: [
      ['SIEM', 'Detection & Response', 'Automation'],
      ['FortiGate HA', 'Network Segmentation', 'Regulatory Approval'],
      ['Infra Ops', 'Automation', 'Compliance'],
      ['NSX-T', 'Microsegmentation', 'Network Security'],
      ['Ansible', 'VPN/NAC', 'Automation'],
      ['Linux', 'Server Ops', 'Firewall'],
    ],
    ja: [
      ['SIEM', '検知・対応', '自動化'],
      ['FortiGate HA', 'ネットワーク分離', '認可'],
      ['インフラ運用', '自動化', '規制対応'],
      ['NSX-T', 'マイクロセグメンテーション', 'ネットワークセキュリティ'],
      ['Ansible', 'VPN/NAC', '自動化'],
      ['Linux', 'サーバー運用', 'ファイアウォール'],
    ],
  };
  const statsByIndex = STATS_BY_INDEX[language] || STATS_BY_INDEX.ko;
  const careerEnMap = {
    '(주)아이티센 CTS': {
      title: 'ITCEN CTS Co., Ltd.',
      period: '2025.03 ~ 2026.02',
      description:
        'Built integrated security operations to reduce the delay between security event detection and responder notification by connecting Splunk ES with Slack via n8n and developing a FortiManager API-based firewall policy lookup tool.',
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

  const projectEnMap = {
    'Observability Platform': {
      description:
        'Built unified observability for homelab infrastructure to remove the need to switch between per-service consoles by integrating Prometheus, Loki, and Grafana into a single dashboard.',
      tagline: 'Monitoring Platform',
    },
    'n8n Automation': {
      description:
        'Centralized scattered automation tasks (alerts, deployments, data collection) into n8n so new integrations can be added without writing code.',
      tagline: 'Workflow Automation',
    },
    'Security Alert System': {
      description:
        'FortiGate security events were scattered across device syslog and Splunk, causing delays from event occurrence to responder awareness. Integrated Splunk Saved Search with Webhooks and implemented EMS state-tracking pattern (11 CSV state trackers) to prevent duplicate alerts by sending notifications only on state transitions. Classifies events with 6,091 FortiGate LogID mappings. When FortiGate syslog events occur, alerts are immediately routed through Splunk Saved Search → Webhook → Slack/Telegram in a single path.',
      tagline: 'Security Alert Automation',
    },
    'IP Blacklist Platform': {
      description:
        'Built a unified threat intel lookup over Flask and Next.js so analysts query a single interface instead of multiple external feeds.',
      tagline: 'Threat Intelligence',
    },
  };

  // SSoT → portfolio data contract:
  // - source.careers[] → resume[] (flat career cards: icon, title, description, period, stats, highlight)
  // - source.personalProjects[] → projects[] (showcase cards)
  // INTENTIONALLY EXCLUDED: source.careers[].projects[] (work sub-projects with techStack/achievements)
  //   These are job-application detail consumed by Wanted/JobKorea sync, not portfolio content.
  //   The terminal-themed portfolio shows summarized career cards only.
  //   If sub-projects need to render here, extend the entry below AND update apps/portfolio/lib/cards.js.
  const resume = source.careers.map((career, idx) => {
    const icons = ['🏦', '🏗️', '📈', '☁️', '🎓', '📞', '✈️'];
    // stats come from the language-aware STATS_BY_INDEX selected at the top.

    const entry = {
      icon: icons[idx] || '💼',
      title: career.company,
      role: career.myRole || career.role || '',
      description: career.description,
      period: career.period,
      stats: statsByIndex[idx] || [],
      highlight: idx === 0,
    };

    if (idx === 0) {
      entry.completePdfUrl =
        'https://raw.githubusercontent.com/jclee941/resume/master/packages/data/resumes/technical/nextrade/exports/Nextrade_Full_Documentation.pdf';
    }

    return entry;
  });

  const resumeEn = source.careers.map((career, idx) => {
    const icons = ['🏦', '🏗️', '📈', '☁️', '🎓', '📞', '✈️'];
    // resumeEn is a secondary EN projection (fallback path); use English stats
    // by index so it stays symmetric even if a non-EN source language is used.
    const statsByIndexEn = STATS_BY_INDEX.en;

    const translated = careerEnMap[career.company] || {};
    const entry = {
      icon: icons[idx] || '💼',
      title: translated.title || career.company,
      role: translated.role || career.myRole || career.role || '',
      description: translated.description || career.description,
      period: translated.period || career.period.replace('현재', 'Present'),
      stats: statsByIndexEn[idx] || [],
      highlight: idx === 0,
    };

    if (idx === 0) {
      entry.completePdfUrl =
        'https://raw.githubusercontent.com/jclee941/resume/master/packages/data/resumes/technical/nextrade/exports/Nextrade_Full_Documentation.pdf';
    }

    return entry;
  });

  const projects = (source.personalProjects || []).map((proj) => ({
    icon: proj.icon || '💻',
    title: proj.name,
    tech: Array.isArray(proj.technologies) ? proj.technologies.join(', ') : proj.technologies,
    description: proj.description,
    tagline: proj.tagline || proj.description,

    language: proj.language,

    githubUrl: proj.githubUrl,
    demoUrl: proj.demoUrl,

    related_skills: proj.technologies || [],
    liveUrl: proj.demoUrl || proj.url,
    repoUrl: proj.githubUrl || proj.repoUrl,
    businessImpact: proj.businessImpact,
    displayOrder: typeof proj.displayOrder === 'number' ? proj.displayOrder : 999,
    featured: proj.featured === true,
  }));

  const projectsEn = (source.personalProjects || []).map((proj) => {
    const translated = projectEnMap[proj.name] || {};

    return {
      icon: proj.icon || '💻',
      title: translated.title || proj.name,
      tech: Array.isArray(proj.technologies) ? proj.technologies.join(', ') : proj.technologies,
      description: translated.description || proj.description,
      tagline: translated.tagline || proj.tagline || proj.description,

      language: proj.language,

      githubUrl: proj.githubUrl,
      demoUrl: proj.demoUrl,

      related_skills: proj.technologies || [],
      liveUrl: proj.demoUrl || proj.url,
      repoUrl: proj.githubUrl || proj.repoUrl,
      businessImpact: proj.businessImpact,
      displayOrder: typeof proj.displayOrder === 'number' ? proj.displayOrder : 999,
      featured: proj.featured === true,
    };
  });

  // SSoT careers[] → top-level careers[] for the client timeline module.
  // Preserves the data fields apps/portfolio/src/scripts/modules/timeline.js renders
  // (company, companyUrl, period, role, myRole, description) so the timeline reads from
  // build-injected window.__RESUME_CHAT_DATA__.careers instead of a hardcoded fallback.
  // `achievements` is flattened from the SSoT work sub-projects (career.projects[].achievements)
  // so the timeline "Impact" text + expanded list stay sourced from the SSoT (no drift).
  // UI-only metadata (phase/status) is NOT part of the SSoT and is attached in timeline.js.
  const careers = source.careers.map((career) => ({
    company: career.company,
    companyUrl: career.companyUrl || null,
    period: career.period,
    role: career.role,
    myRole: career.myRole,
    description: career.description,
    achievements: (career.projects || [])
      .flatMap((project) => project.achievements || [])
      .filter((achievement) => typeof achievement === 'string' && achievement.length > 0),
  }));

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
  };
}

module.exports = {
  generateWebData,
};
