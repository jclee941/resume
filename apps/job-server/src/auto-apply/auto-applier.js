import { ApplicationManager } from './application-manager.js';
import { UnifiedJobCrawler } from '../crawlers/index.js';
import {
  findByText,
  findElementWithText,
  initBrowser,
  loadCookies,
  closeBrowser,
} from './browser-helpers.js';
import {
  applyToWanted,
  applyToJobKorea,
  applyToSaramin,
  applyToLinkedIn,
} from './strategies/index.js';
export class AutoApplier {
  constructor(options = {}) {
    this.logger = options.logger || console;
    this.crawler = new UnifiedJobCrawler(options.crawler);
    this.appManager = new ApplicationManager({ logger: this.logger });
    this.config = {
      maxDailyApplications: options.maxDailyApplications || 10,
      reviewThreshold: options.reviewThreshold || 60,
      autoApplyThreshold: options.autoApplyThreshold || 75,
      autoApply: options.autoApply !== undefined ? options.autoApply : false,
      dryRun: options.dryRun !== undefined ? options.dryRun : true,
      delayBetweenApps: options.delayBetweenApps || 5000,
      excludeCompanies: options.excludeCompanies || [],
      preferredCompanies: options.preferredCompanies || [],
      ...options,
    };
    this.browser = null;
    this.page = null;
  }

  async findByText(tag, text, cssAlternative = null) {
    return findByText.call(this, tag, text, cssAlternative);
  }

  async findElementWithText(text) {
    return findElementWithText.call(this, text);
  }

  async initBrowser() {
    return initBrowser.call(this);
  }

  async loadCookies(cookies, domain = '.wanted.co.kr') {
    return loadCookies.call(this, cookies, domain);
  }

  async closeBrowser() {
    return closeBrowser.call(this);
  }

  async run(options = {}) {
    const {
      keywords = ['시니어 엔지니어', '클라우드 엔지니어', 'SRE'],
      categories = [],
      experience = 8,
      location = 'seoul',
      maxApplications = this.config.maxDailyApplications,
    } = options;

    const results = {
      searched: 0,
      matched: 0,
      applied: 0,
      skipped: 0,
      failed: 0,
      applications: [],
    };

    try {
      this.logger.info('🔍 Searching for jobs...');
      const searchResult = await this.crawler.searchWithMatching({
        keywords,
        categories,
        experience,
        location,
        minScore: this.config.minMatchScore,
        maxResults: maxApplications * 2,
        excludeCompanies: this.config.excludeCompanies,
      });

      if (!searchResult.success) {
        return { success: false, error: 'Search failed', results };
      }

      results.searched = searchResult.totalJobs;
      this.logger.info(`📋 Found ${results.searched} matching jobs`);

      const candidates = searchResult.jobs
        .filter((job) => !this.appManager.isDuplicate(job.id))
        .filter((job) => job.matchPercentage >= this.config.minMatchScore)
        .slice(0, maxApplications);

      results.matched = candidates.length;
      this.logger.info(`✅ ${results.matched} jobs ready for application`);

      if (this.config.autoApply && !this.config.dryRun) {
        try {
          await this.initBrowser();

          for (const job of candidates) {
            try {
              const appResult = await this.applyToJob(job);

              if (appResult.success) {
                results.applied++;
                results.applications.push(appResult.application);
              } else {
                results.failed++;
              }

              await this.sleep(this.config.delayBetweenApps);
            } catch (error) {
              this.logger.error(`❌ Failed to apply to ${job.company}: ${error.message}`);
              results.failed++;
            }
          }
        } finally {
          await this.closeBrowser();
        }
      } else {
        for (const job of candidates) {
          const application = this.appManager.addApplication(job, {
            notes: this.config.dryRun ? 'Dry run - not actually applied' : '',
          });
          results.applications.push(application);
        }
        results.skipped = candidates.length;
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
    }
  }

  async applyToJob(job) {
    const source = job.source;

    switch (source) {
      case 'wanted':
        return this.applyToWanted(job);
      case 'jobkorea':
        return this.applyToJobKorea(job);
      case 'saramin':
        return this.applyToSaramin(job);
      case 'linkedin':
        return this.applyToLinkedIn(job);
      default:
        return { success: false, error: `Unsupported source: ${source}` };
    }
  }

  async applyToWanted(job) {
    return applyToWanted.call(this, job);
  }

  async applyToJobKorea(job) {
    return applyToJobKorea.call(this, job);
  }

  async applyToSaramin(job) {
    return applyToSaramin.call(this, job);
  }

  async applyToLinkedIn(job) {
    return applyToLinkedIn.call(this, job);
  }

  getApplications(filters = {}) {
    return this.appManager.listApplications(filters);
  }

  getStats() {
    return this.appManager.getStats();
  }

  getDailyReport(date) {
    return this.appManager.generateDailyReport(date);
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export default AutoApplier;
