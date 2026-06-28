import { createForeignAtsAdapterRegistry } from '../ats/foreign-ats-registry.js';
import {
  countApplyResults,
  createDryRunOnlyResult,
  createDryRunResult,
} from './orchestrator-results.js';
import { searchApplySource } from './foreign-ats-search.js';

export class ApplyOrchestrator {
  #crawler;
  #applier;
  #appManager;
  #foreignAtsRegistry;
  #config;
  #stats;

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

  async #searchPlatform(platform, keywords, options) {
    return searchApplySource({
      crawler: this.#crawler,
      foreignAtsRegistry: this.#foreignAtsRegistry,
      platform,
      keywords,
      options,
      locationTargets: this.#config.locationTargets,
    });
  }

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
          error: `Browser init failed: ${error.message}`,
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
            const result = await this.#applier.applyToJob(job);
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
          this.logger.error(`❌ Apply exception for ${job.company || job.title}: ${error.message}`);
          results.push({ job, success: false, error: error.message });
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

  #sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  getStats() {
    return {
      ...this.#stats,
      duration: this.#stats.endTime ? this.#stats.endTime - this.#stats.startTime : null,
    };
  }

  reset() {
    this.#stats = this.#initStats();
  }

  updateConfig(updates) {
    Object.assign(this.#config, updates);
  }
}

export default ApplyOrchestrator;
