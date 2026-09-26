import { JobFilter } from './job-filter.js';
import { ApplyOrchestrator } from './orchestrator.js';

/**
 * @typedef {import('./orchestrator.js').ApplyJob} ApplyJob
 * @typedef {ConstructorParameters<typeof JobFilter>[0] & import('./orchestrator.js').ApplyOrchestratorConfig & {
 *   reviewThreshold?: number;
 *   autoApplyThreshold?: number;
 *   minMatchScore?: number;
 *   keywords?: string[];
 *   excludeKeywords?: string[];
 *   excludeCompanies?: string[];
 *   preferredCompanies?: string[];
 *   platformPriority?: string[];
 *   notifications?: { email?: boolean };
 *   useAI?: boolean;
 *   resumePath?: string | null;
 *   [key: string]: unknown;
 * }} UnifiedApplyConfig
 *
 * @typedef {{
 *   notifyAutoApplyResult?: (results: unknown, dryRun: boolean) => Promise<unknown>;
 *   notifySearchResults?: (jobs: unknown[], keywords: string | undefined) => Promise<unknown>;
 * }} UnifiedApplyNotifier
 *
 * @typedef {{
 *   crawler?: import('./orchestrator.js').ApplyCrawler;
 *   applier?: import('./orchestrator.js').ApplyApplier;
 *   appManager?: import('./orchestrator.js').ApplyAppManager;
 *   notifier?: UnifiedApplyNotifier;
 *   config?: UnifiedApplyConfig;
 *   logger?: { error(message: string, ...args: unknown[]): void };
 * }} UnifiedApplyDependencies
 *
 * @typedef {Awaited<ReturnType<ApplyOrchestrator['applyToJobs']>>} ApplyPhaseResult
 * @typedef {Awaited<ReturnType<JobFilter['filter']>>} FilterPhaseResult
 */

export class UnifiedApplySystem {
  #filter;
  #orchestrator;
  #notifier;
  #config;

  /**
   * @param {UnifiedApplyDependencies} [dependencies]
   */
  constructor(dependencies = {}) {
    const { crawler, applier, appManager, notifier, config = {} } = dependencies;

    this.#config = {
      maxDailyApplications: 20,
      // Two-tier threshold system (Oracle recommendation)
      reviewThreshold: 60, // Jobs >= 60: notify for manual review
      autoApplyThreshold: 75, // Jobs >= 75: auto-apply without review
      minMatchScore: 60, // Kept for backward compatibility (= reviewThreshold)
      enabledPlatforms: ['wanted'],
      keywords: ['시니어 엔지니어', '클라우드 엔지니어', 'SRE'],
      excludeKeywords: [],
      excludeCompanies: [],
      preferredCompanies: [],
      platformPriority: ['wanted', 'saramin', 'jobkorea'],
      notifications: { email: false },
      useAI: false,
      resumePath: null,
      ...config,
    };

    this.logger = dependencies.logger ?? config.logger ?? console;
    this.#filter = new JobFilter(this.#config);
    this.#orchestrator = new ApplyOrchestrator(crawler, applier, appManager, this.#config);
    this.#notifier = notifier;
  }

  /**
   * Public getter for config (returns a shallow copy to preserve encapsulation)
   * @returns {Object} Configuration object
   */
  get config() {
    return { ...this.#config };
  }

  /**
   * @param {{ keywords?: string[]; dryRun?: boolean; notify?: boolean }} [options]
   */
  async run(options = {}) {
    const { keywords = this.#config.keywords, dryRun = true, notify = true } = options;

    const searchResult = await this.#searchPhase(keywords);
    const filterResult = await this.#filterPhase(searchResult.jobs);
    const applyResult = await this.#applyPhase(filterResult.jobs, dryRun);

    if (notify) {
      await this.#notifyPhase(applyResult, dryRun);
    }

    return this.#generateSummary(searchResult, filterResult, applyResult, dryRun);
  }

  /**
   * @param {string[]} keywords
   */
  async #searchPhase(keywords) {
    const jobs = await this.#orchestrator.searchJobs(keywords);
    return { jobs, count: jobs.length };
  }

  /**
   * @param {ApplyJob[]} jobs
   */
  async #filterPhase(jobs) {
    const existingIds = new Set();
    return this.#filter.filter(jobs, existingIds, {
      useAI: this.#config.useAI,
      resumePath: this.#config.resumePath,
    });
  }

  /**
   * @param {ApplyJob[]} jobs
   * @param {boolean} dryRun
   */
  async #applyPhase(jobs, dryRun) {
    return this.#orchestrator.applyToJobs(jobs, dryRun);
  }

  /**
   * @param {ApplyPhaseResult} applyResult
   * @param {boolean} dryRun
   */
  async #notifyPhase(applyResult, dryRun) {
    if (!this.#notifier) return;

    try {
      await this.#notifier.notifyAutoApplyResult?.(applyResult.results, dryRun);
    } catch (e) {
      this.logger.error('Failed to send auto-apply notification:', e);
    }
  }

  /**
   * @param {{ jobs: ApplyJob[]; count: number }} searchResult
   * @param {FilterPhaseResult} filterResult
   * @param {ApplyPhaseResult} applyResult
   * @param {boolean} dryRun
   */
  #generateSummary(searchResult, filterResult, applyResult, dryRun) {
    return {
      success: true,
      dryRun,
      phases: {
        search: { found: searchResult.count },
        filter: filterResult.stats,
        apply: {
          attempted: applyResult.results?.length || 0,
          succeeded: applyResult.applied || 0,
          failed: applyResult.failed || 0,
          skipped: applyResult.skipped || 0,
        },
      },
      stats: this.#orchestrator.getStats(),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * @param {string[] | undefined} keywords
   * @param {{ notify?: boolean }} [options]
   */
  async searchOnly(keywords, options = {}) {
    const searchResult = await this.#searchPhase(keywords || this.#config.keywords);
    const filterResult = await this.#filterPhase(searchResult.jobs);

    if (options.notify && this.#notifier) {
      await this.#notifier.notifySearchResults?.(filterResult.jobs, keywords?.join(', '));
    }

    return {
      jobs: filterResult.jobs,
      stats: { searched: searchResult.count, filtered: filterResult.stats },
    };
  }

  getStats() {
    return this.#orchestrator.getStats();
  }

  /**
   * @param {Partial<UnifiedApplyConfig>} updates
   */
  updateConfig(updates) {
    Object.assign(this.#config, updates);
    this.#filter.updateConfig(updates);
    this.#orchestrator.updateConfig(updates);
  }

  reset() {
    this.#orchestrator.reset();
  }
}

export { JobFilter } from './job-filter.js';
export { ApplyOrchestrator } from './orchestrator.js';
export default UnifiedApplySystem;
