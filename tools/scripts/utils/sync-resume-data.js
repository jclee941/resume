#!/usr/bin/env node
/**
 * Single Source of Truth: resumes/master/resume_data.json
 *
 * Generates:
 * - web/data.json (portfolio website)
 * - shinhan_filled.pptx (proposal format)
 */

const fs = require('fs');
const path = require('path');
const { validateResumeDataFile, formatErrors } = require('./validate-resume-data.js');

const SOURCE_PATH = path.join(
  __dirname,
  '../../../typescript/data/resumes/master/resume_data.json'
);
const SCHEMA_PATH = path.join(
  __dirname,
  '../../../typescript/data/resumes/master/resume_schema.json'
);
const WEB_DATA_PATH = path.join(__dirname, '../../../typescript/portfolio-worker/data.json');

function loadSource() {
  const raw = fs.readFileSync(SOURCE_PATH, 'utf-8');
  return JSON.parse(raw);
}

function generateWebData(source) {
  const careerEnMap = {
    '(주)아이티센 CTS': {
      title: 'ITCEN CTS Co., Ltd.',
      period: '2025.03 ~ Present',
      description:
        'Nextrade security operations managed service and support for the Information Security Team\n• Enhanced Splunk-based security log analysis and real-time threat monitoring\n• Optimized FortiGate firewall policies and automated access-control operations\n• Strengthened infrastructure stability through vulnerability assessments and monthly security reporting\n• Tech: Splunk, FortiGate, Python, Linux',
    },
    '(주)가온누리정보시스템': {
      title: 'Gaonnuri Information Systems Co., Ltd.',
      description:
        'Designed and built the security infrastructure for the Nextrade trading execution system\n• Provided technical support for Financial Services Commission authorization review and established the security architecture\n• Designed network segmentation and access-control policies to meet security compliance requirements\n• Implemented FortiGate HA high-availability architecture and disaster recovery processes\n• Tech: FortiGate, FortiManager, Linux, VMware',
    },
    '(주)콴텍투자일임': {
      title: 'Quant Investment Management Co., Ltd.',
      description:
        'Operated cloud infrastructure security for an AI asset management platform\n• Managed and improved AWS security controls including IAM, Security Groups, and WAF\n• Performed recurring vulnerability assessments and supported robo-advisor testbed security reviews\n• Built and operated Prometheus/Grafana security metrics dashboards\n• Tech: AWS, Terraform, Prometheus, Grafana',
    },
    '(주)펀엔씨': {
      title: 'FunNC Co., Ltd.',
      description:
        'Led cloud migration and security hardening for an e-commerce service\n• Designed migration from on-premises environments to AWS VPC-based cloud architecture\n• Established EKS cluster security settings and container vulnerability assessment processes\n• Automated security review steps in GitLab CI/CD pipelines\n• Tech: AWS, Kubernetes, Docker, GitLab CI',
    },
    '(주)조인트리': {
      title: 'Jointree Co., Ltd.',
      description:
        'Advanced security infrastructure for the next-generation information system at Kookmin University\n• Strengthened internal network security through VMware NSX-T-based micro-segmentation design\n• Built integrated security solutions and policies including firewall, NAC, and DLP\n• Supported network security architecture for hybrid cloud transition\n• Tech: VMware NSX-T, Network Security, NAC',
    },
    '(주)메타넷엠플랫폼': {
      title: 'Metanet M Platform Co., Ltd.',
      description:
        'Operated and automated large-scale contact center IT infrastructure\n• Rapidly built and operated VPN infrastructure for large-scale remote work during COVID-19\n• Improved operational efficiency by automating server provisioning and repetitive tasks with Ansible\n• Built real-time monitoring and incident response using Zabbix and PRTG\n• Tech: Ansible, VPN, Zabbix, Python',
    },
    '(주)엠티데이타': {
      title: 'MT Data Co., Ltd.',
      description:
        'Provided on-site IT infrastructure operations support in the defense industry\n• Performed recurring maintenance and checks for server and client infrastructure in an isolated network\n• Managed infrastructure assets and applied security patches in compliance with internal security policies\n• Maintained stable working environments through technical support and incident response\n• Tech: Windows Server, Linux, Helpdesk',
    },
  };

  const projectEnMap = {
    'Observability Platform': {
      description:
        'Homelab infrastructure monitoring with Prometheus metrics collection, Loki log aggregation, and Grafana visualization.',
      tagline: 'Monitoring Platform',
    },
    'n8n Automation': {
      description: 'Automated workflows for alerts, deployments, and data collection.',
      tagline: 'Workflow Automation',
      metrics: {
        executions: '200+ runs/day',
      },
    },
    'FortiNet API Client': {
      title: 'Fortinet API Client',
      description:
        'Python library for querying FortiManager policies/routes and collecting FortiAnalyzer log statistics.',
      tagline: 'Security Device API Automation',
      metrics: {
        features: 'Policy retrieval, route management, log statistics',
        automation: '80% reduction in manual effort',
      },
    },
    'Security Alert System': {
      description:
        'Detects FortiGate events in Splunk and sends Slack Block Kit alerts with 32 active detection rules.',
      tagline: 'Security Alert Automation',
      metrics: {
        detectionRules: '32 rules',
        responseTime: 'Alert delivered within 30 seconds of event detection',
      },
    },
    'IP Blacklist Platform': {
      description:
        'Collects malicious IP data, performs analysis, and provides dashboards via a Flask API and Next.js frontend.',
      tagline: 'Threat Intelligence',
    },
  };

  const resume = source.careers.map((career, idx) => {
    const icons = ['🏦', '🏗️', '📈', '☁️', '🎓', '📞', '✈️'];
    const statsMap = {
      '(주)아이티센 CTS': ['보안관제', '컴플라이언스', 'DR'],
      '(주)가온누리정보시스템': ['아키텍처', '망분리', '인허가'],
      '(주)콴텍투자일임': ['AWS', '정책설계', '안정운영'],
      '(주)펀엔씨': ['AWS', 'K8s', 'DevOps'],
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
        'https://raw.githubusercontent.com/jclee-homelab/resume/master/typescript/data/resumes/technical/nextrade/exports/Nextrade_Full_Documentation.pdf';
    }

    return entry;
  });

  const resumeEn = source.careers.map((career, idx) => {
    const icons = ['🏦', '🏗️', '📈', '☁️', '🎓', '📞', '✈️'];
    const statsMapEn = {
      '(주)아이티센 CTS': ['Security Operations', 'Compliance', 'DR'],
      '(주)가온누리정보시스템': ['Architecture', 'Network Segmentation', 'Regulatory Approval'],
      '(주)콴텍투자일임': ['AWS', 'Policy Design', 'Stable Operations'],
      '(주)펀엔씨': ['AWS', 'K8s', 'DevOps'],
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
        'https://raw.githubusercontent.com/jclee-homelab/resume/master/typescript/data/resumes/technical/nextrade/exports/Nextrade_Full_Documentation.pdf';
    }

    return entry;
  });

  // Map personal projects to projects format
  const projects = (source.personalProjects || []).map((proj) => ({
    icon: proj.icon || '💻',
    title: proj.name,
    tech: Array.isArray(proj.technologies) ? proj.technologies.join(', ') : proj.technologies,
    description: proj.description,
    tagline: proj.tagline || proj.description,
    metrics: proj.metrics || {},
    related_skills: proj.technologies || [],
    liveUrl: proj.url,
    repoUrl: proj.repoUrl,
    businessImpact: proj.businessImpact,
  }));

  const projectsEn = (source.personalProjects || []).map((proj) => {
    const translated = projectEnMap[proj.name] || {};
    const translatedMetrics = {
      ...(proj.metrics || {}),
      ...(translated.metrics || {}),
    };

    return {
      icon: proj.icon || '💻',
      title: translated.title || proj.name,
      tech: Array.isArray(proj.technologies) ? proj.technologies.join(', ') : proj.technologies,
      description: translated.description || proj.description,
      tagline: translated.tagline || proj.tagline || proj.description,
      metrics: translatedMetrics,
      related_skills: proj.technologies || [],
      liveUrl: proj.url,
      repoUrl: proj.repoUrl,
      businessImpact: proj.businessImpact,
    };
  });

  return {
    resumeDownload: {
      pdfUrl: 'https://resume.jclee.me/resume.pdf',
      docxUrl:
        'https://raw.githubusercontent.com/jclee-homelab/resume/master/typescript/data/resumes/archive/versions/resume_final.docx',
      mdUrl:
        'https://raw.githubusercontent.com/jclee-homelab/resume/master/typescript/data/resumes/master/resume_final.md',
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
  };
}

function main() {
  // Step 1: Validate master resume data before processing
  console.log('📋 Validating resume data against schema...');
  const validation = validateResumeDataFile(SOURCE_PATH, SCHEMA_PATH);

  if (!validation.valid) {
    console.error('❌ Resume data validation FAILED:');
    console.error(formatErrors(validation.errors));
    console.error('\n⚠️  Fix the errors above and try again.');
    process.exit(1);
  }
  console.log('✅ Resume data validation passed\n');

  // Step 2: Load and process valid data
  console.log('📄 Loading source: resumes/master/resume_data.json');
  const source = loadSource();

  console.log('🔄 Generating web/data.json...');
  const webData = generateWebData(source);
  fs.writeFileSync(WEB_DATA_PATH, JSON.stringify(webData, null, 2) + '\n');
  console.log('✅ web/data.json updated');

  console.log('\n📊 Summary:');
  console.log(`   - Resume entries: ${webData.resume.length}`);
  console.log(`   - Project entries: ${webData.projects.length}`);
  console.log(`   - Source: ${source.personal.name} (${source.summary.totalExperience})`);
}

main();
