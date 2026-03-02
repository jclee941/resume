import { JobFilter } from './job-filter.js';
import { ApplyOrchestrator } from './orchestrator.js';

export class UnifiedApplySystem {
  #filter;
  #orchestrator;
  #notifier;
  #config;

  constructor(dependencies = {}) {
    const {
      crawler,
      applier,
      appManager,
      notifier,
      config = {},
    } = dependencies;

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
      notifications: { slack: true, email: false },
      useAI: false,
      resumePath: null,
      ...config,
    };

    this.#filter = new JobFilter(this.#config);
    this.#orchestrator = new ApplyOrchestrator(
      crawler,
      applier,
      appManager,
      this.#config,
    );
    this.#notifier = notifier;
  }

  /**
   * Public getter for config (returns a shallow copy to preserve encapsulation)
   * @returns {Object} Configuration object
   */
  get config() {
    return { ...this.#config };
  }

  async run(options = {}) {
    const {
      keywords = this.#config.keywords,
      dryRun = true,
      notify = true,
    } = options;

    const searchResult = await this.#searchPhase(keywords);
    const filterResult = await this.#filterPhase(searchResult.jobs);
    const applyResult = await this.#applyPhase(filterResult.jobs, dryRun);

    if (notify) {
      await this.#notifyPhase(applyResult, dryRun);
    }

    return this.#generateSummary(
      searchResult,
      filterResult,
      applyResult,
      dryRun,
    );
  }

  async #searchPhase(keywords) {
    const jobs = await this.#orchestrator.searchJobs(keywords);
    return { jobs, count: jobs.length };
  }

  async #filterPhase(jobs) {
    const existingIds = new Set();
    return this.#filter.filter(jobs, existingIds, {
      useAI: this.#config.useAI,
      resumePath: this.#config.resumePath,
    });
  }

  async #applyPhase(jobs, dryRun) {
    return this.#orchestrator.applyToJobs(jobs, dryRun);
  }

  async #notifyPhase(applyResult, dryRun) {
    if (!this.#notifier) return;

    try {
      if (this.#config.notifications.slack) {
        await this.#notifier.notifyAutoApplyResult?.(
          applyResult.results,
          dryRun,
        );
      }
    } catch {
      // Notification failure should not break the flow
    }
  }

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

  async searchOnly(keywords, options = {}) {
    const searchResult = await this.#searchPhase(
      keywords || this.#config.keywords,
    );
    const filterResult = await this.#filterPhase(searchResult.jobs);

    if (options.notify && this.#notifier) {
      await this.#notifier.notifySearchResults?.(
        filterResult.jobs,
        keywords?.join(', '),
      );
    }

    return {
      jobs: filterResult.jobs,
      stats: { searched: searchResult.count, filtered: filterResult.stats },
    };
  }

  getStats() {
    return this.#orchestrator.getStats();
  }

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
