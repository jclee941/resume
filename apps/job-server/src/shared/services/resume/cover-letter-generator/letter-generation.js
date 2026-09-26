import { analyzeWithClaude } from '../../matching/ai-matcher.js';
import { buildAIPrompt } from './ai-generation.js';
import { buildTemplateFallback } from './template-selection.js';

/**
 * @param {import('./ai-generation.js').AIPromptResumeData & import('./template-selection.js').TemplateResumeData} resumeData
 * @param {import('./ai-generation.js').AIPromptJobPosting} jobPosting
 * @param {import('./ai-generation.js').AIPromptOptions & { analyzeFn?: typeof analyzeWithClaude }} [options]
 */
export async function generateCoverLetter(resumeData, jobPosting, options = {}) {
  const fallbackCoverLetter = buildTemplateFallback(resumeData, jobPosting, options);
  const analyzeFn = typeof options.analyzeFn === 'function' ? options.analyzeFn : analyzeWithClaude;
  const prompt = buildAIPrompt(resumeData, jobPosting, options);
  const aiCoverLetter = await analyzeFn(prompt, '');
  const language = options.language === 'ko' ? 'ko' : 'en';

  if (!aiCoverLetter || !String(aiCoverLetter).trim()) {
    return {
      coverLetter: fallbackCoverLetter,
      fallback: true,
      language,
    };
  }

  return {
    coverLetter: String(aiCoverLetter).trim(),
    fallback: false,
    language,
  };
}
