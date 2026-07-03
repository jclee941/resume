export function createRunResults() {
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
      error: error.message,
      results,
    };
  } finally {
    if (browserInitialized) {
      await this.closeBrowser();
    }
  }
}

export function recordProcessResult(results, processResult) {
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
