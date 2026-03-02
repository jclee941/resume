import { loadResume } from './job-matcher.js';

const CLAUDE_CONFIG = {
  apiKey: process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY,
  model: 'claude-3-5-sonnet-20241022',
  maxTokens: 4000,
  temperature: 0.1,
};

export async function analyzeWithClaude(prompt, text) {
  if (!CLAUDE_CONFIG.apiKey) {
    console.warn('Claude API key not found, falling back to basic matching');
    return null;
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_CONFIG.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: CLAUDE_CONFIG.model,
        max_tokens: CLAUDE_CONFIG.maxTokens,
        temperature: CLAUDE_CONFIG.temperature,
        system:
          '당신은 채용 전문가입니다. 한국어 채용 공고와 이력서를 분석하여 상세한 매칭 정보를 제공해주세요.',
        messages: [{ role: 'user', content: `${prompt}\n\n텍스트: ${text}` }],
      }),
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status}`);
    }

    const result = await response.json();
    return result.content[0].text;
  } catch (error) {
    console.error('Claude AI 분석 실패:', error.message);
    return null;
  }
}

export async function analyzeJobPosting(jobPosting) {
  const prompt = `채용 공고를 분석하여 다음 정보를 JSON 형식으로 추출해주세요:
1. 주요 요구사항 (required_skills, preferred_skills)
2. 경력 수준 (experience_level: junior/mid/senior/lead)
3. 직무 카테고리 (job_category)
4. 회사 유형 (company_type)
5. 근무 형태 (work_type)
6. 기술 스택 (tech_stack)

JSON 형식으로만 응답해주세요.`;

  const analysis = await analyzeWithClaude(
    prompt,
    jobPosting.description || jobPosting.content,
  );
  if (!analysis) return null;

  try {
    const jsonMatch = analysis.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    return JSON.parse(jsonMatch[0]);
  } catch {
    return null;
  }
}

export async function analyzeResume(resume) {
  const prompt = `이력서를 분석하여 다음 정보를 JSON 형식으로 추출해주세요:
1. 보유 기술 스택 (skills)
2. 경력 연차 (experience_years)
3. 경력 수준 (experience_level)
4. 주요 프로젝트 (key_projects)
5. 강점 (strengths)

JSON 형식으로만 응답해주세요.`;

  const resumeText =
    `${resume.summary || ''} ${resume.experience || ''} ${resume.skills || ''}`.trim();
  const analysis = await analyzeWithClaude(prompt, resumeText);
  if (!analysis) return null;

  try {
    const jsonMatch = analysis.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    return JSON.parse(jsonMatch[0]);
  } catch {
    return null;
  }
}

async function calculateAIMatchScore(resumeAnalysis, jobAnalysis) {
  if (!resumeAnalysis || !jobAnalysis) {
    return { score: 0, reasoning: '분석 데이터 부족' };
  }

  const prompt = `이력서와 채용 공고의 매칭도를 분석해주세요.

이력서: ${JSON.stringify(resumeAnalysis)}
채용 공고: ${JSON.stringify(jobAnalysis)}

항목별 가중치: 기술(40%), 경력(25%), 프로젝트(20%), 문화(10%), 조건(5%)

JSON 형식으로 응답:
{"match_score": 85, "skill_match": 90, "experience_match": 80, "reasoning": "설명", "strengths": [], "gaps": []}`;

  const analysis = await analyzeWithClaude(prompt, '');
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
  } catch {
    return { score: 0, reasoning: '파싱 오류' };
  }
}

export async function calculateAIMatch(resumePath, jobPosting) {
  try {
    const resume = loadResume(resumePath);
    const resumeAnalysis = await analyzeResume(resume);
    const jobAnalysis = await analyzeJobPosting(jobPosting);

    if (!resumeAnalysis || !jobAnalysis) {
      return {
        matchScore: 0,
        aiAnalysis: null,
        fallback: true,
        reasoning: 'AI 분석 실패',
      };
    }

    const matchResult = await calculateAIMatchScore(
      resumeAnalysis,
      jobAnalysis,
    );

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
    console.error('AI 매칭 분석 중 오류:', error);
    return {
      matchScore: 0,
      aiAnalysis: null,
      fallback: true,
      reasoning: `AI 분석 오류: ${error.message}`,
    };
  }
}

export async function extractKeywordsWithAI(text, category = 'general') {
  const prompt = `다음 텍스트에서 ${category} 관련 주요 키워드를 추출해주세요.
JSON 형식: {"keywords": [], "tech_stack": [], "importance_scores": {}}`;

  const analysis = await analyzeWithClaude(prompt, text);
  if (!analysis) return { keywords: [], tech_stack: [], importance_scores: {} };

  try {
    const jsonMatch = analysis.match(/\{[\s\S]*\}/);
    if (!jsonMatch)
      return { keywords: [], tech_stack: [], importance_scores: {} };
    return JSON.parse(jsonMatch[0]);
  } catch {
    return { keywords: [], tech_stack: [], importance_scores: {} };
  }
}

export async function matchJobsWithAI(resumePath, jobs, options = {}) {
  const { minScore = 0, maxResults = 10 } = options;

  try {
    const resume = loadResume(resumePath);
    const resumeAnalysis = await analyzeResume(resume);

    if (!resumeAnalysis) {
      throw new Error('Resume analysis failed');
    }

    const results = [];

    // Process in parallel with concurrency limit
    const batchSize = 5;
    for (let i = 0; i < jobs.length; i += batchSize) {
      const batch = jobs.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(async (job) => {
          try {
            const jobAnalysis = await analyzeJobPosting(job);
            if (!jobAnalysis) return null;

            const matchResult = await calculateAIMatchScore(
              resumeAnalysis,
              jobAnalysis,
            );

            return {
              ...job,
              matchScore: matchResult.score,
              matchPercentage: matchResult.score, // Alias for compatibility
              matchType: 'ai',
              confidence: 'medium',
              aiAnalysis: {
                matchDetails: matchResult.details,
                reasoning: matchResult.reasoning,
              },
            };
          } catch (e) {
            console.error(`Job analysis failed for ${job.position}:`, e);
            return null;
          }
        }),
      );
      results.push(...batchResults.filter((r) => r !== null));
    }

    const matchedJobs = results
      .filter((job) => job.matchScore >= minScore)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, maxResults);

    return {
      success: true,
      jobs: matchedJobs,
      resumeAnalysis: {
        ...resumeAnalysis,
        aiMatchCount: matchedJobs.length,
        basicMatchCount: jobs.length, // Rough approximation
      },
    };
  } catch (error) {
    console.error('AI Batch Match Error:', error);
    return {
      success: false,
      error: error.message,
      jobs: [],
      resumeAnalysis: null,
    };
  }
}

export async function getCareerAdvice(
  resumeAnalysis,
  jobAnalysis,
  matchResult,
) {
  const prompt = `이력서와 채용 공고 분석 결과를 바탕으로 커리어 조언을 제공해주세요.

이력서: ${JSON.stringify(resumeAnalysis)}
채용 공고: ${JSON.stringify(jobAnalysis)}
매칭 결과: ${JSON.stringify(matchResult)}

JSON 형식: {"suitability": "", "preparation_needed": [], "interview_focus": [], "next_steps": []}`;

  const analysis = await analyzeWithClaude(prompt, '');
  if (!analysis) return null;

  try {
    const jsonMatch = analysis.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    return JSON.parse(jsonMatch[0]);
  } catch {
    return null;
  }
}

export const getAICareerAdvice = getCareerAdvice;
