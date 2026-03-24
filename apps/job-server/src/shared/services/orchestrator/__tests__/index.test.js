import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import * as barrel from '../index.js';
import { CrawlOrchestrator, SUPPORTED_PLATFORMS, DEFAULT_OPTIONS } from '../crawl-orchestrator.js';
import { RateLimiter, DEFAULT_PLATFORM_LIMITS, FALLBACK_LIMIT } from '../rate-limiter.js';
import { ProgressTracker } from '../progress-tracker.js';
import { ResourcePool } from '../resource-pool.js';

describe('orchestrator index barrel', { concurrency: 1 }, () => {
  beforeEach(() => {
    mock.restoreAll();
  });

  afterEach(() => {
    mock.restoreAll();
  });

  it('re-exports all orchestrator classes and constants', () => {
    assert.strictEqual(barrel.CrawlOrchestrator, CrawlOrchestrator);
    assert.strictEqual(barrel.RateLimiter, RateLimiter);
    assert.strictEqual(barrel.ProgressTracker, ProgressTracker);
    assert.strictEqual(barrel.ResourcePool, ResourcePool);
    assert.strictEqual(barrel.SUPPORTED_PLATFORMS, SUPPORTED_PLATFORMS);
    assert.strictEqual(barrel.DEFAULT_OPTIONS, DEFAULT_OPTIONS);
    assert.strictEqual(barrel.DEFAULT_PLATFORM_LIMITS, DEFAULT_PLATFORM_LIMITS);
    assert.strictEqual(barrel.FALLBACK_LIMIT, FALLBACK_LIMIT);
  });
});
