/**
 * Resume apps/portfolio data transformation utilities.
 */

/**
 * Generate portfolio apps/portfolio data from master resume source data.
 * @param {Object} source - Master resume data.
 * @returns {Object} Portfolio data.json payload.
 */
function generateWebData(source) {
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
        'Established a routine log analysis cadence and adhered to security audit guidelines to proactively detect hardware failure indicators in a closed network environment.',
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
    'FortiNet API Client': {
      title: 'Fortinet API Client',
      description:
        'Python library wrapping FortiManager and FortiAnalyzer REST APIs to remove repetitive console operations from daily security ops.',
      tagline: 'Security Device API Automation',
    },
    'Security Alert System': {
      description:
        'Connected Splunk Saved Search webhooks to Slack/Telegram so security event detection delivers immediate notifications instead of waiting on console review.',
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
    const statsMap = {
      '(주)아이티센 CTS': ['보안관제', '컴플라이언스', 'DR'],
      '(주)가온누리정보시스템': ['아키텍처', '망분리', '인허가'],
      '(주)콴텍투자일임': ['AWS', '정책설계', '안정운영'],
      '(주)조인트리': ['NSX-T', '보안통합', 'SI'],
      '(주)메타넷엠플랫폼': ['VPN/NAC', 'Ansible', 'Python'],
      '(주)엠티데이타': ['서버운영', '방화벽', '망분리'],
    };

    const entry = {
      icon: icons[idx] || '💼',
      title: career.company,
      description: career.description,
      period: career.period,
      stats: statsMap[career.company] || [],
      highlight: idx === 0,
    };

    if (idx === 0) {
      entry.completePdfUrl =
        'https://raw.githubusercontent.com/jclee-homelab/resume/master/packages/data/resumes/technical/nextrade/exports/Nextrade_Full_Documentation.pdf';
    }

    return entry;
  });

  const resumeEn = source.careers.map((career, idx) => {
    const icons = ['🏦', '🏗️', '📈', '☁️', '🎓', '📞', '✈️'];
    const statsMapEn = {
      '(주)아이티센 CTS': ['Security Operations', 'Compliance', 'DR'],
      '(주)가온누리정보시스템': ['Architecture', 'Network Segmentation', 'Regulatory Approval'],
      '(주)콴텍투자일임': ['AWS', 'Policy Design', 'Stable Operations'],
      '(주)조인트리': ['NSX-T', 'Security Integration', 'Systems Integration'],
      '(주)메타넷엠플랫폼': ['VPN/NAC', 'Ansible', 'Python'],
      '(주)엠티데이타': ['Server Operations', 'Firewall', 'Network Segmentation'],
    };

    const translated = careerEnMap[career.company] || {};
    const entry = {
      icon: icons[idx] || '💼',
      title: translated.title || career.company,
      description: translated.description || career.description,
      period: translated.period || career.period.replace('현재', 'Present'),
      stats: statsMapEn[career.company] || [],
      highlight: idx === 0,
    };

    if (idx === 0) {
      entry.completePdfUrl =
        'https://raw.githubusercontent.com/jclee-homelab/resume/master/packages/data/resumes/technical/nextrade/exports/Nextrade_Full_Documentation.pdf';
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
    };
  });

  return {
    resumeDownload: {
      pdfUrl: 'https://resume.jclee.me/resume.pdf',
      docxUrl:
        'https://raw.githubusercontent.com/jclee-homelab/resume/master/packages/data/resumes/archive/versions/resume_final.docx',
      mdUrl:
        'https://raw.githubusercontent.com/jclee-homelab/resume/master/packages/data/resumes/master/resume_final.md',
    },
    resume,
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
    aboutSection: source.summary && source.summary.aboutSection ? source.summary.aboutSection : null,
  };
}

module.exports = {
  generateWebData,
};
