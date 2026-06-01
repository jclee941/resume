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

export class JobFilter {
  #config;
  #aiScoreCache;
  #jobIdToCacheKey;
  #stats;

  constructor(config = {}) {
    this.logger = config.logger ?? console;
    this.#config = createFilterConfig(config);
    this.#aiScoreCache = new Map();
    this.#jobIdToCacheKey = new Map();
    this.#stats = createScoringStats();
  }

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

  invalidateCache(jobId) {
    const normalized = String(jobId || '')
      .trim()
      .toLowerCase();
    if (!normalized) return false;

    const byIdKey = this.#jobIdToCacheKey.get(normalized);
    const cacheKey = byIdKey || normalized;
    const removed = this.#aiScoreCache.delete(cacheKey);
    if (removed) this.#stats.cacheInvalidations += 1;
    if (byIdKey) this.#jobIdToCacheKey.delete(normalized);
    return removed;
  }

  updateConfig(updates) {
    Object.assign(this.#config, updates);
  }

  #scoreHeuristicOnly(jobs, jobMeta) {
    return jobs.map((job) => {
      const heuristicScore = getHeuristicScore(job, jobMeta, this.#config);
      this.#stats.heuristicScored += 1;
      return buildHeuristicOnlyScore(job, heuristicScore);
    });
  }

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
      setCachedAiScore: (key, value) => this.#setCachedAiScore(key, value),
    });
  }

  #setCachedAiScore(key, aiData) {
    this.#aiScoreCache.set(key, {
      score: aiData.score,
      confidence: aiData.confidence,
      timestamp: aiData.timestamp || Date.now(),
    });
  }

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
