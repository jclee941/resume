import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { WantedCrawler } from '../wanted/wanted-crawler.js';
import { JobKoreaCrawler } from '../jobkorea/jobkorea-crawler.js';
import { SaraminCrawler } from '../saramin/saramin-crawler.js';
import { BaseCrawler } from '../../src/crawlers/base-crawler.js';
import { UnifiedJobCrawler } from '../../src/crawlers/unified/unified-job-crawler.js';

// Proves the enrichment path is real: platform crawlers OVERRIDE the abstract
// BaseCrawler.getJobDetail (which throws) with working implementations, and
// UnifiedJobCrawler.getJobDetail routes to them without hitting the throw.

describe('platform crawlers override getJobDetail (not the throwing base)', () => {
  it('WantedCrawler.getJobDetail is a different function than BaseCrawler.getJobDetail', () => {
    assert.notEqual(WantedCrawler.prototype.getJobDetail, BaseCrawler.prototype.getJobDetail);
    assert.notEqual(JobKoreaCrawler.prototype.getJobDetail, BaseCrawler.prototype.getJobDetail);
    assert.notEqual(SaraminCrawler.prototype.getJobDetail, BaseCrawler.prototype.getJobDetail);
  });

  it('WantedCrawler.getJobDetail populates description/requirements from API payload (no throw)', async () => {
    const crawler = new WantedCrawler();
    // Stub network: BaseCrawler.fetchJSON is what getJobDetail calls.
    crawler.fetchJSON = async () => ({
      job: {
        id: 316710,
        position: 'Security Engineer (DevSecOps)',
        company: { name: '고위드' },
        detail: {
          main_tasks: 'WAF/IPS 운영, 보안 자동화 파이프라인 구축',
          requirements: 'Linux, Kubernetes, CI/CD, FortiGate 경험',
        },
      },
    });
    const result = await crawler.getJobDetail('316710');
    assert.equal(result.success, true);
    assert.match(result.job.description, /WAF/);
    assert.match(result.job.requirements, /Kubernetes/);
  });
});

describe('UnifiedJobCrawler.getJobDetail routes wanted_<id> to the wanted crawler', () => {
  it('reaches a non-throwing platform path and returns enriched body', async () => {
    const unified = new UnifiedJobCrawler({ sources: ['wanted'] });
    unified.crawlers.wanted.fetchJSON = async () => ({
      job: {
        id: 360052,
        position: 'Lead Security Engineer',
        company: { name: '유모스원' },
        detail: { main_tasks: 'SIEM/EDR 운영', requirements: '8년 이상 보안 경력' },
      },
    });
    const result = await unified.getJobDetail('wanted_360052');
    assert.equal(result.success, true);
    assert.match(result.job.description, /SIEM/);
    assert.match(result.job.requirements, /보안/);
  });

  it('returns a structured error (not a throw) for an unknown source', async () => {
    const unified = new UnifiedJobCrawler({ sources: ['wanted'] });
    const result = await unified.getJobDetail('bogus_123');
    assert.equal(result.success, false);
    assert.match(result.error, /Unknown source/);
  });
});
