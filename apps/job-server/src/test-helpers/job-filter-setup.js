import { createTestServices } from './service-setup.js';

// ========================
// Job Filter Test Helper
// ========================

/**
 * @typedef {import('../shared/services/apply/job-filter/criteria.js').CriteriaJob} CriteriaJob
 *
 * @typedef {{
 *   logger: unknown,
 *   config: Record<string, unknown>,
 *   shouldReview: (job: CriteriaJob) => boolean,
 *   shouldAutoApply: (job: CriteriaJob) => boolean,
 *   isExcluded: (job: CriteriaJob) => boolean,
 * }} MockJobFilterInstance
 *
 * @typedef {import('./service-setup.js').TestServicesOptions & {
 *   reviewThreshold?: number,
 *   autoApplyThreshold?: number,
 *   minMatchScore?: number,
 *   excludeKeywords?: string[],
 *   excludeCompanies?: string[],
 *   preferredCompanies?: string[],
 *   keywords?: string[],
 * }} TestJobFilterOptions
 *
 * @typedef {{
 *   jobFilter: import('../shared/services/apply/job-filter.js').JobFilter | MockJobFilterInstance,
 *   logger: ReturnType<typeof import('./mocks.js').createMockLogger>,
 * }} TestJobFilterResult
 */

/**
 * Create job filter with mocks
 * @param {TestJobFilterOptions} [options]
 * @returns {Promise<TestJobFilterResult>} JobFilter instance and mocks
 */
export async function createTestJobFilter(options = {}) {
  const { logger } = createTestServices(options);

  /**
   * @type {typeof import('../shared/services/apply/job-filter.js').JobFilter | (new (opts: TestJobFilterOptions) => MockJobFilterInstance)}
   */
  let JobFilter;
  try {
    const module = await import('../shared/services/apply/job-filter.js');
    JobFilter = module.JobFilter;
  } catch {
    JobFilter = class MockJobFilter {
      /**
       * @param {TestJobFilterOptions} opts
       */
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

      /**
       * @param {CriteriaJob} job
       */
      shouldReview(job) {
        const score = job.matchScore || 0;
        return score >= this.config.reviewThreshold && score < this.config.autoApplyThreshold;
      }

      /**
       * @param {CriteriaJob} job
       */
      shouldAutoApply(job) {
        const score = job.matchScore || 0;
        return score >= this.config.autoApplyThreshold;
      }

      /**
       * @param {CriteriaJob} job
       */
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

  const jobFilter =
    new /** @type {new (options: Record<string, unknown>) => import('../shared/services/apply/job-filter.js').JobFilter | MockJobFilterInstance} */ (
      JobFilter
    )({
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
