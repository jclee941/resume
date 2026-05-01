import { JobFilter } from '../shared/services/apply/job-filter.js';

export function createAutoApplierJobFilter(options = {}, config, logger = console) {
  return (
    options.jobFilter ||
    new JobFilter({
      logger,
      reviewThreshold: config.reviewThreshold,
      autoApplyThreshold: config.autoApplyThreshold,
      minMatchScore: config.minMatchScore,
      excludeKeywords: config.excludeKeywords,
      excludeCompanies: config.excludeCompanies,
      preferredCompanies: config.preferredCompanies,
      keywords: config.keywords,
    })
  );
}
