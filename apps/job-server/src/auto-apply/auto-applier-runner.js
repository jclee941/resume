/**
 * @typedef {{
 *   applied?: boolean;
 *   status?: string;
 *   stages: {
 *     generateCoverLetter?: boolean;
 *     checkApproval?: boolean;
 *     submit?: boolean;
 *     track?: boolean;
 *   };
 *   [key: string]: unknown;
 * }} ProcessResult
 */

/**
 * @typedef {{
 *   searched: number;
 *   matched: number;
 *   applied: number;
 *   skipped: number;
 *   failed: number;
 *   applications: ProcessResult[];
 *   stages: {
 *     search: number;
 *     filterScore: number;
 *     generateCoverLetter: number;
 *     checkApproval: number;
 *     submit: number;
 *     track: number;
 *   };
 *   filterStats: unknown;
 * }} RunResults
 */

/**
 * @typedef {{
 *   keywords?: string[];
 *   categories?: string[];
 *   experience?: number;
 *   location?: string;
 *   maxApplications?: number;
 *   useAI?: boolean;
 *   resumePath?: string;
 * }} RunAutoApplyOptions
 */

/**
 * @typedef {{
 *   config: {
 *     maxDailyApplications: number;
 *     useAI: boolean;
 *     resumePath: string;
 *     minMatchScore: number;
 *     excludeCompanies: string[];
 *     autoApply: boolean;
 *     dryRun: boolean;
 *     delayBetweenApps: number;
 *   };
 *   logger: { info(msg: string): void; error?(msg: string): void };
 *   retryService: { execute<T>(fn: () => Promise<T>, options?: { serviceName?: string }): Promise<T> };
 *   crawler: {
 *     searchWithMatching(query: unknown): Promise<{
 *       success: boolean;
 *       totalJobs: number;
 *       jobs: unknown[];
 *       sourceStats?: unknown;
 *       resumeAnalysis?: unknown;
 *     }>;
 *   };
 *   tracker: { recordSearch(jobs: unknown[], options: unknown): Promise<unknown> };
 *   getExistingJobKeys(): Promise<Set<string>>;
 *   jobFilter: {
 *     filter(jobs: unknown[], keys: Set<string>, options: unknown): Promise<{ jobs: unknown[]; stats: unknown }>;
 *   };
 *   processJob(job: unknown, context: { ensureBrowser: () => Promise<void> }): Promise<ProcessResult>;
 *   initBrowser(): Promise<void>;
 *   closeBrowser(): Promise<void>;
 *   sleep(ms: number): Promise<void>;
 * }} AutoApplierContext
 */

/**
 * @returns {RunResults}
 */
function createRunResults() {
  return {
    searched: 0,
    matched: 0,
    applied: 0,
    skipped: 0,
    failed: 0,
    applications: [],
    stages: {
      search: 0,
      filterScore: 0,
      generateCoverLetter: 0,
      checkApproval: 0,
      submit: 0,
      track: 0,
    },
    filterStats: {},
  };
}

/**
 * @this {AutoApplierContext}
 * @param {RunAutoApplyOptions} [options]
 * @returns {Promise<{
 *   success: boolean;
 *   error?: string;
 *   results: RunResults;
 *   resumeAnalysis?: unknown;
 * }>}
 */
export async function runAutoApply(options = {}) {
  const {
    keywords = ['보안 운영', '보안 인프라', 'SIEM'],
    categories = [],
    experience = 8,
    location = 'seoul',
    maxApplications = this.config.maxDailyApplications,
    useAI = this.config.useAI,
    resumePath = this.config.resumePath,
  } = options;

  const results = createRunResults();
  let browserInitialized = false;

  try {
    this.logger.info('🔍 Searching for jobs...');
    const searchResult = await this.retryService.execute(
      async () =>
        await this.crawler.searchWithMatching({
          keywords,
          categories,
          experience,
          location,
          minScore: this.config.minMatchScore,
          maxResults: maxApplications * 3,
          excludeCompanies: this.config.excludeCompanies,
        }),
      { serviceName: 'crawler-search' }
    );

    if (!searchResult.success) {
      return { success: false, error: 'Search failed', results };
    }

    results.searched = searchResult.totalJobs;
    results.stages.search = results.searched;
    this.logger.info(`📋 Found ${results.searched} matching jobs`);

    await this.tracker.recordSearch(searchResult.jobs, {
      sourceStats: searchResult.sourceStats,
      keywords,
    });

    const existingKeys = await this.getExistingJobKeys();
    const filterResult = await this.jobFilter.filter(searchResult.jobs, existingKeys, {
      useAI,
      resumePath,
    });

    results.filterStats = filterResult.stats;
    results.stages.filterScore = filterResult.jobs.length;

    const candidates = filterResult.jobs.slice(0, maxApplications);

    results.matched = candidates.length;
    this.logger.info(`✅ ${results.matched} jobs ready for application`);

    for (const job of candidates) {
      const processResult = await this.processJob(job, {
        ensureBrowser: async () => {
          if (!browserInitialized && this.config.autoApply && !this.config.dryRun) {
            await this.initBrowser();
            browserInitialized = true;
          }
        },
      });

      recordProcessResult(results, processResult);

      if (this.config.autoApply && !this.config.dryRun) {
        await this.sleep(this.config.delayBetweenApps);
      }
    }

    return {
      success: true,
      results,
      resumeAnalysis: searchResult.resumeAnalysis,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      results,
    };
  } finally {
    if (browserInitialized) {
      await this.closeBrowser();
    }
  }
}

/**
 * @param {RunResults} results
 * @param {ProcessResult} processResult
 * @returns {void}
 */
function recordProcessResult(results, processResult) {
  results.applications.push(processResult);

  if (processResult.applied) {
    results.applied += 1;
  } else if (processResult.status === 'failed') {
    results.failed += 1;
  } else {
    results.skipped += 1;
  }

  if (processResult.stages.generateCoverLetter) {
    results.stages.generateCoverLetter += 1;
  }
  if (processResult.stages.checkApproval) {
    results.stages.checkApproval += 1;
  }
  if (processResult.stages.submit) {
    results.stages.submit += 1;
  }
  if (processResult.stages.track) {
    results.stages.track += 1;
  }
}
