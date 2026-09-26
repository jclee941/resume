import { createForeignAtsAdapterRegistry } from '../ats/foreign-ats-registry.js';
import {
  countApplyResults,
  createDryRunOnlyResult,
  createDryRunResult,
} from './orchestrator-results.js';
import { searchApplySource } from './foreign-ats-search.js';

/**
 * @typedef {import('./foreign-ats-search.js').ApplySourceJob} ApplyJob
 * @typedef {import('./foreign-ats-search.js').SearchApplySourceParams['crawler']} ApplyCrawler
 * @typedef {import('./foreign-ats-search.js').SearchApplySourceOptions & { platforms?: string[] }} ApplySearchOptions
 * @typedef {NonNullable<import('./foreign-ats-search.js').SearchApplySourceParams['foreignAtsRegistry']>} ApplyForeignAtsRegistry
 *
 * @typedef {{
 *   applyToJob(job: ApplyJob): Promise<import('./orchestrator-results.js').ApplyResult & { error?: string }>;
 *   initBrowser?: () => Promise<unknown>;
 *   closeBrowser?: () => Promise<unknown>;
 * }} ApplyApplier
 *
 * @typedef {{ listApplications(options?: { fromDate?: string }): Array<{ status?: string }> }} ApplyAppManager
 *
 * @typedef {{
 *   foreignAtsRegistry?: ApplyForeignAtsRegistry;
 *   logger?: { log(message: string): void; error(message: string, ...args: unknown[]): void };
 *   maxDailyApplications?: number;
 *   enabledPlatforms?: string[];
 *   parallelSearch?: boolean;
 *   delayBetweenApplies?: number;
 *   locationTargets?: string | readonly string[];
 * }} ApplyOrchestratorConfig
 *
 * @typedef {{
 *   searched: number;
 *   filtered: number;
 *   applied: number;
 *   skipped: number;
 *   failed: number;
 *   startTime: number | null;
 *   endTime: number | null;
 * }} ApplyOrchestratorStats
 */

export class ApplyOrchestrator {
  #crawler;
  #applier;
  #appManager;
  #foreignAtsRegistry;
  #config;
  #stats;

  /**
   * @param {ApplyCrawler | undefined} crawler
   * @param {ApplyApplier | undefined} applier
   * @param {ApplyAppManager | undefined} appManager
   * @param {ApplyOrchestratorConfig} [config]
   */
  constructor(crawler, applier, appManager, config = {}) {
    this.#crawler = crawler;
    this.#applier = applier;
    this.#appManager = appManager;
    this.#foreignAtsRegistry = config.foreignAtsRegistry ?? createForeignAtsAdapterRegistry();
    this.logger = config.logger ?? console;
    this.#config = {
      maxDailyApplications: config.maxDailyApplications || 20,
      enabledPlatforms: config.enabledPlatforms || ['wanted'],
      parallelSearch: config.parallelSearch !== false,
      delayBetweenApplies: config.delayBetweenApplies || 3000,
      ...config,
    };
    this.#stats = this.#initStats();
  }

  /** @returns {ApplyOrchestratorStats} */
  #initStats() {
    return {
      searched: 0,
      filtered: 0,
      applied: 0,
      skipped: 0,
      failed: 0,
      startTime: null,
      endTime: null,
    };
  }

  /**
   * @param {readonly string[]} keywords
   * @param {ApplySearchOptions} [options]
   */
  async searchJobs(keywords, options = {}) {
    this.#stats.startTime = Date.now();
    const jobs = [];

    const platforms = options.platforms || this.#config.enabledPlatforms;

    if (this.#config.parallelSearch) {
      const results = await Promise.allSettled(
        platforms.map((platform) => this.#searchPlatform(platform, keywords, options))
      );

      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          jobs.push(...result.value);
        }
      }
    } else {
      for (const platform of platforms) {
        try {
          const result = await this.#searchPlatform(platform, keywords, options);
          if (result) jobs.push(...result);
        } catch (e) {
          this.logger.error(`Failed to search platform ${platform}:`, e);
          continue;
        }
      }
    }

    this.#stats.searched = jobs.length;
    return jobs;
  }

  /**
   * @param {string} platform
   * @param {readonly string[]} keywords
   * @param {ApplySearchOptions} options
   */
  async #searchPlatform(platform, keywords, options) {
    return searchApplySource({
      // Searching is only wired up for orchestrators built with a crawler.
      crawler: /** @type {ApplyCrawler} */ (this.#crawler),
      foreignAtsRegistry: this.#foreignAtsRegistry,
      platform,
      keywords,
      options,
      locationTargets: this.#config.locationTargets,
    });
  }

  /**
   * @param {ApplyJob[]} jobs
   * @param {boolean} [dryRun]
   */
  async applyToJobs(jobs, dryRun = true) {
    const results = [];
    const todayCount = this.#getTodayApplicationCount();
    const remaining = this.#config.maxDailyApplications - todayCount;
    if (remaining <= 0) {
      return {
        results: [],
        skipped: jobs.length,
        reason: 'Daily limit reached',
      };
    }

    const toApply = jobs.slice(0, remaining);
    const realApplyJobs = dryRun
      ? []
      : toApply.filter((job) => !job.dryRunOnly && !job.submissionSkipped);

    if (realApplyJobs.length > 0 && this.#applier?.initBrowser) {
      try {
        await this.#applier.initBrowser();
      } catch (error) {
        return {
          results: toApply
            .filter((job) => job.dryRunOnly || job.submissionSkipped)
            .map((job) => createDryRunOnlyResult(job)),
          applied: 0,
          failed: realApplyJobs.length,
          skipped: jobs.length - realApplyJobs.length,
          error: `Browser init failed: ${error instanceof Error ? error.message : String(error)}`,
        };
      }
    }

    try {
      for (const job of toApply) {
        try {
          if (dryRun) {
            results.push(createDryRunResult(job));
          } else if (job.dryRunOnly || job.submissionSkipped) {
            results.push(createDryRunOnlyResult(job));
          } else {
            this.logger.log(
              `  🎯 Applying to: ${job.company || job.title} (${job.source}) — ${job.sourceUrl}`
            );
            // Real submissions (non dry-run) require the applier the caller wired in.
            const result = await /** @type {ApplyApplier} */ (this.#applier).applyToJob(job);
            results.push({ job, ...result });

            if (result.success && !result.skipped && result.applied !== false) {
              this.#stats.applied++;
            } else if (result.success) {
              this.#stats.skipped++;
            } else {
              this.logger.error(`❌ Apply failed for ${job.company || job.title}: ${result.error}`);
              this.#stats.failed++;
            }

            await this.#sleep(this.#config.delayBetweenApplies);
          }
        } catch (error) {
          this.logger.error(
            `❌ Apply exception for ${job.company || job.title}: ${error instanceof Error ? error.message : String(error)}`
          );
          results.push({
            job,
            success: false,
            error: error instanceof Error ? error.message : String(error),
          });
          this.#stats.failed++;
        }
      }
    } finally {
      if (realApplyJobs.length > 0 && this.#applier?.closeBrowser) {
        try {
          await this.#applier.closeBrowser();
        } catch (e) {
          this.logger.error('Failed to close browser:', e);
        }
      }
    }

    const summary = countApplyResults(results, jobs.length - toApply.length);
    this.#stats.skipped = summary.skipped;
    this.#stats.endTime = Date.now();

    return {
      results,
      ...summary,
    };
  }

  #getTodayApplicationCount() {
    if (!this.#appManager) return 0;

    const today = new Date().toISOString().split('T')[0];
    const apps = this.#appManager.listApplications({ fromDate: today });
    return apps.filter((a) => a.status === 'applied').length;
  }

  /**
   * @param {number} ms
   * @returns {Promise<void>}
   */
  #sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  getStats() {
    return {
      ...this.#stats,
      // endTime is only stamped after a run that set startTime.
      duration: this.#stats.endTime
        ? this.#stats.endTime - /** @type {number} */ (this.#stats.startTime)
        : null,
    };
  }

  reset() {
    this.#stats = this.#initStats();
  }

  /**
   * @param {Partial<ApplyOrchestratorConfig>} updates
   */
  updateConfig(updates) {
    Object.assign(this.#config, updates);
  }
}

export default ApplyOrchestrator;
