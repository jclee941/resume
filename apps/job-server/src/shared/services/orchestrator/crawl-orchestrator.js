/**
 * @fileoverview Compatibility adapter for the crawl orchestrator modules.
 *
 * Existing imports from `./crawl-orchestrator.js` continue to work while the
 * implementation lives in focused files under `./crawl-orchestrator/`.
 */

export {
  CrawlOrchestrator,
  DEFAULT_OPTIONS,
  SUPPORTED_PLATFORMS,
} from './crawl-orchestrator/index.js';

export { default } from './crawl-orchestrator/orchestrator.js';
