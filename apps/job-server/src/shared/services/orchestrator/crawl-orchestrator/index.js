/**
 * @fileoverview Public exports for crawl orchestration modules.
 */

export { CrawlOrchestrator } from './orchestrator.js';
export { DEFAULT_OPTIONS, SUPPORTED_PLATFORMS } from './constants.js';
export { ensureBrowserPool, createBrowserContext, destroyBrowserContext } from './browser-pool.js';
export { validatePlatforms } from './platform-validation.js';
export {
  executeWithConcurrency,
  crawlPlatform,
  executePlatformCrawl,
  handlePlatformCrawlError,
} from './platform-crawl.js';
export { aggregateResults, deduplicateJobs } from './result-aggregation.js';
