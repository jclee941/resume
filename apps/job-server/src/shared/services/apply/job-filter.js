import { matchJobsWithAI } from '../matching/ai-matcher.js';

export class JobFilter {
  #config;

  constructor(config = {}) {
    this.#config = {
      reviewThreshold: config.reviewThreshold || 60,
      autoApplyThreshold: config.autoApplyThreshold || 75,
      minMatchScore: config.minMatchScore || config.reviewThreshold || 60,
      excludeKeywords: config.excludeKeywords || [],
      excludeCompanies: config.excludeCompanies || [],
      preferredCompanies: config.preferredCompanies || [],
      keywords: config.keywords || [],
      platformPriority: config.platformPriority || [
        'wanted',
        'saramin',
        'jobkorea',
      ],
      ...config,
    };
  }

  async filter(jobs, existingJobIds = new Set(), options = {}) {
    const { useAI = false, resumePath = null } = options;

    const deduplicated = this.#deduplicate(jobs, existingJobIds);
    const filtered = this.#applyFilters(deduplicated);
    const scored = await this.#applyScoring(filtered, useAI, resumePath);
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
    return this.#config.excludeKeywords.some((kw) =>
      text.includes(kw.toLowerCase()),
    );
  }

  #isExcludedCompany(job) {
    const company = (job.company || '').toLowerCase();
    return this.#config.excludeCompanies.some((c) =>
      company.includes(c.toLowerCase()),
    );
  }

  async #applyScoring(jobs, useAI = false, resumePath = null) {
    // Try AI scoring if enabled and resume path provided
    if (useAI && resumePath) {
      try {
        const aiResult = await matchJobsWithAI(resumePath, jobs, {
          minScore: 0,
          maxResults: jobs.length,
        });

        if (aiResult && aiResult.jobs && !aiResult.fallback) {
          // Build AI score map by job key
          const aiScoreMap = new Map(
            aiResult.jobs.map((j) => [this.#generateJobKey(j), j.matchScore]),
          );

          // Hybrid scoring: 70% AI + 30% heuristic
          return jobs.map((job) => {
            const aiScore = aiScoreMap.get(this.#generateJobKey(job));
            const heuristicScore = this.#calculateHeuristicScore(job);

            if (aiScore !== undefined) {
              const blendedScore = Math.round(
                aiScore * 0.7 + heuristicScore * 0.3,
              );
              return {
                ...job,
                matchScore: Math.min(100, blendedScore),
                matchType: 'hybrid',
                aiScore,
                heuristicScore,
              };
            }
            return {
              ...job,
              matchScore: heuristicScore,
              matchType: 'heuristic',
            };
          });
        }
      } catch (error) {
        console.warn(
          'AI scoring failed, falling back to heuristic:',
          error.message,
        );
      }
    }

    // Fallback: heuristic-only scoring (original logic)
    return jobs.map((job) => ({
      ...job,
      matchScore: this.#calculateHeuristicScore(job),
      matchType: 'heuristic',
    }));
  }

  #calculateHeuristicScore(job) {
    let score = job.matchScore || 50;

    if (this.#isPreferredCompany(job)) {
      score += 15;
    }

    const positionText =
      `${job.position || ''} ${job.title || ''}`.toLowerCase();
    const keywordMatches = this.#config.keywords.filter((kw) =>
      positionText.includes(kw.toLowerCase()),
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
    return this.#config.preferredCompanies.some((c) =>
      company.includes(c.toLowerCase()),
    );
  }

  #sort(jobs) {
    const { reviewThreshold, autoApplyThreshold } = this.#config;

    return jobs
      .filter((job) => job.matchScore >= reviewThreshold)
      .map((job) => ({
        ...job,
        tier:
          job.matchScore >= autoApplyThreshold ? 'auto-apply' : 'manual-review',
      }))
      .sort((a, b) => b.matchScore - a.matchScore);
  }

  updateConfig(updates) {
    Object.assign(this.#config, updates);
  }
}

export default JobFilter;
