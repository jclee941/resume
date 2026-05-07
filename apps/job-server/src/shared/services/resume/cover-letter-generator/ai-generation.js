import { buildJobText, getMatchedSkills } from './text-analysis.js';

const COVER_LETTER_STYLE_PROMPTS = {
  professional: 'Keep the tone professional, concise, and specific to business impact.',
  concise: 'Keep the letter concise and direct, with short paragraphs.',
  detailed: 'Use a detailed style with concrete examples and measurable outcomes.',
};

function buildRequirementText(requirements) {
  return Array.isArray(requirements) ? requirements.join('\n') : String(requirements || '');
}

export function buildAIPrompt(resumeData, jobPosting, options = {}) {
  const language = options.language === 'ko' ? 'ko' : 'en';
  const style = options.style || 'professional';
  const stylePrompt = COVER_LETTER_STYLE_PROMPTS[style] || COVER_LETTER_STYLE_PROMPTS.professional;
  const matchedSkills = getMatchedSkills(resumeData, jobPosting);
  const company = jobPosting.company?.name || jobPosting.company || '';
  const position = jobPosting.position || jobPosting.title || '';
  const requirements = buildRequirementText(jobPosting.requirements);
  const jobText = buildJobText(jobPosting);

  if (language === 'ko') {
    return `다음 정보를 기반으로 지원 직무 맞춤형 커버레터를 작성해주세요.

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
포지션: ${position}
회사: ${company}
요구사항: ${requirements}
상세: ${jobText}

커버레터 본문만 출력하세요.`;
  }

  return `Generate a personalized cover letter using the information below.

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
Position: ${position}
Company: ${company}
Requirements: ${requirements}
Detail: ${jobText}

Return only the cover letter body.`;
}
