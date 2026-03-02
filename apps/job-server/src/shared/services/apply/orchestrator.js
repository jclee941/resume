export class ApplyOrchestrator {
  #crawler;
  #applier;
  #appManager;
  #config;
  #stats;

  constructor(crawler, applier, appManager, config = {}) {
    this.#crawler = crawler;
    this.#applier = applier;
    this.#appManager = appManager;
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
        platforms.map((platform) =>
          this.#crawler.search(platform, keywords, options),
        ),
      );

      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          jobs.push(...result.value);
        }
      }
    } else {
      for (const platform of platforms) {
        try {
          const result = await this.#crawler.search(
            platform,
            keywords,
            options,
          );
          if (result) jobs.push(...result);
        } catch {
          continue;
        }
      }
    }

    this.#stats.searched = jobs.length;
    return jobs;
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

    for (const job of toApply) {
      try {
        if (dryRun) {
          results.push({
            job,
            success: true,
            dryRun: true,
            message: 'Would apply',
          });
          this.#stats.applied++;
        } else {
          const result = await this.#applier.apply(job);
          results.push({ job, ...result });

          if (result.success) {
            this.#appManager?.addApplication(job, { status: 'applied' });
            this.#stats.applied++;
          } else {
            this.#stats.failed++;
          }

          await this.#sleep(this.#config.delayBetweenApplies);
        }
      } catch (error) {
        results.push({ job, success: false, error: error.message });
        this.#stats.failed++;
      }
    }

    this.#stats.skipped = jobs.length - toApply.length;
    this.#stats.endTime = Date.now();

    return {
      results,
      applied: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      skipped: this.#stats.skipped,
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
      duration: this.#stats.endTime
        ? this.#stats.endTime - this.#stats.startTime
        : null,
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
