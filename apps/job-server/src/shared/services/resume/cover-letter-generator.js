import { analyzeWithClaude } from '../matching/ai-matcher.js';

const COVER_LETTER_STYLE_PROMPTS = {
  professional: 'Keep the tone professional, concise, and specific to business impact.',
  concise: 'Keep the letter concise and direct, with short paragraphs.',
  detailed: 'Use a detailed style with concrete examples and measurable outcomes.',
};

const COMMON_STOPWORDS = new Set([
  'and',
  'the',
  'for',
  'with',
  'from',
  'that',
  'this',
  'have',
  'will',
  'your',
  'you',
  'our',
  'job',
  'role',
  'team',
  'work',
  'years',
  'year',
  '경력',
  '경험',
  '업무',
  '및',
  '에서',
]);

function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9가-힣+#./\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function toTokens(value) {
  return normalize(value)
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2 && !COMMON_STOPWORDS.has(token));
}

function unique(list) {
  return [...new Set(list)];
}

function parseYears(totalExperience) {
  const value = String(totalExperience || '');
  const match = value.match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : 0;
}

function collectResumeSkills(resumeData) {
  return Object.values(resumeData.skills || {}).flatMap((group) =>
    (group.items || []).map((item) => item.name)
  );
}

function buildJobText(jobPosting) {
  const requirements = Array.isArray(jobPosting.requirements)
    ? jobPosting.requirements.join(' ')
    : String(jobPosting.requirements || '');

  return [
    jobPosting.position || jobPosting.title || '',
    requirements,
    jobPosting.description || '',
    jobPosting.detail || '',
    jobPosting.preferred || '',
    jobPosting.benefits || '',
  ].join(' ');
}

function getMatchedSkills(resumeData, jobPosting) {
  const resumeSkills = collectResumeSkills(resumeData);
  const jobTokenSet = new Set(toTokens(buildJobText(jobPosting)));

  const scored = resumeSkills
    .map((skill) => {
      const skillTokens = toTokens(skill);
      const overlapCount = skillTokens.filter((token) => jobTokenSet.has(token)).length;
      return { skill, overlapCount };
    })
    .filter((item) => item.overlapCount > 0)
    .sort((a, b) => b.overlapCount - a.overlapCount)
    .map((item) => item.skill);

  return unique(scored).slice(0, 6);
}

function inferDomain(resumeData) {
  const expertise = Array.isArray(resumeData.summary?.expertise)
    ? resumeData.summary.expertise
    : [];
  if (expertise.length > 0) {
    return expertise.join(', ');
  }

  const resumeSkills = collectResumeSkills(resumeData).slice(0, 3);
  if (resumeSkills.length > 0) {
    return resumeSkills.join(', ');
  }

  return 'infrastructure and automation';
}

function buildTemplateFallback(resumeData, jobPosting, options = {}) {
  const language = options.language === 'ko' ? 'ko' : 'en';
  const matchedSkills = getMatchedSkills(resumeData, jobPosting);
  const years = parseYears(resumeData.summary?.totalExperience);
  const domain = inferDomain(resumeData);
  const position = jobPosting.position || jobPosting.title || 'this role';
  const company = jobPosting.company?.name || jobPosting.company || 'your company';
  const name = resumeData.personal?.name || 'Candidate';
  const portfolio = resumeData.personal?.portfolio || '';
  const role = detectRole(position);

  // Collect quantified achievements from career projects
  const achievements = [];
  for (const career of resumeData.careers || []) {
    for (const proj of career.projects || []) {
      for (const ach of proj.achievements || []) {
        achievements.push(ach);
      }
    }
  }

  // Pick top 3-5 achievements relevant to the job
  const jobText = buildJobText(jobPosting);
  const jobTokens = new Set(toTokens(jobText));
  const scoredAch = achievements.map(a => ({
    text: a,
    score: toTokens(a).filter(t => jobTokens.has(t)).length,
  })).sort((a, b) => b.score - a.score);
  const topAchievements = scoredAch.slice(0, 4).map(a => a.text);

  if (language === 'ko') {
    return buildKoreanCoverLetter(name, company, position, years, domain, role, matchedSkills, topAchievements, portfolio);
  }

  return buildEnglishCoverLetter(name, company, position, years, domain, role, matchedSkills, topAchievements, portfolio);
}

function detectRole(position) {
  const p = (position || '').toLowerCase();
  if (p.includes('devsecops') || (p.includes('security') && p.includes('devops'))) return 'devsecops';
  if (p.includes('sre') || p.includes('reliability')) return 'sre';
  if (p.includes('cloud') && p.includes('security')) return 'cloud-security';
  if (p.includes('security') || p.includes('보안')) return 'security';
  if (p.includes('devops')) return 'devops';
  if (p.includes('infra') || p.includes('인프라')) return 'infra';
  return 'general';
}

function getRoleIntro(role) {
  const intros = {
    devsecops: '보안과 운영을 코드로 통합하는 DevSecOps 엔지니어로서',
    sre: '서비스 안정성과 가용성을 최우선으로 설계하는 SRE 엔지니어로서',
    'cloud-security': '클라우드 환경의 보안 아키텍처를 설계하고 자동화하는 엔지니어로서',
    security: '보안 인프라의 설계부터 운영 자동화까지 담당하는 보안 엔지니어로서',
    devops: '인프라 자동화와 CI/CD 파이프라인을 설계·운영하는 DevOps 엔지니어로서',
    infra: '대규모 인프라 설계와 자동화를 전문으로 하는 인프라 엔지니어로서',
    general: '보안 인프라 자동화 전문 엔지니어로서',
  };
  return intros[role] || intros.general;
}

function buildKoreanCoverLetter(name, company, position, years, domain, role, matchedSkills, achievements, portfolio) {
  const roleIntro = getRoleIntro(role);
  const skillsText = matchedSkills.length > 0
    ? matchedSkills.slice(0, 5).join(', ')
    : domain;
  const achSection = achievements.length > 0
    ? `\n[주요 성과]\n${  achievements.map(a => `• ${  a}`).join('\n')}`
    : '';
  const portfolioLine = portfolio ? `\n포트폴리오: ${  portfolio}` : '';

  return [
    '채용 담당자님께,',
    '',
    `${company}의 ${position} 포지션에 지원합니다.`,
    '',
    `${roleIntro}, ${years || 9}년간 금융·공공 환경에서 ${skillsText} 분야의 실무 경험을 쌓아왔습니다.`,
    '',
    '특히 증권 매매체결시스템의 보안 아키텍처를 설계하여 금융위원회 본인가 심사를 통과시킨 경험이 있으며, SIEM 기반 보안 관제 체계 구축과 대규모 서버 운영 자동화를 직접 수행했습니다.',
    achSection,
    '',
    `${company}의 ${position} 직무에서 그간의 경험과 기술력을 바탕으로 팀의 보안 역량 강화와 운영 효율화에 기여하고자 합니다.`,
    '',
    '면접 기회를 주시면 구체적인 기여 방안을 말씀드리겠습니다.',
    portfolioLine,
    '',
    '감사합니다.',
    name,
  ].filter(Boolean).join('\n');
}

  function buildEnglishCoverLetter(name, company, position, years, domain, role, matchedSkills, achievements, portfolio) {
  const skillsText = matchedSkills.length > 0
    ? matchedSkills.slice(0, 5).join(', ')
    : domain;
  const achSection = achievements.length > 0
    ? `\nKey Achievements:\n${  achievements.map(a => `• ${  a}`).join('\n')}`
    : '';
  const portfolioLine = portfolio ? `\nPortfolio: ${  portfolio}` : '';

  return [
    'Dear Hiring Manager,',
    '',
    `I am writing to apply for the ${position} position at ${company}.`,
    '',
    `With ${years || 9} years of hands-on experience in ${skillsText}, I have designed and operated security infrastructure across financial and public-sector environments.`,
    '',
    'I designed FortiGate HA architecture achieving 99.99% availability for a securities trading system, which passed the Financial Services Commission authorization review. I also built SIEM monitoring with 32 detection rules and automated 500+ server configurations using Ansible/Python.',
    achSection,
    '',
    `I am confident that my experience in ${skillsText} would enable me to make meaningful contributions to your team.`,
    portfolioLine,
    '',
    'Best regards,',
    name,
  ].filter(Boolean).join('\n');
}

function buildAIPrompt(resumeData, jobPosting, options = {}) {
  const language = options.language === 'ko' ? 'ko' : 'en';
  const style = options.style || 'professional';
  const stylePrompt = COVER_LETTER_STYLE_PROMPTS[style] || COVER_LETTER_STYLE_PROMPTS.professional;
  const matchedSkills = getMatchedSkills(resumeData, jobPosting);

  const prompt =
    language === 'ko'
      ? `다음 정보를 기반으로 지원 직무 맞춤형 커버레터를 작성해주세요.

- 언어: 한국어
- 스타일: ${style}
- 톤: 전문적이고 자신감 있는 톤
- 길이: 4~6문단
- 반드시 포함:
  1) 직무 지원 동기
  2) 이력서 핵심 강점 요약
  3) 채용 공고 요구사항과의 정합성
  4) 마무리 문장

${stylePrompt}

[지원자 요약]
이름: ${resumeData.personal?.name || ''}
총 경력: ${resumeData.summary?.totalExperience || ''}
핵심 소개: ${resumeData.summary?.profileStatement || ''}
주요 스킬: ${matchedSkills.join(', ')}

[채용 공고]
포지션: ${jobPosting.position || jobPosting.title || ''}
회사: ${jobPosting.company?.name || jobPosting.company || ''}
요구사항: ${Array.isArray(jobPosting.requirements) ? jobPosting.requirements.join('\n') : String(jobPosting.requirements || '')}
상세: ${buildJobText(jobPosting)}

커버레터 본문만 출력하세요.`
      : `Generate a personalized cover letter using the information below.

- Language: English
- Style: ${style}
- Tone: Professional and confident
- Length: 4-6 paragraphs
- Must include:
  1) Why this role
  2) Resume highlights
  3) Alignment with job requirements
  4) Closing

${stylePrompt}

[Candidate Summary]
Name: ${resumeData.personal?.name || ''}
Total experience: ${resumeData.summary?.totalExperience || ''}
Profile: ${resumeData.summary?.profileStatement || ''}
Relevant skills: ${matchedSkills.join(', ')}

[Job Posting]
Position: ${jobPosting.position || jobPosting.title || ''}
Company: ${jobPosting.company?.name || jobPosting.company || ''}
Requirements: ${Array.isArray(jobPosting.requirements) ? jobPosting.requirements.join('\n') : String(jobPosting.requirements || '')}
Detail: ${buildJobText(jobPosting)}

Return only the cover letter body.`;

  return prompt;
}

export async function generateCoverLetter(resumeData, jobPosting, options = {}) {
  const fallbackCoverLetter = buildTemplateFallback(resumeData, jobPosting, options);
  const analyzeFn = typeof options.analyzeFn === 'function' ? options.analyzeFn : analyzeWithClaude;

  const prompt = buildAIPrompt(resumeData, jobPosting, options);
  const aiCoverLetter = await analyzeFn(prompt, '');

  if (!aiCoverLetter || !String(aiCoverLetter).trim()) {
    return {
      coverLetter: fallbackCoverLetter,
      fallback: true,
      language: options.language === 'ko' ? 'ko' : 'en',
    };
  }

  return {
    coverLetter: String(aiCoverLetter).trim(),
    fallback: false,
    language: options.language === 'ko' ? 'ko' : 'en',
  };
}
