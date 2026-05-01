/**
 * @fileoverview Constants for crawl orchestration.
 */

/**
 * Default orchestrator configuration.
 * @type {CrawlOrchestratorOptions}
 */
export const DEFAULT_OPTIONS = {
  /** Max browser instances in the pool */
  maxBrowsers: 3,
  /** Min idle browsers to keep warm */
  minBrowsers: 0,
  /** Browser acquire timeout (ms) */
  acquireTimeoutMs: 60_000,
  /** Max idle time before browser eviction (ms) */
  idleTimeoutMs: 120_000,
  /** Max browser lifetime (ms) */
  maxBrowserAge: 300_000,
  /** Global concurrency cap across all platforms */
  concurrency: 3,
  /** Per-platform concurrency override map */
  platformConcurrency: {},
  /** Abort signal for external cancellation */
  signal: null,
  /** Whether to deduplicate results across platforms */
  deduplicate: true,
};

/**
 * Supported platform identifiers (must match UnifiedJobCrawler keys).
 * @type {string[]}
 */
export const SUPPORTED_PLATFORMS = [
  'wanted',
  'jobkorea',
  'saramin',
  'linkedin',
  'remember',
  'rocketpunch',
  'programmers',
  'jumpit',
  'rallit',
];
