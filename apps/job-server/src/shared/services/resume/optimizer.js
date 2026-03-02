/**
 * AI 기반 이력서 최적화 엔진
 */

import { analyzeWithClaude } from './ai-matcher.js';

/**
 * JD 분석 결과를 바탕으로 이력서를 최적화합니다.
 */
export async function optimizeResume(masterResume, jobAnalysis) {
  const prompt = `
당신은 전문 채용 컨설턴트입니다. 제공된 '마스터 이력서'를 '채용 공고 분석 결과'에 맞춰 최적화해주세요.

[지침]
1. 정직성 유지: 없는 경력을 지어내지 마세요.
2. 강조점 변경: JD에서 요구하는 기술과 경험이 마스터 이력서에 있다면, 해당 부분을 더 눈에 띄게 배치하거나 상세히 서술하세요.
3. 요약 섹션(Summary) 최적화: 이 포지션에 왜 적합한지 보여주는 3-4줄의 강력한 요약을 작성하세요.
4. 키워드 매칭: JD의 핵심 키워드를 자연스럽게 문장에 녹여내세요.
5. 형식 유지: 마스터 이력서의 Markdown 구조(##, ### 등)를 그대로 유지하세요.
6. 언어: 한국어로 작성하세요.

[마스터 이력서]
${masterResume}

[채용 공고 분석 결과]
${JSON.stringify(jobAnalysis, null, 2)}

최적화된 Markdown 이력서만 출력하세요. 다른 설명은 필요 없습니다.
`;

  const optimized = await analyzeWithClaude(prompt, '');

  if (!optimized) {
    throw new Error('이력서 최적화 실패');
  }

  // Markdown 부분만 추출 (혹시 모를 LLM의 사족 제거)
  const markdownMatch = optimized.match(/# [\s\S]*/);
  return markdownMatch ? markdownMatch[0] : optimized;
}
