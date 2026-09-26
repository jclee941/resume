import { analyzeWithClaude } from './ai-matcher.js';

/**
 * @param {string} text
 * @param {string} [category]
 * @param {{ logger?: import('./ai-matcher.js').MatchingLogger }} [options]
 * @returns {Promise<{ keywords: string[]; tech_stack: string[]; importance_scores: Record<string, number> }>}
 */
export async function extractKeywordsWithAI(text, category = 'general', { logger = console } = {}) {
  const prompt = `다음 텍스트에서 ${category} 관련 주요 키워드를 추출해주세요.
JSON 형식: {"keywords": [], "tech_stack": [], "importance_scores": {}}`;

  const analysis = await analyzeWithClaude(prompt, text, { logger });
  if (!analysis) return { keywords: [], tech_stack: [], importance_scores: {} };

  try {
    const jsonMatch = analysis.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { keywords: [], tech_stack: [], importance_scores: {} };
    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    logger.error(
      '[extractKeywordsWithAI] JSON parse failed:',
      error instanceof Error ? error.message : String(error)
    );
    return { keywords: [], tech_stack: [], importance_scores: {} };
  }
}

/**
 * @param {unknown} resumeAnalysis
 * @param {unknown} jobAnalysis
 * @param {unknown} matchResult
 * @param {{ logger?: import('./ai-matcher.js').MatchingLogger }} [options]
 * @returns {Promise<{ suitability: string; preparation_needed: string[]; interview_focus: string[]; next_steps: string[] } | null>}
 */
export async function getCareerAdvice(
  resumeAnalysis,
  jobAnalysis,
  matchResult,
  { logger = console } = {}
) {
  const prompt = `이력서와 채용 공고 분석 결과를 바탕으로 커리어 조언을 제공해주세요.

이력서: ${JSON.stringify(resumeAnalysis)}
채용 공고: ${JSON.stringify(jobAnalysis)}
매칭 결과: ${JSON.stringify(matchResult)}

JSON 형식: {"suitability": "", "preparation_needed": [], "interview_focus": [], "next_steps": []}`;

  const analysis = await analyzeWithClaude(prompt, '', { logger });
  if (!analysis) return null;

  try {
    const jsonMatch = analysis.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    logger.error(
      '[getCareerAdvice] JSON parse failed:',
      error instanceof Error ? error.message : String(error)
    );
    return null;
  }
}

export const getAICareerAdvice = getCareerAdvice;
