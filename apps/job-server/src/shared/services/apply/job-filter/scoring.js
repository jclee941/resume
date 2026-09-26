import { matchJobsWithAI } from '../../matching/ai-matcher.js';
import { generateJobKey, isPreferredCompany } from './criteria.js';

/**
 * @typedef {import('./criteria.js').CriteriaJob & {
 *   id?: string | number;
 *   title?: string;
 *   source?: string;
 *   matchScore?: number;
 *   [key: string]: unknown;
 * }} ScoringJob
 *
 * @typedef {{
 *   config: import('./criteria.js').FilterConfig;
 *   logger: Console | { warn: (msg: string, ...args: unknown[]) => void; error?: (msg: string, ...args: unknown[]) => void; [key: string]: unknown };
 *   stats: ReturnType<typeof import('./criteria.js').createScoringStats>;
 *   setCachedAiScore: (key: string, value: { score: number; confidence: number | string; timestamp: number }) => void;
 * }} ScoringContext
 */

/**
 * @param {ScoringJob} job
 * @param {import('./criteria.js').FilterConfig} config
 * @returns {number}
 */
function calculateHeuristicScore(job, config) {
  let score = job.matchScore || 50;

  if (isPreferredCompany(job, config)) {
    score += 15;
  }

  const positionText = `${job.position || ''} ${job.title || ''}`.toLowerCase();
  const keywordMatches = config.keywords.filter((kw) => positionText.includes(kw.toLowerCase()));
  score += keywordMatches.length * 20;

  const platformIndex = config.platformPriority.indexOf(/** @type {string} */ (job.source));
  if (platformIndex !== -1) {
    score += (config.platformPriority.length - platformIndex) * 2;
  }

  return Math.min(100, score);
}

/**
 * @param {unknown} [confidence]
 * @returns {number}
 */
export function normalizeConfidence(confidence) {
  if (typeof confidence === 'number') {
    return Math.max(0, Math.min(1, confidence));
  }

  /** @type {Record<string, number>} */
  const table = {
    high: 0.9,
    medium: 0.7,
    low: 0.5,
  };

  return table[String(confidence || '').toLowerCase()] ?? 0.7;
}

/**
 * @template {ScoringJob} T
 * @param {T} job
 * @param {number} heuristicScore
 * @returns {T & { matchScore: number; matchType: string }}
 */
export function buildHeuristicOnlyScore(job, heuristicScore) {
  return {
    ...job,
    matchScore: heuristicScore,
    matchType: 'heuristic',
  };
}

/**
 * @template {ScoringJob} T
 * @param {T} job
 * @param {number} heuristicScore
 * @returns {T & { matchScore: number; matchType: string; heuristicScore: number; aiSkipped: boolean }}
 */
export function buildLowHeuristicScore(job, heuristicScore) {
  return {
    ...job,
    matchScore: heuristicScore,
    matchType: 'heuristic',
    heuristicScore,
    aiSkipped: true,
  };
}

/**
 * @template {ScoringJob} T
 * @param {T} job
 * @param {number} heuristicScore
 * @param {{ score: number }} ai
 * @param {number} aiConfidence
 * @returns {T & { matchScore: number; matchType: string; aiScore: number; aiConfidence: number; heuristicScore: number }}
 */
export function buildHybridScore(job, heuristicScore, ai, aiConfidence) {
  const blendedScore = Math.round(ai.score * 0.7 + heuristicScore * 0.3);

  return {
    ...job,
    matchScore: Math.min(100, blendedScore),
    matchType: 'hybrid',
    aiScore: ai.score,
    aiConfidence,
    heuristicScore,
  };
}

/**
 * @param {ScoringJob[]} jobs
 * @param {import('./criteria.js').FilterConfig} config
 * @param {Map<string, string>} jobIdToCacheKey
 * @returns {Map<string, { heuristicScore: number }>}
 */
export function createJobMeta(jobs, config, jobIdToCacheKey) {
  const jobMeta = new Map();

  for (const job of jobs) {
    const key = generateJobKey(job);
    const heuristicScore = calculateHeuristicScore(job, config);
    if (job.id) jobIdToCacheKey.set(String(job.id).toLowerCase(), key);
    jobMeta.set(key, { heuristicScore });
  }

  return jobMeta;
}

/**
 * @param {ScoringJob} job
 * @param {Map<string, { heuristicScore: number }>} jobMeta
 * @param {import('./criteria.js').FilterConfig} config
 * @returns {number}
 */
export function getHeuristicScore(job, jobMeta, config) {
  const key = generateJobKey(job);
  return jobMeta.get(key)?.heuristicScore ?? calculateHeuristicScore(job, config);
}

/**
 * @param {ScoringJob[]} aiCandidates
 * @param {string} resumePath
 * @param {ScoringContext} context
 * @returns {Promise<Map<string, { score: number; confidence: number | string; timestamp: number }>>}
 */
export async function scoreAiCandidates(aiCandidates, resumePath, context) {
  const aiScores = new Map();
  if (aiCandidates.length === 0) return aiScores;

  context.stats.aiJobsRequested += aiCandidates.length;
  const batchSize = Math.max(1, Number(context.config.aiBatchSize) || 5);
  const batches = [];
  for (let i = 0; i < aiCandidates.length; i += batchSize) {
    batches.push(aiCandidates.slice(i, i + batchSize));
  }

  context.stats.batchesProcessed += batches.length;
  const batchResults = await Promise.all(
    batches.map(async (batch) => runAiBatch(batch, resumePath, context))
  );
  for (const batchMap of batchResults) {
    for (const [key, value] of batchMap.entries()) {
      aiScores.set(key, value);
      context.setCachedAiScore(key, value);
    }
  }
  return aiScores;
}

/**
 * @param {ScoringJob[]} batch
 * @param {string} resumePath
 * @param {ScoringContext} context
 * @returns {Promise<Map<string, { score: number; confidence: number | string; timestamp: number }>>}
 */
async function runAiBatch(batch, resumePath, context) {
  const aiScoreMap = new Map();
  if (batch.length === 0) return aiScoreMap;
  context.stats.aiCalls += 1;

  try {
    const aiResult =
      /** @type {(Awaited<ReturnType<typeof matchJobsWithAI>> & { fallback?: boolean }) | null | undefined} */ (
        await matchJobsWithAI(resumePath, batch, {
          minScore: 0,
          maxResults: batch.length,
          logger: /** @type {Pick<Console, 'error' | 'warn'>} */ (context.logger),
        })
      );
    if (!Array.isArray(aiResult?.jobs) || aiResult?.fallback === true) {
      context.stats.aiFailures += 1;
      context.logger.warn(
        'AI scoring failed, falling back to heuristic:',
        'invalid or fallback AI response'
      );
      return aiScoreMap;
    }
    for (const aiJob of aiResult.jobs) {
      aiScoreMap.set(generateJobKey(aiJob), {
        score: aiJob.matchScore,
        confidence: aiJob.confidence,
        timestamp: Date.now(),
      });
    }
  } catch (error) {
    context.stats.aiFailures += 1;
    context.logger.warn(
      'AI scoring failed, falling back to heuristic:',
      error instanceof Error ? error.message : String(error)
    );
  }

  return aiScoreMap;
}
