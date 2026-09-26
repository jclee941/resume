import { loadResume } from './job-matcher.js';
export { extractKeywordsWithAI, getCareerAdvice, getAICareerAdvice } from './ai-matcher-advice.js';
export { matchJobsWithAI } from './ai-matcher-batch.js';

const CLAUDE_CONFIG = {
  apiKey:
    process.env.CLIPROXY_API_KEY || process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY,
  baseUrl: (process.env.CLIPROXY_BASE || 'https://cliproxy.jclee.me/v1').replace(/\/$/, ''),
  model: process.env.CLIPROXY_MODEL || 'gpt-6-pro',
  maxTokens: 4000,
};

export async function analyzeWithClaude(prompt, text, { logger = console } = {}) {
  if (!CLAUDE_CONFIG.apiKey) {
    logger.warn('Claude API key not found, falling back to basic matching');
    return null;
  }

  try {
    const response = await fetch(`${CLAUDE_CONFIG.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${CLAUDE_CONFIG.apiKey}`,
      },
      body: JSON.stringify({
        model: CLAUDE_CONFIG.model,
        max_tokens: CLAUDE_CONFIG.maxTokens,
        messages: [
          {
            role: 'system',
            content:
              '당신은 채용 전문가입니다. 한국어 채용 공고와 이력서를 분석하여 상세한 매칭 정보를 제공해주세요.',
          },
          { role: 'user', content: `${prompt}\n\n텍스트: ${text}` },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status}`);
    }

    const result = await response.json();
    return result.choices[0].message.content;
  } catch (error) {
    logger.error('Claude AI 분석 실패:', error.message);
    return null;
  }
}

export async function analyzeJobPosting(jobPosting, { logger = console } = {}) {
  const prompt = `채용 공고를 분석하여 다음 정보를 JSON 형식으로 추출해주세요:
1. 주요 요구사항 (required_skills, preferred_skills)
2. 경력 수준 (experience_level: junior/mid/senior/lead)
3. 직무 카테고리 (job_category)
4. 회사 유형 (company_type)
5. 근무 형태 (work_type)
6. 기술 스택 (tech_stack)

JSON 형식으로만 응답해주세요.`;

  const jobText = [
    jobPosting.position || jobPosting.title || '',
    jobPosting.company ? `회사: ${jobPosting.company}` : '',
    jobPosting.location ? `근무지: ${jobPosting.location}` : '',
    jobPosting.description || jobPosting.content || '',
  ]
    .filter(Boolean)
    .join('\n');
  const analysis = await analyzeWithClaude(prompt, jobText, {
    logger,
  });
  if (!analysis) return null;

  try {
    const jsonMatch = analysis.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    logger.error('[analyzeJobPosting] JSON parse failed:', error.message);
    return null;
  }
}

export async function analyzeResume(resume, { logger = console } = {}) {
  const prompt = `이력서를 분석하여 다음 정보를 JSON 형식으로 추출해주세요:
1. 보유 기술 스택 (skills)
2. 경력 연차 (experience_years)
3. 경력 수준 (experience_level)
4. 주요 프로젝트 (key_projects)
5. 강점 (strengths)

JSON 형식으로만 응답해주세요.`;

  const resumeText =
    typeof resume === 'string'
      ? resume
      : `${resume.summary || ''} ${resume.experience || ''} ${resume.skills || ''}`.trim();
  const analysis = await analyzeWithClaude(prompt, resumeText, { logger });
  if (!analysis) return null;

  try {
    const jsonMatch = analysis.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    logger.error('[analyzeResume] JSON parse failed:', error.message);
    return null;
  }
}

export async function calculateAIMatchScore(
  resumeAnalysis,
  jobAnalysis,
  { logger = console } = {}
) {
  const prompt = `이력서와 채용 공고의 매칭도를 분석해주세요.

이력서: ${JSON.stringify(resumeAnalysis)}
채용 공고: ${JSON.stringify(jobAnalysis)}

항목별 가중치: 기술(40%), 경력(25%), 프로젝트(20%), 문화(10%), 조건(5%)

JSON 형식으로 응답:
{"match_score": 85, "skill_match": 90, "experience_match": 80, "reasoning": "설명", "strengths": [], "gaps": []}`;

  const analysis = await analyzeWithClaude(prompt, '', { logger });
  if (!analysis) return { score: 0, reasoning: 'AI 분석 실패' };

  try {
    const jsonMatch = analysis.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { score: 0, reasoning: '응답 파싱 실패' };

    const result = JSON.parse(jsonMatch[0]);
    return {
      score: result.match_score || 0,
      reasoning: result.reasoning || '',
      details: result,
    };
  } catch (error) {
    logger.error('[calculateAIMatchScore] JSON parse failed:', error.message);
    return { score: 0, reasoning: '파싱 오류' };
  }
}

export async function calculateAIMatch(
  resumePath,
  jobPosting,
  { logger = console, resumeReader = loadResume } = {}
) {
  try {
    const resume = resumeReader(resumePath);
    const resumeAnalysis = await analyzeResume(resume, { logger });
    const jobAnalysis = await analyzeJobPosting(jobPosting, { logger });

    if (!resumeAnalysis || !jobAnalysis) {
      return {
        matchScore: 0,
        aiAnalysis: null,
        fallback: true,
        reasoning: 'AI 분석 실패',
      };
    }

    const matchResult = await calculateAIMatchScore(resumeAnalysis, jobAnalysis, { logger });

    return {
      matchScore: matchResult.score,
      aiAnalysis: {
        resumeAnalysis,
        jobAnalysis,
        matchDetails: matchResult.details,
        reasoning: matchResult.reasoning,
      },
      fallback: false,
      confidence: 'medium',
    };
  } catch (error) {
    logger.error('AI 매칭 분석 중 오류:', error);
    return {
      matchScore: 0,
      aiAnalysis: null,
      fallback: true,
      reasoning: `AI 분석 오류: ${error.message}`,
    };
  }
}
