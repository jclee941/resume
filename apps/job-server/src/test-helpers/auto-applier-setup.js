import { createTestServices } from './service-setup.js';

// ========================
// AutoApplier Test Helper
// ========================

/**
 * Create auto-applier with all mocks
 * @param {Object} [options]
 * @returns {Promise<Object>} AutoApplier instance and mocks
 */
export async function createTestAutoApplier(options = {}) {
  const { logger, d1Client, fetch, env, repository, telegram, claude, wanted } =
    createTestServices(options);

  // Auto-applier will be imported dynamically to avoid circular dependencies
  let AutoApplier;
  try {
    const module = await import('../auto-apply/auto-applier.js');
    AutoApplier = module.AutoApplier;
  } catch {
    // Fallback for when auto-applier isn't available
    AutoApplier = class MockAutoApplier {
      constructor(opts) {
        this.logger = opts.logger || logger;
        this.repository = opts.repository || repository;
        this.config = {
          maxDailyApplications: opts.maxDailyApplications || 10,
          reviewThreshold: opts.reviewThreshold || 60,
          autoApplyThreshold: opts.autoApplyThreshold || 75,
          minMatchScore: opts.minMatchScore || 60,
          autoApply: opts.autoApply !== undefined ? opts.autoApply : false,
          dryRun: opts.dryRun !== undefined ? opts.dryRun : true,
          delayBetweenApps: opts.delayBetweenApps || 5000,
          excludeCompanies: opts.excludeCompanies || [],
          excludeKeywords: opts.excludeKeywords || [],
          preferredCompanies: opts.preferredCompanies || [],
          keywords: opts.keywords || [],
          useAI: opts.useAI || false,
          resumePath: opts.resumePath || null,
        };
      }
    };
  }

  const autoApplier = new AutoApplier({
    logger,
    repository,
    d1Client,
    maxDailyApplications: options.maxDailyApplications,
    reviewThreshold: options.reviewThreshold,
    autoApplyThreshold: options.autoApplyThreshold,
    minMatchScore: options.minMatchScore,
    autoApply: options.autoApply,
    dryRun: options.dryRun !== undefined ? options.dryRun : true,
    delayBetweenApps: options.delayBetweenApps,
    excludeCompanies: options.excludeCompanies,
    excludeKeywords: options.excludeKeywords,
    preferredCompanies: options.preferredCompanies,
    keywords: options.keywords,
    useAI: options.useAI,
    resumePath: options.resumePath,
  });

  return {
    autoApplier,
    logger,
    d1Client,
    fetch,
    env,
    repository,
    telegram,
    claude,
    wanted,

    /**
     * Get all mocks
     * @returns {Object}
     */
    getMocks() {
      return {
        logger,
        d1Client,
        fetch,
        telegram,
        claude,
        wanted,
        repository,
      };
    },
  };
}
