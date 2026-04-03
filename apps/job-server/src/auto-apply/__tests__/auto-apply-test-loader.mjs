export async function load(url, context, nextLoad) {
  if (url.endsWith('/src/shared/services/matching/ai-matcher.js')) {
    return {
      format: 'module',
      shortCircuit: true,
      source: `
        export async function matchJobsWithAI(...args) {
          return globalThis.__jobFilterMatchJobsWithAI(...args);
        }

        export async function calculateAIMatch(...args) {
          const result = await matchJobsWithAI(...args);
          return result;
        }

        export async function extractKeywordsWithAI() {
          return [];
        }

        export async function getCareerAdvice() {
          return '';
        }

        export async function getAICareerAdvice() {
          return '';
        }

        export async function analyzeResume() {
          return null;
        }

        export async function analyzeJobPosting() {
          return null;
        }

        export async function analyzeWithClaude(...args) {
          if (typeof globalThis.__coverLetterAnalyzeWithClaude === 'function') {
            return globalThis.__coverLetterAnalyzeWithClaude(...args);
          }
          return null;
        }
      `,
    };
  }

  return nextLoad(url, context);
}
