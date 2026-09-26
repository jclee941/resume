import {
  applyJobFilters,
  createFilterConfig,
  createScoringStats,
  deduplicateJobs,
  generateJobKey,
  sortFilteredJobs,
} from './criteria.js';
import {
  buildHeuristicOnlyScore,
  buildHybridScore,
  buildLowHeuristicScore,
  createJobMeta,
  getHeuristicScore,
  normalizeConfidence,
  scoreAiCandidates,
} from './scoring.js';

/**
 * @typedef {{
 *   useAI?: boolean;
 *   resumePath?: string | null;
 * }} FilterOptions
 *
 * @typedef {import('./criteria.js').CriteriaJob & {
 *   id?: string | number;
 *   title?: string;
 *   source?: string;
 *   matchScore?: number;
 *   [key: string]: unknown;
 * }} FilterJob
 *
 * @typedef {{
 *   score: number;
 *   confidence: number | string;
 *   timestamp: number;
 * }} CachedAiScore
 */

export class JobFilter {
  #config;
  #aiScoreCache;
  #jobIdToCacheKey;
  #stats;

  /**
   * @param {import('./criteria.js').FilterConfigInput & { logger?: Console | { warn: (msg: string, ...args: unknown[]) => void; error?: (msg: string, ...args: unknown[]) => void } }} [config]
   */
  constructor(config = {}) {
    /** @type {Console | { warn: (msg: string, ...args: unknown[]) => void; error?: (msg: string, ...args: unknown[]) => void }} */
    this.logger = config.logger ?? console;
    this.#config = createFilterConfig(config);
    /** @type {Map<string, CachedAiScore>} */
    this.#aiScoreCache = new Map();
    /** @type {Map<string, string>} */
    this.#jobIdToCacheKey = new Map();
    this.#stats = createScoringStats();
  }

  /**
   * @template {FilterJob} T
   * @param {T[]} jobs
   * @param {Set<string>} [existingJobIds]
   * @param {FilterOptions} [options]
   */
  async filter(jobs, existingJobIds = new Set(), options = {}) {
    const { useAI = false, resumePath = null } = options;
    const deduplicated = deduplicateJobs(jobs, existingJobIds);
    const filtered = applyJobFilters(deduplicated, this.#config);
    const scored = await this.scoreBatch(filtered, { useAI, resumePath });
    const sorted = sortFilteredJobs(scored, this.#config);

    return {
      jobs: sorted,
      stats: {
        input: jobs.length,
        afterDedup: deduplicated.length,
        afterFilter: filtered.length,
        output: sorted.length,
        matchType: scored.length > 0 ? scored[0].matchType : 'none',
      },
    };
  }

  /**
   * @template {FilterJob} T
   * @param {T[]} jobs
   * @param {FilterOptions} [options]
   */
  async scoreBatch(jobs, options = {}) {
    const { useAI = false, resumePath = null } = options;
    const scored = [];
    this.#stats.totalScored += jobs.length;
    this.#pruneExpiredCache();

    const jobMeta = createJobMeta(jobs, this.#config, this.#jobIdToCacheKey);
    if (!useAI || !resumePath) return this.#scoreHeuristicOnly(jobs, jobMeta);

    const aiScores = await this.#collectAiScores(jobs, jobMeta, resumePath);
    for (const job of jobs) {
      const key = generateJobKey(job);
      const heuristicScore = getHeuristicScore(job, jobMeta, this.#config);

      if (heuristicScore < 40) {
        this.#stats.heuristicScored += 1;
        scored.push(buildLowHeuristicScore(job, heuristicScore));
        continue;
      }

      const ai = aiScores.get(key) ?? this.#getCachedAiScore(key);
      if (ai) {
        const aiConfidence = normalizeConfidence(ai.confidence);
        if (aiConfidence >= this.#config.aiMinConfidence) {
          this.#stats.hybridScored += 1;
          scored.push(buildHybridScore(job, heuristicScore, ai, aiConfidence));
          continue;
        }
        this.#stats.aiLowConfidenceSkips += 1;
      }

      this.#stats.heuristicScored += 1;
      this.#stats.aiFallbacks += 1;
      scored.push({ ...buildHeuristicOnlyScore(job, heuristicScore), heuristicScore });
    }

    return scored;
  }

  getScoringStats() {
    return {
      ...this.#stats,
      cacheSize: this.#aiScoreCache.size,
      aiUsageRate: this.#stats.totalScored
        ? Number((this.#stats.hybridScored / this.#stats.totalScored).toFixed(3))
        : 0,
      heuristicUsageRate: this.#stats.totalScored
        ? Number((this.#stats.heuristicScored / this.#stats.totalScored).toFixed(3))
        : 0,
    };
  }

  /**
   * @param {Partial<import('./criteria.js').FilterConfigInput>} updates
   */
  updateConfig(updates) {
    Object.assign(this.#config, updates);
  }

  /**
   * @template {FilterJob} T
   * @param {T[]} jobs
   * @param {Map<string, { heuristicScore: number }>} jobMeta
   */
  #scoreHeuristicOnly(jobs, jobMeta) {
    return jobs.map((job) => {
      const heuristicScore = getHeuristicScore(job, jobMeta, this.#config);
      this.#stats.heuristicScored += 1;
      return buildHeuristicOnlyScore(job, heuristicScore);
    });
  }

  /**
   * @template {FilterJob} T
   * @param {T[]} jobs
   * @param {Map<string, { heuristicScore: number }>} jobMeta
   * @param {string} resumePath
   * @returns {Promise<Map<string, CachedAiScore>>}
   */
  async #collectAiScores(jobs, jobMeta, resumePath) {
    const aiCandidates = [];
    const uniqueCandidateKeys = new Set();

    for (const job of jobs) {
      const key = generateJobKey(job);
      const heuristicScore = getHeuristicScore(job, jobMeta, this.#config);
      if (heuristicScore < 40) {
        this.#stats.aiSkippedLowHeuristic += 1;
        continue;
      }
      if (this.#getCachedAiScore(key)) {
        this.#stats.cacheHits += 1;
        continue;
      }
      this.#stats.cacheMisses += 1;
      if (!uniqueCandidateKeys.has(key)) {
        uniqueCandidateKeys.add(key);
        aiCandidates.push(job);
      }
    }

    return scoreAiCandidates(aiCandidates, resumePath, {
      config: this.#config,
      logger: this.logger,
      stats: this.#stats,
      setCachedAiScore: /** @type {(key: string, value: CachedAiScore) => void} */ (
        (key, value) => this.#setCachedAiScore(key, value)
      ),
    });
  }

  /**
   * @param {string} key
   * @param {{ score: number; confidence: number | string; timestamp?: number }} aiData
   */
  #setCachedAiScore(key, aiData) {
    this.#aiScoreCache.set(key, {
      score: aiData.score,
      confidence: aiData.confidence,
      timestamp: aiData.timestamp || Date.now(),
    });
  }

  /**
   * @param {string} key
   * @returns {CachedAiScore | null}
   */
  #getCachedAiScore(key) {
    const cached = this.#aiScoreCache.get(key);
    if (!cached) return null;
    const ttlMs = this.#config.aiCacheTtl * 60 * 60 * 1000;
    if (Date.now() - cached.timestamp > ttlMs) {
      this.#aiScoreCache.delete(key);
      return null;
    }
    return cached;
  }

  #pruneExpiredCache() {
    const ttlMs = this.#config.aiCacheTtl * 60 * 60 * 1000;
    const now = Date.now();
    for (const [key, value] of this.#aiScoreCache.entries()) {
      if (now - value.timestamp > ttlMs) this.#aiScoreCache.delete(key);
    }
  }
}

export default JobFilter;
