import { analyzeWithClaude } from '../../matching/ai-matcher.js';
import { buildAIPrompt } from './ai-generation.js';
import { buildTemplateFallback } from './template-selection.js';

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
