import { detectRole, getRoleIntro } from './role-detection.js';
import {
  getMatchedSkills,
  getRelevantAchievements,
  inferDomain,
  parseYears,
} from './text-analysis.js';

export function buildKoreanCoverLetter(
  name,
  company,
  position,
  years,
  domain,
  role,
  matchedSkills,
  achievements,
  portfolio
) {
  const roleIntro = getRoleIntro(role);
  const skillsText = matchedSkills.length > 0 ? matchedSkills.slice(0, 5).join(', ') : domain;
  const achievementSection =
    achievements.length > 0
      ? `\n[주요 성과]\n${achievements.map((achievement) => `• ${achievement}`).join('\n')}`
      : '';
  const portfolioLine = portfolio ? `\n포트폴리오: ${portfolio}` : '';

  return [
    '채용 담당자님께,',
    '',
    `${company}의 ${position} 포지션에 지원합니다.`,
    '',
    `${roleIntro}, ${years || 9}년간 금융·공공 환경에서 ${skillsText} 분야의 실무 경험을 쌓아왔습니다.`,
    '',
    '특히 증권 매매체결시스템 보안 인프라를 구축·운영하며 금융위원회 본인가 심사에 대응했고, Splunk ES 탐지 룰과 알림 워크플로 구축, Ansible·Python 기반 운영 자동화를 직접 수행했습니다.',
    achievementSection,
    '',
    `${company}의 ${position} 직무에서 그간의 경험과 기술력을 바탕으로 팀의 보안 역량 강화와 운영 효율화에 기여하고자 합니다.`,
    '',
    '면접 기회를 주시면 구체적인 기여 방안을 말씀드리겠습니다.',
    portfolioLine,
    '',
    '감사합니다.',
    name,
  ]
    .filter(Boolean)
    .join('\n');
}

export function buildEnglishCoverLetter(
  name,
  company,
  position,
  years,
  domain,
  _role,
  matchedSkills,
  achievements,
  portfolio
) {
  const skillsText = matchedSkills.length > 0 ? matchedSkills.slice(0, 5).join(', ') : domain;
  const achievementSection =
    achievements.length > 0
      ? `\nKey Achievements:\n${achievements.map((achievement) => `• ${achievement}`).join('\n')}`
      : '';
  const portfolioLine = portfolio ? `\nPortfolio: ${portfolio}` : '';

  return [
    'Dear Hiring Manager,',
    '',
    `I am writing to apply for the ${position} position at ${company}.`,
    '',
    `With ${years || 9} years of hands-on experience in ${skillsText}, I have designed and operated security infrastructure across financial and public-sector environments.`,
    '',
    'I designed and operated FortiGate HA architecture for a securities trading system and supported the Financial Services Commission license review with documented security evidence. I also built SIEM detection rules and notification workflows on Splunk ES, and automated server configuration with Ansible and Python.',
    achievementSection,
    '',
    `I am confident that my experience in ${skillsText} would enable me to make meaningful contributions to your team.`,
    portfolioLine,
    '',
    'Best regards,',
    name,
  ]
    .filter(Boolean)
    .join('\n');
}

export function buildTemplateFallback(resumeData, jobPosting, options = {}) {
  const language = options.language === 'ko' ? 'ko' : 'en';
  const matchedSkills = getMatchedSkills(resumeData, jobPosting);
  const years = parseYears(resumeData.summary?.totalExperience);
  const domain = inferDomain(resumeData);
  const position = jobPosting.position || jobPosting.title || 'this role';
  const company = jobPosting.company?.name || jobPosting.company || 'your company';
  const name = resumeData.personal?.name || 'Candidate';
  const portfolio = resumeData.personal?.portfolio || '';
  const role = detectRole(position);
  const achievements = getRelevantAchievements(resumeData, jobPosting);

  if (language === 'ko') {
    return buildKoreanCoverLetter(
      name,
      company,
      position,
      years,
      domain,
      role,
      matchedSkills,
      achievements,
      portfolio
    );
  }

  return buildEnglishCoverLetter(
    name,
    company,
    position,
    years,
    domain,
    role,
    matchedSkills,
    achievements,
    portfolio
  );
}
