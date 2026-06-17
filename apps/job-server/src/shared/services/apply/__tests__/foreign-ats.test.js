import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { FOREIGN_ATS_PLATFORMS } from '@resume/types/application';
import {
  ApplyOrchestrator,
  createForeignAtsAdapterRegistry,
  FOREIGN_ATS_LOCATION_TARGETS,
  SUPPORTED_FOREIGN_ATS_PLATFORMS,
} from '../index.js';

describe('foreign-ats adapter boundary', () => {
  it('exposes stable capabilities for supported foreign ATS platforms', () => {
    const registry = createForeignAtsAdapterRegistry();

    assert.strictEqual(SUPPORTED_FOREIGN_ATS_PLATFORMS, FOREIGN_ATS_PLATFORMS);
    assert.deepEqual(FOREIGN_ATS_LOCATION_TARGETS, ['remote', 'seoul', 'incheon', 'gyeonggi']);
    assert.ok(SUPPORTED_FOREIGN_ATS_PLATFORMS.includes('greenhouse'));
    assert.ok(SUPPORTED_FOREIGN_ATS_PLATFORMS.includes('lever'));
    assert.ok(SUPPORTED_FOREIGN_ATS_PLATFORMS.includes('ashby'));

    for (const platform of SUPPORTED_FOREIGN_ATS_PLATFORMS) {
      const adapter = registry.getAdapter(platform);

      assert.equal(adapter.platform, platform);
      assert.deepEqual(adapter.capabilities.locations, FOREIGN_ATS_LOCATION_TARGETS);
      assert.equal(adapter.capabilities.dryRunFirst, true);
      assert.equal(adapter.capabilities.canFetchNetwork, false);
      assert.equal(adapter.capabilities.canSubmit, false);
    }
  });

  it('normalizes search targets and rejects unsupported ATS platforms', async () => {
    const registry = createForeignAtsAdapterRegistry();
    const adapter = registry.getAdapter('GreenHouse');

    const plan = await adapter.planSearch({
      keywords: ['SRE'],
      locations: ['Remote', 'Seoul', 'Busan', 'Gyeonggi-do'],
      dryRun: false,
    });

    assert.equal(plan.platform, 'greenhouse');
    assert.equal(plan.dryRun, true);
    assert.deepEqual(plan.keywords, ['SRE']);
    assert.deepEqual(plan.locationTargets, ['remote', 'seoul', 'gyeonggi']);
    assert.deepEqual(plan.unsupportedLocations, ['Busan']);
    assert.equal(plan.networkSkipped, true);
    assert.equal(plan.submissionSkipped, true);

    assert.throws(
      () => registry.getAdapter('not-an-ats'),
      /Unsupported foreign ATS platform: not-an-ats/
    );
  });

  it('lets the apply orchestrator route foreign ATS search through injected adapters', async () => {
    const searchCalls = [];
    const registry = createForeignAtsAdapterRegistry({
      adapters: {
        greenhouse: {
          platform: 'greenhouse',
          capabilities: {
            locations: FOREIGN_ATS_LOCATION_TARGETS,
            dryRunFirst: true,
            canFetchNetwork: false,
            canSubmit: false,
          },
          async search(criteria) {
            searchCalls.push(criteria);
            return [
              {
                id: 'gh-1',
                company: 'ForeignCo',
                position: 'SRE',
                source: 'greenhouse',
                atsPlatform: 'greenhouse',
                locationTargets: criteria.locationTargets,
              },
            ];
          },
        },
      },
    });

    const crawler = {
      search: mock.fn(async () => []),
    };
    const orchestrator = new ApplyOrchestrator(crawler, null, null, {
      foreignAtsRegistry: registry,
      enabledPlatforms: ['greenhouse'],
      locationTargets: ['Remote', 'Seoul'],
    });

    const jobs = await orchestrator.searchJobs(['sre']);

    assert.equal(crawler.search.mock.calls.length, 0);
    assert.equal(searchCalls.length, 1);
    assert.equal(searchCalls[0].dryRun, true);
    assert.deepEqual(searchCalls[0].locationTargets, ['remote', 'seoul']);
    assert.equal(jobs[0].atsPlatform, 'greenhouse');
  });

  it('skips submissionSkipped jobs before browser setup in real apply mode', async () => {
    const applier = {
      initBrowser: mock.fn(async () => {}),
      applyToJob: mock.fn(async () => ({ success: true })),
      closeBrowser: mock.fn(async () => {}),
    };
    const orchestrator = new ApplyOrchestrator({ search: mock.fn(async () => []) }, applier, null, {
      delayBetweenApplies: 0,
      enabledPlatforms: ['wanted'],
    });

    const result = await orchestrator.applyToJobs(
      [
        {
          company: 'BoundaryCo',
          position: 'Security Engineer',
          source: 'greenhouse',
          sourceUrl: 'https://example.invalid/job',
          submissionSkipped: true,
        },
      ],
      false
    );

    assert.equal(applier.initBrowser.mock.calls.length, 0);
    assert.equal(applier.applyToJob.mock.calls.length, 0);
    assert.equal(applier.closeBrowser.mock.calls.length, 0);
    assert.equal(result.applied, 0);
    assert.equal(result.failed, 0);
    assert.equal(result.skipped, 1);
    assert.equal(result.results[0].dryRunOnly, true);
    assert.equal(result.results[0].skipped, true);
  });
});
