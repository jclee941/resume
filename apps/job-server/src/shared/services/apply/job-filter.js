import { matchJobsWithAI } from '../matching/ai-matcher.js';

export class JobFilter {
  #config;
  #aiScoreCache;
  #jobIdToCacheKey;
  #stats;

  constructor(config = {}) {
    this.logger = config.logger ?? console;
    this.#config = {
      reviewThreshold: config.reviewThreshold || 60,
      autoApplyThreshold: config.autoApplyThreshold || 75,
      minMatchScore: config.minMatchScore || config.reviewThreshold || 60,
      excludeKeywords: config.excludeKeywords || [],
      excludeCompanies: config.excludeCompanies || [],
      preferredCompanies: config.preferredCompanies || [],
      keywords: config.keywords || [],
      platformPriority: config.platformPriority || ['wanted', 'saramin', 'jobkorea'],
      aiBatchSize: config.aiBatchSize || 5,
      aiCacheTtl: config.aiCacheTtl || 24,
      aiMinConfidence: config.aiMinConfidence || 0.7,
      ...config,
    };

    this.#aiScoreCache = new Map();
    this.#jobIdToCacheKey = new Map();
    this.#stats = {
      totalScored: 0,
      heuristicScored: 0,
      hybridScored: 0,
      aiCalls: 0,
      aiJobsRequested: 0,
      aiFailures: 0,
      aiFallbacks: 0,
      aiLowConfidenceSkips: 0,
      aiSkippedLowHeuristic: 0,
      cacheHits: 0,
      cacheMisses: 0,
      batchesProcessed: 0,
      cacheInvalidations: 0,
    };
  }

  async filter(jobs, existingJobIds = new Set(), options = {}) {
    const { useAI = false, resumePath = null } = options;

    const deduplicated = this.#deduplicate(jobs, existingJobIds);
    const filtered = this.#applyFilters(deduplicated);
    const scored = await this.scoreBatch(filtered, { useAI, resumePath });
    const sorted = this.#sort(scored);

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

  #deduplicate(jobs, existingJobIds) {
    const seen = new Set(existingJobIds);
    const result = [];

    for (const job of jobs) {
      const key = this.#generateJobKey(job);
      if (!seen.has(key)) {
        seen.add(key);
        result.push(job);
      }
    }

    return result;
  }

  #generateJobKey(job) {
    const company = (job.company || '').toLowerCase().trim();
    const position = (job.position || '').toLowerCase().trim();
    return `${company}:${position}`;
  }

  #applyFilters(jobs) {
    return jobs.filter((job) => {
      if (this.#matchesExcludeKeywords(job)) return false;
      if (this.#isExcludedCompany(job)) return false;
      return true;
    });
  }

  #matchesExcludeKeywords(job) {
    const text = `${job.position} ${job.description || ''}`.toLowerCase();
    return this.#config.excludeKeywords.some((kw) => text.includes(kw.toLowerCase()));
  }

  #isExcludedCompany(job) {
    const company = (job.company || '').toLowerCase();
    return this.#config.excludeCompanies.some((c) => company.includes(c.toLowerCase()));
  }

  async #applyScoring(jobs, useAI = false, resumePath = null) {
    return this.scoreBatch(jobs, { useAI, resumePath });
  }

  async scoreBatch(jobs, options = {}) {
    const { useAI = false, resumePath = null } = options;
    const scored = [];
    const jobMeta = new Map();

    this.#stats.totalScored += jobs.length;
    this.#pruneExpiredCache();

    for (const job of jobs) {
      const key = this.#generateJobKey(job);
      const heuristicScore = this.#calculateHeuristicScore(job);
      if (job.id) this.#jobIdToCacheKey.set(String(job.id).toLowerCase(), key);
      jobMeta.set(key, { heuristicScore });
    }

    if (!useAI || !resumePath) {
      const heuristicOnly = jobs.map((job) => {
        const key = this.#generateJobKey(job);
        const heuristicScore =
          jobMeta.get(key)?.heuristicScore ?? this.#calculateHeuristicScore(job);
        this.#stats.heuristicScored += 1;
        return {
          ...job,
          matchScore: heuristicScore,
          matchType: 'heuristic',
        };
      });
      scored.push(...heuristicOnly);
      return scored;
    }

    const aiCandidates = [];
    const uniqueCandidateKeys = new Set();

    for (const job of jobs) {
      const key = this.#generateJobKey(job);
      const heuristicScore = jobMeta.get(key)?.heuristicScore ?? this.#calculateHeuristicScore(job);

      if (heuristicScore < 40) {
        this.#stats.aiSkippedLowHeuristic += 1;
        continue;
      }

      const cached = this.#getCachedAiScore(key);
      if (cached) {
        this.#stats.cacheHits += 1;
        continue;
      }

      this.#stats.cacheMisses += 1;
      if (!uniqueCandidateKeys.has(key)) {
        uniqueCandidateKeys.add(key);
        aiCandidates.push(job);
      }
    }

    const aiScores = new Map();
    if (aiCandidates.length > 0) {
      this.#stats.aiJobsRequested += aiCandidates.length;
      const batchSize = Math.max(1, Number(this.#config.aiBatchSize) || 5);
      const batches = [];

      for (let i = 0; i < aiCandidates.length; i += batchSize) {
        batches.push(aiCandidates.slice(i, i + batchSize));
      }

      this.#stats.batchesProcessed += batches.length;

      const batchResults = await Promise.all(
        batches.map(async (batch) => this.#runAiBatch(batch, resumePath))
      );

      for (const batchMap of batchResults) {
        for (const [key, value] of batchMap.entries()) {
          aiScores.set(key, value);
          this.#setCachedAiScore(key, value);
        }
      }
    }

    for (const job of jobs) {
      const key = this.#generateJobKey(job);
      const heuristicScore = jobMeta.get(key)?.heuristicScore ?? this.#calculateHeuristicScore(job);

      if (heuristicScore < 40) {
        this.#stats.heuristicScored += 1;
        scored.push({
          ...job,
          matchScore: heuristicScore,
          matchType: 'heuristic',
          heuristicScore,
          aiSkipped: true,
        });
        continue;
      }

      const ai = aiScores.get(key) ?? this.#getCachedAiScore(key);
      if (ai) {
        const aiConfidence = this.#normalizeConfidence(ai.confidence);
        if (aiConfidence >= this.#config.aiMinConfidence) {
          const blendedScore = Math.round(ai.score * 0.7 + heuristicScore * 0.3);
          this.#stats.hybridScored += 1;
          scored.push({
            ...job,
            matchScore: Math.min(100, blendedScore),
            matchType: 'hybrid',
            aiScore: ai.score,
            aiConfidence,
            heuristicScore,
          });
          continue;
        }

        this.#stats.aiLowConfidenceSkips += 1;
      }

      this.#stats.heuristicScored += 1;
      this.#stats.aiFallbacks += 1;
      scored.push({
        ...job,
        matchScore: heuristicScore,
        matchType: 'heuristic',
        heuristicScore,
      });
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
    if (removed) {
      this.#stats.cacheInvalidations += 1;
    }

    if (byIdKey) {
      this.#jobIdToCacheKey.delete(normalized);
    }

    return removed;
  }

  async #runAiBatch(batch, resumePath) {
    const aiScoreMap = new Map();
    if (batch.length === 0) return aiScoreMap;

    this.#stats.aiCalls += 1;

    try {
      const aiResult = await matchJobsWithAI(resumePath, batch, {
        minScore: 0,
        maxResults: batch.length,
        logger: this.logger,
      });

      const hasUsableJobs = Array.isArray(aiResult?.jobs);
      if (!hasUsableJobs || aiResult?.fallback === true) {
        this.#stats.aiFailures += 1;
        this.logger.warn(
          'AI scoring failed, falling back to heuristic:',
          'invalid or fallback AI response'
        );
        return aiScoreMap;
      }

      for (const aiJob of aiResult.jobs) {
        const key = this.#generateJobKey(aiJob);
        aiScoreMap.set(key, {
          score: aiJob.matchScore,
          confidence: aiJob.confidence,
          timestamp: Date.now(),
        });
      }
    } catch (error) {
      this.#stats.aiFailures += 1;
      this.logger.warn('AI scoring failed, falling back to heuristic:', error.message);
    }

    return aiScoreMap;
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
      if (now - value.timestamp > ttlMs) {
        this.#aiScoreCache.delete(key);
      }
    }
  }

  #normalizeConfidence(confidence) {
    if (typeof confidence === 'number') {
      return Math.max(0, Math.min(1, confidence));
    }

    const table = {
      high: 0.9,
      medium: 0.7,
      low: 0.5,
    };

    return table[String(confidence || '').toLowerCase()] ?? 0.7;
  }

  #calculateHeuristicScore(job) {
    let score = job.matchScore || 50;

    if (this.#isPreferredCompany(job)) {
      score += 15;
    }

    const positionText = `${job.position || ''} ${job.title || ''}`.toLowerCase();
    const keywordMatches = this.#config.keywords.filter((kw) =>
      positionText.includes(kw.toLowerCase())
    );
    score += keywordMatches.length * 20;

    const platformIndex = this.#config.platformPriority.indexOf(job.source);
    if (platformIndex !== -1) {
      score += (this.#config.platformPriority.length - platformIndex) * 2;
    }

    return Math.min(100, score);
  }

  #isPreferredCompany(job) {
    const company = (job.company || '').toLowerCase();
    return this.#config.preferredCompanies.some((c) => company.includes(c.toLowerCase()));
  }

  #sort(jobs) {
    const { reviewThreshold, autoApplyThreshold } = this.#config;

    return jobs
      .filter((job) => job.matchScore >= reviewThreshold)
      .map((job) => ({
        ...job,
        tier: job.matchScore >= autoApplyThreshold ? 'auto-apply' : 'manual-review',
      }))
      .sort((a, b) => b.matchScore - a.matchScore);
  }

  updateConfig(updates) {
    Object.assign(this.#config, updates);
  }
}

export default JobFilter;
