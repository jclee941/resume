import { ApplicationManager } from './application-manager.js';
import { UnifiedJobCrawler } from '../crawlers/index.js';
import { ApplicationRepository } from '../shared/repositories/application-repository.js';
import { CoverLetterService } from '../shared/services/apply/cover-letter-service.js';
import { ApprovalWorkflowManager } from '../shared/services/apply/approval-manager.js';
import { RetryService } from '../shared/services/apply/retry-service.js';
import { ApplicationTrackerService } from '../shared/services/apply/application-tracker.js';
import { JobFilter } from '../shared/services/apply/job-filter.js';
import { TelegramNotificationAdapter } from '../shared/services/notifications/telegram-adapter.js';
import {
  processJob,
  shouldApply,
  submitApplication,
  handleApproval,
  getExistingJobKeys,
} from './auto-applier-pipeline.js';
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

    this.repository = options.repository || new ApplicationRepository();
    this.coverLetterService =
      options.coverLetterService ||
      new CoverLetterService({
        d1Client: this.repository.d1Client,
        logger: this.logger,
      });
    this.notificationAdapter =
      options.notificationAdapter ||
      new TelegramNotificationAdapter({
        logger: this.logger,
        d1Client: this.repository.d1Client,
      });
    this.approvalManager =
      options.approvalManager ||
      new ApprovalWorkflowManager({
        applicationRepository: this.repository,
        notificationAdapter: this.notificationAdapter,
        logger: this.logger,
      });
    this.retryService = options.retryService || new RetryService(options.retryConfig || {});
    this.tracker =
      options.tracker ||
      new ApplicationTrackerService({
        applicationRepository: this.repository,
        coverLetterService: this.coverLetterService,
        logger: this.logger,
      });

    this.crawler = new UnifiedJobCrawler(options.crawler);
    this.appManager = new ApplicationManager({ logger: this.logger });

    this.config = {
      maxDailyApplications: options.maxDailyApplications || 10,
      reviewThreshold: options.reviewThreshold || 60,
      autoApplyThreshold: options.autoApplyThreshold || 75,
      minMatchScore:
        options.minMatchScore || options.reviewThreshold || options.autoApplyThreshold || 60,
      autoApply: options.autoApply !== undefined ? options.autoApply : false,
      dryRun: options.dryRun !== undefined ? options.dryRun : true,
      delayBetweenApps: options.delayBetweenApps || 5000,
      excludeCompanies: options.excludeCompanies || [],
      excludeKeywords: options.excludeKeywords || [],
      preferredCompanies: options.preferredCompanies || [],
      keywords: options.keywords || [],
      useAI: options.useAI || false,
      resumePath: options.resumePath || null,
    };

    this.jobFilter =
      options.jobFilter ||
      new JobFilter({
        logger: this.logger,
        reviewThreshold: this.config.reviewThreshold,
        autoApplyThreshold: this.config.autoApplyThreshold,
        minMatchScore: this.config.minMatchScore,
        excludeKeywords: this.config.excludeKeywords,
        excludeCompanies: this.config.excludeCompanies,
        preferredCompanies: this.config.preferredCompanies,
        keywords: this.config.keywords,
      });

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
      useAI = this.config.useAI,
      resumePath = this.config.resumePath,
    } = options;

    const results = {
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

  async processJob(job, context = {}) {
    return processJob.call(this, job, context);
  }

  async shouldApply(job, trackedApplication = null) {
    return shouldApply.call(this, job, trackedApplication);
  }

  async submitApplication(job) {
    return submitApplication.call(this, job);
  }

  async handleApproval(job, trackedApplication = null) {
    return handleApproval.call(this, job, trackedApplication);
  }

  async getExistingJobKeys() {
    return getExistingJobKeys.call(this);
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
