import { loadResume } from './job-matcher.js';
import { analyzeJobPosting, analyzeResume, calculateAIMatchScore } from './ai-matcher.js';

/**
 * @template {import('./ai-matcher.js').AIJobPosting} T
 * @param {string} resumePath
 * @param {T[]} jobs
 * @param {import('./ai-matcher.js').MatchOptions & { minScore?: number; maxResults?: number }} [options]
 */
export async function matchJobsWithAI(resumePath, jobs, options = {}) {
  const { minScore = 0, maxResults = 10, logger = console, resumeReader = loadResume } = options;

  try {
    const resume = resumeReader(resumePath);
    const resumeAnalysis = await analyzeResume(resume, { logger });

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
            const jobAnalysis = await analyzeJobPosting(job, { logger });
            if (!jobAnalysis) return null;

            const matchResult = await calculateAIMatchScore(resumeAnalysis, jobAnalysis, {
              logger,
            });

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
            logger.error(`Job analysis failed for ${job.position}:`, e);
            return null;
          }
        })
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
    logger.error('AI Batch Match Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      jobs: [],
      resumeAnalysis: null,
    };
  }
}
