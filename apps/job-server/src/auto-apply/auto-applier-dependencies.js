import { ApplicationManager } from './application-manager.js';
import { UnifiedJobCrawler } from '../crawlers/unified/unified-job-crawler.js';
import { ApplicationRepository } from '../shared/repositories/application-repository.js';
import { CoverLetterService } from '../shared/services/apply/cover-letter-service.js';
import { ApprovalWorkflowManager } from '../shared/services/apply/approval-manager.js';
import { RetryService } from '@resume/shared/retry';
import { ApplicationTrackerService } from '../shared/services/apply/application-tracker.js';
import { TelegramNotificationAdapter } from '../shared/services/notifications/telegram-adapter.js';

/**
 * @typedef {Object} AutoApplierOptions
 * @property {ApplicationRepository} [repository]
 * @property {CoverLetterService} [coverLetterService]
 * @property {TelegramNotificationAdapter} [notificationAdapter]
 * @property {ApprovalWorkflowManager} [approvalManager]
 * @property {RetryService} [retryService]
 * @property {Record<string, unknown>} [retryConfig]
 * @property {ApplicationTrackerService} [tracker]
 * @property {import('../crawlers/unified/unified-job-crawler.js').UnifiedJobCrawlerOptions} [crawler]
 * @property {number} [maxDailyApplications]
 * @property {number} [reviewThreshold]
 * @property {number} [autoApplyThreshold]
 * @property {number} [minMatchScore]
 * @property {boolean} [autoApply]
 * @property {boolean} [dryRun]
 * @property {number} [delayBetweenApps]
 * @property {string[]} [excludeCompanies]
 * @property {string[]} [excludeKeywords]
 * @property {string[]} [preferredCompanies]
 * @property {string[]} [keywords]
 * @property {boolean} [useAI]
 * @property {string | null} [resumePath]
 * @property {Console} [logger]
 *
 * @typedef {Object} AutoApplierDependencies
 * @property {ApplicationRepository} repository
 * @property {CoverLetterService} coverLetterService
 * @property {TelegramNotificationAdapter} notificationAdapter
 * @property {ApprovalWorkflowManager} approvalManager
 * @property {RetryService} retryService
 * @property {ApplicationTrackerService} tracker
 * @property {UnifiedJobCrawler} crawler
 * @property {ApplicationManager} appManager
 *
 * @typedef {Object} AutoApplierConfig
 * @property {number} maxDailyApplications
 * @property {number} reviewThreshold
 * @property {number} autoApplyThreshold
 * @property {number} minMatchScore
 * @property {boolean} autoApply
 * @property {boolean} dryRun
 * @property {number} delayBetweenApps
 * @property {string[]} excludeCompanies
 * @property {string[]} excludeKeywords
 * @property {string[]} preferredCompanies
 * @property {string[]} keywords
 * @property {boolean} useAI
 * @property {string | null} resumePath
 */

/**
 * @param {AutoApplierOptions} [options]
 * @param {Console} [logger]
 * @returns {AutoApplierDependencies}
 */
export function createAutoApplierDependencies(options = {}, logger = console) {
  const repository = options.repository || new ApplicationRepository();
  const coverLetterService =
    options.coverLetterService ||
    new CoverLetterService({
      d1Client: repository.d1Client,
      dryRun: options.dryRun === true,
      logger,
    });
  const notificationAdapter =
    options.notificationAdapter ||
    new TelegramNotificationAdapter({
      logger,
      d1Client: repository.d1Client,
    });
  const approvalManager =
    options.approvalManager ||
    new ApprovalWorkflowManager({
      applicationRepository: repository,
      notificationAdapter,
      logger,
    });
  const retryService = options.retryService || new RetryService(options.retryConfig || {});
  const tracker =
    options.tracker ||
    new ApplicationTrackerService({
      applicationRepository: repository,
      coverLetterService,
      logger,
    });
  const crawler = new UnifiedJobCrawler(options.crawler);
  const appManager = new ApplicationManager({ logger });

  return {
    repository,
    coverLetterService,
    notificationAdapter,
    approvalManager,
    retryService,
    tracker,
    crawler,
    appManager,
  };
}

/**
 * @param {AutoApplierOptions} [options]
 * @returns {AutoApplierConfig}
 */
export function createAutoApplierConfig(options = {}) {
  return {
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
}

/**
 * @param {object} target
 * @param {AutoApplierDependencies} dependencies
 * @returns {asserts target is AutoApplierDependencies}
 */
export function assignAutoApplierDependencies(target, dependencies) {
  Object.assign(target, dependencies);
}
