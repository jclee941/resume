/**
 * @fileoverview Barrel export for the parallel crawl orchestrator module.
 *
 * Provides four components:
 *  - {@link CrawlOrchestrator} — Main orchestrator (browser pool + rate limit + progress)
 *  - {@link RateLimiter}        — Per-platform token-bucket rate limiter
 *  - {@link ProgressTracker}    — Task lifecycle & progress monitoring
 *  - {@link ResourcePool}       — Generic async resource pool
 */

export { CrawlOrchestrator, SUPPORTED_PLATFORMS, DEFAULT_OPTIONS } from './crawl-orchestrator.js';

export { RateLimiter, DEFAULT_PLATFORM_LIMITS, FALLBACK_LIMIT } from './rate-limiter.js';

export { ProgressTracker } from './progress-tracker.js';

export { ResourcePool } from './resource-pool.js';
