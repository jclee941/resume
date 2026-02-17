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

  if (language === 'ko') {
    return [
      '채용 담당자님께,',
      '',
      `${company}의 ${position} 포지션에 지원하고자 합니다.`,
      `${years || 0}년의 ${domain} 경험을 바탕으로 ${
        matchedSkills.length > 0 ? matchedSkills.slice(0, 3).join(', ') : '실무 중심 기술'
      } 역량을 보유하고 있습니다.`,
      '',
      '주요 강점:',
      `${matchedSkills.length > 0 ? matchedSkills.map((skill) => `- ${skill}`).join('\n') : '- 직무 연관 경험 다수 보유'}`,
      '',
      '귀사의 목표 달성에 기여할 수 있는 방법을 면접에서 자세히 말씀드리고 싶습니다.',
      '',
      `감사합니다.\n${name}`,
    ].join('\n');
  }

  return [
    'Dear Hiring Manager,',
    '',
    `I am writing to express my interest in the ${position} role at ${company}.`,
    `With ${years || 0} years of experience in ${domain}, I bring expertise in ${
      matchedSkills.length > 0
        ? matchedSkills.slice(0, 3).join(', ')
        : 'infrastructure and automation'
    }.`,
    '',
    'Key qualifications:',
    `${matchedSkills.length > 0 ? matchedSkills.map((skill) => `- ${skill}`).join('\n') : '- Broad hands-on experience aligned with this role'}`,
    '',
    'I look forward to discussing how my background aligns with your needs.',
    '',
    `Best regards,\n${name}`,
  ].join('\n');
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
