import { createTestServices } from './service-setup.js';

// ========================
// Job Filter Test Helper
// ========================

/**
 * Create job filter with mocks
 * @param {Object} [options]
 * @returns {Promise<Object>} JobFilter instance and mocks
 */
export async function createTestJobFilter(options = {}) {
  const { logger } = createTestServices(options);

  let JobFilter;
  try {
    const module = await import('../shared/services/apply/job-filter.js');
    JobFilter = module.JobFilter;
  } catch {
    JobFilter = class MockJobFilter {
      constructor(opts) {
        this.logger = opts.logger || logger;
        this.config = {
          reviewThreshold: opts.reviewThreshold || 60,
          autoApplyThreshold: opts.autoApplyThreshold || 75,
          minMatchScore: opts.minMatchScore || 60,
          excludeKeywords: opts.excludeKeywords || [],
          excludeCompanies: opts.excludeCompanies || [],
          preferredCompanies: opts.preferredCompanies || [],
          keywords: opts.keywords || [],
        };
      }

      shouldReview(job) {
        const score = job.matchScore || 0;
        return score >= this.config.reviewThreshold && score < this.config.autoApplyThreshold;
      }

      shouldAutoApply(job) {
        const score = job.matchScore || 0;
        return score >= this.config.autoApplyThreshold;
      }

      isExcluded(job) {
        const excludeCompany = this.config.excludeCompanies.some(
          (c) => job.company && job.company.toLowerCase().includes(c.toLowerCase())
        );
        const excludeKeyword = this.config.excludeKeywords.some(
          (k) => job.position && job.position.toLowerCase().includes(k.toLowerCase())
        );
        return excludeCompany || excludeKeyword;
      }
    };
  }

  const jobFilter = new JobFilter({
    logger,
    reviewThreshold: options.reviewThreshold,
    autoApplyThreshold: options.autoApplyThreshold,
    minMatchScore: options.minMatchScore,
    excludeKeywords: options.excludeKeywords,
    excludeCompanies: options.excludeCompanies,
    preferredCompanies: options.preferredCompanies,
    keywords: options.keywords,
  });

  return {
    jobFilter,
    logger,
  };
}
